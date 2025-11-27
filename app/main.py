from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from .database import Base, engine
from . import models
from .routes_auth import router as auth_router

# Khởi tạo bảng trong PostgreSQL
Base.metadata.create_all(bind=engine)

app = FastAPI()

# Mount static folder (CSS, JS, images)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Setup template folder
templates = Jinja2Templates(directory="templates")

# Include API routes (register, login, forgot-password)
app.include_router(auth_router)


# ======================
#       HTML PAGES
# ======================

@app.get("/", response_class=HTMLResponse)
def home(request: Request):
    """Trang chủ"""
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/login", response_class=HTMLResponse)
def page_login(request: Request):
    """Trang đăng nhập"""
    return templates.TemplateResponse("login.html", {"request": request})


@app.get("/register", response_class=HTMLResponse)
def page_register(request: Request):
    """Trang đăng ký"""
    return templates.TemplateResponse("register.html", {"request": request})


@app.get("/forgot-password", response_class=HTMLResponse)
def page_forgot(request: Request):
    """Trang quên mật khẩu"""
    return templates.TemplateResponse("forgot.html", {"request": request})
