from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app import models

import shutil
import uuid
import os

# ✅ NEW: send mail
import smtplib
from email.message import EmailMessage
from datetime import datetime

router = APIRouter(prefix="/api/recipes", tags=["Recipes"])

UPLOAD_DIR = "static/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def make_image_url(filename: str | None):
    if not filename:
        return None
    # nếu lưu "/static/..." thì giữ nguyên
    if filename.startswith("/static/"):
        return filename
    # nếu lưu "static/..." thì thêm /
    if filename.startswith("static/"):
        return "/" + filename
    # nếu lưu filename trần (uuid_filename) thì map vào uploads
    return f"/static/uploads/{filename}"


# ✅ NEW: send review email via Gmail SMTP
def send_review_email(
    *,
    recipe_title: str,
    recipe_id: int,
    rating: int,
    reviewer_name: str,
    comment: str,
):
    # bật/tắt bằng env
    if os.getenv("MAIL_ENABLED", "0") != "1":
        return

    host = os.getenv("MAIL_HOST", "smtp.gmail.com")
    port = int(os.getenv("MAIL_PORT", "465"))
    user = os.getenv("MAIL_USER", "")
    password = os.getenv("MAIL_PASS", "")
    mail_to = os.getenv("MAIL_TO", "")
    mail_from = os.getenv("MAIL_FROM", user)

    # thiếu config thì bỏ qua (không làm hỏng chức năng review)
    if not (user and password and mail_to):
        print("MAIL CONFIG MISSING: check MAIL_USER/MAIL_PASS/MAIL_TO in .env")
        return

    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    subject = f"[Yuki Meal Planner] Review mới: {recipe_title} ({rating}★)"
    body = f"""Bạn vừa nhận được 1 đánh giá mới.

Món: {recipe_title}
Recipe ID: {recipe_id}
Số sao: {rating}/5
Người đánh giá: {reviewer_name}
Nhận xét: {comment or "(không có)"}
Thời gian: {now}
"""

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = mail_from
    msg["To"] = mail_to
    msg.set_content(body)

    # Gmail SSL 465
    with smtplib.SMTP_SSL(host, port) as smtp:
        smtp.login(user, password)
        smtp.send_message(msg)


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
        image=saved_filename,
    )

    db.add(recipe)
    db.commit()
    db.refresh(recipe)

    return {"message": "Created", "id": recipe.id}


# =========================================
# READ ALL (kèm avg_rating + review_count)
# =========================================
@router.get("/")
def list_recipes(db: Session = Depends(get_db), category: str | None = None):
    q = db.query(models.Recipe)
    if category:
        q = q.filter(models.Recipe.category == category)

    recipes = q.all()
    ids = [r.id for r in recipes]

    stats = {}
    if ids:
        rows = (
            db.query(
                models.RecipeReview.recipe_id.label("recipe_id"),
                func.avg(models.RecipeReview.rating).label("avg_rating"),
                func.count(models.RecipeReview.id).label("review_count"),
            )
            .filter(models.RecipeReview.recipe_id.in_(ids))
            .group_by(models.RecipeReview.recipe_id)
            .all()
        )
        for row in rows:
            stats[int(row.recipe_id)] = {
                "avg_rating": float(row.avg_rating or 0),
                "review_count": int(row.review_count or 0),
            }

    result = []
    for r in recipes:
        st = stats.get(r.id, {"avg_rating": 0.0, "review_count": 0})
        result.append(
            {
                "id": r.id,
                "title": r.title,
                "ingredients": r.ingredients,
                "steps": r.steps,
                "note": r.note,
                "category": r.category,
                "image": make_image_url(r.image),
                "avg_rating": round(float(st["avg_rating"]), 2),
                "review_count": int(st["review_count"]),
            }
        )
    return result


# =========================================
# READ ONE
# =========================================
@router.get("/{recipe_id}")
def get_recipe(recipe_id: int, db: Session = Depends(get_db)):
    r = db.query(models.Recipe).filter(models.Recipe.id == recipe_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Recipe not found")

    st = (
        db.query(
            func.avg(models.RecipeReview.rating).label("avg_rating"),
            func.count(models.RecipeReview.id).label("review_count"),
        )
        .filter(models.RecipeReview.recipe_id == recipe_id)
        .first()
    )

    return {
        "id": r.id,
        "title": r.title,
        "ingredients": r.ingredients,
        "steps": r.steps,
        "note": r.note,
        "category": r.category,
        "image": make_image_url(r.image),
        "avg_rating": round(float(st.avg_rating or 0), 2),
        "review_count": int(st.review_count or 0),
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
        raise HTTPException(status_code=404, detail="Recipe not found")

    recipe.title = title
    recipe.ingredients = ingredients
    recipe.steps = steps
    recipe.note = note
    recipe.category = category

    if image:
        new_filename = f"{uuid.uuid4().hex}_{image.filename}"
        file_path = os.path.join(UPLOAD_DIR, new_filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
        recipe.image = new_filename

    db.commit()
    return {"message": "Updated", "image": make_image_url(recipe.image)}


# =========================================
# DELETE
# =========================================
@router.delete("/{recipe_id}")
def delete_recipe(recipe_id: int, db: Session = Depends(get_db)):
    recipe = db.query(models.Recipe).filter(models.Recipe.id == recipe_id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    db.delete(recipe)
    db.commit()
    return {"message": "Deleted"}


# =========================================
# REVIEWS: LIST
# =========================================
@router.get("/{recipe_id}/reviews")
def list_reviews(recipe_id: int, db: Session = Depends(get_db)):
    r = db.query(models.Recipe).filter(models.Recipe.id == recipe_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Recipe not found")

    reviews = (
        db.query(models.RecipeReview)
        .filter(models.RecipeReview.recipe_id == recipe_id)
        .order_by(models.RecipeReview.created_at.desc())
        .all()
    )

    st = (
        db.query(
            func.avg(models.RecipeReview.rating).label("avg_rating"),
            func.count(models.RecipeReview.id).label("review_count"),
        )
        .filter(models.RecipeReview.recipe_id == recipe_id)
        .first()
    )

    return {
        "recipe_id": recipe_id,
        "avg_rating": round(float(st.avg_rating or 0), 2),
        "review_count": int(st.review_count or 0),
        "reviews": [
            {
                "id": rv.id,
                "reviewer_name": rv.reviewer_name or "Ẩn danh",
                "rating": rv.rating,
                "comment": rv.comment or "",
                "created_at": rv.created_at.isoformat() if rv.created_at else None,
            }
            for rv in reviews
        ],
    }


# =========================================
# REVIEWS: CREATE (✅ gửi mail thật)
# =========================================
@router.post("/{recipe_id}/reviews")
def create_review(
    recipe_id: int,
    rating: int = Form(...),
    comment: str = Form(""),
    reviewer_name: str = Form("Ẩn danh"),
    db: Session = Depends(get_db),
):
    if rating < 1 or rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be 1..5")

    r = db.query(models.Recipe).filter(models.Recipe.id == recipe_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Recipe not found")

    rv = models.RecipeReview(
        recipe_id=recipe_id,
        rating=rating,
        comment=comment,
        reviewer_name=reviewer_name,
    )

    db.add(rv)
    db.commit()
    db.refresh(rv)

    # ✅ Gửi email (nếu lỗi mail vẫn trả OK cho user)
    try:
        send_review_email(
            recipe_title=r.title,
            recipe_id=recipe_id,
            rating=rating,
            reviewer_name=reviewer_name,
            comment=comment,
        )
    except Exception as e:
        print("MAIL ERROR:", e)

    return {"message": "Review created", "id": rv.id}
