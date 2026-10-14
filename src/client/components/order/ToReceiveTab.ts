import type { OrderItem } from "./OrdersPage.js";

export function renderToReceiveTab(orders: OrderItem[], renderCard: (order: OrderItem) => string): string {
  const filtered = orders.filter((order) => {
    const status = (order.status ?? "").toLowerCase();
    const statusLabel = (order.statusLabel ?? "").toLowerCase();
    const combined = `${status} ${statusLabel}`.trim();

    return (
      status === "receive" ||
      statusLabel.includes("receive") ||
      combined.includes("shipping") ||
      combined.includes("shipped") ||
      combined.includes("deliver") ||
      combined.includes("delivery")
    );
  });

  if (filtered.length === 0) {
    return `
      <div class="orders-empty">
        <p class="orders-empty__title">No items to receive</p>
        <p class="orders-empty__desc">You don't have any orders out for delivery at the moment.</p>
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