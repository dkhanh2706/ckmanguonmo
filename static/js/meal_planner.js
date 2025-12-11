// static/js/meal_planner.js

const STUDENT_API = "/api/student/recipes";
const GYM_API = "/api/gym/recipes";

// Lưu state planner: { [date]: { [slot]: [ {id, title, source} ] } }
const plannerState = {};

// Các slot mặc định trong ngày
const SLOTS = [
  { key: "breakfast", label: "Bữa sáng" },
  { key: "lunch", label: "Bữa trưa" },
  { key: "dinner", label: "Bữa tối" },
];

// State tuần hiện tại (mặc định tuần chứa "hôm nay")
let currentWeekStart = getStartOfWeek(new Date());

document.addEventListener("DOMContentLoaded", () => {
  renderWeekCalendar();
  loadAllRecipes();

  document
    .getElementById("prev-week-btn")
    .addEventListener("click", () => changeWeek(-7));
  document
    .getElementById("next-week-btn")
    .addEventListener("click", () => changeWeek(7));
  document
    .getElementById("today-week-btn")
    .addEventListener("click", () => {
      currentWeekStart = getStartOfWeek(new Date());
      renderWeekCalendar();
    });
});

/* ========== LỊCH TUẦN ========== */

function getStartOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = CN
  const diff = (day + 6) % 7; // về thứ 2
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateISO(date) {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

function formatVNDate(date) {
  const d = date.getDate();
  const m = date.getMonth() + 1;
  return `${d}/${m}`;
}

function getWeekdayLabel(idx) {
  const labels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  return labels[idx] || "";
}

function changeWeek(deltaDays) {
  const d = new Date(currentWeekStart);
  d.setDate(d.getDate() + deltaDays);
  currentWeekStart = getStartOfWeek(d);
  renderWeekCalendar();
}

function renderWeekCalendar() {
  const root = document.getElementById("calendar-root");
  if (!root) return;

  root.innerHTML = "";

  const grid = document.createElement("div");
  grid.className = "calendar-grid";

  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + i);
    weekDates.push(d);
  }

  const weekLabel = document.getElementById("week-range-label");
  if (weekLabel) {
    const start = weekDates[0];
    const end = weekDates[6];
    weekLabel.textContent = `Tuần ${formatVNDate(start)} – ${formatVNDate(
      end
    )}`;
  }

  grid.appendChild(document.createElement("div"));

  weekDates.forEach((date, idx) => {
    const header = document.createElement("div");
    header.className = "calendar-header";
    const iso = formatDateISO(date);
    header.innerHTML = `<div>${getWeekdayLabel(
      idx
    )}</div><div>${formatVNDate(date)}</div><div class="small-muted">${iso}</div>`;
    grid.appendChild(header);
  });

  SLOTS.forEach((slot) => {
    const labelCell = document.createElement("div");
    labelCell.className = "calendar-slot-label";
    labelCell.textContent = slot.label;
    grid.appendChild(labelCell);

    weekDates.forEach((date) => {
      const iso = formatDateISO(date);
      const cell = document.createElement("div");
      cell.className = "calendar-cell";
      cell.dataset.date = iso;
      cell.dataset.slot = slot.key;

      cell.addEventListener("dragover", handleCellDragOver);
      cell.addEventListener("dragleave", handleCellDragLeave);
      cell.addEventListener("drop", handleCellDrop);

      cell.addEventListener("click", () => {
        const detail = getCellText(iso, slot.key);
        if (detail) {
          alert(
            `Ngày ${iso} – ${slot.label}:\n- ` + detail.join("\n- ")
          );
        } else {
          alert(`Ngày ${iso} – ${slot.label} hiện chưa có món nào.`);
        }
      });

      renderCellContent(cell, iso, slot.key);
      grid.appendChild(cell);
    });
  });

  root.appendChild(grid);
}

function getCellText(dateISO, slotKey) {
  const dayState = plannerState[dateISO];
  if (!dayState || !dayState[slotKey] || !dayState[slotKey].length) {
    return null;
  }
  return dayState[slotKey].map((r) => r.title);
}

function renderCellContent(cell, dateISO, slotKey) {
  cell.innerHTML = "";
  const dayState = plannerState[dateISO];
  if (!dayState || !dayState[slotKey]) return;

  dayState[slotKey].forEach((item) => {
    const tag = document.createElement("div");
    tag.className = `meal-tag ${item.source}`;
    tag.textContent = item.title;
    cell.appendChild(tag);
  });
}

/* ========== DRAG & DROP ========== */

function handleCellDragOver(e) {
  e.preventDefault();
  e.currentTarget.classList.add("highlight-drop");
}

function handleCellDragLeave(e) {
  e.currentTarget.classList.remove("highlight-drop");
}

function handleCellDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove("highlight-drop");

  const payload = e.dataTransfer.getData("application/json");
  if (!payload) return;
  const recipe = JSON.parse(payload);

  const dateISO = e.currentTarget.dataset.date;
  const slotKey = e.currentTarget.dataset.slot;

  if (!plannerState[dateISO]) plannerState[dateISO] = {};
  if (!plannerState[dateISO][slotKey]) plannerState[dateISO][slotKey] = [];

  plannerState[dateISO][slotKey].push({
    id: recipe.id,
    title: recipe.title,
    source: recipe.source,
  });

  renderCellContent(e.currentTarget, dateISO, slotKey);
}

/* ========== LOAD DANH SÁCH MÓN ========== */

async function loadAllRecipes() {
  try {
    const [svRes, gymRes] = await Promise.all([
      fetch(STUDENT_API),
      fetch(GYM_API),
    ]);

    const svData = svRes.ok ? await svRes.json() : [];
    const gymData = gymRes.ok ? await gymRes.json() : [];

    renderRecipeList("student-recipes", svData, "student");
    renderRecipeList("gym-recipes", gymData, "gym");
  } catch (err) {
    console.error("Lỗi load recipes:", err);
  }
}

function renderRecipeList(containerId, recipes, sourceType) {
  const root = document.getElementById(containerId);
  if (!root) return;

  if (!recipes || !recipes.length) {
    root.innerHTML = `<p class="small-muted">Chưa có công thức nào.</p>`;
    return;
  }

  root.innerHTML = "";
  recipes.forEach((r) => {
    const card = document.createElement("div");
    card.className = "recipe-card";
    card.draggable = true;

    card.addEventListener("dragstart", (e) => {
      e.dataTransfer.effectAllowed = "copy";
      e.dataTransfer.setData(
        "application/json",
        JSON.stringify({
          id: r.id,
          title: r.title,
          source: sourceType,
        })
      );
    });

    const title = document.createElement("div");
    title.className = "recipe-card-title";
    title.textContent = r.title;

    const note = document.createElement("div");
    note.className = "recipe-card-note";
    note.textContent = r.note || "";

    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = r.category || "Không phân loại";

    card.appendChild(title);
    if (r.note) card.appendChild(note);
    card.appendChild(chip);

    root.appendChild(card);
  });
}
