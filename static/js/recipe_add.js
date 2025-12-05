document.getElementById("btn-save").addEventListener("click", async () => {
    const form = document.getElementById("recipe-form");
    const formData = new FormData(form);

    try {
        const res = await fetch("/api/recipes", {
            method: "POST",
            body: formData
        });

        const data = await res.json();
        console.log("Server response:", data);

        if (!res.ok) {
            alert("❌ Lỗi server: " + (data.detail || "Không rõ lỗi"));
            return;
        }

        alert("✅ Đã lưu công thức thành công!");
        window.location.href = "/recipes";
    } catch (err) {
        console.error("Lỗi khi gửi request:", err);
        alert("⚠️ Không thể kết nối đến server.");
    }
});
