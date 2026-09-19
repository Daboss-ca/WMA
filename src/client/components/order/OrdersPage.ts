import { getCurrentUser } from "../../state/sessionManager";

export type OrderStatusTab = "all" | "pay" | "ship" | "receive" | "review";

export interface OrderItem {
  id: string;
  orderNumber: string;
  date: string;
  status: "pay" | "ship" | "receive" | "review";
  statusLabel: string;
  title: string;
  category: string;
  price: number;
  imageUrl?: string;
  dimensions: string;
}

// Sample mock data — pwede itong itakda bilang empty array ([]) kung wala pang totoong order
const MOCK_ORDERS: OrderItem[] = [
  {
    id: "ord-1",
    orderNumber: "WMA-2026-001",
    date: "Sept 18, 2026",
    status: "pay",
    statusLabel: "Awaiting Payment",
    title: "Oak Display Kiosk",
    category: "Kiosk",
    price: 45000,
    dimensions: "120×210×60 cm",
  },
];

const TABS: { id: OrderStatusTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pay", label: "To pay" },
  { id: "ship", label: "To ship" },
  { id: "receive", label: "To receive" },
  { id: "review", label: "To review" },
];

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] ?? character);
}

function renderOrderCard(order: OrderItem): string {
  const formattedPrice = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(order.price);

  let actionButtonLabel = "View details";
  if (order.status === "pay") actionButtonLabel = "Pay now / Upload proof";
  else if (order.status === "ship") actionButtonLabel = "Track crafting";
  else if (order.status === "receive") actionButtonLabel = "Confirm received";
  else if (order.status === "review") actionButtonLabel = "Write review";

  return `
    <article class="order-card" data-order-id="${order.id}">
      <header class="order-card__header">
        <div>
          <span class="order-card__number">${escapeHtml(order.orderNumber)}</span>
          <span class="order-card__date">${escapeHtml(order.date)}</span>
        </div>
        <span class="order-badge order-badge--${order.status}">
          ${escapeHtml(order.statusLabel)}
        </span>
      </header>

      <div class="order-card__body">
        <div class="order-card__media">
          ${
            order.imageUrl
              ? `<img src="${order.imageUrl}" alt="${escapeHtml(order.title)}" />`
              : `<div class="order-card__placeholder">${escapeHtml(order.category)}</div>`
          }
        </div>
        <div class="order-card__info">
          <h3 class="order-card__title">${escapeHtml(order.title)}</h3>
          <p class="order-card__meta">Dimension: ${escapeHtml(order.dimensions)}</p>
          <p class="order-card__price">${formattedPrice}</p>
        </div>
      </div>

      <footer class="order-card__footer">
        <button type="button" class="btn btn--secondary btn--sm" data-order-action="${order.status}">
          ${actionButtonLabel}
        </button>
      </footer>
    </article>
  `;
}

export function createOrdersPage(initialTab: OrderStatusTab = "all"): HTMLElement {
  const user = getCurrentUser();
  const page = document.createElement("main");
  page.className = "site-main orders-page";
  page.id = "orders-page";

  if (!user) return page;

  let activeTab: OrderStatusTab = initialTab;

  const renderContent = () => {
    const filteredOrders = MOCK_ORDERS.filter(
      (order) => activeTab === "all" || order.status === activeTab
    );

    const tabsHtml = TABS.map(
      (tab) => `
        <button 
          type="button" 
          class="orders-tab ${tab.id === activeTab ? "is-active" : ""}" 
          data-tab="${tab.id}"
          aria-pressed="${tab.id === activeTab}"
        >
          ${tab.label}
        </button>`
    ).join("");

    let listHtml = "";
    if (filteredOrders.length === 0) {
      listHtml = `
        <div class="orders-empty">
          <p class="orders-empty__title">No orders found</p>
          <p class="orders-empty__desc">You don't have any orders under "${TABS.find((t) => t.id === activeTab)?.label}" yet.</p>
          <a href="#catalog" class="btn btn--outline orders-empty__cta" data-action="go-catalog">Browse Catalog</a>
        </div>
      `;
    } else {
      listHtml = `
        <div class="orders-list">
          ${filteredOrders.map(renderOrderCard).join("")}
        </div>
      `;
    }

    page.innerHTML = `
      <div class="wrap orders-page__inner">
        <div class="orders-header">
          <button type="button" class="btn-back" id="back-to-dashboard-btn">
            ← Back to Dashboard
          </button>
          <h1 class="orders-title">Your Orders</h1>
        </div>

        <nav class="orders-tabs" role="tablist" aria-label="Order status tabs">
          ${tabsHtml}
        </nav>

        <section class="orders-content">
          ${listHtml}
        </section>
      </div>
    `;

    // Event listeners
    page.querySelector("#back-to-dashboard-btn")?.addEventListener("click", () => {
      document.dispatchEvent(new CustomEvent("wma:close-orders"));
    });

    page.querySelectorAll<HTMLButtonElement>("[data-tab]").forEach((tabBtn) => {
      tabBtn.addEventListener("click", () => {
        const selected = tabBtn.dataset.tab as OrderStatusTab;
        if (selected && selected !== activeTab) {
          activeTab = selected;
          renderContent();
        }
      });
    });

    page.querySelector('[data-action="go-catalog"]')?.addEventListener("click", () => {
      document.dispatchEvent(new CustomEvent("wma:close-orders"));
    });
  };

  renderContent();
  return page;
}