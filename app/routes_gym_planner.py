# app/routes_gym_planner.py
from typing import List

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from .database import get_db
from . import models, schemas

router = APIRouter(tags=["gym-planner"])

templates = Jinja2Templates(directory="templates")


# ========= HTML PAGE =========
@router.get("/gym/planner", response_class=HTMLResponse)
def gym_planner_page(request: Request):
    """
    Trang Meal Planner cho người tập gym / eat clean / giảm cân.
    HTML + JS sẽ lấy danh sách món ăn healthy qua API /api/gym/recipes.
    """
    return templates.TemplateResponse(
        "gym_planner.html",
        {
            "request": request,
            "page_title": "Meal Planner - Gym / Eat clean",
        },
    )


# ========= API: LẤY DANH SÁCH MÓN HEALTHY =========
@router.get(
    "/api/gym/recipes",
    response_model=List[schemas.RecipeOut],
)
def get_gym_recipes(db: Session = Depends(get_db)):
    """
    Lấy danh sách món ăn dạng healthy (cho gym/eat clean).
    Dựa trên cột 'category' của bảng recipes = 'healthy'.
    """
    recipes = (
        db.query(models.Recipe)
        .filter(models.Recipe.category == "healthy")
        .all()
    )
    return recipes
