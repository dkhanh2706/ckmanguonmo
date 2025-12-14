// Lấy tên món từ query
const params = new URLSearchParams(window.location.search);
const title = params.get("title");

if (title) {
  document.getElementById("recipe-name").textContent =
    "🍽️ Món ăn: " + title;
}

// MOCK DATA DINH DƯỠNG
const dataNutrition = {
  labels: ["Protein", "Carb", "Fat", "Chất xơ"],
  datasets: [
    {
      label: "Thành phần (%)",
      data: [30, 40, 20, 10],
    },
  ],
};

const ctx = document.getElementById("nutritionChart");

new Chart(ctx, {
  type: "doughnut",
  data: dataNutrition,
  options: {
    responsive: true,
    plugins: {
      legend: {
        position: "bottom",
      },
    },
  },
});
