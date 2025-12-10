// static/js/recipe_edit.js

const API_BASE = "/api/recipes";
// recipeId được gán trong template:
// <script>const recipeId = "{{ recipe_id }}";</script>

// =======================
// HÀM TIỆN ÍCH
// =======================

function buildImageUrl(image) {
  if (!image) return "";

  let path = String(image).trim();
  if (!path) return "";

  // Nếu là URL ngoài / data URL thì dùng luôn
  if (/^(https?:)?\/\//i.test(path) || path.startsWith("data:")) {
    return path;
  }

  if (path.startsWith("/")) {
    path = path.slice(1);
  }

  // Chuẩn hóa giống bên list
  if (path.startsWith("app/static/")) {
    path = path.replace(/^app\//, "");
  }

  if (path.startsWith("static/")) {
    // ok
  } else if (path.startsWith("uploads/")) {
    path = "static/" + path;
  } else if (!path.startsWith("static/")) {
    path = "static/uploads/" + path;
  }

  return "/" + path;
}

function renderCurrentImage(previewEl, data) {
  if (!previewEl) return;

  previewEl.innerHTML = "";

  const url = buildImageUrl(data.image);
  if (url) {
    const img = document.createElement("img");
    img.src = url;
    img.alt = data.title || "Ảnh món ăn";
    img.className = "recipe-edit-image";
    previewEl.appendChild(img);
  } else {
    previewEl.innerHTML =
      '<p class="text-muted">Chưa có ảnh cho công thức này.</p>';
  }
}

// =======================
// LOAD CHI TIẾT CÔNG THỨC
// =======================

document.addEventListener("DOMContentLoaded", () => {
  if (!window.recipeId) {
    alert("Không tìm thấy ID công thức.");
    return;
  }

  loadRecipeDetail(window.recipeId);

  const form = document.getElementById("edit-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      updateRecipe();
    });
  }

  const imageInput = document.getElementById("image");
  if (imageInput) {
    imageInput.addEventListener("change", handleImagePreview);
  }
});

async function loadRecipeDetail(id) {
  try {
    const res = await fetch(`${API_BASE}/${id}`);
    if (!res.ok) {
      alert("Không tải được dữ liệu công thức.");
      return;
    }

    const data = await res.json();

    // Điền form
    document.getElementById("title").value = data.title || "";
    document.getElementById("ingredients").value = data.ingredients || "";
    document.getElementById("steps").value = data.steps || "";
    document.getElementById("note").value = data.note || "";

    const categorySelect = document.getElementById("category");
    if (categorySelect) {
      if (data.category) {
        const optionExists = Array.from(categorySelect.options).some(
          (opt) => opt.value === data.category
        );
        if (!optionExists) {
          const opt = document.createElement("option");
          opt.value = data.category;
          opt.textContent = data.category;
          categorySelect.appendChild(opt);
        }
        categorySelect.value = data.category;
      }
    }

    // Preview ảnh hiện tại
    const preview = document.getElementById("image-preview");
    renderCurrentImage(preview, data);
  } catch (err) {
    console.error(err);
    alert("Có lỗi khi tải chi tiết công thức.");
  }
}

// =======================
// PREVIEW ẢNH MỚI KHI CHỌN FILE
// =======================

function handleImagePreview(e) {
  const file = e.target.files[0];
  const preview = document.getElementById("image-preview");
  if (!preview) return;

  if (!file) return;

  const url = URL.createObjectURL(file);
  preview.innerHTML = "";
  const img = document.createElement("img");
  img.src = url;
  img.alt = "Ảnh mới";
  img.className = "recipe-edit-image";
  preview.appendChild(img);
}

// =======================
// GỬI FORM CẬP NHẬT
// =======================

async function updateRecipe() {
  const form = document.getElementById("edit-form");
  if (!form) return;

  const formData = new FormData(form);

  try {
    const res = await fetch(`${API_BASE}/${window.recipeId}`, {
      method: "PUT",
      body: formData,
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(text);
      alert("Cập nhật công thức thất bại.");
      return;
    }

    alert("Cập nhật công thức thành công! ✅");
    window.location.href = "/recipes";
  } catch (err) {
    console.error(err);
    alert("Có lỗi kết nối server.");
  }
}
