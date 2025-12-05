from fastapi import APIRouter, Depends, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.database import get_db
from app import models

import shutil
import uuid
import os

# API PREFIX
router = APIRouter(prefix="/api/recipes", tags=["Recipes"])

# Thư mục lưu file trên server
UPLOAD_DIR = "static/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# Tạo URL hiển thị ảnh cho front-end
def make_image_url(filename: str | None):
    if not filename:
        return None
    return f"/static/uploads/{filename}"


# =========================================
# CREATE
# =========================================
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

    saved_filename = None

    # Lưu file ảnh nếu có upload
    if image:
        saved_filename = f"{uuid.uuid4().hex}_{image.filename}"
        file_path = os.path.join(UPLOAD_DIR, saved_filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)

    recipe = models.Recipe(
        title=title,
        ingredients=ingredients,
        steps=steps,
        note=note,
        category=category,
        image=saved_filename,       # LƯU TÊN FILE, KHÔNG LƯU ĐƯỜNG DẪN
    )

    db.add(recipe)
    db.commit()
    db.refresh(recipe)

    return {
        "message": "Created",
        "data": {
            "id": recipe.id,
            "title": recipe.title,
            "image": make_image_url(recipe.image)
        }
    }


# =========================================
# READ ALL
# =========================================
@router.get("/")
def list_recipes(db: Session = Depends(get_db), category: str | None = None):

    query = db.query(models.Recipe)

    if category:
        query = query.filter(models.Recipe.category == category)

    recipes = query.all()

    # Convert image → URL
    result = []
    for r in recipes:
        result.append({
            "id": r.id,
            "title": r.title,
            "ingredients": r.ingredients,
            "steps": r.steps,
            "note": r.note,
            "category": r.category,
            "image": make_image_url(r.image)
        })

    return result


# =========================================
# READ ONE
# =========================================
@router.get("/{recipe_id}")
def get_recipe(recipe_id: int, db: Session = Depends(get_db)):
    r = db.query(models.Recipe).filter(models.Recipe.id == recipe_id).first()
    if not r:
        return {"message": "Not found"}

    return {
        "id": r.id,
        "title": r.title,
        "ingredients": r.ingredients,
        "steps": r.steps,
        "note": r.note,
        "category": r.category,
        "image": make_image_url(r.image),
    }


# =========================================
# UPDATE
# =========================================
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

    # Cập nhật ảnh nếu có file mới
    if image:
        new_filename = f"{uuid.uuid4().hex}_{image.filename}"
        file_path = os.path.join(UPLOAD_DIR, new_filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)

        recipe.image = new_filename

    db.commit()
    db.refresh(recipe)

    return {"message": "Updated", "image": make_image_url(recipe.image)}


# =========================================
# DELETE
# =========================================
@router.delete("/{recipe_id}")
def delete_recipe(recipe_id: int, db: Session = Depends(get_db)):
    recipe = db.query(models.Recipe).filter(models.Recipe.id == recipe_id).first()
    if not recipe:
        return {"message": "Not found"}

    db.delete(recipe)
    db.commit()
    return {"message": "Deleted"}
