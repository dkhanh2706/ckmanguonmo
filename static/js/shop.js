// static/js/shop.js

async function fetchProducts() {
  const res = await fetch("/api/shop/products");
  if (!res.ok) {
    console.error("Không lấy được danh sách sản phẩm");
    return [];
  }
  return await res.json();
}

async function createOrderOnServer(payload) {
  const res = await fetch("/api/shop/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let msg = "Tạo đơn thất bại";
    try {
      const data = await res.json();
      msg = data?.detail || data?.message || msg;
    } catch (_) {}
    throw new Error(msg);
  }
  return await res.json();
}

function formatVND(amount) {
  return Number(amount || 0).toLocaleString("vi-VN");
}

const state = {
  products: [],
  filtered: [],
  cart: [], // { id, name, price, qty }
};

// ===== UI (match shopping_list.html) =====
const productListEl = document.getElementById("shop-products");
const cartListEl = document.getElementById("cart-items");
const cartTotalEl = document.getElementById("cart-total");
const checkoutBtn = document.getElementById("btn-checkout");

const outputEl = document.getElementById("order-output");
const copyBtn = document.getElementById("btn-copy-order");

const searchInput = document.getElementById("shop-search-input");
const searchBtn = document.getElementById("shop-search-btn");

// ===== normalize (không dấu) =====
function normalizeText(s = "") {
  return String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function keywordTokens(s = "") {
  return normalizeText(s)
    .split(" ")
    .map((x) => x.trim())
    .filter((x) => x.length >= 2); // cho dễ match "ga", "toi", ...
}

function scoreProductMatch(productName, keyword) {
  const pn = normalizeText(productName);
  const kw = normalizeText(keyword);
  if (!pn || !kw) return 0;

  if (pn.includes(kw)) return 100;

  const toks = keywordTokens(keyword);
  if (!toks.length) return 0;

  let hit = 0;
  for (const t of toks) if (pn.includes(t)) hit++;
  return Math.round((hit / toks.length) * 80);
}

function findBestProduct(keyword) {
  let best = null;
  let bestScore = 0;

  for (const p of state.products) {
    const sc = scoreProductMatch(p?.name || "", keyword);
    if (sc > bestScore) {
      bestScore = sc;
      best = p;
    }
  }

  // ngưỡng tối thiểu
  if (bestScore >= 30) return best;
  return null;
}

// ===== cart =====
function calcTotal() {
  return state.cart.reduce(
    (sum, x) => sum + Number(x.price || 0) * Number(x.qty || 0),
    0
  );
}

function addToCart(productId) {
  const p = state.products.find((x) => String(x.id) === String(productId));
  if (!p) return;

  const existed = state.cart.find((x) => String(x.id) === String(productId));
  if (existed) existed.qty += 1;
  else state.cart.push({ id: p.id, name: p.name, price: p.price, qty: 1 });
}

function removeFromCart(productId) {
  state.cart = state.cart.filter((x) => String(x.id) !== String(productId));
}

function changeQty(productId, delta) {
  const item = state.cart.find((x) => String(x.id) === String(productId));
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) removeFromCart(productId);
}

// ===== order preview (tự có đơn sẵn) =====
function buildOrderText(extraWantedList = null) {
  const lines = state.cart.map(
    (x) => `- ${x.name} x${x.qty} = ${formatVND(x.price * x.qty)}đ`
  );
  const total = `${formatVND(calcTotal())}đ`;

  const wanted =
    Array.isArray(extraWantedList) && extraWantedList.length
      ? `\n\n🧺 Nguyên liệu từ công thức:\n- ${extraWantedList.join("\n- ")}`
      : "";

  if (state.cart.length === 0) {
    return wanted
      ? `🧾 ĐƠN HÀNG\n(Chưa tự match được sản phẩm trong shop)\n${wanted}\n\n👉 Bạn có thể gõ 1 từ khóa ở trên để tìm và thêm tay.`
      : "";
  }

  return `🧾 ĐƠN HÀNG\n${lines.join("\n")}\n\nTỔNG: ${total}${wanted}`;
}

function refreshOrderPreview(extraWantedList = null) {
  if (!outputEl) return;
  outputEl.value = buildOrderText(extraWantedList);
}

// ===== render products =====
function renderProducts() {
  if (!productListEl) return;

  productListEl.innerHTML = "";
  state.filtered.forEach((p) => {
    const card = document.createElement("article");
    card.className = "shop-card";

    const imgSrc = p.image || "/static/img/default_recipe.jpg";

    card.innerHTML = `
      <img src="${imgSrc}" alt="${p.name}">
      <div class="shop-card-body">
        <div class="shop-card-header">
          <h3 class="shop-card-title">${p.name}</h3>
          ${
            p.badge
              ? `<span class="shop-card-badge"><i class="fas fa-star"></i> ${p.badge}</span>`
              : ""
          }
        </div>
        <p class="shop-card-desc">${p.desc || ""}</p>
        <div class="shop-card-footer">
          <span class="shop-card-price">${formatVND(p.price)}đ</span>
          <button class="btn-add" data-id="${p.id}">+ Thêm</button>
        </div>
      </div>
    `;
    productListEl.appendChild(card);
  });

  productListEl.querySelectorAll(".btn-add").forEach((btn) => {
    btn.addEventListener("click", () => {
      addToCart(btn.getAttribute("data-id"));
      renderCart();
    });
  });
}

