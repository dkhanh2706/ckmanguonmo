from sqlalchemy import Column, Integer, String, Text, DateTime, func
from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)


class Recipe(Base):
    __tablename__ = "recipes"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)          # Tên món ăn
    ingredients = Column(Text, nullable=False)           # Nguyên liệu (chuỗi dài)
    steps = Column(Text, nullable=False)                 # Các bước nấu
    image = Column(String(255), nullable=True)           # Đường dẫn ảnh
    note = Column(String(255), nullable=True)            # Ghi chú: thời gian nấu, độ khó
    category = Column(String(100), nullable=True)        # healthy, chay, keto, canh, chiên...


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    # Tên sản phẩm / nguyên liệu
    name = Column(String(200), nullable=False)
    # Giá (lưu dạng số nguyên VND, ví dụ 185000)
    price = Column(Integer, nullable=False)
    # Đơn vị tính: kg, gói, chai, bao,...
    unit = Column(String(50), nullable=True)
    # Lưu tên file ảnh (vd: "abc123.jpg"), FE sẽ truy cập /static/uploads/products/<tên_file>
    image = Column(String(255), nullable=True)
    # Nhãn hiển thị: "Bán chạy", "Healthy", "Ưu đãi", ...
    badge = Column(String(50), nullable=True)
    # Thời gian tạo bản ghi
    created_at = Column(DateTime(timezone=True), server_default=func.now())
