from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from .database import Base, engine, SessionLocal
from . import models

# Routers
from .routes_auth import router as auth_router
from .routes_recipes import router as recipes_router
from .routes_default_recipes import router as default_recipes_router
from .routes_student_planner import router as student_planner_router
from .routes_gym_planner import router as gym_planner_router
from .routes_shop import router as shop_router
from .routes_planner import router as planner_router


app = FastAPI(title="Yuki Meal Planner")

# =========================
# Static + Templates
# =========================
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")


# =========================
# Startup: create tables + seed data
# =========================
@app.on_event("startup")
def on_startup():
    # Create tables
    Base.metadata.create_all(bind=engine)

    # Seed (chỉ thêm khi DB trống)
    db = SessionLocal()
    try:
        if db.query(models.Recipe).count() == 0:
            db.add_all(
                [
                    models.Recipe(
                        title="Cơm chiên trứng",
                        ingredients="Cơm nguội; Trứng; Hành lá; Nước mắm; Dầu ăn",
                        steps="1) Đánh trứng\n2) Phi hành\n3) Cho cơm vào đảo\n4) Thêm trứng\n5) Nêm nếm",
                        note="15 phút - Dễ",
                        category="chiên",
                        image=None,
                    ),
                    models.Recipe(
                        title="Canh rau cải thịt bằm",
                        ingredients="Rau cải; Thịt bằm; Hành tím; Muối; Tiêu",
                        steps="1) Phi hành\n2) Xào thịt\n3) Cho nước + rau\n4) Nêm nếm",
                        note="20 phút - Dễ",
                        category="canh",
                        image=None,
                    ),
                ]
            )
            db.commit()

        if db.query(models.Product).count() == 0:
            db.add_all(
                [
                    models.Product(
                        name="Ức gà fillet 1kg",
                        price=89000,
                        unit="gói",
                        image=None,
                        badge="Gym",
                    ),
                    models.Product(
                        name="Dầu olive Extra Virgin 500ml",
                        price=145000,
                        unit="chai",
                        image=None,
                        badge="Ưu đãi",
                    ),
                ]
            )
            db.commit()
    finally:
        db.close()


# =========================
# Include routers (API)
# =========================
app.include_router(auth_router)
app.include_router(recipes_router)  # /api/recipes + /api/recipes/{id}/reviews (nếu bạn đặt trong routes_recipes.py)
app.include_router(default_recipes_router)
app.include_router(student_planner_router)
app.include_router(gym_planner_router)
app.include_router(shop_router)
app.include_router(planner_router)


# =========================
# Pages (HTML)
# =========================
@app.get("/", response_class=HTMLResponse)
def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/recipes", response_class=HTMLResponse)
def page_recipes(request: Request):
    return templates.TemplateResponse("recipes_list.html", {"request": request})


@app.get("/recipes/new", response_class=HTMLResponse)
def page_recipe_add(request: Request):
    return templates.TemplateResponse("recipe_add.html", {"request": request})


@app.get("/recipes/{recipe_id}/edit", response_class=HTMLResponse)
def page_recipe_edit(request: Request, recipe_id: int):
    return templates.TemplateResponse(
        "recipe_edit.html",
        {"request": request, "recipe_id": recipe_id},
    )


@app.get("/meal-planner", response_class=HTMLResponse)
def page_meal_planner(request: Request):
    return templates.TemplateResponse("meal_planner.html", {"request": request})


@app.get("/shopping-list", response_class=HTMLResponse)
def page_shopping_list(request: Request):
    return templates.TemplateResponse("shopping_list.html", {"request": request})


@app.get("/order-history", response_class=HTMLResponse)
def page_order_history(request: Request):
    return templates.TemplateResponse("order_history.html", {"request": request})