// ===== render cart (đẹp + auto preview) =====
function renderCart(extraWantedList = null) {
  if (!cartListEl || !cartTotalEl) return;

  cartListEl.innerHTML = "";

  if (state.cart.length === 0) {
    cartListEl.innerHTML = `<p class="empty-cart">Chưa có sản phẩm nào trong giỏ.</p>`;
    cartTotalEl.textContent = "0";
    refreshOrderPreview(extraWantedList);
    return;
  }

  state.cart.forEach((item) => {
    const li = document.createElement("li");
    li.className = "cart-row";

    li.innerHTML = `
      <div class="cart-left">
        <div class="cart-name" title="${item.name}">${item.name}</div>
        <div class="cart-meta">
          <div class="qty-wrap">
            <button class="qty-btn" data-act="minus" data-id="${item.id}">-</button>
            <span class="qty-num">${item.qty}</span>
            <button class="qty-btn" data-act="plus" data-id="${item.id}">+</button>
          </div>
          <div class="cart-line-price">${formatVND(item.price * item.qty)}đ</div>
        </div>
      </div>

      <div class="cart-right">
        <button class="cart-remove" data-id="${item.id}" title="Xóa">✕</button>
      </div>
    `;

    cartListEl.appendChild(li);
  });

  cartTotalEl.textContent = formatVND(calcTotal());

  cartListEl.querySelectorAll(".qty-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const act = btn.getAttribute("data-act");
      changeQty(id, act === "plus" ? 1 : -1);
      renderCart(extraWantedList);
    });
  });

  cartListEl.querySelectorAll(".cart-remove").forEach((btn) => {
    btn.addEventListener("click", () => {
      removeFromCart(btn.getAttribute("data-id"));
      renderCart(extraWantedList);
    });
  });

  // ✅ quan trọng: giỏ thay đổi là đơn hàng preview tự cập nhật
  refreshOrderPreview(extraWantedList);
}

// ===== search =====
function applySearch() {
  const q = (searchInput?.value || "").trim().toLowerCase();
  if (!q) state.filtered = [...state.products];
  else {
    state.filtered = state.products.filter((p) =>
      String(p.name || "").toLowerCase().includes(q)
    );
  }
  renderProducts();
}

function setupSearch() {
  if (searchInput) {
    searchInput.addEventListener("input", applySearch);
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        applySearch();
      }
    });
  }
  if (searchBtn) searchBtn.addEventListener("click", applySearch);
}

// ===== buy now =====
function setupCheckout() {
  if (!checkoutBtn) return;

  checkoutBtn.addEventListener("click", async () => {
    if (state.cart.length === 0) {
      alert("Giỏ hàng đang trống.");
      return;
    }

    try {
      checkoutBtn.disabled = true;
      checkoutBtn.textContent = "Đang mua...";

      const payload = {
        customer_name: "Khách lẻ",
        note: "Đơn tạo từ /shopping-list",
        items: state.cart.map((x) => ({
          product_id: Number(x.id),
          qty: Number(x.qty),
        })),
      };

      const data = await createOrderOnServer(payload);

      // show xác nhận trong textarea
      if (outputEl) {
        outputEl.value =
          buildOrderText() +
          `\n\n✅ ĐÃ MUA THÀNH CÔNG\nMã đơn: #${data.order_id}\nTổng tiền: ${formatVND(
            data.total_price
          )}đ`;
      }

      // clear cart
      state.cart = [];
      renderCart();

      alert(`✅ Mua thành công! Mã đơn: #${data.order_id}`);
    } catch (err) {
      alert(err?.message || "Mua thất bại");
    } finally {
      checkoutBtn.disabled = false;
      checkoutBtn.textContent = "Mua ngay";
    }
  });
}

// ===== copy =====
function setupCopy() {
  if (!copyBtn || !outputEl) return;

  copyBtn.addEventListener("click", async () => {
    const text = outputEl.value || "";
    if (!text.trim()) return;

    try {
      await navigator.clipboard.writeText(text);
      alert("Đã sao chép nội dung đơn hàng.");
    } catch (_) {
      outputEl.select();
      outputEl.setSelectionRange(0, 99999);
      document.execCommand("copy");
      alert("Đã sao chép nội dung đơn hàng.");
    }
  });
}

// ===== PREFILL FROM RECIPES =====
const PREFILL_KEY = "prefill_shop_from_recipes";

function tryPrefillCartFromRecipes() {
  const raw = localStorage.getItem(PREFILL_KEY);
  if (!raw) return;

  try {
    const payload = JSON.parse(raw);
    const ingredients = Array.isArray(payload.ingredients) ? payload.ingredients : [];
    const wanted = ingredients.map((x) => String(x)).filter(Boolean);

    // show preview ngay để chắc chắn "đã có đơn"
    refreshOrderPreview(wanted);

    if (searchInput && ingredients.length) {
      searchInput.value = ingredients.slice(0, 6).join(", ");
    }

    let added = 0;
    for (const kw of ingredients) {
      const best = findBestProduct(kw);
      if (best) {
        addToCart(best.id);
        added++;
      }
    }

    renderCart(wanted);

    // dùng xong thì xóa để lần sau không auto-add lại
    localStorage.removeItem(PREFILL_KEY);

    // nếu shop ít sản phẩm -> có thể added ít
    if (added === 0) {
      console.warn("Prefill: không match được sản phẩm nào. Hãy kiểm tra tên products trong DB.");
    }
  } catch (e) {
    console.error("Prefill parse error:", e);
    localStorage.removeItem(PREFILL_KEY);
  }
}

// ===== init =====
document.addEventListener("DOMContentLoaded", async () => {
  state.products = await fetchProducts();
  state.filtered = [...state.products];

  renderProducts();
  renderCart();

  setupSearch();
  setupCheckout();
  setupCopy();

  // ✅ đi từ công thức qua shop: auto có đơn + auto có giỏ
  tryPrefillCartFromRecipes();
});