import type { OrderItem } from "./OrdersPage.js";

export function renderToReviewTab(orders: OrderItem[], renderCard: (order: OrderItem) => string): string {
  const filtered = orders.filter((o) => o.status === "review");

  if (filtered.length === 0) {
    return `
      <div class="orders-empty">
        <p class="orders-empty__title">No pending reviews</p>
        <p class="orders-empty__desc">You haven't received any new orders to review yet.</p>
        <a href="#catalog" class="btn btn--outline orders-empty__cta" data-action="go-catalog">Browse Catalog</a>
      </div>
    `;
  }

  return `
    <div class="orders-list">
      ${filtered.map(renderCard).join("")}
    </div>
  `;
}