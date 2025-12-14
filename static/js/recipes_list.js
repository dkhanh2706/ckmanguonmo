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

// =======================
// MUA NGUYÊN LIỆU TỪ CÔNG THỨC GỢI Ý (3 MÓN)
// =======================
const PREFILL_KEY = "prefill_shop_from_recipes";

// Tách nguyên liệu từ chuỗi (ưu tiên dấu ; theo hướng dẫn nhập liệu)
function splitIngredients(raw = "") {
  return String(raw)
    .split(/;|,|\n/gi)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      // loại bỏ số lượng/đơn vị đơn giản (mang tính minh họa)
      return s
        .replace(/\b\d+([.,]\d+)?\b/g, "")
        .replace(
          /\b(kg|g|gram|ml|l|muỗng|muong|thìa|thia|tsp|tbsp|cup|chén|chen)\b/gi,
          ""
        )
        .replace(/\s+/g, " ")
        .trim();
    })
    .filter(Boolean);
}

function savePrefillAndGoShop(recipes = []) {
  const titles = recipes.map((r) => r.title || "Món gợi ý").slice(0, 3);
  const ingredients = recipes
    .flatMap((r) => splitIngredients(r.ingredients || ""))
    .map((x) => x.toLowerCase());

  const uniq = Array.from(new Set(ingredients)).slice(0, 40);

  localStorage.setItem(
    PREFILL_KEY,
    JSON.stringify({
      titles,
      ingredients: uniq,
      ts: Date.now(),
    })
  );

  // ✅ Nếu route shop của bạn khác, đổi lại URL này
  window.location.href = "/shopping-list";
}

// Trạng thái dữ liệu
let defaultRecipes = []; // 3 công thức gợi ý
let userRecipes = []; // công thức của user
let filteredUserRecipes = []; // sau khi search

// DOM
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
  const t = String(text || "").trim();
  if (t.length <= maxLen) return t;
  return t.slice(0, maxLen - 3) + "...";
}

// Chọn ảnh mặc định theo index (xoay vòng)
function pickDefaultImage(index = 0) {
  if (!DEFAULT_IMAGES.length) return DEFAULT_FALLBACK_IMG;
  const i = Math.abs(index) % DEFAULT_IMAGES.length;
  return DEFAULT_IMAGES[i] || DEFAULT_FALLBACK_IMG;
}

// Build image URL (nếu backend trả path tương đối)
function buildImageUrl(imagePath) {
  if (!imagePath) return "";
  // Nếu đã là URL tuyệt đối hoặc bắt đầu bằng /static thì giữ nguyên
  if (
    String(imagePath).startsWith("http://") ||
    String(imagePath).startsWith("https://") ||
    String(imagePath).startsWith("/static/")
  ) {
    return imagePath;
  }
  // Nếu backend trả dạng "uploads/xxx.jpg" thì ghép thành "/static/uploads/xxx.jpg"
  if (String(imagePath).startsWith("uploads/")) {
    return "/static/" + imagePath;
  }
  // Còn lại: trả về nguyên gốc
  return imagePath;
}

