// static/js/nutrition.js
// /nutrition?source=default|user&id=...

const $ = (s) => document.querySelector(s);

const currentEl = $("#current-recipe");
const tableEl = $("#nutri-table");
const tbodyEl = $("#nutri-tbody");

const pickedListEl = $("#picked-list");
const sumGridEl = $("#sum-grid");

// Buttons
const btnAdd = $("#btn-add-to-total");
const btnCalc = $("#btn-calc-total");
const btnClear = $("#btn-clear");
const btnRandomize = $("#btn-randomize");

// TDEE UI
const sexEl = $("#sex");
const ageEl = $("#age");
const heightEl = $("#height");
const weightEl = $("#weight");
const activityEl = $("#activity");
const btnCalcTdee = $("#btn-calc-tdee");
const btnSaveProfile = $("#btn-save-profile");
const tdeeResultsEl = $("#tdee-results");
const energyCompareEl = $("#energy-compare");

// Macro UI
const macroBoxEl = $("#macro-box");
const macroHintEl = $("#macro-hint");

const STORAGE_KEY = "nutrition_picks_v1";
const PROFILE_KEY = "nutrition_profile_v1";

// -----------------------
// Helpers
// -----------------------
function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function parseQuery() {
  const u = new URL(window.location.href);
  return {
    source: u.searchParams.get("source") || "user",
    id: u.searchParams.get("id") || "",
  };
}

function hashCode(str) {
  let h = 0;
  const s = String(str || "");
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function randFromSeed(seed) {
  let x = seed >>> 0;
  return () => {
    x = (1664525 * x + 1013904223) >>> 0;
    return x / 4294967296;
  };
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function round1(n) {
  return Math.round(Number(n || 0) * 10) / 10;
}

function fmt(n, unit) {
  const x = Number(n || 0);
  const v = Number.isFinite(x) ? round1(x) : 0;
  return `${v} ${unit}`;
}

function loadPicks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = JSON.parse(raw || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function savePicks(picks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(picks));
}

function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    const p = JSON.parse(raw || "{}");
    return p && typeof p === "object" ? p : {};
  } catch {
    return {};
  }
}

function saveProfile(p) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
}

// -----------------------
// Nutrition (MINH HOẠ)
// -----------------------
function makeMockNutrition(recipe, salt = 0) {
  const title = String(recipe?.title || "");
  const ing = String(recipe?.ingredients || "");
  const key = `${title}|${ing}|${salt}`;

  const seed = hashCode(key);
  const r = randFromSeed(seed);

  // calories + macro (1 phần)
  const calories = Math.round(250 + r() * 500);     // 250..750
  let protein = Math.round(10 + r() * 35);          // 10..45 g
  let carbs   = Math.round(20 + r() * 70);          // 20..90 g
  let fat     = Math.round(8 + r() * 30);           // 8..38 g

  const fiber  = Math.round(2 + r() * 12);          // 2..14 g
  const sugar  = Math.round(1 + r() * 18);          // 1..19 g
  const sodium = Math.round(250 + r() * 1100);      // 250..1350 mg

  // scale theo độ dài ingredients
  const k = clamp(ing.length / 120, 0.6, 1.5);

  // scale
  const calScaled = Math.round(calories * k);
  protein = Math.round(protein * k);
  carbs   = Math.round(carbs * k);
  fat     = Math.round(fat * k);

  // chỉnh lại để macro calories không lệch quá nhiều so với calories (minh hoạ)
  const macroCal = protein * 4 + carbs * 4 + fat * 9;
  if (macroCal > 0) {
    const ratio = calScaled / macroCal;
    protein = Math.max(1, Math.round(protein * ratio));
    carbs   = Math.max(1, Math.round(carbs * ratio));
    fat     = Math.max(1, Math.round(fat * ratio));
  }

  return {
    calories: calScaled,
    protein,
    carbs,
    fat,
    fiber: Math.round(fiber * k),
    sugar: Math.round(sugar * k),
    sodium: Math.round(sodium * k),
  };
}

