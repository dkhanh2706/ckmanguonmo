// static/js/meal_planner.js

const STUDENT_API = "/api/student/recipes";
const GYM_API = "/api/gym/recipes";

// API lưu planner (theo routes_planner.py của bạn)
const PLANNER_WEEK_API = "/planner/week"; // GET ?start=YYYY-MM-DD
const PLANNER_SLOT_API = "/planner/slot"; // POST {date, meal_type, recipe_id, note}

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

document.addEventListener("DOMContentLoaded", async () => {
  // Render UI trước để không bị trống
  renderWeekCalendar();
  loadAllRecipes();

  document
    .getElementById("prev-week-btn")
    .addEventListener("click", () => changeWeek(-7));
  document
    .getElementById("next-week-btn")
    .addEventListener("click", () => changeWeek(7));
  document.getElementById("today-week-btn").addEventListener("click", () => {
    currentWeekStart = getStartOfWeek(new Date());
    refreshWeek(); // load + render
  });

  // ✅ Load lịch từ backend cho tuần hiện tại (nếu server đang chạy)
  await refreshWeek();
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
  refreshWeek(); // ✅ load + render
}

async function refreshWeek() {
  // 1) cố gắng load từ backend (nếu server tắt thì bỏ qua)
  await loadPlannerFromServerForCurrentWeek();
  // 2) render UI từ plannerState
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
    weekLabel.textContent = `Tuần ${formatVNDate(start)} – ${formatVNDate(end)}`;
  }

  // góc trống
  grid.appendChild(document.createElement("div"));

  // header 7 ngày
  weekDates.forEach((date, idx) => {
    const header = document.createElement("div");
    header.className = "calendar-header";
    const iso = formatDateISO(date);
    header.innerHTML = `<div>${getWeekdayLabel(idx)}</div><div>${formatVNDate(
      date
    )}</div><div class="small-muted">${iso}</div>`;
    grid.appendChild(header);
  });

  // rows theo bữa
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
          alert(`Ngày ${iso} – ${slot.label}:\n- ` + detail.join("\n- "));
        } else {
          alert(`Ngày ${iso} – ${slot.label} hiện chưa có món nào.`);
        }
      });

      // (optional) Double click để xoá món trong ô + lưu backend
      cell.addEventListener("dblclick", async () => {
        clearCell(iso, slot.key);
        renderCellContent(cell, iso, slot.key);

        // lưu xoá xuống backend (nếu server đang chạy)
        try {
          await saveSlotToServer(iso, slot.key, null);
        } catch (e) {
          console.warn("Không xoá được (có thể server đang tắt):", e?.message || e);
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
  if (!dayState || !dayState[slotKey] || !dayState[slotKey].length) return;

  dayState[slotKey].forEach((item) => {
    const tag = document.createElement("div");
    tag.className = `meal-tag ${item.source || ""}`;
    tag.textContent = item.title;
    cell.appendChild(tag);
  });
}

function setCellSingleRecipe(dateISO, slotKey, recipeObjOrNull) {
  if (!plannerState[dateISO]) plannerState[dateISO] = {};

  if (!recipeObjOrNull) {
    plannerState[dateISO][slotKey] = [];
    return;
  }

  // ✅ 1 ô chỉ lưu 1 món (phù hợp backend /planner/slot)
  plannerState[dateISO][slotKey] = [
    {
      id: recipeObjOrNull.id,
      title: recipeObjOrNull.title,
      source: recipeObjOrNull.source,
    },
  ];
}

function clearCell(dateISO, slotKey) {
  if (!plannerState[dateISO]) plannerState[dateISO] = {};
  plannerState[dateISO][slotKey] = [];
}

/* ========== DRAG & DROP ========== */

function handleCellDragOver(e) {
  e.preventDefault();
  e.currentTarget.classList.add("highlight-drop");
}

function handleCellDragLeave(e) {
  e.currentTarget.classList.remove("highlight-drop");
}

async function handleCellDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove("highlight-drop");

  const payload = e.dataTransfer.getData("application/json");
  if (!payload) return;

  const recipe = JSON.parse(payload);

  const dateISO = e.currentTarget.dataset.date;
  const slotKey = e.currentTarget.dataset.slot;

  // ✅ update UI ngay
  setCellSingleRecipe(dateISO, slotKey, recipe);
  renderCellContent(e.currentTarget, dateISO, slotKey);

  // ✅ lưu xuống backend (nếu server đang chạy)
  try {
    await saveSlotToServer(dateISO, slotKey, recipe.id);
  } catch (err) {
    // đúng yêu cầu của bạn: tắt uvicorn thì khỏi lưu cũng được
    console.warn("Không lưu được (có thể server đang tắt):", err?.message || err);
  }
}

/* ========== PLANNER API (SAVE/LOAD) ========== */

async function saveSlotToServer(dateISO, slotKey, recipeIdOrNull) {
  // backend cần meal_type (breakfast/lunch/dinner) và recipe_id (int|null)
  const body = {
    date: dateISO,
    meal_type: slotKey,
    recipe_id: recipeIdOrNull,
    note: "",
  };

  const res = await fetch(PLANNER_SLOT_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`POST /planner/slot failed (${res.status}): ${text}`);
  }
  return await res.json();
}

async function loadPlannerFromServerForCurrentWeek() {
  const startISO = formatDateISO(currentWeekStart);

  try {
    const url = `${PLANNER_WEEK_API}?start=${encodeURIComponent(startISO)}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });

    if (!res.ok) {
      // server chạy nhưng lỗi route / auth / ...
      // không throw mạnh để UI vẫn hoạt động local
      console.warn(`GET /planner/week failed: ${res.status}`);
      return;
    }

    const data = await res.json();
    // data.slots = [{date, meal_type, recipe_id, note}, ...]

    // Build lookup recipe_id -> title (nếu backend trả recipes)
    const recipeTitleById = {};
    if (Array.isArray(data.recipes)) {
      data.recipes.forEach((r) => {
        recipeTitleById[r.id] = r.title || `Recipe #${r.id}`;
      });
    }

    // Clear state cho 7 ngày trong tuần (để không dính tuần trước)
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() + i);
      weekDates.push(formatDateISO(d));
    }
    weekDates.forEach((iso) => {
      plannerState[iso] = plannerState[iso] || {};
      SLOTS.forEach((s) => (plannerState[iso][s.key] = []));
    });

    // Apply slots từ server
    (data.slots || []).forEach((s) => {
      if (!s?.date || !s?.meal_type) return;
      if (!weekDates.includes(s.date)) return;

      if (!plannerState[s.date]) plannerState[s.date] = {};
      if (!plannerState[s.date][s.meal_type]) plannerState[s.date][s.meal_type] = [];

      if (s.recipe_id) {
        const title = recipeTitleById[s.recipe_id] || `Recipe #${s.recipe_id}`;
        // source không biết (student/gym) nên để rỗng cho khỏi sai màu
        plannerState[s.date][s.meal_type] = [{ id: s.recipe_id, title, source: "" }];
      } else {
        plannerState[s.date][s.meal_type] = [];
      }
    });
  } catch (err) {
    // ✅ server tắt / mạng lỗi => bỏ qua, dùng local state
    console.warn("Không load được planner từ server (có thể server đang tắt):", err?.message || err);
  }
}

/* ========== LOAD DANH SÁCH MÓN ========== */

async function loadAllRecipes() {
  try {
    const [svRes, gymRes] = await Promise.all([fetch(STUDENT_API), fetch(GYM_API)]);

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
