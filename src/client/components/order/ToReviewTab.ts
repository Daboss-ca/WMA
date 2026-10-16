import type { OrderItem } from "./OrdersPage.js";

export function renderToReviewTab(orders: OrderItem[], renderCard: (order: OrderItem) => string): string {
  const filtered = orders
    .filter((order) => order.status === "review" && order.items.some((item) => !item.reviewed))
    .map((order) => {
      const items = order.items.filter((item) => !item.reviewed);
      return {
        ...order,
        items,
        price: items.reduce((total, item) => total + item.unitPrice * item.quantity, 0),
      };
    });

  if (filtered.length === 0) {
    return `
      <div class="orders-empty">
        <p class="orders-empty__title">No pending reviews</p>
        <p class="orders-empty__desc">There are no items awaiting your review.</p>
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
