from typing import List

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from .database import get_db
from . import models, schemas

router = APIRouter(tags=["student-planner"])
templates = Jinja2Templates(directory="templates")


@router.get("/student/planner", response_class=HTMLResponse)
def student_planner_page(request: Request):
    return templates.TemplateResponse(
        "student_planner.html",
        {"request": request, "page_title": "Meal Planner - Sinh viên ở trọ"},
    )


@router.get("/api/student/recipes", response_model=List[schemas.RecipeOutWithSource])
def get_student_recipes(db: Session = Depends(get_db)):
    recipes = db.query(models.Recipe).filter(models.Recipe.category != "healthy").all()

    out: list[schemas.RecipeOutWithSource] = []
    for r in recipes:
        base = schemas.RecipeOut.model_validate(r, from_attributes=True).model_dump()
        base["source"] = "student"
        out.append(schemas.RecipeOutWithSource(**base))
    return out
