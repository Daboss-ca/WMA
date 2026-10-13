import { createStatCards } from "../components/StatCards.js";
import { renderStatusChip } from "../components/StatusChip.js";
import { adminStore } from "../services/adminStore.js";
import { ORDER_STATUSES, type AdminPage, type OrderStatus } from "../types/admin.js";
import { escapeHtml, fromHTML } from "../utils/dom.js";
import { formatCurrency, formatDate, ORDER_STATUS_META } from "../utils/format.js";

export function createAdminOverviewPage(): AdminPage {
  const element = fromHTML<HTMLElement>(`<div class="admin-overview"></div>`);

  const render = (): void => {
    const orders = adminStore.listOrders();
    const stats = adminStore.getStats();
    const recent = orders.slice(0, 5);

    const counts = Object.fromEntries(ORDER_STATUSES.map((status) => [status, 0])) as Record<OrderStatus, number>;
    orders.forEach((order) => {
      counts[order.status] += 1;
    });

    const total = orders.length || 1;
    const pipeline = ORDER_STATUSES.map(
      (status) => `
      <li class="admin-pipeline__row">
        <div class="admin-pipeline__meta">
          <span>${ORDER_STATUS_META[status].label}</span>
          <strong>${counts[status]}</strong>
        </div>
        <div class="admin-bar" role="presentation">
          <span style="width:${Math.round((counts[status] / total) * 100)}%"></span>
        </div>
      </li>`
    ).join("");

    const recentList = recent.length
      ? `<ul class="admin-list">
          ${recent
            .map(
              (order) => `
            <li>
              <div>
                <strong class="admin-mono">${escapeHtml(order.reference)}</strong>
                <span class="admin-muted admin-block">${escapeHtml(order.customer.name)} · ${formatDate(order.createdAt)}</span>
              </div>
              <div class="admin-list__end">
                <span class="admin-price">${formatCurrency(order.total)}</span>
                ${renderStatusChip(order.status)}
              </div>
            </li>`
            )
            .join("")}
        </ul>`
      : `<p class="admin-empty">No orders yet.</p>`;

    const attention =
      stats.pendingOrders > 0
        ? `<div class="admin-callout admin-callout--warning">${stats.pendingOrders} ${
            stats.pendingOrders === 1 ? "order is" : "orders are"
          } waiting for payment approval.</div>`
        : "";

    element.replaceChildren(
      createStatCards(stats),
      fromHTML<HTMLElement>(`<div class="admin-attention">${attention}</div>`),
      fromHTML<HTMLElement>(`
        <div class="admin-grid-2">
          <section class="admin-panel">
            <h2 class="admin-panel__title">Recent orders</h2>
            ${recentList}
          </section>
          <section class="admin-panel">
            <h2 class="admin-panel__title">Order pipeline <span class="admin-muted">${orders.length} total</span></h2>
            <ul class="admin-pipeline">${pipeline}</ul>
          </section>
        </div>`)
    );
  };

  render();
  const unsubscribe = adminStore.subscribe(render);
  return { element, destroy: unsubscribe };
}