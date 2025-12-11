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

# ============================
#   KHỞI TẠO APP + DATABASE
# ============================
app = FastAPI()

Base.metadata.create_all(bind=engine)

# STATIC & TEMPLATE
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")


# ============================
#   SEED DATA DEMO
# ============================
@app.on_event("startup")
def seed_sample_recipes():
    db = SessionLocal()
    try:
        count = db.query(models.Recipe).count()
        if count == 0:
            sample_recipes = [
                models.Recipe(
                    title="Cơm chiên trứng",
                    ingredients="Cơm trắng; Trứng gà; Hành lá; Nước mắm; Dầu ăn",
                    steps=(
                        "1. Đánh trứng.\n"
                        "2. Phi hành cho thơm.\n"
                        "3. Xào trứng và cho cơm vào chiên.\n"
                        "4. Nêm lại gia vị."
                    ),
                    note="Thời gian: 15 phút, Độ khó: Dễ",
                    category="chiên",
                    image=None,
                ),
                models.Recipe(
                    title="Canh rau cải thịt bằm",
                    ingredients="Rau cải; Thịt bằm; Hành tím; Muối; Tiêu",
                    steps=(
                        "1. Phi hành.\n"
                        "2. Xào thịt.\n"
                        "3. Cho nước + rau cải.\n"
                        "4. Nêm nếm."
                    ),
                    note="Thời gian: 20 phút, Độ khó: Dễ",
                    category="canh",
                    image=None,
                ),
                models.Recipe(
                    title="Salad ức gà healthy",
                    ingredients="Ức gà; Xà lách; Dưa leo; Cà chua; Dầu olive",
                    steps=(
                        "1. Luộc ức gà rồi xé.\n"
                        "2. Cắt rau củ.\n"
                        "3. Pha sốt và trộn đều."
                    ),
                    note="Thời gian: 25 phút, Healthy",
                    category="healthy",
                    image=None,
                ),
            ]
            db.add_all(sample_recipes)
            db.commit()
    finally:
        db.close()


# ============================
#   API ROUTERS
# ============================
app.include_router(auth_router)
app.include_router(recipes_router)
app.include_router(default_recipes_router)

# router dùng chung API cho student / gym (chỉ dùng phần /api/...)
app.include_router(student_planner_router)
app.include_router(gym_planner_router)


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


# ===== PAGES CHO RECIPES =====
@app.get("/recipes", response_class=HTMLResponse)
def page_recipes(request: Request):
    return templates.TemplateResponse("recipes_list.html", {"request": request})


@app.get("/recipes/new", response_class=HTMLResponse)
def page_recipe_new(request: Request):
    return templates.TemplateResponse("recipe_add.html", {"request": request})


@app.get("/recipes/{recipe_id}/edit", response_class=HTMLResponse)
def page_recipe_edit(request: Request, recipe_id: int):
    return templates.TemplateResponse(
        "recipe_edit.html",
        {"request": request, "recipe_id": recipe_id},
    )


# ===== TRANG MEAL PLANNER GỘP STUDENT + GYM =====
@app.get("/meal-planner", response_class=HTMLResponse)
def page_meal_planner(request: Request):
    return templates.TemplateResponse("meal_planner.html", {"request": request})


# ===== PAGES TÍNH NĂNG KHÁC (demo) =====
@app.get("/features/weekly-planner", response_class=HTMLResponse)
def page_weekly_planner():
    return HTMLResponse(
        """
        <h1>Lập kế hoạch hàng tuần</h1>
        <p>Chức năng sẽ phát triển sau.</p>
        <a href="/">← Quay lại trang chủ</a>
        """
    )


@app.get("/features/recipe-library", response_class=HTMLResponse)
def page_recipe_library():
    return HTMLResponse(
        """
        <h1>Chia sẻ các công thức hay</h1>
        <p>Khu vực chia sẻ công thức nấu ăn thú vị cho mọi người.</p>
        <p>Vào <a href="/recipes">Danh sách công thức</a> để xem chi tiết.</p>
        <a href="/">← Quay lại trang chủ</a>
        """
    )


@app.get("/features/shopping-list", response_class=HTMLResponse)
def page_shopping_list():
    return HTMLResponse(
        """
        <h1>Danh sách mua sắm</h1>
        <p>Chức năng sẽ được thêm sau.</p>
        <a href="/">← Quay lại trang chủ</a>
        """
    )
