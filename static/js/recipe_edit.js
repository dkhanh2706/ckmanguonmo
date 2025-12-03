// static/js/recipe_edit.js

const API_BASE = "/api/recipes";

// recipeId được gán từ template:
// const recipeId = "{{ recipe_id }}";

document.addEventListener("DOMContentLoaded", () => {
    if (!recipeId) {
        alert("Không tìm thấy ID công thức.");
        return;
    }
    loadRecipeDetail(recipeId);

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

        document.getElementById("title").value = data.title || "";
        document.getElementById("ingredients").value = data.ingredients || "";
        document.getElementById("steps").value = data.steps || "";
        document.getElementById("note").value = data.note || "";

        const categorySelect = document.getElementById("category");
        if (categorySelect) {
            // nếu muốn có sẵn các option thì có thể bổ sung JS ở đây
            if (data.category) {
                // nếu option đã tồn tại
                const optionExists = Array.from(categorySelect.options)
                    .some(opt => opt.value === data.category);
                if (!optionExists && data.category) {
                    const opt = document.createElement("option");
                    opt.value = data.category;
                    opt.textContent = data.category;
                    categorySelect.appendChild(opt);
                }
                categorySelect.value = data.category;
            }
        }

        // preview ảnh hiện tại
        const preview = document.getElementById("image-preview");
        if (preview) {
            preview.innerHTML = "";
            if (data.image) {
                const img = document.createElement("img");
                img.src = `/${data.image}`;
                img.alt = data.title;
                preview.appendChild(img);
            } else {
                preview.innerHTML = `<p class="text-muted">Chưa có ảnh cho công thức này.</p>`;
            }
        }
    } catch (err) {
        console.error(err);
        alert("Có lỗi khi tải chi tiết công thức.");
    }
}

function handleImagePreview(e) {
    const file = e.target.files[0];
    const preview = document.getElementById("image-preview");
    if (!preview) return;

    if (!file) {
        return;
    }

    const url = URL.createObjectURL(file);
    preview.innerHTML = "";
    const img = document.createElement("img");
    img.src = url;
    img.alt = "Ảnh mới";
    preview.appendChild(img);
}

async function updateRecipe() {
    const form = document.getElementById("edit-form");
    if (!form) return;

    const formData = new FormData(form);

    try {
        const res = await fetch(`${API_BASE}/${recipeId}`, {
            method: "PUT",
            body: formData
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
