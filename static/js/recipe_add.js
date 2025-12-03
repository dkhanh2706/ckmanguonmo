// static/js/recipe_add.js

const API_BASE = "/api/recipes";

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("recipe-form");
    if (!form) return;

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        submitRecipe();
    });
});

async function submitRecipe() {
    const form = document.getElementById("recipe-form");
    if (!form) return;

    const formData = new FormData(form);

    try {
        const res = await fetch(API_BASE, {
            method: "POST",
            body: formData
        });

        if (!res.ok) {
            const text = await res.text();
            console.error(text);
            alert("Thêm công thức thất bại. Kiểm tra lại dữ liệu.");
            return;
        }

        alert("Đã thêm công thức thành công! 🎉");
        window.location.href = "/recipes";
    } catch (err) {
        console.error(err);
        alert("Có lỗi kết nối tới server.");
    }
}
