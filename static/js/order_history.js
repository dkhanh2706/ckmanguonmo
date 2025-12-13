// static/js/order_history.js

function formatVND(amount) {
  return (amount || 0).toLocaleString("vi-VN");
}

function formatDateTime(isoOrDate) {
  if (!isoOrDate) return "";
  const d = new Date(isoOrDate);
  if (isNaN(d.getTime())) return String(isoOrDate);
  return d.toLocaleString("vi-VN");
}

function buildOrderText(order) {
  const lines = [];
  lines.push(`ĐƠN HÀNG #${order.id}`);
  lines.push("--------------------");

  let total = 0;
  order.items.forEach((it, idx) => {
    const lineTotal = it.unit_price * it.quantity;
    total += lineTotal;
    lines.push(
      `${idx + 1}. ${it.product_name} x${it.quantity} = ${formatVND(
        lineTotal
      )} đ`
    );
  });

  lines.push("--------------------");
  lines.push(`TỔNG: ${formatVND(total)} đ`);
  return lines.join("\n");
}

async function fetchOrders() {
  const res = await fetch("/api/shop/orders");
  if (!res.ok) return [];
  return await res.json();
}

// ✅ NEW: API xóa đơn
async function deleteOrder(orderId) {
  // Bạn cần có endpoint DELETE /api/shop/orders/{id}
  const res = await fetch(`/api/shop/orders/${orderId}`, {
    method: "DELETE",
  });

  // Nếu backend trả 204 No Content thì ok
  if (res.status === 204) return true;

  // Nếu backend trả JSON
  if (res.ok) return true;

  // Nếu lỗi thì cố đọc message
  let msg = "Xóa đơn thất bại.";
  try {
    const data = await res.json();
    if (data && (data.detail || data.message))
      msg = data.detail || data.message;
  } catch {}
  throw new Error(msg);
}

function renderOrders(orders) {
  const listEl = document.getElementById("oh-list");
  const emptyEl = document.getElementById("oh-empty");
  listEl.innerHTML = "";

  if (!orders || orders.length === 0) {
    emptyEl.style.display = "block";
    return;
  }
  emptyEl.style.display = "none";

  orders.forEach((o) => {
    const card = document.createElement("div");
    card.className = "oh-card";
    card.dataset.orderId = o.id;

    const itemCount = (o.items || []).reduce(
      (s, it) => s + (it.quantity || 0),
      0
    );

    const itemsHtml = (o.items || [])
      .map(
        (it) => `
        <li class="oh-item">
          <div style="min-width:0;">
            <div class="name">${it.product_name}</div>
            <div class="sub">${formatVND(it.unit_price)} đ x ${
          it.quantity
        }</div>
          </div>
          <div class="sub">${formatVND(it.unit_price * it.quantity)} đ</div>
        </li>
      `
      )
      .join("");

    const orderText = buildOrderText(o);

    card.innerHTML = `
      <div class="oh-card-top">
        <div class="oh-badges">
          <span class="oh-badge"><i class="fas fa-receipt"></i> #${o.id}</span>
          <span class="oh-badge total"><i class="fas fa-coins"></i> ${formatVND(
            o.total_price
          )} đ</span>
          <span class="oh-badge"><i class="fas fa-box"></i> ${itemCount} món</span>
        </div>
        <div class="oh-meta">
          ${formatDateTime(o.created_at)}
        </div>
      </div>

      <ul class="oh-items">
        ${itemsHtml}
      </ul>

      <div class="oh-card-actions">
        <button class="oh-action" data-action="toggle">Xem nội dung đơn</button>
        <button class="oh-action primary" data-action="copy">Sao chép</button>

        <!-- ✅ NEW: nút đã mua -->
        <button class="oh-action danger" data-action="bought">
          ✅ Đã mua
        </button>
      </div>

      <div class="oh-order-text">
        <textarea readonly>${orderText}</textarea>
      </div>
    `;

    const btnToggle = card.querySelector('[data-action="toggle"]');
    const btnCopy = card.querySelector('[data-action="copy"]');
    const btnBought = card.querySelector('[data-action="bought"]');
    const textWrap = card.querySelector(".oh-order-text");
    const textarea = card.querySelector("textarea");

    btnToggle.addEventListener("click", () => {
      const show = textWrap.style.display !== "block";
      textWrap.style.display = show ? "block" : "none";
      btnToggle.textContent = show ? "Ẩn nội dung đơn" : "Xem nội dung đơn";
    });

    btnCopy.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(textarea.value);
        alert(`Đã sao chép nội dung đơn #${o.id}`);
      } catch {
        textarea.select();
        document.execCommand("copy");
        alert(`Đã sao chép nội dung đơn #${o.id}`);
      }
    });

    // ✅ NEW: click "Đã mua" => xóa đơn
    btnBought.addEventListener("click", async () => {
      const ok = confirm(
        `Xác nhận: Đơn #${o.id} đã mua và sẽ bị XÓA khỏi lịch sử?`
      );
      if (!ok) return;

      btnBought.disabled = true;
      btnBought.textContent = "Đang xóa...";

      try {
        await deleteOrder(o.id);
        // Xóa card trên UI
        card.remove();

        // Nếu xóa hết đơn thì hiện empty
        const listEl2 = document.getElementById("oh-list");
        const emptyEl2 = document.getElementById("oh-empty");
        if (!listEl2 || !emptyEl2) return;

        if (listEl2.children.length === 0) {
          emptyEl2.style.display = "block";
        }
      } catch (e) {
        alert(e?.message || "Xóa đơn thất bại.");
        btnBought.disabled = false;
        btnBought.textContent = "✅ Đã mua";
      }
    });

    listEl.appendChild(card);
  });
}

function setupSearch(allOrders) {
  const input = document.getElementById("oh-search");
  if (!input) return;

  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    if (!q) {
      renderOrders(allOrders);
      return;
    }
    const filtered = allOrders.filter((o) => {
      if (String(o.id).includes(q)) return true;
      return (o.items || []).some((it) =>
        (it.product_name || "").toLowerCase().includes(q)
      );
    });
    renderOrders(filtered);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const btnRefresh = document.getElementById("btn-refresh");

  let orders = await fetchOrders();
  renderOrders(orders);
  setupSearch(orders);

  if (btnRefresh) {
    btnRefresh.addEventListener("click", async () => {
      orders = await fetchOrders();
      renderOrders(orders);
      setupSearch(orders);
    });
  }
});
