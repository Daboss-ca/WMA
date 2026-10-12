import { getCurrentUser } from "../../state/sessionManager.js";
import { renderToPayTab } from "./ToPayTab.js";
import { renderToShipTab } from "./ToShipTab.js";
import { renderToReceiveTab } from "./ToReceiveTab.js";
import { renderToReviewTab } from "./ToReviewTab.js";

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

const TABS: { id: OrderStatusTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pay", label: "To pay" },
  { id: "ship", label: "To ship" },
  { id: "receive", label: "To receive" },
  { id: "review", label: "To review" },
];

function escapeHtml(value: string): string {
  if (!value) return "";
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] ?? character);
}

// Inilabas ko ang render function na ito para mapasa sa mga child tabs
export function renderOrderCard(order: OrderItem): string {
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
          <p class="order-card__meta">${escapeHtml(order.dimensions)}</p>
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

// Inilabas din ito para maging malinis ang main function
function mapDatabaseStatus(dbStatus: string): "pay" | "ship" | "receive" | "review" {
  const statusLower = (dbStatus || "").toLowerCase();
  if (statusLower.includes("pay") || statusLower.includes("pending")) return "pay";
  if (statusLower.includes("ship") || statusLower.includes("craft")) return "ship";
  if (statusLower.includes("receive") || statusLower.includes("deliver")) return "receive";
  if (statusLower.includes("review") || statusLower.includes("complete")) return "review";
  return "pay";
}

export function createOrdersPage(initialTab: OrderStatusTab = "all"): HTMLElement {
  const user = getCurrentUser();
  const page = document.createElement("main");
  page.className = "site-main orders-page";
  page.id = "orders-page";

  if (!user) return page;

  let activeTab: OrderStatusTab = initialTab;
  let orders: OrderItem[] = [];
  let isLoading = true;

  const fetchUserOrders = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/orders?user_id=${user.id}`);
      const data = await response.json();

      if (response.ok && Array.isArray(data)) {
        orders = data.map((item: any) => {
          const firstOrderItem = item.order_items?.[0];
          const product = firstOrderItem?.products;
          const quantity = firstOrderItem?.quantity || 1;

          return {
            id: item.id,
            orderNumber: `WMA-${item.id.slice(0, 6).toUpperCase()}`,
            date: new Date(item.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }),
            status: mapDatabaseStatus(item.status),
            statusLabel: item.status || "Pending",
            title: product?.title || `Item ${firstOrderItem?.product_id || ""}`,
            category: product?.category || "Category",
            price: item.total_amount || 0,
            imageUrl: product?.image_url,
            dimensions: product?.dimensions ? `Dimensions: ${product.dimensions} (Qty: ${quantity})` : `Qty: ${quantity}`,
          };
        });
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      isLoading = false;
      renderContent();
    }
  };

  const renderContent = () => {
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
    if (isLoading) {
      listHtml = `<div class="orders-loading"><p>Loading your orders...</p></div>`;
    } else {
      // Dito ginagamit ang mga hiwa-hiwalay na renderers natin
      switch (activeTab) {
        case "pay":
          listHtml = renderToPayTab(orders, renderOrderCard);
          break;
        case "ship":
          listHtml = renderToShipTab(orders, renderOrderCard);
          break;
        case "receive":
          listHtml = renderToReceiveTab(orders, renderOrderCard);
          break;
        case "review":
          listHtml = renderToReviewTab(orders, renderOrderCard);
          break;
        case "all":
        default:
          if (orders.length === 0) {
            listHtml = `
              <div class="orders-empty">
                <p class="orders-empty__title">No orders found</p>
                <p class="orders-empty__desc">You don't have any orders yet.</p>
                <a href="#catalog" class="btn btn--outline orders-empty__cta" data-action="go-catalog">Browse Catalog</a>
              </div>
            `;
          } else {
            listHtml = `<div class="orders-list">${orders.map(renderOrderCard).join("")}</div>`;
          }
          break;
      }
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
  fetchUserOrders();

  return page;
}