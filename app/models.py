from sqlalchemy import Column, Integer, String, Text
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
