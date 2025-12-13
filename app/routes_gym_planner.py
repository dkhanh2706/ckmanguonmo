from typing import List

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from .database import get_db
from . import models, schemas

router = APIRouter(tags=["gym-planner"])
templates = Jinja2Templates(directory="templates")


@router.get("/gym/planner", response_class=HTMLResponse)
def gym_planner_page(request: Request):
    return templates.TemplateResponse(
        "gym_planner.html",
        {"request": request, "page_title": "Meal Planner - Gym / Eat clean"},
    )


@router.get("/api/gym/recipes", response_model=List[schemas.RecipeOutWithSource])
def get_gym_recipes(db: Session = Depends(get_db)):
    recipes = db.query(models.Recipe).filter(models.Recipe.category == "healthy").all()

    out: list[schemas.RecipeOutWithSource] = []
    for r in recipes:
        base = schemas.RecipeOut.model_validate(r, from_attributes=True).model_dump()
        base["source"] = "gym"
        out.append(schemas.RecipeOutWithSource(**base))
    return out
