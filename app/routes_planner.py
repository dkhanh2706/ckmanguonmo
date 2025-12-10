# app/routes_planner.py

from datetime import date, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .database import get_db
from . import models

router = APIRouter(prefix="/planner", tags=["meal-planner"])

# 3 bữa chính mỗi ngày
MEAL_TYPES = ["breakfast", "lunch", "dinner"]


# ============================
#  Hàm tính range 1 tuần
# ============================
def get_week_range(start: Optional[date] = None) -> List[date]:
    """
    Trả về danh sách 7 ngày (thứ 2 → CN) chứa ngày start.
    Nếu không truyền start thì dùng hôm nay.
    """
    if start is None:
        start = date.today()

    monday = start - timedelta(days=start.weekday())  # weekday(): Mon=0
    return [monday + timedelta(days=i) for i in range(7)]


# ============================
#  API lấy lịch ăn trong tuần
# ============================
@router.get("/week")
def planner_week(
    start: Optional[str] = None,  # dạng "YYYY-MM-DD" (option)
    db: Session = Depends(get_db),
):
    # --- Xử lý ngày bắt đầu ---
    if start:
        try:
            start_date = date.fromisoformat(start)
        except ValueError:
            raise HTTPException(status_code=400, detail="Ngày bắt đầu không hợp lệ")
    else:
        start_date = date.today()

    days = get_week_range(start_date)

    # TODO: sau này lấy từ user đang đăng nhập
    user_id = 1

    # --- Lấy tất cả slot của user trong khoảng tuần này ---
    slots = (
        db.query(models.MealSlot)
        .filter(
            models.MealSlot.user_id == user_id,
            models.MealSlot.date >= days[0],
            models.MealSlot.date <= days[-1],
        )
        .all()
    )

    # Map key (date_iso, meal_type) -> slot
    slots_map = {(s.date.isoformat(), s.meal_type): s for s in slots}

    # --- Lấy toàn bộ recipe để fill dropdown ---
    recipes = db.query(models.Recipe).all()

    # --- Lấy danh sách món yêu thích của user ---
    favorite_rows = (
        db.query(models.FavoriteRecipe)
        .filter(models.FavoriteRecipe.user_id == user_id)
        .all()
    )
    favorite_ids = {f.recipe_id for f in favorite_rows}

    # --- Build dữ liệu trả về ---
    # 1. Danh sách slot (mỗi ô trong bảng)
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
                    "note": slot.note if slot else "",
                }
            )

    # 2. Danh sách recipe (dùng cho dropdown)
    ui_recipes = [
        {
            "id": r.id,
            "title": r.title,
            "category": r.category,
            "tags": getattr(r, "tags", None),
            "is_favorite": r.id in favorite_ids,
        }
        for r in recipes
    ]

    return {
        "days": [d.isoformat() for d in days],
        "meal_types": MEAL_TYPES,
        "recipes": ui_recipes,
        "slots": ui_slots,
    }


# ============================
#  API lưu 1 ô trong lịch
# ============================
@router.post("/slot")
def save_slot(payload: dict, db: Session = Depends(get_db)):
    """
    Body expected:
    {
      "date": "YYYY-MM-DD",
      "meal_type": "breakfast" | "lunch" | "dinner",
      "recipe_id": 1 | null,
      "note": "string"
    }
    """
    # TODO: sau này lấy user đang đăng nhập
    user_id = 1

    # --- Validate & parse ---
    try:
        slot_date = date.fromisoformat(payload.get("date", ""))
    except Exception:
        raise HTTPException(status_code=400, detail="Ngày không hợp lệ")

    meal_type = payload.get("meal_type")
    if meal_type not in MEAL_TYPES:
        raise HTTPException(status_code=400, detail="Loại bữa ăn không hợp lệ")

    recipe_id = payload.get("recipe_id")
    note = payload.get("note", "")

    # --- Tìm slot cũ (nếu có) ---
    slot = (
        db.query(models.MealSlot)
        .filter(
            models.MealSlot.user_id == user_id,
            models.MealSlot.date == slot_date,
            models.MealSlot.meal_type == meal_type,
        )
        .first()
    )

    if slot is None:
        # Tạo mới
        slot = models.MealSlot(
            user_id=user_id,
            date=slot_date,
            meal_type=meal_type,
            recipe_id=recipe_id,
            note=note,
        )
        db.add(slot)
    else:
        # Cập nhật
        slot.recipe_id = recipe_id
        slot.note = note

    db.commit()
    db.refresh(slot)

    return {
        "id": slot.id,
        "date": slot.date.isoformat(),
        "meal_type": slot.meal_type,
        "recipe_id": slot.recipe_id,
        "note": slot.note,
    }