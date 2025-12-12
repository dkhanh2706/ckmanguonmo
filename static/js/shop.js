// static/js/shop.js

async function fetchProducts() {
  const res = await fetch("/api/shop/products");
  if (!res.ok) {
    console.error("Không lấy được danh sách sản phẩm");
    return [];
  }
  return await res.json();
}

function formatVND(amount) {
  return amount.toLocaleString("vi-VN");
}

const state = {
  products: [],
  filtered: [],
  cart: [],
};

function renderProducts() {
  const container = document.getElementById("shop-products");
  if (!container) return;

  container.innerHTML = "";

  if (state.filtered.length === 0) {
    container.innerHTML =
      '<p style="padding: 8px; color:#6b7280;">Không tìm thấy sản phẩm phù hợp.</p>';
    return;
  }

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
        <div class="shop-card-bottom">
          <span class="shop-card-price">${formatVND(p.price)} đ</span>
          <span class="shop-card-unit">/${p.unit || "món"}</span>
        </div>
      </div>
      <button data-id="${p.id}">
        Thêm vào giỏ
      </button>
    `;

    const btn = card.querySelector("button");
    btn.addEventListener("click", () => addToCart(p.id));
    container.appendChild(card);
  });
}

function addToCart(productId) {
  const product = state.products.find((p) => p.id === productId);
  if (!product) return;

  const existing = state.cart.find((c) => c.id === productId);
  if (existing) {
    existing.qty += 1;
  } else {
    state.cart.push({ ...product, qty: 1 });
  }
  renderCart();
}

function removeFromCart(productId) {
  const index = state.cart.findIndex((c) => c.id === productId);
  if (index !== -1) {
    state.cart.splice(index, 1);
    renderCart();
  }
}

function renderCart() {
  const list = document.getElementById("cart-items");
  const totalEl = document.getElementById("cart-total");
  if (!list || !totalEl) return;

  list.innerHTML = "";
  let total = 0;

  if (state.cart.length === 0) {
    list.innerHTML =
      '<li style="font-size:0.8rem; opacity:0.8;">Giỏ hàng đang trống.</li>';
    totalEl.textContent = "0";
    return;
  }

  state.cart.forEach((item) => {
    total += item.price * item.qty;
    const li = document.createElement("li");
    li.className = "cart-item";
    li.innerHTML = `
      <span class="cart-item-name">${item.name}</span>
      <span class="cart-item-qty">x${item.qty}</span>
      <span class="cart-item-price">${formatVND(item.price * item.qty)} đ</span>
      <button class="cart-item-remove" title="Xóa khỏi giỏ">&times;</button>
    `;
    const removeBtn = li.querySelector(".cart-item-remove");
    removeBtn.addEventListener("click", () => removeFromCart(item.id));
    list.appendChild(li);
  });

  totalEl.textContent = formatVND(total);
}

function setupSearch() {
  const input = document.getElementById("shop-search-input");
  const btn = document.getElementById("shop-search-btn");
  if (!input || !btn) return;

  const doFilter = () => {
    const keyword = input.value.trim().toLowerCase();
    if (!keyword) {
      state.filtered = [...state.products];
    } else {
      state.filtered = state.products.filter((p) =>
        p.name.toLowerCase().includes(keyword)
      );
    }
    renderProducts();
  };

  btn.addEventListener("click", doFilter);
  input.addEventListener("keyup", (e) => {
    if (e.key === "Enter") doFilter();
  });
}

function generateOrderSummary() {
  if (state.cart.length === 0) {
    return "Giỏ hàng đang trống. Vui lòng thêm sản phẩm trước khi tạo đơn.";
  }

  let lines = [];
  let total = 0;

  lines.push("ĐƠN HÀNG NGUYÊN LIỆU");
  lines.push("--------------------");

  state.cart.forEach((item, index) => {
    const lineTotal = item.price * item.qty;
    total += lineTotal;
    lines.push(
      `${index + 1}. ${item.name} x${item.qty} = ${formatVND(lineTotal)} đ`
    );
  });

  lines.push("--------------------");
  lines.push(`TỔNG: ${formatVND(total)} đ`);

  return lines.join("\n");
}

async function sendOrderToServer() {
  if (state.cart.length === 0) {
    alert("Giỏ hàng đang trống.");
    return null;
  }

  const payload = {
    customer_name: null, // sau này có thể thêm input tên khách
    note: null,
    items: state.cart.map((item) => ({
      product_id: item.id,
      qty: item.qty,
    })),
  };

  try {
    const res = await fetch("/api/shop/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.error("Lỗi khi lưu đơn hàng:", await res.text());
      alert("Có lỗi khi lưu đơn hàng (backend).");
      return null;
    }

    const data = await res.json();
    return data; // { message, order_id, total_price }
  } catch (err) {
    console.error("Lỗi khi gọi API orders:", err);
    alert("Không gọi được API đơn hàng.");
    return null;
  }
}

function setupCheckout() {
  const checkoutBtn = document.getElementById("btn-checkout");
  const outputEl = document.getElementById("order-output");
  const copyBtn = document.getElementById("btn-copy-order");

  if (!checkoutBtn || !outputEl || !copyBtn) return;

  checkoutBtn.addEventListener("click", async () => {
    const content = generateOrderSummary();
    outputEl.value = content;

    if (state.cart.length === 0) {
      alert("Giỏ hàng đang trống.");
      return;
    }

    // Gửi đơn lên server để lưu vào DB
    const result = await sendOrderToServer();
    if (result && result.order_id) {
      alert(
        `Đã tạo đơn hàng #${result.order_id} (tổng ${formatVND(
          result.total_price
        )} đ). Nội dung chi tiết nằm ở ô bên dưới, bạn có thể sao chép để gửi cho người bán.`
      );
    } else {
      // Nếu backend lỗi nhưng vẫn tạo được nội dung đơn thì vẫn cho user dùng
      alert(
        "Đã tạo nội dung đơn hàng ở ô bên dưới. (Lưu ý: có thể lưu DB không thành công)."
      );
    }

    // GIỮ NGUYÊN GIỎ HÀNG, KHÔNG XÓA
  });

  copyBtn.addEventListener("click", () => {
    if (!outputEl.value.trim()) {
      alert("Chưa có nội dung đơn để sao chép.");
      return;
    }
    outputEl.select();
    outputEl.setSelectionRange(0, 99999);
    document.execCommand("copy");
    alert("Đã sao chép nội dung đơn hàng.");
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  state.products = await fetchProducts();
  state.filtered = [...state.products];
  renderProducts();
  renderCart();
  setupSearch();
  setupCheckout();
});
