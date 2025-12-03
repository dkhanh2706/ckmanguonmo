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

# Static files (CSS, JS, images)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Thư mục templates
templates = Jinja2Templates(directory="templates")

# Include các API auth (register, login, forgot-password)
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


# ======================
#   PAGES TÍNH NĂNG (link từ Trang chủ)
# ======================

@app.get("/features/weekly-planner", response_class=HTMLResponse)
def page_weekly_planner():
    """
    Trang giới thiệu 'Lập kế hoạch hàng tuần'.
    Hiện tạm nội dung đơn giản để tránh lỗi template,
    sau này bạn có thể thay bằng TemplateResponse riêng.
    """
    html = """
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8">
        <title>Lập kế hoạch hàng tuần</title>
    </head>
    <body>
        <h1>Lập kế hoạch hàng tuần</h1>
        <p>Trang chi tiết tính năng lập kế hoạch tuần – sẽ phát triển sau.</p>
        <p><a href="/">← Quay lại trang chủ</a></p>
    </body>
    </html>
    """
    return HTMLResponse(content=html)


@app.get("/features/recipe-library", response_class=HTMLResponse)
def page_recipe_library():
    """Trang giới thiệu 'Thư viện công thức' (placeholder)."""
    html = """
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8">
        <title>Thư viện công thức</title>
    </head>
    <body>
        <h1>Thư viện công thức</h1>
        <p>Trang chi tiết Thư viện công thức – sẽ phát triển sau.</p>
        <p><a href="/">← Quay lại trang chủ</a></p>
    </body>
    </html>
    """
    return HTMLResponse(content=html)


@app.get("/features/shopping-list", response_class=HTMLResponse)
def page_shopping_list():
    """Trang giới thiệu 'Danh sách mua sắm' (placeholder)."""
    html = """
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8">
        <title>Danh sách mua sắm</title>
    </head>
    <body>
        <h1>Danh sách mua sắm</h1>
        <p>Trang chi tiết Danh sách mua sắm - sẽ phát triển sau.</p>
        <p><a href="/">← Quay lại trang chủ</a></p>
    </body>
    </html>
    """
    return HTMLResponse(content=html)
