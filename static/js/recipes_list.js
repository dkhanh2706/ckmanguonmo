// static/js/recipes_list.js

// =======================
// STATE TOÀN CỤC
// =======================
let defaultRecipes = [];
let userRecipes = [];

const defaultListEl = document.getElementById("default-recipes-list");
const userListEl = document.getElementById("user-recipes-list");
const emptyUserText = document.getElementById("user-recipes-empty");

const searchInput = document.getElementById("search-input");
const btnSearch = document.getElementById("btn-search");

// =======================
// HÀM TIỆN ÍCH
// =======================

// Escape text để tránh lỗi HTML (phòng ngừa XSS nhẹ nhàng)
function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Chuẩn hóa đường dẫn ảnh từ DB -> URL cho <img>
function buildImageUrl(image) {
  if (!image) return "";

  let path = String(image).trim();
  if (!path) return "";

  // Nếu là URL tuyệt đối (http, https, data:) thì dùng luôn
  if (/^(https?:)?\/\//i.test(path) || path.startsWith("data:")) {
    return path;
  }

  // Bỏ "/" đầu nếu có
  if (path.startsWith("/")) {
    path = path.slice(1);
  }

  // Một số dạng hay gặp:
  // "static/uploads/xxx.jpg"
  // "uploads/xxx.jpg"
  // "xxx.jpg"
  if (path.startsWith("app/static/")) {
    // Nếu lỡ lưu "app/static/..." thì bỏ "app/"
    path = path.replace(/^app\//, "");
  }

  if (path.startsWith("static/")) {
    // Đã có "static/..." rồi
  } else if (path.startsWith("uploads/")) {
    path = "static/" + path;
  } else {
    // Mặc định cho vào static/uploads
    path = "static/uploads/" + path;
  }

  return "/" + path;
}

// Tạo HTML ảnh thumb (nếu có ảnh)
function renderImageThumb(recipe) {
  if (!recipe.image) return "";

  const url = buildImageUrl(recipe.image);
  if (!url) return "";

  return `
    <div class="recipe-thumb">
      <img src="${url}" alt="${escapeHtml(recipe.title || "Ảnh món ăn")}" loading="lazy" />
    </div>
  `;
}

// =======================
// TẠO CARD HIỂN THỊ
// =======================

function createDefaultCard(recipe) {
  return `
    <article class="recipe-card recipe-card-default">
        <div class="recipe-card-header">
            ${renderImageThumb(recipe)}
            <div class="recipe-card-header-text">
              <div class="recipe-tag">Gợi ý</div>
              <h3 class="recipe-title">${escapeHtml(recipe.title)}</h3>
              <p class="recipe-category">${escapeHtml(recipe.category || "Khác")}</p>
            </div>
        </div>
        <p class="recipe-note">${escapeHtml(recipe.note || "")}</p>
        <p class="recipe-ingredients">
            <strong>Nguyên liệu chính:</strong> ${escapeHtml(recipe.ingredients || "")}
        </p>
    </article>
  `;
}

function createUserCard(recipe) {
  const isDefault = recipe.id <= 3; // Nếu bạn dùng id 1,2,3 làm mặc định trong DB

  return `
    <article class="recipe-card">
        <div class="recipe-card-header">
            ${renderImageThumb(recipe)}
            <div class="recipe-card-header-text">
              ${
                isDefault
                  ? '<div class="recipe-tag">Mặc định</div>'
                  : ""
              }
              <h3 class="recipe-title">${escapeHtml(recipe.title)}</h3>
              <p class="recipe-category">${escapeHtml(recipe.category || "Khác")}</p>
            </div>
        </div>

        <p class="recipe-note">${escapeHtml(recipe.note || "")}</p>

        <div class="recipe-actions">
            <a href="/recipes/${recipe.id}/edit" class="btn-small btn-primary-outline">
              Xem chi tiết
            </a>

            ${
              isDefault
                ? ""
                : `
                  <button class="btn-small btn-outline" data-action="edit" data-id="${recipe.id}">
                      Sửa
                  </button>
                  <button class="btn-small btn-danger" data-action="delete" data-id="${recipe.id}">
                      Xóa
                  </button>
                `
            }
        </div>
    </article>
  `;
}

// =======================
// RENDER LISTS
// =======================

function renderDefaultRecipes(term = "") {
  if (!defaultListEl) return;
  const q = term.trim().toLowerCase();

  const filtered = defaultRecipes.filter((r) => {
    if (!q) return true;
    return (
      (r.title || "").toLowerCase().includes(q) ||
      (r.ingredients || "").toLowerCase().includes(q)
    );
  });

  if (!filtered.length) {
    defaultListEl.innerHTML =
      '<p class="empty-text">Không tìm thấy công thức gợi ý phù hợp.</p>';
    return;
  }

  defaultListEl.innerHTML = filtered.map((r) => createDefaultCard(r)).join("");
}

function renderUserRecipes(term = "") {
  if (!userListEl) return;
  const q = term.trim().toLowerCase();

  const filtered = userRecipes.filter((r) => {
    if (!q) return true;
    return (
      (r.title || "").toLowerCase().includes(q) ||
      (r.ingredients || "").toLowerCase().includes(q)
    );
  });

  if (!filtered.length) {
    userListEl.innerHTML =
      '<p class="empty-text">Chưa có công thức phù hợp. Hãy thử tìm từ khoá khác hoặc thêm món mới 👩‍🍳</p>';
    if (emptyUserText) emptyUserText.style.display = "block";
    return;
  }

  userListEl.innerHTML = filtered.map(createUserCard).join("");
  if (emptyUserText) emptyUserText.style.display = "none";
}

// =======================
// FETCH DATA
// =======================

async function loadDefaultRecipes() {
  if (!defaultListEl) return;

  defaultListEl.innerHTML = '<p class="loading-text">Đang tải công thức gợi ý...</p>';

  try {
    const res = await fetch("/default-recipes");
    if (!res.ok) throw new Error("Failed to load default recipes");
    defaultRecipes = await res.json();
    renderDefaultRecipes();
  } catch (err) {
    console.error(err);
    defaultListEl.innerHTML =
      '<p class="empty-text">Không tải được công thức gợi ý.</p>';
  }
}

async function loadUserRecipes() {
  if (!userListEl) return;

  userListEl.innerHTML = '<p class="loading-text">Đang tải công thức của bạn...</p>';

  try {
    const res = await fetch("/api/recipes/");
    if (!res.ok) throw new Error("Failed to load recipes");
    userRecipes = await res.json();
    renderUserRecipes();
  } catch (err) {
    console.error(err);
    userListEl.innerHTML =
      '<p class="empty-text">Không tải được công thức người dùng.</p>';
  }
}

// =======================
// TÌM KIẾM
// =======================

function applySearch() {
  const term = (searchInput && searchInput.value) || "";
  renderDefaultRecipes(term);
  renderUserRecipes(term);
}

// =======================
// SỰ KIỆN SỬA / XOÁ
// =======================

if (userListEl) {
  userListEl.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const id = btn.dataset.id;
    const action = btn.dataset.action;

    if (!id) return;

    if (action === "edit") {
      window.location.href = `/recipes/${id}/edit`;
      return;
    }

    if (action === "delete") {
      if (!confirm("Bạn có chắc muốn xóa công thức này?")) return;
      try {
        const res = await fetch(`/api/recipes/${id}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          alert(data.detail || "Xóa thất bại.");
          return;
        }
        await loadUserRecipes();
        applySearch();
      } catch (err) {
        console.error(err);
        alert("Có lỗi khi xóa công thức.");
      }
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadDefaultRecipes();
  loadUserRecipes();

  if (btnSearch) {
    btnSearch.addEventListener("click", applySearch);
  }

  if (searchInput) {
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        applySearch();
      }
    });
  }
});
