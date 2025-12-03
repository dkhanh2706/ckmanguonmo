from fastapi import APIRouter, Depends, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.database import get_db
from app import models

import shutil
import uuid

router = APIRouter(prefix="/recipes", tags=["Recipes"])

UPLOAD_DIR = "static/uploads/"


@router.post("/")
def create_recipe(
    title: str = Form(...),
    ingredients: str = Form(...),
    steps: str = Form(...),
    note: str = Form(""),
    category: str = Form(""),
    image: UploadFile | None = File(None),
    db: Session = Depends(get_db),
):
    file_path = None

    if image:
        filename = f"{uuid.uuid4().hex}_{image.filename}"
        file_path = UPLOAD_DIR + filename
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)

    recipe = models.Recipe(
        title=title,
        ingredients=ingredients,
        steps=steps,
        note=note,
        category=category,
        image=file_path,
    )

    db.add(recipe)
    db.commit()
    db.refresh(recipe)

    return {"message": "Created", "data": recipe}


@router.get("/")
def list_recipes(
    db: Session = Depends(get_db),
    category: str | None = None,
    difficulty: str | None = None,
):
    query = db.query(models.Recipe)
    
    if category:
        query = query.filter(models.Recipe.category == category)

    return query.all()


@router.get("/{recipe_id}")
def get_recipe(recipe_id: int, db: Session = Depends(get_db)):
    return db.query(models.Recipe).filter(models.Recipe.id == recipe_id).first()


@router.put("/{recipe_id}")
def update_recipe(
    recipe_id: int,
    title: str = Form(...),
    ingredients: str = Form(...),
    steps: str = Form(...),
    note: str = Form(""),
    category: str = Form(""),
    image: UploadFile | None = File(None),
    db: Session = Depends(get_db),
):
    recipe = db.query(models.Recipe).filter(models.Recipe.id == recipe_id).first()

    if not recipe:
        return {"message": "Not found"}

    recipe.title = title
    recipe.ingredients = ingredients
    recipe.steps = steps
    recipe.note = note
    recipe.category = category

    if image:
        filename = f"{uuid.uuid4().hex}_{image.filename}"
        file_path = UPLOAD_DIR + filename
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
        recipe.image = file_path

    db.commit()
    db.refresh(recipe)

    return {"message": "Updated", "data": recipe}


@router.delete("/{recipe_id}")
def delete_recipe(recipe_id: int, db: Session = Depends(get_db)):
    recipe = db.query(models.Recipe).filter(models.Recipe.id == recipe_id).first()
    if recipe:
        db.delete(recipe)
        db.commit()
    return {"message": "Deleted"}
