// static/js/recipes_list.js

// =======================
// CẤU HÌNH & STATE
// =======================

// Ảnh fallback cuối cùng, chắc chắn tồn tại
const DEFAULT_FALLBACK_IMG = "/static/img/default_recipe.jpg";

// Danh sách ảnh mặc định xoay vòng cho các card
// 👉 Bạn có thể tạo thêm file default_1.jpg, default_2.jpg, default_3.jpg …
const DEFAULT_IMAGES = [
  "/static/img/default_1.jpg",
  "/static/img/default_2.jpg",
  "/static/img/default_3.jpg",
  DEFAULT_FALLBACK_IMG, // luôn để 1 ảnh tồn tại cuối cùng
];

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

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Rút gọn text (ví dụ cho nguyên liệu)
function truncate(text = "", maxLen = 80) {
  const t = text.trim();
  if (t.length <= maxLen) return t;
  return t.slice(0, maxLen - 3) + "...";
}

// Chọn ảnh mặc định theo index (xoay vòng)
function pickDefaultImage(index = 0) {
  if (!DEFAULT_IMAGES.length) return DEFAULT_FALLBACK_IMG;
  const i = index % DEFAULT_IMAGES.length;
  return DEFAULT_IMAGES[i] || DEFAULT_FALLBACK_IMG;
}

// Build URL ảnh từ giá trị image trong DB / API
// Trả về: string url hoặc null nếu không xây được
function buildImageUrl(image) {
  if (!image) return null;

  let path = String(image).trim();
  if (!path) return null;

  // Trường hợp URL tuyệt đối (http, https, data)
  if (/^(https?:)?\/\//i.test(path) || path.startsWith("data:")) {
    return path;
  }

  // Bỏ / đầu nếu có
  if (path.startsWith("/")) path = path.slice(1);

  // Nếu lỡ lưu "app/static/..."
  if (path.startsWith("app/")) path = path.slice(4); // bỏ "app/"

  if (path.startsWith("static/")) {
    // ok, đã là static/...
  } else if (path.startsWith("uploads/")) {
    path = "static/" + path;
  } else {
    // fallback: cho vào static/uploads/
    path = "static/uploads/" + path;
  }

  return "/" + path;
}

// =======================
// TẠO HTML CARD
// =======================

// Card cho công thức gợi ý
function createDefaultCard(recipe, index) {
  const baseImg = buildImageUrl(recipe.image);
  const imgUrl = baseImg || pickDefaultImage(index);

  const title = escapeHtml(recipe.title || "Món ăn gợi ý");
  const category = escapeHtml(recipe.category || "Khác");
  const note = escapeHtml(recipe.note || "");
  const ingredientsShort = truncate(recipe.ingredients || "", 90);

  return `
    <article class="recipe-card">
      <div class="recipe-card-thumb">
        <img src="${imgUrl}" alt="${title}"
             loading="lazy"
             onerror="this.src='${DEFAULT_FALLBACK_IMG}'" />
        <span class="badge badge-default">Gợi ý</span>
      </div>
      <div class="recipe-card-body">
        <h3 class="recipe-card-title">${title}</h3>
        <p class="recipe-card-meta">${category}</p>
        ${note ? `<p class="recipe-card-note">${note}</p>` : ""}
        ${
          ingredientsShort
            ? `<p class="recipe-card-ingredients"><strong>Nguyên liệu chính:</strong> ${escapeHtml(
                ingredientsShort
              )}</p>`
            : ""
        }
      </div>
    </article>
  `;
}

// Card cho công thức của user
function createUserCard(recipe, index) {
  const baseImg = buildImageUrl(recipe.image);
  const imgUrl = baseImg || pickDefaultImage(index);

  const title = escapeHtml(recipe.title || "Món ăn của bạn");
  const category = escapeHtml(recipe.category || "Khác");
  const note = escapeHtml(recipe.note || "");
  const ingredientsShort = truncate(recipe.ingredients || "", 80);

  return `
    <article class="recipe-card user-card">
      <div class="recipe-card-thumb">
        <img src="${imgUrl}" alt="${title}"
             loading="lazy"
             onerror="this.src='${DEFAULT_FALLBACK_IMG}'" />
        <span class="badge badge-user">Của bạn</span>
      </div>
      <div class="recipe-card-body">
        <h3 class="recipe-card-title">${title}</h3>
        <p class="recipe-card-meta">${category}</p>
        ${note ? `<p class="recipe-card-note">${note}</p>` : ""}
        ${
          ingredientsShort
            ? `<p class="recipe-card-ingredients"><strong>Nguyên liệu:</strong> ${escapeHtml(
                ingredientsShort
              )}</p>`
            : ""
        }

        <div class="recipe-card-actions">
          <a href="/recipes/${recipe.id}/edit" class="btn-card">
            Xem / sửa
          </a>
          <button class="btn-card btn-card-danger"
                  data-action="delete"
                  data-id="${recipe.id}">
            Xóa
          </button>
        </div>
      </div>
    </article>
  `;
}

// =======================
// RENDER LIST
// =======================

function renderDefaultRecipes(searchTerm = "") {
  if (!defaultListEl) return;

  const q = searchTerm.trim().toLowerCase();
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

  defaultListEl.innerHTML = filtered
    .map((recipe, index) => createDefaultCard(recipe, index))
    .join("");
}

function renderUserRecipes(searchTerm = "") {
  if (!userListEl) return;

  const q = searchTerm.trim().toLowerCase();
  const filtered = userRecipes.filter((r) => {
    if (!q) return true;
    return (
      (r.title || "").toLowerCase().includes(q) ||
      (r.ingredients || "").toLowerCase().includes(q)
    );
  });

  if (!filtered.length) {
    userListEl.innerHTML =
      '<p class="empty-text">Chưa có công thức phù hợp. Hãy thử từ khoá khác hoặc thêm món mới 👩‍🍳</p>';
    if (emptyUserText) emptyUserText.style.display = "block";
    return;
  }

  userListEl.innerHTML = filtered
    .map((recipe, index) => createUserCard(recipe, index))
    .join("");
  if (emptyUserText) emptyUserText.style.display = "none";
}

// =======================
// FETCH DATA
// =======================

async function loadDefaultRecipes() {
  if (!defaultListEl) return;

  defaultListEl.innerHTML =
    '<p class="loading-text">Đang tải công thức gợi ý...</p>';

  try {
    // Router gợi ý: routes_default_recipes, path GET "/default-recipes"
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

  userListEl.innerHTML =
    '<p class="loading-text">Đang tải công thức của bạn...</p>';

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

// =======================
// KHỞI TẠO
// =======================

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
