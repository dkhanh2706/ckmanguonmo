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
from pydantic import BaseModel

from app.database import get_db
from app import models

import os
import uuid
import shutil

router = APIRouter(prefix="/api/shop", tags=["Shop"])

# Thư mục lưu ảnh sản phẩm
UPLOAD_DIR = "static/uploads/products"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# =========================
#     TIỆN ÍCH ẢNH
# =========================
def save_image(file: UploadFile | None) -> str | None:
    """Lưu file upload và trả về tên file (hoặc None nếu không có)."""
    if not file:
        return None

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
    return f"/static/uploads/products/{filename}"


# =========================
#     PRODUCT CRUD
# =========================

@router.get("/products")
def list_products(db: Session = Depends(get_db)):
    products = db.query(models.Product).order_by(models.Product.id.desc()).all()

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


# =========================
#     ORDER MODEL (input)
# =========================

class OrderItemIn(BaseModel):
    product_id: int
    qty: int


class OrderCreate(BaseModel):
    customer_name: str | None = None
    note: str | None = None
    items: list[OrderItemIn]


# =========================
#     ORDER API
# =========================

@router.post("/orders")
def create_order(payload: OrderCreate, db: Session = Depends(get_db)):
    if not payload.items:
        raise HTTPException(status_code=400, detail="Giỏ hàng trống")

    # Lấy tất cả product cần dùng
    product_ids = [item.product_id for item in payload.items]
    products = (
        db.query(models.Product)
        .filter(models.Product.id.in_(product_ids))
        .all()
    )
    product_map = {p.id: p for p in products}

    # Kiểm tra thiếu sản phẩm nào không
    missing_ids = [pid for pid in product_ids if pid not in product_map]
    if missing_ids:
        raise HTTPException(
            status_code=404,
            detail=f"Sản phẩm không tồn tại: {missing_ids}",
        )

    total_price = 0
    order_items = []

    for item in payload.items:
        prod = product_map[item.product_id]
        line_total = prod.price * item.qty
        total_price += line_total

        oi = models.OrderItem(
            product_id=prod.id,
            product_name=prod.name,
            unit_price=prod.price,
            quantity=item.qty,
        )
        order_items.append(oi)

    order = models.Order(
        customer_name=payload.customer_name or "Khách lẻ",
        note=payload.note or "Đơn tạo từ /shopping-list",
        total_price=total_price,
        items=order_items,
    )

    db.add(order)
    db.commit()
    db.refresh(order)

    return {
        "message": "Order created",
        "order_id": order.id,
        "total_price": total_price,
    }


@router.get("/orders")
def list_orders(db: Session = Depends(get_db)):
    orders = (
        db.query(models.Order)
        .order_by(models.Order.id.desc())
        .all()
    )

    result = []
    for o in orders:
        result.append(
            {
                "id": o.id,
                "customer_name": o.customer_name,
                "note": o.note,
                "total_price": o.total_price,
                "created_at": o.created_at,
                "items": [
                    {
                        "product_name": i.product_name,
                        "unit_price": i.unit_price,
                        "quantity": i.quantity,
                    }
                    for i in o.items
                ],
            }
        )
    return result
