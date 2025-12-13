// static/js/meal_planner.js
// Weekly meal planner: render grid 3 meals x 7 days, drag-drop recipes into cells, save to DB.
// Endpoints expected:
//   GET  /planner/week?start=YYYY-MM-DD   -> {days:[...7], slots:[{date, meal_type, recipe_id, note}]}
//   POST /planner/slot                   -> accepts {date, meal_type, recipe_id, note} returns saved
//   GET  /api/student/recipes            -> [{id,title,...}]
//   GET  /api/gym/recipes                -> [{id,title,...}]

(() => {
  const DAY_LABELS = [
    "Thứ 2",
    "Thứ 3",
    "Thứ 4",
    "Thứ 5",
    "Thứ 6",
    "Thứ 7",
    "CN",
  ];
  const MEALS = [
    { key: "breakfast", label: "Bữa sáng" },
    { key: "lunch", label: "Bữa trưa" },
    { key: "dinner", label: "Bữa tối" },
  ];

  const elRoot = document.getElementById("calendar-root");
  const elWeekLabel = document.getElementById("week-range-label");

  const btnPrev = document.getElementById("prev-week-btn");
  const btnToday = document.getElementById("today-week-btn");
  const btnNext = document.getElementById("next-week-btn");

  const elStudent = document.getElementById("student-recipes");
  const elGym = document.getElementById("gym-recipes");

  // state
  let currentMonday = getMonday(new Date());
  let slotsMap = new Map(); // key: `${date}|${meal}` -> recipe_id
  let recipesMap = new Map(); // recipe_id -> {id,title,source}
  let selectedDayISO = new Date().toISOString().slice(0, 10);
  window.__selectedDayISO = selectedDayISO;

  // ---------------- helpers ----------------
  function pad2(n) {
    return String(n).padStart(2, "0");
  }
  function toISO(d) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }
  function addDays(d, n) {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  }
  function getMonday(d) {
    const x = new Date(d);
    const day = x.getDay(); // 0 Sun
    const diff = day === 0 ? -6 : 1 - day;
    x.setDate(x.getDate() + diff);
    x.setHours(0, 0, 0, 0);
    return x;
  }
  function fmtRange(monday) {
    const start = toISO(monday);
    const end = toISO(addDays(monday, 6));
    return `${start} → ${end}`;
  }
  function keySlot(dateISO, mealKey) {
    return `${dateISO}|${mealKey}`;
  }

  function escapeHtml(str = "") {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // ---------------- api ----------------
  async function getJSON(url) {
    const res = await fetch(url, { credentials: "same-origin" });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`GET ${url} failed: ${res.status} ${t}`);
    }
    return res.json();
  }
  async function postJSON(url, data) {
    const res = await fetch(url, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`POST ${url} failed: ${res.status} ${t}`);
    }
    return res.json();
  }

  // ---------------- recipes ----------------
  function recipeCard(r) {
    const div = document.createElement("div");
    div.className = "r-card";
    div.draggable = true;
    div.innerHTML = `
      <div class="r-title">${escapeHtml(r.title)}</div>
      <div class="r-note">Kéo thả vào lịch để lưu</div>
      <span class="chip">${
        r.source === "gym" ? "Gym / Healthy" : "Sinh viên"
      }</span>
    `;
    div.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData(
        "application/json",
        JSON.stringify({ recipe_id: r.id })
      );
      e.dataTransfer.effectAllowed = "copyMove";
    });
    return div;
  }

  async function loadRecipes() {
    const [student, gym] = await Promise.all([
      getJSON("/api/student/recipes"),
      getJSON("/api/gym/recipes"),
    ]);

    recipesMap.clear();
    elStudent.innerHTML = "";
    elGym.innerHTML = "";

    student.forEach((r) => recipesMap.set(r.id, { ...r, source: "student" }));
    gym.forEach((r) => recipesMap.set(r.id, { ...r, source: "gym" }));

    student.forEach((r) =>
      elStudent.appendChild(recipeCard({ ...r, source: "student" }))
    );
    gym.forEach((r) => elGym.appendChild(recipeCard({ ...r, source: "gym" })));
  }

  // ---------------- calendar render ----------------
  function renderCell(cell, dateISO, mealKey) {
    const rId = slotsMap.get(keySlot(dateISO, mealKey));

    if (!rId) {
      cell.innerHTML = `<div class="placeholder">Kéo món vào đây</div>`;
      cell.setAttribute("data-recipe-title", "");
      cell.setAttribute("data-recipe-class", "");
      return;
    }

    const r = recipesMap.get(rId);
    const title = r?.title || `Recipe #${rId}`;
    const cls = r?.source === "gym" ? "gym" : "student";

    cell.setAttribute("data-recipe-title", title);
    cell.setAttribute("data-recipe-class", cls);

    cell.innerHTML = `
      <span class="tag ${cls}">${escapeHtml(title)}</span>
      <div class="hint">(Chuột phải để xoá)</div>
    `;
  }

  function buildGrid(daysISO) {
    const grid = document.createElement("div");
    grid.className = "calendar-grid";

    // corner
    const corner = document.createElement("div");
    corner.className = "cal-head";
    corner.innerHTML = `<div>Bữa ăn</div><span class="iso">&nbsp;</span>`;
    grid.appendChild(corner);

    // header days
    daysISO.forEach((iso, idx) => {
      const h = document.createElement("div");
      h.className = "cal-head";
      h.innerHTML = `<div>${DAY_LABELS[idx]}</div><span class="iso">${iso}</span>`;
      grid.appendChild(h);
    });

    // rows meals
    for (const m of MEALS) {
      const lab = document.createElement("div");
      lab.className = "slot-label";
      lab.textContent = m.label;
      grid.appendChild(lab);

      for (const iso of daysISO) {
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.setAttribute("data-date", iso);
        cell.setAttribute("data-meal-type", m.key);
        cell.setAttribute("data-recipe-title", "");
        cell.setAttribute("data-recipe-class", "");

        renderCell(cell, iso, m.key);

        // select day for PDF Day
        cell.addEventListener("click", () => {
          selectedDayISO = iso;
          window.__selectedDayISO = selectedDayISO;

          document.querySelectorAll(".cell").forEach((c) => {
            c.style.outline = "";
          });
          cell.style.outline = "2px solid #93c5fd";
          cell.style.outlineOffset = "-2px";
        });

        // drag drop
        cell.addEventListener("dragover", (e) => {
          e.preventDefault();
          cell.classList.add("drop");
        });
        cell.addEventListener("dragleave", () => cell.classList.remove("drop"));

        cell.addEventListener("drop", async (e) => {
          e.preventDefault();
          cell.classList.remove("drop");
          let payload;
          try {
            payload = JSON.parse(
              e.dataTransfer.getData("application/json") || "{}"
            );
          } catch {
            payload = {};
          }
          const recipeId = Number(payload.recipe_id || 0);
          if (!recipeId) return;

          await saveSlot(iso, m.key, recipeId);
          renderCell(cell, iso, m.key);
        });

        // right click clear
        cell.addEventListener("contextmenu", async (e) => {
          e.preventDefault();
          await saveSlot(iso, m.key, null);
          slotsMap.delete(keySlot(iso, m.key));
          renderCell(cell, iso, m.key);
        });

        grid.appendChild(cell);
      }
    }

    return grid;
  }

  function renderCalendar(daysISO) {
    elRoot.innerHTML = "";
    elRoot.appendChild(buildGrid(daysISO));
  }

  // ---------------- data load ----------------
  async function loadWeek(monday) {
    const startISO = toISO(monday);
    elWeekLabel.textContent = fmtRange(monday);

    const data = await getJSON(
      `/planner/week?start=${encodeURIComponent(startISO)}`
    );

    slotsMap.clear();
    (data.slots || []).forEach((s) => {
      if (s.recipe_id) slotsMap.set(keySlot(s.date, s.meal_type), s.recipe_id);
      // nếu recipe_id null -> coi như trống
    });

    renderCalendar(data.days || []);
  }

  async function saveSlot(dateISO, mealKey, recipeIdOrNull) {
    const saved = await postJSON("/planner/slot", {
      date: dateISO,
      meal_type: mealKey,
      recipe_id: recipeIdOrNull,
      note: "",
    });

    if (saved.recipe_id) {
      slotsMap.set(keySlot(saved.date, saved.meal_type), saved.recipe_id);
    } else {
      slotsMap.delete(keySlot(saved.date, saved.meal_type));
    }
  }

  // ---------------- nav buttons ----------------
  function bindNav() {
    btnPrev?.addEventListener("click", async () => {
      currentMonday = addDays(currentMonday, -7);
      await loadWeek(currentMonday);
    });
    btnNext?.addEventListener("click", async () => {
      currentMonday = addDays(currentMonday, 7);
      await loadWeek(currentMonday);
    });
    btnToday?.addEventListener("click", async () => {
      currentMonday = getMonday(new Date());
      await loadWeek(currentMonday);
    });
  }

  // ---------------- init ----------------
  async function init() {
    try {
      bindNav();
      await loadRecipes();
      await loadWeek(currentMonday);
    } catch (err) {
      console.error(err);
      elRoot.innerHTML = `
        <div style="padding:12px;border:1px solid #fecaca;background:#fff1f2;color:#991b1b;border-radius:12px;">
          <b>Lỗi:</b> ${escapeHtml(err.message || String(err))}
        </div>
      `;
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
