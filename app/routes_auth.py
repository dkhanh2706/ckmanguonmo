from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from . import models, schemas
from .database import get_db
from .auth_utils import hash_password, verify_password

# Biến router PHẢI tên là "router"
router = APIRouter(
    prefix="/api/auth",
    tags=["Auth"],
)


# =========================
# AUTH: REGISTER / LOGIN
# =========================
@router.post("/register", response_model=schemas.UserOut)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == user_in.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email đã tồn tại",
        )

    user = models.User(
        email=user_in.email,
        full_name=user_in.full_name,
        hashed_password=hash_password(user_in.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login")
def login(data: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == data.email).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sai email hoặc mật khẩu",
        )

    # Trả JSON cho frontend lưu localStorage
    return {
        "message": "Đăng nhập thành công",
        "user": {"id": user.id, "email": user.email, "full_name": user.full_name},
    }


# =========================
# FORGOT PASSWORD (STEP 1)
# =========================
@router.post("/forgot-password")
def forgot_password(email: str, db: Session = Depends(get_db)):
    """
    Demo: Nhận email qua query param:
    POST /api/auth/forgot-password?email=abc@gmail.com

    Thực tế thường sẽ gửi email kèm token reset,
    nhưng demo thì chỉ xác nhận email tồn tại.
    """
    email = (email or "").strip().lower()
    if not email:
        raise HTTPException(status_code=422, detail="Thiếu email")

    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy tài khoản với email này",
        )

    return {
        "message": "Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi (demo)."
    }


# =========================
# RESET PASSWORD (STEP 2)
# =========================
class ResetPasswordIn(BaseModel):
    email: EmailStr
    new_password: str


@router.post("/reset-password")
def reset_password(data: ResetPasswordIn, db: Session = Depends(get_db)):
    """
    Đổi mật khẩu trực tiếp (demo).
    Frontend gửi JSON:
    {
      "email": "abc@gmail.com",
      "new_password": "123456"
    }
    """
    new_password = (data.new_password or "").strip()
    if len(new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu mới phải có ít nhất 6 ký tự",
        )

    user = db.query(models.User).filter(models.User.email == str(data.email)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy tài khoản với email này",
        )

    user.hashed_password = hash_password(new_password)
    db.add(user)
    db.commit()

    return {"message": "Đổi mật khẩu thành công (demo). Bạn có thể đăng nhập lại."}
