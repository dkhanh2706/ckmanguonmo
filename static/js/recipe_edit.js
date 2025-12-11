// static/js/recipe_edit.js

const API_BASE = "/api/recipes";

/**
 * Lấy ID từ URL.
 * Ví dụ: /recipes/20/edit  ->  "20"
 */
function getRecipeIdFromUrl() {
  // Ví dụ: "/recipes/20/edit" hoặc "/recipes/20/edit/"
  let path = window.location.pathname;
  // Bỏ dấu "/" dư ở cuối nếu có
  path = path.replace(/\/+$/, "");
  // Tách theo "/"
  const parts = path.split("/"); // ["", "recipes", "20", "edit"]

  if (parts.length >= 3) {
    const id = parts[2];
    if (!isNaN(Number(id))) {
      return id;
    }
  }
  return null;
}

document.addEventListener("DOMContentLoaded", () => {
  const recipeId = getRecipeIdFromUrl();
  console.log("DEBUG – Recipe ID từ URL:", recipeId);

  if (!recipeId) {
    alert("Không tìm thấy ID công thức (URL không có ID).");
    window.location.href = "/recipes";
    return;
  }

  // lưu lại để dùng khi cập nhật
  window._currentRecipeId = recipeId;

  // 1. Load dữ liệu chi tiết để fill form
  loadRecipeDetail(recipeId);

  // 2. Gắn submit để cập nhật
  const form = document.getElementById("edit-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      updateRecipe();
    });
  }

  // 3. Preview ảnh khi chọn file mới
  const imageInput = document.getElementById("image");
  if (imageInput) {
    imageInput.addEventListener("change", handleImagePreview);
  }
});

/**
 * Gọi API GET /api/recipes/{id} và fill dữ liệu vào form
 */
async function loadRecipeDetail(id) {
  try {
    const res = await fetch(`${API_BASE}/${id}`);

    if (!res.ok) {
      console.error("Lỗi load công thức, status =", res.status);
      alert("Không tải được dữ liệu công thức (có thể đã bị xoá).");
      window.location.href = "/recipes";
      return;
    }

    const data = await res.json();
    console.log("DEBUG – Recipe detail:", data);

    if (!data || (!data.id && data.message)) {
      alert("Không tìm thấy công thức (API trả Not found).");
      window.location.href = "/recipes";
      return;
    }

    // Fill form
    document.getElementById("title").value = data.title || "";
    document.getElementById("ingredients").value =
      data.ingredients || "";
    document.getElementById("steps").value = data.steps || "";
    document.getElementById("note").value = data.note || "";

    const categorySelect = document.getElementById("category");
    if (categorySelect) {
      if (data.category) {
        const exists = Array.from(categorySelect.options).some(
          (opt) => opt.value === data.category
        );
        if (!exists) {
          const opt = document.createElement("option");
          opt.value = data.category;
          opt.textContent = data.category;
          categorySelect.appendChild(opt);
        }
        categorySelect.value = data.category;
      } else {
        categorySelect.value = "";
      }
    }

    // Preview ảnh hiện tại
    const preview = document.getElementById("image-preview");
    if (preview) {
      preview.innerHTML = "";
      if (data.image) {
        const img = document.createElement("img");
        img.src = data.image; // backend đã trả URL /static/...
        img.alt = data.title || "Ảnh món ăn";
        preview.appendChild(img);
      } else {
        preview.innerHTML =
          '<p class="text-muted">Chưa có ảnh cho công thức này.</p>';
      }
    }
  } catch (err) {
    console.error("Exception khi load chi tiết:", err);
    alert("Có lỗi khi tải chi tiết công thức.");
  }
}

/**
 * Preview ảnh khi chọn file mới
 */
function handleImagePreview(e) {
  const file = e.target.files && e.target.files[0];
  const preview = document.getElementById("image-preview");
  if (!preview || !file) return;

  const url = URL.createObjectURL(file);
  preview.innerHTML = "";
  const img = document.createElement("img");
  img.src = url;
  img.alt = "Ảnh mới";
  preview.appendChild(img);
}

/**
 * Gửi PUT /api/recipes/{id} để cập nhật công thức
 */
async function updateRecipe() {
  const form = document.getElementById("edit-form");
  if (!form) return;

  const id = window._currentRecipeId || getRecipeIdFromUrl();
  if (!id) {
    alert("Không xác định được ID công thức để cập nhật.");
    return;
  }

  const formData = new FormData(form);

  try {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: "PUT",
      body: formData,
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Lỗi cập nhật:", text);
      alert("Cập nhật công thức thất bại.");
      return;
    }

    alert("Cập nhật công thức thành công! ✅");
    window.location.href = "/recipes";
  } catch (err) {
    console.error("Exception khi cập nhật:", err);
    alert("Có lỗi kết nối server.");
  }
}
