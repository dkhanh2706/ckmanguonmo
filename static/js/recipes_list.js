// static/js/recipes_list.js

// =======================
// CẤU HÌNH & STATE
// =======================

// fallback chắc ăn (bạn đang có file này)
const DEFAULT_FALLBACK_IMG = "/static/img/default_1.jpg";

// dự phòng nếu img_n.jpg bị thiếu
const DEFAULT_IMAGES = [
  "/static/img/default_1.jpg",
  "/static/img/default_2.jpg",
  "/static/img/default_3.jpg",
];

let defaultRecipes = [];
let userRecipes = [];
let dbTitleToId = new Map();

const defaultListEl = document.getElementById("default-recipes-list");
const userListEl = document.getElementById("user-recipes-list");
const emptyUserText = document.getElementById("user-recipes-empty");

const searchInput = document.getElementById("search-input");
const btnSearch = document.getElementById("btn-search");

// =======================
// DIET FILTER (DOM)
// =======================
const dietWrap = document.getElementById("diet-filter-wrap");
const dietCountEl = document.getElementById("diet-filter-count");
const btnClearDiet = document.getElementById("btn-clear-diet");

// =======================
// REVIEW MODAL (DOM)
// =======================
const reviewModal = document.getElementById("review-modal");
const starPicker = document.getElementById("star-picker");
const reviewerNameEl = document.getElementById("reviewer-name");
const reviewCommentEl = document.getElementById("review-comment");
const btnReviewCancel = document.getElementById("btn-review-cancel");
const btnReviewSubmit = document.getElementById("btn-review-submit");

let currentReviewRecipe = null;
let currentSelectedRating = 0;

// =======================
// HELPERS
// =======================
function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function truncate(text = "", maxLen = 80) {
  const t = String(text || "").trim();
  if (t.length <= maxLen) return t;
  return t.slice(0, maxLen - 3) + "...";
}

function pickDefaultImage(index = 0) {
  if (!DEFAULT_IMAGES.length) return DEFAULT_FALLBACK_IMG;
  const i = Math.abs(index) % DEFAULT_IMAGES.length;
  return DEFAULT_IMAGES[i] || DEFAULT_FALLBACK_IMG;
}

/**
 * ✅ MỖI Ô = 1 ẢNH CỐ ĐỊNH THEO VỊ TRÍ (index)
 * Ô 1 -> /static/img/img_1.jpg
 * Ô 2 -> /static/img/img_2.jpg
 * ...
 */
function getCardImageByIndex(index = 0) {
  return `/static/img/img_${index + 1}.jpg`;
}

