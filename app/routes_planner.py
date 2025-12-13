from datetime import date, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .database import get_db
from . import models

router = APIRouter(prefix="/planner", tags=["meal-planner"])

MEAL_TYPES = ["breakfast", "lunch", "dinner"]


class SlotPayload(BaseModel):
    date: str
    meal_type: str
    recipe_id: int | None = None
    note: str | None = ""


def get_week_range(start: Optional[date] = None) -> List[date]:
    if start is None:
        start = date.today()
    monday = start - timedelta(days=start.weekday())
    return [monday + timedelta(days=i) for i in range(7)]


@router.get("/week")
def planner_week(start: Optional[str] = None, db: Session = Depends(get_db)):
    if start:
        try:
            start_date = date.fromisoformat(start)
        except ValueError:
            raise HTTPException(status_code=400, detail="Ngày bắt đầu không hợp lệ")
    else:
        start_date = date.today()

    days = get_week_range(start_date)

    slots = (
        db.query(models.MealSlot)
        .filter(models.MealSlot.date >= days[0], models.MealSlot.date <= days[-1])
        .all()
    )

    slots_map = {(s.date.isoformat(), s.meal_type): s for s in slots}

    recipes = db.query(models.Recipe).all()

    ui_slots = []
    for d in days:
        d_iso = d.isoformat()
        for mt in MEAL_TYPES:
            slot = slots_map.get((d_iso, mt))
            ui_slots.append(
                {
                    "date": d_iso,
                    "meal_type": mt,
                    "recipe_id": slot.recipe_id if slot else None,
                    "note": (slot.note if slot and slot.note else "") or "",
                }
            )

    ui_recipes = [{"id": r.id, "title": r.title, "category": r.category} for r in recipes]

    return {
        "days": [d.isoformat() for d in days],
        "meal_types": MEAL_TYPES,
        "recipes": ui_recipes,
        "slots": ui_slots,
    }


@router.post("/slot")
def save_slot(payload: SlotPayload, db: Session = Depends(get_db)):
    try:
        slot_date = date.fromisoformat(payload.date)
    except Exception:
        raise HTTPException(status_code=400, detail="Ngày không hợp lệ")

    if payload.meal_type not in MEAL_TYPES:
        raise HTTPException(status_code=400, detail="Loại bữa ăn không hợp lệ")

    slot = (
        db.query(models.MealSlot)
        .filter(models.MealSlot.date == slot_date, models.MealSlot.meal_type == payload.meal_type)
        .first()
    )

    if slot is None:
        slot = models.MealSlot(
            date=slot_date,
            meal_type=payload.meal_type,
            recipe_id=payload.recipe_id,
            note=payload.note or "",
        )
        db.add(slot)
    else:
        slot.recipe_id = payload.recipe_id
        slot.note = payload.note or ""

    db.commit()
    db.refresh(slot)

    return {
        "id": slot.id,
        "date": slot.date.isoformat(),
        "meal_type": slot.meal_type,
        "recipe_id": slot.recipe_id,
        "note": slot.note or "",
    }
