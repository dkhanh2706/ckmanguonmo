// static/js/recipes_list.js

const API_BASE = "/api/recipes";

document.addEventListener("DOMContentLoaded", () => {
    loadRecipes();

    const searchInput = document.getElementById("search");
    if (searchInput) {
        searchInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                searchRecipes();
            }
        });
    }
});

// Gọi API lấy danh sách recipes (có hỗ trợ search)
async function loadRecipes(search = "") {
    const container = document.getElementById("recipe-list");
    if (!container) return;

    container.innerHTML = `<p class="empty">Đang tải dữ liệu...</p>`;

    try {
        const url = new URL(API_BASE, window.location.origin);
        if (search) {
            url.searchParams.set("search", search);
        }

        const res = await fetch(url);
        if (!res.ok) {
            throw new Error("Không tải được danh sách công thức");
        }

        const data = await res.json();

        if (data.length === 0) {
            container.innerHTML = `<p class="empty">Chưa có công thức nào. Hãy thêm một món mới 🧑‍🍳</p>`;
            return;
        }

        container.innerHTML = "";

        data.forEach((recipe) => {
            const card = document.createElement("div");
            card.className = "recipe-card";

            const imgSrc = recipe.image
                ? `/${recipe.image}`
                : "https://via.placeholder.com/400x250?text=No+Image";

            card.innerHTML = `
                <img src="${imgSrc}" alt="${recipe.title}">
                <h3>${recipe.title}</h3>
                <p>${recipe.category || "Không có danh mục"}</p>
                <div style="display:flex; gap:8px; margin-top:8px;">
                    <a href="/recipes/${recipe.id}/edit" class="btn-small">Sửa</a>
                    <button class="btn-small btn-delete" data-id="${recipe.id}">Xóa</button>
                </div>
            `;

            container.appendChild(card);
        });

        // Gán sự kiện xóa sau khi render xong
        document.querySelectorAll(".btn-delete").forEach((btn) => {
            btn.addEventListener("click", (e) => {
                const id = e.target.getAttribute("data-id");
                confirmDelete(id);
            });
        });
    } catch (err) {
        console.error(err);
        container.innerHTML = `<p class="empty">Có lỗi khi tải dữ liệu. Vui lòng thử lại.</p>`;
    }
}

function searchRecipes() {
    const searchInput = document.getElementById("search");
    const value = searchInput ? searchInput.value.trim() : "";
    loadRecipes(value);
}

async function confirmDelete(id) {
    const ok = confirm("Bạn có chắc chắn muốn xóa công thức này?");
    if (!ok) return;

    try {
        const res = await fetch(`${API_BASE}/${id}`, {
            method: "DELETE"
        });

        if (!res.ok) {
            throw new Error("Xóa không thành công");
        }

        alert("Đã xóa công thức");
        loadRecipes();
    } catch (err) {
        console.error(err);
        alert("Có lỗi khi xóa. Vui lòng thử lại.");
    }
}