function buildImageUrl(image) {
  if (!image) return null;
  let path = String(image).trim();
  if (!path) return null;

  // absolute url / data url
  if (/^(https?:)?\/\//i.test(path) || path.startsWith("data:")) return path;

  if (path.startsWith("/")) path = path.slice(1);
  if (path.startsWith("app/")) path = path.slice(4);

  if (path.startsWith("static/")) {
    // ok
  } else if (path.startsWith("uploads/")) {
    path = "static/" + path;
  } else if (path.startsWith("default/")) {
    path = "static/" + path;
  } else if (path.startsWith("img/")) {
    path = "static/" + path;
  } else {
    // mặc định legacy: uploads
    path = "static/uploads/" + path;
  }

  return "/" + path;
}

function safeNumber(n, fallback = 0) {
  const x = Number(n);
  return Number.isFinite(x) ? x : fallback;
}

function renderStars(avgRating = 0) {
  const r = Number(avgRating || 0);
  const full = Math.max(0, Math.min(5, Math.round(r)));
  let s = "";
  for (let i = 1; i <= 5; i++) s += i <= full ? "★" : "☆";
  return s;
}

// =======================
// DIETARY RESTRICTIONS (DEMO LOGIC)
// =======================
function normText(s = "") {
  return String(s || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// demo từ khóa: đủ dùng cho bài nộp
const KW_MEAT = [
  "thịt",
  "heo",
  "lợn",
  "bò",
  "gà",
  "vịt",
  "cừu",
  "xúc xích",
  "giăm bông",
  "chả",
  "cá",
  "tôm",
  "mực",
  "hải sản",
];
const KW_EGG = ["trứng"];
const KW_DAIRY = [
  "sữa",
  "phô mai",
  "bơ",
  "kem",
  "sữa chua",
  "whipping",
  "milk",
];
const KW_GLUTEN = ["bột mì", "mì", "bánh mì", "pasta", "noodle", "gluten"];
const KW_NUT = ["đậu phộng", "lạc", "hạt điều", "hạnh nhân", "óc chó", "nut"];
const KW_PORK = ["heo", "lợn", "thịt heo", "thịt lợn", "bacon"];
const KW_ALCOHOL = ["rượu", "bia", "wine", "vodka", "rum"];

function includesAny(text, keywords) {
  const t = normText(text);
  return keywords.some((k) => t.includes(normText(k)));
}

/**
 * Trả về tags "đạt điều kiện" (true/false) theo kiểu demo
 * - vegan: không thịt/cá/trứng/sữa
 * - vegetarian: không thịt/cá (cho phép trứng/sữa)
 * - dairy_free: không sữa
 * - gluten_free: không gluten
 * - nut_free: không hạt
 * - halal: demo: không heo + không rượu (minh hoạ)
 */
function inferDietTags(recipe) {
  const title = recipe?.title || "";
  const ing = recipe?.ingredients || "";
  const hay = `${title} ${ing}`;

  const hasMeat = includesAny(hay, KW_MEAT);
  const hasEgg = includesAny(hay, KW_EGG);
  const hasDairy = includesAny(hay, KW_DAIRY);
  const hasGluten = includesAny(hay, KW_GLUTEN);
  const hasNut = includesAny(hay, KW_NUT);
  const hasPork = includesAny(hay, KW_PORK);
  const hasAlcohol = includesAny(hay, KW_ALCOHOL);

  const vegetarian = !hasMeat; // no meat/seafood
  const vegan = !hasMeat && !hasEgg && !hasDairy;

  return {
    vegetarian,
    vegan,
    gluten_free: !hasGluten,
    dairy_free: !hasDairy,
    nut_free: !hasNut,
    halal: !hasPork && !hasAlcohol,
  };
}

function attachDietTags(list) {
  return (list || []).map((r) => ({
    ...r,
    diet: r.diet || inferDietTags(r),
  }));
}

function getSelectedDietFilters() {
  const checked = Array.from(
    document.querySelectorAll('input[name="diet"]:checked')
  ).map((x) => String(x.value));
  return checked;
}

function updateDietCountUI() {
  if (!dietCountEl) return;
  const n = getSelectedDietFilters().length;
  dietCountEl.textContent = String(n);
}

function matchDiet(recipe) {
  const selected = getSelectedDietFilters();
  if (!selected.length) return true;

  const tags = recipe?.diet || inferDietTags(recipe);
  // AND logic: bật nhiều cái -> phải đạt hết
  return selected.every((key) => !!tags[key]);
}

// =======================
// DEMO NUTRITION (để đẩy sang /nutrition)
// =======================

// hash đơn giản để số "ổn định" theo món (demo)
function hashCode(str) {
  const s = String(str || "");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Tạo dinh dưỡng demo (kcal/protein/carbs/fat/fiber/sugar/sodium)
 * → bạn dùng để tính tổng ở nutrition.html
 */
function makeMockNutrition(recipe) {
  const base = hashCode(`${recipe?.title || ""}|${recipe?.ingredients || ""}`);
  const rnd = (min, max) => min + (base % (max - min + 1));

  // scale kiểu "mỗi món"
  const calories = rnd(250, 750);
  const protein = rnd(8, 45);
  const carbs = rnd(20, 110);
  const fat = rnd(6, 35);
  const fiber = rnd(2, 18);
  const sugar = rnd(1, 25);
  const sodium = rnd(200, 1600);

  return { calories, protein, carbs, fat, fiber, sugar, sodium };
}

// =======================
// MODAL REVIEW
// =======================
function setStarPicker(rating) {
  currentSelectedRating = Number(rating || 0);
  if (!starPicker) return;

  const stars = Array.from(starPicker.querySelectorAll("span[data-v]"));
  stars.forEach((sp) => {
    const v = Number(sp.dataset.v || 0);
    if (v <= currentSelectedRating) sp.classList.add("active");
    else sp.classList.remove("active");
  });
}

function openReviewModal(recipeObj) {
  if (!reviewModal) return;

  currentReviewRecipe = recipeObj;
  setStarPicker(0);

  if (reviewerNameEl) reviewerNameEl.value = "";
  if (reviewCommentEl) reviewCommentEl.value = "";

  reviewModal.classList.add("show");
}

function closeReviewModal() {
  if (!reviewModal) return;

  reviewModal.classList.remove("show");
  currentReviewRecipe = null;
  currentSelectedRating = 0;
}

if (starPicker) {
  starPicker.addEventListener("click", (e) => {
    const sp = e.target.closest("span[data-v]");
    if (!sp) return;
    setStarPicker(Number(sp.dataset.v || 0));
  });

  starPicker.addEventListener("mousemove", (e) => {
    const sp = e.target.closest("span[data-v]");
    if (!sp) return;
    const hoverV = Number(sp.dataset.v || 0);

    const stars = Array.from(starPicker.querySelectorAll("span[data-v]"));
    stars.forEach((x) => {
      const v = Number(x.dataset.v || 0);
      if (v <= hoverV) x.classList.add("active");
      else x.classList.remove("active");
    });
  });

  starPicker.addEventListener("mouseleave", () => {
    setStarPicker(currentSelectedRating);
  });
}

if (btnReviewCancel)
  btnReviewCancel.addEventListener("click", closeReviewModal);

if (reviewModal) {
  reviewModal.addEventListener("click", (e) => {
    if (e.target === reviewModal) closeReviewModal();
  });
}

document.addEventListener("keydown", (e) => {
  if (
    e.key === "Escape" &&
    reviewModal &&
    reviewModal.classList.contains("show")
  )
    closeReviewModal();
});

// =======================
// CARD HTML
// =======================
function createRatingRow(recipe, source) {
  const avg = safeNumber(recipe.avg_rating, 0);
  const count = safeNumber(recipe.review_count, 0);

  return `
    <div class="recipe-rating-row" style="align-items:flex-start;">
      <div>
        <span class="stars" title="Điểm trung bình: ${avg.toFixed(
          2
        )}">${renderStars(avg)}</span>
        <span class="rating-count">(${count})</span>
      </div>

      <div class="rating-actions" style="margin-left:auto; display:flex; flex-direction:column; gap:6px;">
        <button type="button" class="btn-review"
                data-action="review"
                data-source="${source}"
                data-id="${recipe.id}">
          Đánh giá
        </button>

        <button type="button" class="btn-review"
                data-action="nutrition"
                data-source="${source}"
                data-id="${recipe.id}">
          🥗 Dinh dưỡng
        </button>
      </div>
    </div>
  `;
}

function createDefaultCard(recipe, index) {
  const baseImg = buildImageUrl(recipe.image);

  // ✅ nếu không có ảnh -> dùng ảnh cố định img_1.jpg, img_2.jpg...
  const fixedCardImg = getCardImageByIndex(index);
  const imgUrl = baseImg || fixedCardImg;

  const title = escapeHtml(recipe.title || "Món ăn gợi ý");
  const category = escapeHtml(recipe.category || "Khác");
  const note = escapeHtml(recipe.note || "");
  const ingredientsShort = truncate(recipe.ingredients || "", 90);

  return `
    <article class="recipe-card">
      <div class="recipe-card-thumb">
        <img src="${imgUrl}" alt="${title}"
             loading="lazy"
             onerror="this.onerror=null; this.src='${pickDefaultImage(
               index
             )}';" />
        <span class="badge badge-default">Gợi ý</span>
      </div>
      <div class="recipe-card-body">
        <h3 class="recipe-card-title">${title}</h3>
        <p class="recipe-card-meta">${category}</p>

        ${createRatingRow(recipe, "default")}

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
             onerror="this.onerror=null; this.src='${pickDefaultImage(
               index
             )}';" />
        <span class="badge badge-user">Của bạn</span>
      </div>
      <div class="recipe-card-body">
        <h3 class="recipe-card-title">${title}</h3>
        <p class="recipe-card-meta">${category}</p>

        ${createRatingRow(recipe, "user")}

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
                  data-source="user"
                  data-id="${recipe.id}">
            Xóa
          </button>
        </div>
      </div>
    </article>
  `;
}

// =======================
// RENDER (áp dụng search + dietary)
// =======================
function filterBySearchAndDiet(list, searchTerm) {
  const q = String(searchTerm || "")
    .trim()
    .toLowerCase();

  return (list || []).filter((r) => {
    // search
    const okSearch =
      !q ||
      String(r.title || "")
        .toLowerCase()
        .includes(q) ||
      String(r.ingredients || "")
        .toLowerCase()
        .includes(q);

    if (!okSearch) return false;

    // dietary filters
    if (!matchDiet(r)) return false;

    return true;
  });
}

function renderDefaultRecipes(searchTerm = "") {
  if (!defaultListEl) return;

  const filtered = filterBySearchAndDiet(defaultRecipes, searchTerm);

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

  const filtered = filterBySearchAndDiet(userRecipes, searchTerm);

  if (!filtered.length) {
    userListEl.innerHTML =
      '<p class="empty-text">Chưa có công thức phù hợp. Hãy thử từ khoá khác hoặc đổi bộ lọc 👩‍🍳</p>';
    if (emptyUserText) emptyUserText.style.display = "block";
    return;
  }

  userListEl.innerHTML = filtered
    .map((recipe, index) => createUserCard(recipe, index))
    .join("");
  if (emptyUserText) emptyUserText.style.display = "none";
}

// =======================
// FETCH
// =======================
async function loadDefaultRecipes() {
  if (!defaultListEl) return;

  defaultListEl.innerHTML =
    '<p class="loading-text">Đang tải công thức gợi ý...</p>';

  try {
    const res = await fetch("/default-recipes/");
    if (!res.ok) throw new Error("Failed to load default recipes");
    defaultRecipes = await res.json();
    defaultRecipes = attachDietTags(defaultRecipes);
    applySearch();
  } catch (err) {
    console.error(err);
    defaultListEl.innerHTML =
      '<p class="empty-text">Không tải được công thức gợi ý.</p>';
  }
}

function rebuildDbTitleMap() {
  dbTitleToId = new Map();
  userRecipes.forEach((r) => {
    const t = String(r.title || "")
      .trim()
      .toLowerCase();
    if (t) dbTitleToId.set(t, Number(r.id));
  });
}

async function loadUserRecipes() {
  if (!userListEl) return;

  userListEl.innerHTML =
    '<p class="loading-text">Đang tải công thức của bạn...</p>';

  try {
    const res = await fetch("/api/recipes/");
    if (!res.ok) throw new Error("Failed to load recipes");
    userRecipes = await res.json();
    userRecipes = attachDietTags(userRecipes);

    rebuildDbTitleMap();
    applySearch();
  } catch (err) {
    console.error(err);
    userListEl.innerHTML =
      '<p class="empty-text">Không tải được công thức người dùng.</p>';
  }
}

// =======================
// SEARCH
// =======================
function applySearch() {
  updateDietCountUI();
  const term = (searchInput && searchInput.value) || "";
  renderDefaultRecipes(term);
  renderUserRecipes(term);
}

// =======================
// REVIEW HELPERS
// =======================
async function ensureRecipeExistsInDb(recipeObj) {
  if (recipeObj.source === "user") return Number(recipeObj.id);

  const key = String(recipeObj.title || "")
    .trim()
    .toLowerCase();
  if (key && dbTitleToId.has(key)) return dbTitleToId.get(key);

  const fd = new FormData();
  fd.append("title", recipeObj.title || "Công thức gợi ý");
  fd.append("ingredients", recipeObj.ingredients || "");
  fd.append("steps", recipeObj.steps || "");
  fd.append("note", recipeObj.note || "");
  fd.append("category", recipeObj.category || "");

  const res = await fetch("/api/recipes/", { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || "Không tạo được recipe vào DB");

  const newId = Number(data.id);
  if (key && Number.isFinite(newId)) dbTitleToId.set(key, newId);

  await loadUserRecipes();
  applySearch();
  return newId;
}

async function fetchAndRefreshRecipeStats(recipeId) {
  try {
    const res = await fetch(`/api/recipes/${recipeId}`);
    if (!res.ok) return;
    const data = await res.json();

    const avg = safeNumber(data.avg_rating, 0);
    const cnt = safeNumber(data.review_count, 0);

    const uid = Number(recipeId);
    const uidx = userRecipes.findIndex((x) => Number(x.id) === uid);
    if (uidx >= 0) {
      userRecipes[uidx].avg_rating = avg;
      userRecipes[uidx].review_count = cnt;
    }

    const t = String(data.title || "")
      .trim()
      .toLowerCase();
    if (t) {
      defaultRecipes = defaultRecipes.map((r) => {
        const rt = String(r.title || "")
          .trim()
          .toLowerCase();
        if (rt === t) return { ...r, avg_rating: avg, review_count: cnt };
        return r;
      });
    }

    applySearch();
  } catch (e) {
    console.warn("Không refresh được stats:", e);
  }
}

// =======================
// CLICK HANDLER
// =======================
function findRecipeBySourceAndId(source, id) {
  if (source === "default") {
    return defaultRecipes.find((r) => String(r.id) === String(id)) || null;
  }
  return userRecipes.find((r) => String(r.id) === String(id)) || null;
}

function handleListClick(e) {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;

  const action = btn.dataset.action;
  const source = btn.dataset.source;
  const id = btn.dataset.id;

  if (action === "delete") {
    if (!id) return;

    (async () => {
      if (!confirm("Bạn có chắc muốn xóa công thức này?")) return;
      try {
        const res = await fetch(`/api/recipes/${id}`, { method: "DELETE" });
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
    })();
    return;
  }

  if (action === "review") {
    if (!id) return;

    let recipeObj = null;
    if (source === "default") {
      recipeObj = defaultRecipes.find((r) => String(r.id) === String(id));
      if (!recipeObj) return;
      recipeObj = { ...recipeObj, source: "default" };
    } else {
      recipeObj = userRecipes.find((r) => String(r.id) === String(id));
      if (!recipeObj) return;
      recipeObj = { ...recipeObj, source: "user" };
    }

    openReviewModal(recipeObj);
    return;
  }

  // ✅ Nutrition: lưu món sang sessionStorage + chuyển trang
  if (action === "nutrition") {
    if (!id) return;

    const r = findRecipeBySourceAndId(source, id);
    if (!r) {
      window.location.href = `/nutrition?source=${encodeURIComponent(
        source
      )}&id=${encodeURIComponent(id)}`;
      return;
    }

    const payload = {
      source,
      id: String(id),
      title: r.title || "",
      category: r.category || "",
      ingredients: r.ingredients || "",
      note: r.note || "",
      // demo nutrition để trang nutrition tính tổng nhiều món
      nutrition: makeMockNutrition(r),
      // demo dietary tags
      diet: r.diet || inferDietTags(r),
    };

    try {
      sessionStorage.setItem(
        "nutrition:selectedRecipe",
        JSON.stringify(payload)
      );
    } catch (e) {
      // ignore
    }

    window.location.href = `/nutrition?source=${encodeURIComponent(
      source
    )}&id=${encodeURIComponent(id)}`;
    return;
  }
}

if (defaultListEl) defaultListEl.addEventListener("click", handleListClick);
if (userListEl) userListEl.addEventListener("click", handleListClick);

// =======================
// SUBMIT REVIEW
// =======================
async function submitReview() {
  if (!currentReviewRecipe) {
    alert("Thiếu recipe để đánh giá.");
    return;
  }

  const rating = Number(currentSelectedRating || 0);
  if (rating < 1 || rating > 5) {
    alert("Vui lòng chọn số sao (1–5).");
    return;
  }

  const reviewerName = reviewerNameEl
    ? String(reviewerNameEl.value || "").trim()
    : "";
  const comment = reviewCommentEl
    ? String(reviewCommentEl.value || "").trim()
    : "";

  if (btnReviewSubmit) {
    btnReviewSubmit.disabled = true;
    btnReviewSubmit.textContent = "Đang gửi...";
  }

  try {
    const dbRecipeId = await ensureRecipeExistsInDb(currentReviewRecipe);

    const fd = new FormData();
    fd.append("rating", String(rating));
    fd.append("reviewer_name", reviewerName || "Ẩn danh");
    fd.append("comment", comment);

    const res = await fetch(`/api/recipes/${dbRecipeId}/reviews`, {
      method: "POST",
      body: fd,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.detail || "Gửi đánh giá thất bại.");
      return;
    }

    closeReviewModal();
    alert("✅ Đã gửi đánh giá thành công!");
    await fetchAndRefreshRecipeStats(dbRecipeId);
  } catch (err) {
    console.error(err);
    alert(err.message || "Lỗi khi gửi đánh giá.");
  } finally {
    if (btnReviewSubmit) {
      btnReviewSubmit.disabled = false;
      btnReviewSubmit.textContent = "Gửi";
    }
  }
}

if (btnReviewSubmit) btnReviewSubmit.addEventListener("click", submitReview);

// =======================
// INIT
// =======================
document.addEventListener("DOMContentLoaded", () => {
  loadDefaultRecipes();
  loadUserRecipes();

  if (btnSearch) btnSearch.addEventListener("click", applySearch);

  if (searchInput) {
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        applySearch();
      }
    });
  }

  // diet events
  if (dietWrap) {
    const dietInputs = Array.from(
      document.querySelectorAll('input[name="diet"]')
    );
    dietInputs.forEach((ip) => ip.addEventListener("change", applySearch));
  }

  if (btnClearDiet) {
    btnClearDiet.addEventListener("click", () => {
      Array.from(document.querySelectorAll('input[name="diet"]')).forEach(
        (ip) => {
          ip.checked = false;
        }
      );
      applySearch();
    });
  }

  updateDietCountUI();
});
