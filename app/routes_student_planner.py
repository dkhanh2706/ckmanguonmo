# app/routes_student_planner.py
from typing import List

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from .database import get_db
from . import models, schemas

router = APIRouter(tags=["student-planner"])

# Tạo riêng Jinja2Templates cho router này
templates = Jinja2Templates(directory="templates")


# ========= HTML PAGE =========
@router.get("/student/planner", response_class=HTMLResponse)
def student_planner_page(request: Request):
    """
    Trang Meal Planner cho sinh viên ở trọ.
    Chỉ render HTML, phần dữ liệu sẽ lấy qua API /api/student/recipes.
    """
    return templates.TemplateResponse(
        "student_planner.html",
        {
            "request": request,
            "page_title": "Meal Planner - Sinh viên ở trọ",
        },
    )


# ========= API: LẤY DANH SÁCH MÓN PHÙ HỢP CHO SINH VIÊN =========
@router.get(
    "/api/student/recipes",
    response_model=List[schemas.RecipeOut],
)
def get_student_recipes(db: Session = Depends(get_db)):
    """
    Lấy danh sách món ăn phù hợp cho sinh viên ở trọ.
    Ở đây tạm hiểu:
      - Món 'healthy' dành riêng cho gym/eat clean,
      - Còn lại là món 'bình thường', phù hợp sinh viên.

    Nếu sau này bạn thêm cột khác (estimated_cost, cook_time...)
    thì chỉ cần chỉnh lại filter ở đây.
    """
    recipes = (
        db.query(models.Recipe)
        .filter(models.Recipe.category != "healthy")
        .all()
    )
    return recipes
