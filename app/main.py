from pathlib import Path
import os

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

# =========================
# LOAD .env (RẤT QUAN TRỌNG)
# =========================
# File này nằm ở: CKMANGUONMO/app/main.py
# .env nằm ở: CKMANGUONMO/.env
ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / ".env")

# =========================
# DB + Models
# =========================
from .database import Base, engine
from . import models  # noqa: F401

# =========================
# Routers
# =========================
from .routes_auth import router as auth_router
from .routes_recipes import router as recipes_router
from .routes_default_recipes import router as default_recipes_router
from .routes_student_planner import router as student_planner_router
from .routes_gym_planner import router as gym_planner_router
from .routes_shop import router as shop_router
from .routes_planner import router as planner_router

# =========================
# App
# =========================
app = FastAPI(title="CK Mang Nguon Mo")

# =========================
# Paths
# =========================
STATIC_DIR = ROOT_DIR / "static"
TEMPLATES_DIR = ROOT_DIR / "templates"

if not STATIC_DIR.exists():
    raise RuntimeError(f"Static directory not found: {STATIC_DIR}")
if not TEMPLATES_DIR.exists():
    raise RuntimeError(f"Templates directory not found: {TEMPLATES_DIR}")

# =========================
# Static + Templates
# =========================
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
templates = Jinja2Templates(directory=str(TEMPLATES_DIR))

# =========================
# Startup: create DB tables
# =========================
@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)

# =========================
# Include routers
# =========================
app.include_router(auth_router)
app.include_router(recipes_router)
app.include_router(default_recipes_router)
app.include_router(student_planner_router)
app.include_router(gym_planner_router)
app.include_router(shop_router)
app.include_router(planner_router)

# =========================
# Pages (HTML)
# =========================
@app.get("/", response_class=HTMLResponse)
def page_index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/login", response_class=HTMLResponse)
def page_login(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})


@app.get("/register", response_class=HTMLResponse)
def page_register(request: Request):
    return templates.TemplateResponse("register.html", {"request": request})


@app.get("/forgot", response_class=HTMLResponse)
def page_forgot(request: Request):
    return templates.TemplateResponse("forgot.html", {"request": request})


@app.get("/meal-planner", response_class=HTMLResponse)
def page_meal_planner(request: Request):
    return templates.TemplateResponse("meal_planner.html", {"request": request})


@app.get("/shopping-list", response_class=HTMLResponse)
def page_shopping_list(request: Request):
    return templates.TemplateResponse("shopping_list.html", {"request": request})


@app.get("/order-history", response_class=HTMLResponse)
def page_order_history(request: Request):
    return templates.TemplateResponse("order_history.html", {"request": request})


@app.get("/nutrition", response_class=HTMLResponse)
def page_nutrition(request: Request):
    return templates.TemplateResponse("nutrition.html", {"request": request})


@app.get("/recipes", response_class=HTMLResponse)
def page_recipes_list(request: Request):
    return templates.TemplateResponse("recipes_list.html", {"request": request})


@app.get("/recipes/add", response_class=HTMLResponse)
def page_recipe_add(request: Request):
    return templates.TemplateResponse("recipe_add.html", {"request": request})


@app.get("/recipes/edit/{recipe_id}", response_class=HTMLResponse)
def page_recipe_edit(request: Request, recipe_id: int):
    return templates.TemplateResponse(
        "recipe_edit.html",
        {"request": request, "recipe_id": recipe_id},
    )
