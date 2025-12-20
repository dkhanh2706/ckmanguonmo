# 🍽️ CKMANGUONMO – Website Công Thức, Mua Hàng & Tính Toán Dinh Dưỡng

> FastAPI (Python) + HTML / CSS / JavaScript (Jinja2 Templates)

Dự án xây dựng một website quản lý **công thức món ăn**, **mua hàng**, **lập kế hoạch ăn uống** và **tính toán – thống kê dinh dưỡng**

---

## Clone fast api về máy

- git clone git@github.com:dkhanh2706/ckmanguonmo.git
- python3 -m venv .venv
- source .venv/bin/activate
- python -m pip install --upgrade pip
- pip install -r requirements.txt
- pip install psycopg2-binary
- pip install python-multipart
- source .venv/bin/activate

## 1. Công nghệ sử dụng

### Backend

- **Python + FastAPI**
- SQLModel / SQLAlchemy
- JWT Authentication
- Jinja2 Templates
- SMTP Email (gửi mail đánh giá / đặt lại mật khẩu)
- Uvicorn

### Frontend

- HTML5
- CSS3
- JavaScript (Vanilla JS)
- Fetch API (gọi backend)
- Render bằng Jinja2 (SSR)

### Database

- PostgreSQL (khi deploy)
- SQLite (local / fallback)

---

## 2. Các chức năng chính

### 🔐 Quản lý tài khoản

- Đăng ký tài khoản (`register.html`)
- Đăng nhập (`login.html`)
- Đặt lại mật khẩu qua email (`forgot.html`)
- Xác thực người dùng bằng JWT

---

### 📖 Quản lý công thức món ăn

- Xem danh sách công thức
- Thêm công thức mới
- Sửa công thức
- Xóa công thức
- Công thức mặc định (default recipes)
- Upload hình ảnh công thức (`uploads/`)

---

### 🛒 Mua hàng & đơn hàng

- Xem danh sách sản phẩm/món ăn
- Mua hàng
- Xem **lịch sử mua hàng**
- Chi tiết đơn hàng

---

### 🥗 Dinh dưỡng & Nutrition Calculator

- Xem **thông tin dinh dưỡng từng món**
- Chọn **nhiều món** để tính **tổng dinh dưỡng**
  - Calories
  - Protein
  - Carbohydrates
  - Fat
- Thống kê dinh dưỡng theo món / theo ngày

---

### 📅 Lập kế hoạch ăn uống

- Meal Planner (kế hoạch ăn theo ngày)
- Student Planner
- Gym Planner
- Tổng hợp dinh dưỡng theo kế hoạch

---

### 🔢 Tính toán & dự đoán

- Tính lượng **calo cần thiết cho 1 ngày**
- Dự đoán lượng calo phù hợp theo thể trạng
- Hỗ trợ xây dựng chế độ ăn khoa học

---

### ⭐ Đánh giá & gửi email

- Người dùng đánh giá món ăn/công thức
- Khi có đánh giá:
  - Hệ thống **gửi email thông báo**
  - Nội dung gồm: tên món, điểm đánh giá, nhận xét

---

## 3. Cấu trúc thư mục dự án

CKMANGUONMO/
│
├── .venv/ # Môi trường ảo Python
│
├── app/ # Backend FastAPI
│ ├── main.py # Entry point
│ ├── database.py # Kết nối CSDL
│ ├── models.py # Models
│ ├── schemas.py # Pydantic schemas
│ ├── auth_utils.py # Xác thực & JWT
│ ├── default_recipes.py # Dữ liệu công thức mẫu
│ │
│ ├── routes_auth.py # Đăng nhập / đăng ký
│ ├── routes_recipes.py # CRUD công thức
│ ├── routes_default_recipes.py
│ ├── routes_shop.py # Mua hàng
│ ├── routes_planner.py # Meal planner
│ ├── routes_student_planner.py
│ ├── routes_gym_planner.py
│
├── static/
│ ├── css/
│ │ ├── style.css
│ │ ├── recipes.css
│ │ ├── shop.css
│ │ └── order_history.css
│ │
│ ├── js/
│ │ ├── recipes_list.js
│ │ ├── recipe_add.js
│ │ ├── recipe_edit.js
│ │ ├── nutrition.js
│ │ ├── meal_planner.js
│ │ ├── shop.js
│ │ └── order_history.js
│ │
│ └── img/
│
├── templates/ # HTML Templates (Jinja2)
│ ├── base.html
│ ├── index.html
│ ├── login.html
│ ├── register.html
│ ├── forgot.html
│ ├── recipes_list.html
│ ├── recipe_add.html
│ ├── recipe_edit.html
│ ├── nutrition.html
│ ├── meal_planner.html
│ ├── shopping_list.html
│ └── order_history.html
│
├── uploads/ # Lưu ảnh upload
│
├── requirements.txt
├── run.sh
├── setup.sh
├── .env
├── .gitignore
└── README.md

---

## 4. Cài đặt & chạy dự án

### 4.1 Cài môi trường

```bash
python -m venv .venv
source .venv/bin/activate
# hoặc
.venv\Scripts\activate
4.2 Cài thư viện
pip install -r requirements.txt
4.3 Cấu hình .env
DATABASE_URL=sqlite:///./app.db
SECRET_KEY=your_secret_key
ALGORITHM=HS256

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=23050157@student.bdu.edu.vn
SMTP_PASS=your_app_password
4.4 Chạy server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
