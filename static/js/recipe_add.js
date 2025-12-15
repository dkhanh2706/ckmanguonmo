// static/js/recipe_add.js

const API_CREATE_RECIPE = "/api/recipes/"; // ✅ đúng với prefix "/api/recipes" + @post("/")

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("recipe-form");
  const btnSave = document.getElementById("btn-save");
  const imageInput = document.getElementById("image");
  const preview = document.getElementById("image-preview");

  if (!form || !btnSave) {
    console.error("Missing #recipe-form or #btn-save");
    return;
  }

  // Preview ảnh
  if (imageInput && preview) {
    imageInput.addEventListener("change", () => {
      const file = imageInput.files?.[0];
      preview.innerHTML = "";
      if (!file) return;

      const img = document.createElement("img");
      img.src = URL.createObjectURL(file);
      img.alt = "Preview";
      img.style.maxWidth = "240px";
      img.style.borderRadius = "14px";
      img.style.display = "block";
      img.style.marginTop = "10px";
      preview.appendChild(img);
    });
  }

  btnSave.addEventListener("click", async () => {
    if (btnSave.disabled) return;

    const title = document.getElementById("title")?.value?.trim();
    const ingredients = document.getElementById("ingredients")?.value?.trim();
    const steps = document.getElementById("steps")?.value?.trim();

    if (!title || !ingredients || !steps) {
      alert("⚠️ Vui lòng nhập đủ: Tên món, Nguyên liệu, Các bước nấu.");
      return;
    }

    const formData = new FormData(form);

    btnSave.disabled = true;
    const oldText = btnSave.textContent;
    btnSave.textContent = "Đang lưu...";

    try {
      const res = await fetch(API_CREATE_RECIPE, {
        method: "POST",
        body: formData,
      });

      let data = {};
      const ct = (res.headers.get("content-type") || "").toLowerCase();
      if (ct.includes("application/json")) data = await res.json();
      else data = { detail: await res.text() };

      console.log("CREATE recipe =>", res.status, data);

      if (!res.ok) {
        alert("❌ Lỗi: " + (data.detail || data.message || "Không rõ lỗi"));
        return;
      }

      alert("✅ Đã lưu công thức thành công!");
      window.location.href = "/recipes";
    } catch (err) {
      console.error(err);
      alert("⚠️ Không thể kết nối đến server.");
    } finally {
      btnSave.disabled = false;
      btnSave.textContent = oldText || "Lưu công thức";
    }
  });
});
