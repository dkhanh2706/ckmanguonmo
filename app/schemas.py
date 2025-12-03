from pydantic import BaseModel, EmailStr


# ===========================
# USER SCHEMAS
# ===========================
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


# ===========================
# RECIPE SCHEMAS
# ===========================
class RecipeBase(BaseModel):
    title: str
    ingredients: str
    steps: str
    note: str | None = None
    category: str | None = None  # healthy, chay, keto, canh...


class RecipeCreate(RecipeBase):
    pass


class RecipeOut(RecipeBase):
    id: int
    image: str | None = None

    class Config:
        from_attributes = True