// =======================
// RENDER CARD
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

        <div class="recipe-card-actions">
          <button class="btn-card" type="button" data-action="buy-default" data-index="${index}">
            🛒 Mua nguyên liệu
          </button>
        </div>
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
    <article class="recipe-card user-card" data-id="${recipe.id}">
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
          <a class="btn-card" href="/recipes/${recipe.id}/edit">✏️ Sửa</a>
          <button class="btn-card btn-delete" type="button" data-id="${recipe.id}">🗑️ Xóa</button>
        </div>
      </div>
    </article>
  `;
}

// =======================
// RENDER LIST
// =======================

function renderDefaultRecipes() {
  if (!defaultListEl) return;

  if (!defaultRecipes || defaultRecipes.length === 0) {
    defaultListEl.innerHTML =
      '<p class="empty-text">Chưa có công thức gợi ý.</p>';
    return;
  }

  defaultListEl.innerHTML = defaultRecipes
    .map((r, i) => createDefaultCard(r, i))
    .join("");
}

function renderUserRecipes(list) {
  if (!userListEl) return;

  if (!list || list.length === 0) {
    userListEl.innerHTML = "";
    if (emptyUserText) emptyUserText.style.display = "block";
    return;
  }

  if (emptyUserText) emptyUserText.style.display = "none";

  userListEl.innerHTML = list.map((r, i) => createUserCard(r, i)).join("");
}

// =======================
// LOAD DATA
// =======================

async function loadDefaultRecipes() {
  if (!defaultListEl) return;

  defaultListEl.innerHTML =
    '<p class="loading-text">Đang tải công thức gợi ý...</p>';

  try {
    // Router gợi ý: routes_default_recipes, path GET "/default-recipes"
    const res = await fetch("/default-recipes");
    if (!res.ok) throw new Error("Failed to load default recipes");

    const data = await res.json();

    // ✅ chỉ lấy đúng 3 công thức bất kỳ
    defaultRecipes = Array.isArray(data) ? data.slice(0, 3) : [];
    renderDefaultRecipes();
  } catch (err) {
    console.error(err);

    // ✅ fallback 3 món minh họa (để luôn có dữ liệu)
    defaultRecipes = [
      {
        title: "Ức gà áp chảo",
        category: "healthy",
        note: "25 phút, dễ",
        ingredients: "ức gà; muối; tiêu; tỏi; dầu olive; chanh",
        image: null,
      },
      {
        title: "Canh bí đỏ",
        category: "canh",
        note: "20 phút, dễ",
        ingredients: "bí đỏ; hành lá; thịt băm; nước mắm; tiêu",
        image: null,
      },
      {
        title: "Trứng chiên cà chua",
        category: "chiên",
        note: "15 phút, siêu nhanh",
        ingredients: "trứng; cà chua; hành; nước mắm; đường",
        image: null,
      },
    ];

    renderDefaultRecipes();
  }
}

async function loadUserRecipes() {
  try {
    // Router: routes_recipes, path GET "/api/recipes"
    const res = await fetch("/api/recipes");
    if (!res.ok) throw new Error("Failed to load user recipes");

    userRecipes = await res.json();
    filteredUserRecipes = [...userRecipes];
    renderUserRecipes(filteredUserRecipes);
  } catch (err) {
    console.error(err);
    if (userListEl) {
      userListEl.innerHTML =
        '<p class="empty-text">Không tải được công thức của bạn.</p>';
    }
  }
}

// =======================
// SEARCH
// =======================

function applySearch() {
  const q = (searchInput?.value || "").trim().toLowerCase();

  if (!q) {
    filteredUserRecipes = [...userRecipes];
    renderUserRecipes(filteredUserRecipes);
    return;
  }

  filteredUserRecipes = userRecipes.filter((r) =>
    String(r.title || "").toLowerCase().includes(q)
  );

  renderUserRecipes(filteredUserRecipes);
}

// =======================
// DELETE
// =======================

if (userListEl) {
  userListEl.addEventListener("click", async (e) => {
    const btn = e.target.closest(".btn-delete");
    if (!btn) return;

    const id = btn.dataset.id;
    if (!id) return;

    const ok = confirm("Bạn chắc chắn muốn xóa công thức này?");
    if (!ok) return;

    try {
      const res = await fetch(`/api/recipes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");

      userRecipes = userRecipes.filter((r) => String(r.id) !== String(id));
      filteredUserRecipes = filteredUserRecipes.filter(
        (r) => String(r.id) !== String(id)
      );
      renderUserRecipes(filteredUserRecipes);
      alert("Đã xóa công thức.");
    } catch (err) {
      console.error(err);
      alert("Có lỗi khi xóa công thức.");
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

  // ✅ Mua nguyên liệu cho 1 món gợi ý (nút trong card)
  if (defaultListEl) {
    defaultListEl.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-action='buy-default']");
      if (!btn) return;

      const idx = Number(btn.dataset.index);
      const recipe = defaultRecipes[idx];
      if (!recipe) return;

      savePrefillAndGoShop([recipe]);
    });
  }

  // ✅ Mua nguyên liệu cho cả 3 món gợi ý (nút ở tiêu đề section)
  const btnBuyAll = document.getElementById("btn-buy-default-ingredients");
  if (btnBuyAll) {
    btnBuyAll.addEventListener("click", () => {
      savePrefillAndGoShop(defaultRecipes.slice(0, 3));
    });
  }
});
