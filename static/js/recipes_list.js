// static/js/recipes_list.js

let defaultRecipes = [];
let userRecipes = [];

const defaultListEl = document.getElementById("default-recipes-list");
const userListEl = document.getElementById("user-recipes-list");
const emptyUserText = document.getElementById("user-recipes-empty");

const searchInput = document.getElementById("search-input");
const btnSearch = document.getElementById("btn-search");

// ----- RENDER CARD -----
function createDefaultCard(recipe) {
    return `
    <article class="recipe-card recipe-card-default">
        <div class="recipe-tag">Gợi ý</div>
        <h3 class="recipe-title">${recipe.title}</h3>
        <p class="recipe-category">${recipe.category || "Khác"}</p>
        <p class="recipe-note">${recipe.note || ""}</p>
        <p class="recipe-ingredients">
            <strong>Nguyên liệu chính:</strong> ${recipe.ingredients}
        </p>
    </article>
    `;
}

function createUserCard(recipe) {
    const isDefault = recipe.id <= 3; // nếu bạn dùng id 1,2,3 làm mặc định trong DB

    return `
    <article class="recipe-card">
        ${isDefault ? '<div class="recipe-tag">Mặc định</div>' : ""}
        <h3 class="recipe-title">${recipe.title}</h3>
        <p class="recipe-category">${recipe.category || "Khác"}</p>
        <p class="recipe-note">${recipe.note || ""}</p>
        <div class="recipe-actions">
            <a href="/recipes/${recipe.id}/edit" class="btn-small">Xem chi tiết</a>
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

// ----- RENDER LISTS -----
function renderDefaultRecipes(term = "") {
    if (!defaultListEl) return;
    const q = term.trim().toLowerCase();

    const filtered = defaultRecipes.filter((r) => {
        if (!q) return true;
        return (
            r.title.toLowerCase().includes(q) ||
            (r.ingredients || "").toLowerCase().includes(q)
        );
    });

    defaultListEl.innerHTML = filtered
        .map((r) => createDefaultCard(r))
        .join("");

    if (!filtered.length) {
        defaultListEl.innerHTML =
            '<p class="empty-text">Không tìm thấy công thức gợi ý phù hợp.</p>';
    }
}

function renderUserRecipes(term = "") {
    if (!userListEl) return;
    const q = term.trim().toLowerCase();

    const filtered = userRecipes.filter((r) => {
        if (!q) return true;
        return (
            r.title.toLowerCase().includes(q) ||
            (r.ingredients || "").toLowerCase().includes(q)
        );
    });

    userListEl.innerHTML = filtered.map(createUserCard).join("");

    if (filtered.length === 0) {
        emptyUserText.style.display = "block";
    } else {
        emptyUserText.style.display = "none";
    }
}

// ----- FETCH DATA -----
async function loadDefaultRecipes() {
    try {
        const res = await fetch("/default-recipes");
        if (!res.ok) throw new Error("Failed to load default recipes");
        defaultRecipes = await res.json();
        renderDefaultRecipes();
    } catch (err) {
        console.error(err);
        if (defaultListEl) {
            defaultListEl.innerHTML =
                '<p class="empty-text">Không tải được công thức gợi ý.</p>';
        }
    }
}

async function loadUserRecipes() {
    try {
        const res = await fetch("/api/recipes/");
        if (!res.ok) throw new Error("Failed to load recipes");
        userRecipes = await res.json();
        renderUserRecipes();
    } catch (err) {
        console.error(err);
        if (userListEl) {
            userListEl.innerHTML =
                '<p class="empty-text">Không tải được công thức người dùng.</p>';
        }
    }
}

// ----- SỰ KIỆN TÌM KIẾM -----
function applySearch() {
    const term = searchInput.value || "";
    renderDefaultRecipes(term);
    renderUserRecipes(term);
}

// ----- SỰ KIỆN NÚT SỬA/XÓA (USER RECIPE) -----
if (userListEl) {
    userListEl.addEventListener("click", async (e) => {
        const btn = e.target.closest("button[data-action]");
        if (!btn) return;

        const id = btn.dataset.id;
        const action = btn.dataset.action;

        if (action === "edit") {
            window.location.href = `/recipes/${id}/edit`;
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
                // Xóa thành công → load lại
                await loadUserRecipes();
                applySearch();
            } catch (err) {
                console.error(err);
                alert("Có lỗi khi xóa công thức.");
            }
        }
    });
}

// ----- INIT -----
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
