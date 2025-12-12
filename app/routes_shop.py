# app/routes_shop.py

from fastapi import (
    APIRouter,
    Depends,
    UploadFile,
    File,
    Form,
    HTTPException,
)
from sqlalchemy.orm import Session
from app.database import get_db
from app import models

import os
import uuid
import shutil

router = APIRouter(prefix="/api/shop", tags=["Shop"])

# Thư mục lưu ảnh sản phẩm
UPLOAD_DIR = "static/uploads/products"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def save_image(file: UploadFile | None) -> str | None:
    """Lưu file upload và trả về tên file (hoặc None nếu không có)."""
    if not file:
        return None

    # Sinh tên file ngẫu nhiên để tránh trùng
    ext = file.filename.split(".")[-1]
    filename = f"{uuid.uuid4().hex}.{ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return filename


def image_url(filename: str | None) -> str | None:
    """Trả về đường dẫn cho FE, nếu không có ảnh thì trả về None."""
    if not filename:
        return None
    # lưu trong DB chỉ là tên file, FE sẽ truy cập /static/uploads/products/<file>
    return f"/static/uploads/products/{filename}"


# =========================================
# READ: Lấy danh sách sản phẩm
# =========================================
@router.get("/products")
def list_products(db: Session = Depends(get_db)):
    products = db.query(models.Product).order_by(models.Product.id.desc()).all()

    # Trả về JSON cho FE, convert image thành URL đầy đủ
    return [
        {
            "id": p.id,
            "name": p.name,
            "price": p.price,
            "unit": p.unit,
            "badge": p.badge,
            "image": image_url(p.image),
        }
        for p in products
    ]


# =========================================
# READ: Lấy chi tiết 1 sản phẩm
# =========================================
@router.get("/products/{product_id}")
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = (
        db.query(models.Product)
        .filter(models.Product.id == product_id)
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    return {
        "id": product.id,
        "name": product.name,
        "price": product.price,
        "unit": product.unit,
        "badge": product.badge,
        "image": image_url(product.image),
    }


# =========================================
# CREATE: Thêm sản phẩm mới
# =========================================
@router.post("/products")
async def create_product(
    name: str = Form(...),
    price: int = Form(...),
    unit: str | None = Form(None),
    badge: str | None = Form(None),
    image: UploadFile | None = File(None),
    db: Session = Depends(get_db),
):
    filename = save_image(image)

    product = models.Product(
        name=name,
        price=price,
        unit=unit,
        badge=badge,
        image=filename,
    )
    db.add(product)
    db.commit()
    db.refresh(product)

    return {
        "message": "Created",
        "id": product.id,
        "image": image_url(product.image),
    }


# =========================================
# UPDATE: Sửa sản phẩm
# =========================================
@router.put("/products/{product_id}")
async def update_product(
    product_id: int,
    name: str = Form(...),
    price: int = Form(...),
    unit: str | None = Form(None),
    badge: str | None = Form(None),
    image: UploadFile | None = File(None),
    db: Session = Depends(get_db),
):
    product = (
        db.query(models.Product)
        .filter(models.Product.id == product_id)
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    product.name = name
    product.price = price
    product.unit = unit
    product.badge = badge

    # Nếu có file mới thì lưu + cập nhật
    if image:
        filename = save_image(image)
        product.image = filename

    db.commit()
    db.refresh(product)

    return {
        "message": "Updated",
        "id": product.id,
        "image": image_url(product.image),
    }


# =========================================
# DELETE: Xoá sản phẩm
# =========================================
@router.delete("/products/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db)):
    product = (
        db.query(models.Product)
        .filter(models.Product.id == product_id)
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    db.delete(product)
    db.commit()
    return {"message": "Deleted"}