function nutritionRows(n) {
  return [
    ["Calories", fmt(n.calories, "kcal")],
    ["Protein", fmt(n.protein, "g")],
    ["Carbs", fmt(n.carbs, "g")],
    ["Fat", fmt(n.fat, "g")],
    ["Fiber", fmt(n.fiber, "g")],
    ["Sugar", fmt(n.sugar, "g")],
    ["Sodium", fmt(n.sodium, "mg")],
  ];
}

// -----------------------
// Fetch recipe theo source
// -----------------------
async function fetchRecipe({ source, id }) {
  if (!id) throw new Error("Thiếu id món ăn.");

  if (source === "user") {
    const res = await fetch(`/api/recipes/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error("Không tải được món (user).");
    return await res.json();
  }

  const res = await fetch("/default-recipes/");
  if (!res.ok) throw new Error("Không tải được món (default).");
  const arr = await res.json();
  const found = (arr || []).find((x) => String(x.id) === String(id));
  if (!found) throw new Error("Không tìm thấy món default theo id.");
  return found;
}

// -----------------------
// Current recipe
// -----------------------
let CURRENT = null;
let CURRENT_NUTRI = null;
let CURRENT_SALT = 0;

function renderCurrent() {
  if (!CURRENT) return;

  const title = escapeHtml(CURRENT.title || "Món ăn");
  const cat = escapeHtml(CURRENT.category || (CURRENT.source === "default" ? "Gợi ý" : "Của bạn"));
  const note = escapeHtml(CURRENT.note || "");
  const img = CURRENT.image ? String(CURRENT.image) : "/static/img/default_1.jpg";

  currentEl.innerHTML = `
    <div class="thumb">
      <img src="${img}" alt="${title}" onerror="this.onerror=null; this.src='/static/img/default_1.jpg';">
    </div>
    <div class="meta">
      <h3>${title}</h3>
      <div class="sub">${cat}${note ? " • " + note : ""}</div>
    </div>
  `;

  tableEl.style.display = "";
  tbodyEl.innerHTML = nutritionRows(CURRENT_NUTRI)
    .map(([k, v]) => `<tr><td>${k}</td><td><strong>${v}</strong></td></tr>`)
    .join("");
}

// -----------------------
// Picks list + total
// -----------------------
function renderPicks() {
  const picks = loadPicks();
  if (!picks.length) {
    pickedListEl.innerHTML = `<div class="mini">Chưa chọn món nào. Hãy bấm “Thêm vào tính tổng”.</div>`;
    return;
  }

  pickedListEl.innerHTML = picks.map((p, idx) => {
    const t = escapeHtml(p.title || "Món");
    return `
      <div class="pick-item">
        <div class="pick-left">
          <p class="pick-title">${t}</p>
          <p class="pick-sub">
            1 phần: ${p.nutri.calories} kcal • P ${p.nutri.protein}g • C ${p.nutri.carbs}g • F ${p.nutri.fat}g
          </p>
        </div>
        <div style="display:flex; gap:8px; align-items:center;">
          <input class="qty" type="number" min="1" step="1" value="${p.qty || 1}" data-idx="${idx}" title="Số phần">
          <button class="btn btn-danger" data-del="${idx}">X</button>
        </div>
      </div>
    `;
  }).join("");

  pickedListEl.querySelectorAll("input.qty").forEach((inp) => {
    inp.addEventListener("change", () => {
      const i = Number(inp.dataset.idx);
      const v = Math.max(1, Number(inp.value || 1));
      const arr = loadPicks();
      if (!arr[i]) return;
      arr[i].qty = v;
      savePicks(arr);
      // update live
      const total = calcTotalFromPicks();
      renderTotal(total);
      renderMacro(total);
      renderEnergyCompare();
    });
  });

  pickedListEl.querySelectorAll("button[data-del]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = Number(btn.dataset.del);
      const arr = loadPicks();
      arr.splice(i, 1);
      savePicks(arr);
      renderPicks();

      const total = calcTotalFromPicks();
      renderTotal(total);
      renderMacro(total);
      renderEnergyCompare();
    });
  });
}

function calcTotalFromPicks() {
  const picks = loadPicks();
  const total = { calories:0, protein:0, carbs:0, fat:0, fiber:0, sugar:0, sodium:0 };

  picks.forEach((p) => {
    const q = Math.max(1, Number(p.qty || 1));
    total.calories += (p.nutri.calories || 0) * q;
    total.protein  += (p.nutri.protein  || 0) * q;
    total.carbs    += (p.nutri.carbs    || 0) * q;
    total.fat      += (p.nutri.fat      || 0) * q;
    total.fiber    += (p.nutri.fiber    || 0) * q;
    total.sugar    += (p.nutri.sugar    || 0) * q;
    total.sodium   += (p.nutri.sodium   || 0) * q;
  });

  return total;
}

function renderTotal(total) {
  const rows = [
    ["Calories", fmt(total.calories, "kcal")],
    ["Protein", fmt(total.protein, "g")],
    ["Carbs", fmt(total.carbs, "g")],
    ["Fat", fmt(total.fat, "g")],
    ["Fiber", fmt(total.fiber, "g")],
    ["Sugar", fmt(total.sugar, "g")],
    ["Sodium", fmt(total.sodium, "mg")],
  ];

  sumGridEl.innerHTML = rows.map(([k, v]) => `
    <div class="kv"><span>${k}</span><strong>${v}</strong></div>
  `).join("");
}

// -----------------------
// TDEE + Energy compare
// -----------------------
function getProfileFromUI() {
  return {
    sex: sexEl?.value || "male",
    age: Number(ageEl?.value || 0),
    height: Number(heightEl?.value || 0),
    weight: Number(weightEl?.value || 0),
    activity: Number(activityEl?.value || 1.2),
  };
}

function validateProfile(p) {
  const errs = [];
  if (!(p.age >= 10 && p.age <= 90)) errs.push("Tuổi không hợp lệ (10–90).");
  if (!(p.height >= 120 && p.height <= 220)) errs.push("Chiều cao không hợp lệ (120–220 cm).");
  if (!(p.weight >= 30 && p.weight <= 200)) errs.push("Cân nặng không hợp lệ (30–200 kg).");
  if (![1.2, 1.375, 1.55, 1.725, 1.9].includes(Number(p.activity))) errs.push("Mức vận động không hợp lệ.");
  if (!["male","female"].includes(p.sex)) errs.push("Giới tính không hợp lệ.");
  return errs;
}

function calcBMR(p) {
  // Mifflin–St Jeor
  const W = p.weight, H = p.height, A = p.age;
  if (p.sex === "male") return 10*W + 6.25*H - 5*A + 5;
  return 10*W + 6.25*H - 5*A - 161;
}

function calcTDEE(p) {
  const bmr = calcBMR(p);
  const tdee = bmr * Number(p.activity || 1.2);
  return { bmr, tdee };
}

function renderTdeeResult(p, bmr, tdee) {
  const bmrTxt = Math.round(bmr);
  const tdeeTxt = Math.round(tdee);

  tdeeResultsEl.innerHTML = `
    <div class="result-row">
      <div><strong>BMR</strong><div class="muted">Năng lượng cơ bản</div></div>
      <div><strong>${bmrTxt} kcal/ngày</strong></div>
    </div>
    <div class="result-row">
      <div><strong>TDEE</strong><div class="muted">Nhu cầu/ngày theo vận động</div></div>
      <div><strong>${tdeeTxt} kcal/ngày</strong></div>
    </div>
  `;

  renderEnergyCompare();
}

function badgeForEnergy(pct) {
  if (pct < 90) return { cls:"bad", text:"Thiếu năng lượng" };
  if (pct <= 110) return { cls:"ok", text:"Phù hợp" };
  return { cls:"warn", text:"Dư năng lượng" };
}

function renderEnergyCompare() {
  const profile = loadProfile();
  const hasProfile = profile && profile.age && profile.height && profile.weight && profile.activity;

  const total = calcTotalFromPicks();
  if (!hasProfile) {
    energyCompareEl.style.display = "none";
    return;
  }

  const { bmr, tdee } = calcTDEE(profile);
  const tdeeVal = Math.max(1, tdee);
  const pct = (total.calories / tdeeVal) * 100;

  const b = badgeForEnergy(pct);
  const diff = Math.round(total.calories - tdeeVal);

  const barPct = clamp(pct, 0, 160); // cap hiển thị
  const diffText = diff === 0 ? "Đúng bằng TDEE" : (diff > 0 ? `Dư ${diff} kcal` : `Thiếu ${Math.abs(diff)} kcal`);

  energyCompareEl.style.display = "";
  energyCompareEl.innerHTML = `
    <div style="display:flex; justify-content:space-between; gap:10px; align-items:center;">
      <div><strong>So sánh Calories ↔ TDEE</strong></div>
      <span class="badge ${b.cls}">${b.text}</span>
    </div>

    <div class="barline">
      <span>Calories bạn chọn: <strong>${Math.round(total.calories)} kcal</strong></span>
      <span>TDEE: <strong>${Math.round(tdeeVal)} kcal</strong> • ${round1(pct)}%</span>
    </div>

    <div class="bar"><div style="width:${barPct}%"></div></div>

    <div class="mini" style="margin-top:8px;">
      ${diffText}. (BMR ≈ ${Math.round(bmr)} kcal/ngày)
    </div>
  `;
}

function applyProfileToUI(p) {
  if (!p) return;
  if (sexEl) sexEl.value = p.sex || "male";
  if (ageEl) ageEl.value = p.age || 20;
  if (heightEl) heightEl.value = p.height || 170;
  if (weightEl) weightEl.value = p.weight || 60;
  if (activityEl) activityEl.value = String(p.activity || 1.55);
}

// -----------------------
// Macro ratio (P/C/F)
// -----------------------
function inRange(pct, min, max) {
  return pct >= min && pct <= max;
}

function macroStatus(name, pct, min, max) {
  if (inRange(pct, min, max)) return { cls: "ok", text: "Ổn" };
  if (pct < min) return { cls: "warn", text: "Hơi thấp" };
  return { cls: "warn", text: "Hơi cao" };
}

function renderMacro(total) {
  // Quy đổi: P=4, C=4, F=9
  const calP = (total.protein || 0) * 4;
  const calC = (total.carbs || 0) * 4;
  const calF = (total.fat || 0) * 9;
  const macroTotal = calP + calC + calF;

  if (macroTotal <= 0) {
    macroBoxEl.innerHTML = `<div class="mini">Chưa có dữ liệu macro. Hãy thêm món vào danh sách.</div>`;
    macroHintEl.style.display = "none";
    return;
  }

  const pPct = (calP / macroTotal) * 100;
  const cPct = (calC / macroTotal) * 100;
  const fPct = (calF / macroTotal) * 100;

  // ranges (minh hoạ)
  const P = { min: 20, max: 30 };
  const C = { min: 45, max: 60 };
  const F = { min: 20, max: 30 };

  const pS = macroStatus("Protein", pPct, P.min, P.max);
  const cS = macroStatus("Carb", cPct, C.min, C.max);
  const fS = macroStatus("Fat", fPct, F.min, F.max);

  function macroBlock(label, pct, range, status) {
    const w = clamp(pct, 0, 100);
    return `
      <div class="macro-card">
        <div class="macro-top">
          <strong>${label}</strong>
          <span class="badge ${status.cls}">${status.text} • ${round1(pct)}%</span>
        </div>
        <div class="barline">
          <span>Khuyến nghị: ${range.min}–${range.max}%</span>
          <span>${label}: ${round1(pct)}%</span>
        </div>
        <div class="bar"><div style="width:${w}%"></div></div>
      </div>
    `;
  }

  macroBoxEl.innerHTML = `
    ${macroBlock("Protein", pPct, P, pS)}
    ${macroBlock("Carbs", cPct, C, cS)}
    ${macroBlock("Fat", fPct, F, fS)}
  `;

  // Gợi ý
  const tips = [];
  if (pPct < P.min) tips.push("Protein thấp → thêm trứng, thịt, cá, đậu/đỗ.");
  if (pPct > P.max) tips.push("Protein cao → cân đối thêm rau & carb phức (gạo lứt, khoai).");
  if (cPct < C.min) tips.push("Carb thấp → thêm cơm/khoai/yến mạch (tuỳ mục tiêu).");
  if (cPct > C.max) tips.push("Carb cao → giảm đồ ngọt/tinh bột nhanh, tăng protein & rau.");
  if (fPct < F.min) tips.push("Fat thấp → thêm chất béo tốt (hạt, cá béo, dầu oliu).");
  if (fPct > F.max) tips.push("Fat cao → giảm đồ chiên/xào nhiều dầu.");

  macroHintEl.style.display = "";
  macroHintEl.innerHTML = `
    <div style="display:flex; justify-content:space-between; gap:10px; align-items:center;">
      <div><strong>Nhận xét Macro</strong></div>
      <span class="badge">${Math.round(macroTotal)} kcal từ macro</span>
    </div>
    <ul>
      ${tips.length ? tips.map(t => `<li>${escapeHtml(t)}</li>`).join("") : "<li>Macro đang khá cân bằng 👍</li>"}
    </ul>
  `;
}

// -----------------------
// Buttons
// -----------------------
btnAdd?.addEventListener("click", () => {
  if (!CURRENT || !CURRENT_NUTRI) return;

  const picks = loadPicks();
  const key = `${CURRENT.source}:${CURRENT.id}`;
  const idx = picks.findIndex((x) => x.key === key);

  if (idx >= 0) {
    picks[idx].qty = Math.max(1, Number(picks[idx].qty || 1)) + 1;
  } else {
    picks.push({
      key,
      id: CURRENT.id,
      source: CURRENT.source,
      title: CURRENT.title,
      nutri: CURRENT_NUTRI,
      qty: 1,
    });
  }

  savePicks(picks);
  renderPicks();

  const total = calcTotalFromPicks();
  renderTotal(total);
  renderMacro(total);
  renderEnergyCompare();
});

btnCalc?.addEventListener("click", () => {
  const total = calcTotalFromPicks();
  renderTotal(total);
  renderMacro(total);
  renderEnergyCompare();
});

btnClear?.addEventListener("click", () => {
  if (!confirm("Xoá toàn bộ danh sách tính tổng?")) return;
  savePicks([]);
  renderPicks();

  const total = calcTotalFromPicks();
  renderTotal(total);
  renderMacro(total);
  renderEnergyCompare();
});

btnRandomize?.addEventListener("click", () => {
  CURRENT_SALT += 1;
  CURRENT_NUTRI = makeMockNutrition(CURRENT, CURRENT_SALT);
  renderCurrent();
});

// TDEE
btnCalcTdee?.addEventListener("click", () => {
  const p = getProfileFromUI();
  const errs = validateProfile(p);
  if (errs.length) {
    tdeeResultsEl.innerHTML = `<div class="mini" style="color:#ef4444;"><strong>Lỗi:</strong> ${escapeHtml(errs.join(" "))}</div>`;
    energyCompareEl.style.display = "none";
    return;
  }

  const { bmr, tdee } = calcTDEE(p);
  // auto lưu để so sánh ngay
  saveProfile(p);
  renderTdeeResult(p, bmr, tdee);
});

btnSaveProfile?.addEventListener("click", () => {
  const p = getProfileFromUI();
  const errs = validateProfile(p);
  if (errs.length) {
    alert(errs.join("\n"));
    return;
  }
  saveProfile(p);
  alert("Đã lưu thông tin cá nhân.");
  renderEnergyCompare();
});

// -----------------------
// Init
// -----------------------
document.addEventListener("DOMContentLoaded", async () => {
  // Load profile đã lưu lên UI
  const prof = loadProfile();
  if (prof && Object.keys(prof).length) applyProfileToUI(prof);

  // Load recipe theo query
  const q = parseQuery();
  try {
    const recipe = await fetchRecipe(q);
    CURRENT = { ...recipe, source: q.source, id: q.id };
    CURRENT_NUTRI = makeMockNutrition(CURRENT, 0);
    renderCurrent();
  } catch (e) {
    currentEl.innerHTML = `<div class="mini" style="color:#ef4444;"><strong>Lỗi:</strong> ${escapeHtml(e.message || "Không tải được món.")}</div>`;
  }

  renderPicks();

  const total = calcTotalFromPicks();
  renderTotal(total);
  renderMacro(total);
  renderEnergyCompare();

  // Nếu đã có profile thì show luôn TDEE result
  if (prof && prof.age && prof.height && prof.weight && prof.activity) {
    const { bmr, tdee } = calcTDEE(prof);
    renderTdeeResult(prof, bmr, tdee);
  }
});
