from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from .database import Base, engine, SessionLocal
from . import models

from .routes_auth import router as auth_router
from .routes_recipes import router as recipes_router
from .routes_default_recipes import router as default_recipes_router
from .routes_student_planner import router as student_planner_router
from .routes_gym_planner import router as gym_planner_router
from .routes_shop import router as shop_router
from .routes_planner import router as planner_router  # ✅ thêm


app = FastAPI()

# Tạo bảng nếu chưa có
Base.metadata.create_all(bind=engine)

# STATIC & TEMPLATE
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")


@app.on_event("startup")
def seed_sample_data():
    db = SessionLocal()
    try:
        if db.query(models.Recipe).count() == 0:
            sample_recipes = [
                models.Recipe(
                    title="Cơm chiên trứng",
                    ingredients="Cơm trắng; Trứng gà; Hành lá; Nước mắm; Dầu ăn",
                    steps="1. Đánh trứng.\n2. Phi hành.\n3. Cho cơm vào chiên.\n4. Nêm gia vị.",
                    note="15 phút - Dễ",
                    category="chiên",
                    image="static/img/default_recipe.jpg",
                ),
                models.Recipe(
                    title="Canh rau cải thịt bằm",
                    ingredients="Rau cải; Thịt bằm; Hành tím; Muối; Tiêu",
                    steps="1. Phi hành.\n2. Xào thịt.\n3. Cho nước + rau.\n4. Nêm nếm.",
                    note="20 phút - Dễ",
                    category="canh",
                    image="static/img/default_recipe.jpg",
                ),
                models.Recipe(
                    title="Salad ức gà healthy",
                    ingredients="Ức gà; Xà lách; Dưa leo; Cà chua; Dầu olive",
                    steps="1. Luộc ức gà.\n2. Cắt rau.\n3. Trộn sốt.",
                    note="25 phút - Healthy",
                    category="healthy",
                    image="static/img/default_recipe.jpg",
                ),
            ]
            db.add_all(sample_recipes)

        if db.query(models.Product).count() == 0:
            sample_products = [
                models.Product(name="Gạo ST25 5kg", price=185000, unit="bao", badge="Bán chạy", image=None),
                models.Product(name="Ức gà fillet 1kg", price=89000, unit="kg", badge="Healthy", image=None),
                models.Product(name="Dầu olive 500ml", price=145000, unit="chai", badge="Ưu đãi", image=None),
                models.Product(name="Yến mạch 1kg", price=76000, unit="gói", badge="Gym", image=None),
            ]
            db.add_all(sample_products)

        db.commit()
    finally:
        db.close()


# ============================
#   API ROUTERS
# ============================
app.include_router(auth_router)
app.include_router(recipes_router)
app.include_router(default_recipes_router)
app.include_router(student_planner_router)
app.include_router(gym_planner_router)
app.include_router(shop_router)
app.include_router(planner_router)  # ✅ quan trọng để có /planner/week /planner/slot


# ============================
#   HTML PAGES
# ============================
@app.get("/", response_class=HTMLResponse)
def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/login", response_class=HTMLResponse)
def page_login(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})


@app.get("/register", response_class=HTMLResponse)
def page_register(request: Request):
    return templates.TemplateResponse("register.html", {"request": request})


@app.get("/forgot-password", response_class=HTMLResponse)
def page_forgot(request: Request):
    return templates.TemplateResponse("forgot.html", {"request": request})


@app.get("/recipes", response_class=HTMLResponse)
def page_recipes(request: Request):
    return templates.TemplateResponse("recipes_list.html", {"request": request, "page_title": "Công thức nấu ăn"})


@app.get("/recipes/new", response_class=HTMLResponse)
def page_recipe_new(request: Request):
    return templates.TemplateResponse("recipe_add.html", {"request": request})


@app.get("/recipes/{recipe_id}/edit", response_class=HTMLResponse)
def page_recipe_edit(request: Request, recipe_id: int):
    return templates.TemplateResponse("recipe_edit.html", {"request": request, "recipe_id": recipe_id})


@app.get("/meal-planner", response_class=HTMLResponse)
def page_meal_planner(request: Request):
    return templates.TemplateResponse("meal_planner.html", {"request": request, "page_title": "Lịch ăn uống hằng tuần"})


@app.get("/shopping-list", response_class=HTMLResponse)
def page_shopping_list(request: Request):
    return templates.TemplateResponse("shopping_list.html", {"request": request, "page_title": "Cửa hàng & Danh sách mua sắm"})


@app.get("/order-history", response_class=HTMLResponse)
def page_order_history(request: Request):
    return templates.TemplateResponse("order_history.html", {"request": request, "page_title": "Lịch sử mua hàng"})
