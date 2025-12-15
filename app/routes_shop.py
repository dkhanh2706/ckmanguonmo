from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from pathlib import Path

from .database import get_db
from .models import Product, Order, OrderItem

router = APIRouter(prefix="/api/shop", tags=["Shop"])

# CKMANGUONMO/static/img (vì __file__ = CKMANGUONMO/app/routes_shop.py)
STATIC_IMG_DIR = Path(__file__).resolve().parent.parent / "static" / "img"


def to_int(v, default=0) -> int:
    try:
        return int(v)
    except Exception:
        return default


def image_url(img: str | None):
    """
    Chuẩn hóa đường dẫn ảnh từ DB:
      - '/static/...' => giữ nguyên
      - 'img/xxx.jpg' => '/static/img/xxx.jpg'
      - 'imgshop1.jpg' => '/static/img/imgshop1.jpg'
    """
    if not img:
        return None

    img = str(img).strip()

    if img.startswith("/static/"):
        return img

    if img.startswith("img/"):
        return "/static/" + img

    if "/" not in img:
        return "/static/img/" + img

    return img


def default_shop_image(product_id: int) -> str | None:
    """
    Fallback theo id sản phẩm: imgshop1..imgshop6 (xoay vòng).
    Tự dò đúng extension file đang có (jpg/png/...)
    """
    idx = ((product_id - 1) % 6) + 1
    for ext in ("jpg", "png", "jpeg", "webp"):
        fname = f"imgshop{idx}.{ext}"
        if (STATIC_IMG_DIR / fname).exists():
            return f"/static/img/{fname}"
    return None


@router.get("/products")
def get_products(db: Session = Depends(get_db)):
    rows = db.query(Product).order_by(Product.id.asc()).all()

    data = []
    for p in rows:
        db_img = getattr(p, "image", None)  # có cũng được, không có cũng ok
        img = image_url(db_img)

        # ✅ nếu DB không có/đang sai => dùng imgshop1..6
        if not img:
            img = default_shop_image(p.id)

        data.append(
            {
                "id": p.id,
                "name": p.name,
                "price": to_int(getattr(p, "price", 0)),
                "unit": getattr(p, "unit", None),
                "badge": getattr(p, "badge", None),
                "image": img,  # ✅ luôn trả ra /static/img/...
            }
        )
    return data


@router.post("/orders")
def create_order(payload: dict, db: Session = Depends(get_db)):
    items = payload.get("items") or []
    if not items:
        raise HTTPException(status_code=400, detail="Giỏ hàng trống")

    norm_items = []
    for it in items:
        pid = to_int(it.get("product_id"), 0)
        qty = to_int(it.get("qty"), 0)
        if pid <= 0 or qty <= 0:
            raise HTTPException(status_code=400, detail="Dữ liệu sản phẩm không hợp lệ")
        norm_items.append({"product_id": pid, "qty": qty})

    product_ids = [i["product_id"] for i in norm_items]
    products = db.query(Product).filter(Product.id.in_(product_ids)).all()
    prod_map = {p.id: p for p in products}

    missing = [pid for pid in product_ids if pid not in prod_map]
    if missing:
        raise HTTPException(status_code=400, detail=f"Sản phẩm không tồn tại: {missing}")

    total = 0
    for it in norm_items:
        p = prod_map[it["product_id"]]
        total += it["qty"] * to_int(getattr(p, "price", 0))

    try:
        order = Order(
            customer_name=payload.get("customer_name") or "Khách lẻ",
            note=payload.get("note") or "Đơn tạo từ /shopping-list",
            total_price=total,
        )
        db.add(order)
        db.flush()

        # schema order_items: product_name, unit_price, quantity
        for it in norm_items:
            p = prod_map[it["product_id"]]
            db.add(
                OrderItem(
                    order_id=order.id,
                    product_id=p.id,
                    product_name=p.name,
                    unit_price=to_int(p.price),
                    quantity=it["qty"],
                )
            )

        db.commit()
        return {"order_id": order.id, "total_price": to_int(order.total_price)}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/orders")
def list_orders(db: Session = Depends(get_db)):
    orders = db.query(Order).order_by(Order.id.desc()).all()
    result = []

    for o in orders:
        items = (
            db.query(OrderItem)
            .filter(OrderItem.order_id == o.id)
            .order_by(OrderItem.id.asc())
            .all()
        )
        result.append(
            {
                "id": o.id,
                "customer_name": getattr(o, "customer_name", None),
                "note": getattr(o, "note", None),
                "total_price": to_int(getattr(o, "total_price", 0)),
                "created_at": getattr(o, "created_at", None),
                "items": [
                    {
                        "id": it.id,
                        "product_id": it.product_id,
                        "product_name": it.product_name,
                        "unit_price": to_int(it.unit_price),
                        "quantity": to_int(it.quantity),
                    }
                    for it in items
                ],
            }
        )

    return result


@router.delete("/orders/{order_id}", status_code=204)
def delete_order(order_id: int, db: Session = Depends(get_db)):
    o = db.query(Order).filter(Order.id == order_id).first()
    if not o:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")

    try:
        db.delete(o)
        db.commit()
        return Response(status_code=204)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
