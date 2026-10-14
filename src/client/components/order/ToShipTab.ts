import type { OrderItem } from "./OrdersPage.js";

export function renderToShipTab(orders: OrderItem[], renderCard: (order: OrderItem) => string): string {
  const filtered = orders.filter((order) => {
    const status = (order.status ?? "").toLowerCase();
    const statusLabel = (order.statusLabel ?? "").toLowerCase();
    const combined = `${status} ${statusLabel}`.trim();

    return (
      status === "ship" ||
      combined.includes("to ship") ||
      (combined.includes("ship") && !combined.includes("shipping") && !combined.includes("shipped"))
    );
  });

  if (filtered.length === 0) {
    return `
      <div class="orders-empty">
        <p class="orders-empty__title">No items to ship</p>
        <p class="orders-empty__desc">You don't have any orders currently being crafted or shipped.</p>
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