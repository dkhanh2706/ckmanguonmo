from typing import Literal
from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    email: EmailStr
    full_name: str | None = None


class UserCreate(UserBase):
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(UserBase):
    id: int

    class Config:
        from_attributes = True


class RecipeBase(BaseModel):
    title: str
    ingredients: str
    steps: str
    note: str | None = None
    category: str | None = None


class RecipeCreate(RecipeBase):
    pass


class RecipeOut(RecipeBase):
    id: int
    image: str | None = None

    class Config:
        from_attributes = True


class RecipeOutWithSource(RecipeOut):
    source: Literal["student", "gym"]
