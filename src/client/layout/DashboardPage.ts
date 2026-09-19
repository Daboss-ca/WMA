import { getCurrentUser } from "../state/sessionManager.js";
import { catalogItems } from "../data/furnitureData.js";
import { createCatalogProductFeed } from "./Catalog.js";

type CatalogItem = (typeof catalogItems)[number];

interface OrderStatus {
  id: string;
  label: string;
  count: number;
  icon: string;
}

interface CategoryFilter {
  id: string;
  label: string;
  /** Lower-case fragment matched against the item's category, so "Tables" and "table" both hit. */
  match: string;
}

const ALL_FILTER_ID = "all";

const CATEGORY_FILTERS: readonly CategoryFilter[] = [
  { id: "tables", label: "Tables", match: "table" },
  { id: "cabinets", label: "Cabinets", match: "cabinet" },
  { id: "kiosks", label: "Kiosks", match: "kiosk" },
  { id: "custom", label: "Custom", match: "custom" },
];

const ICON_ATTRS = 'viewBox="0 0 24 24" focusable="false"';

const ORDER_STATUSES: readonly OrderStatus[] = [
  {
    id: "pay",
    label: "To pay",
    count: 0,
    icon: `<svg ${ICON_ATTRS}><rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3 10h18M7 14.5h3"/></svg>`,
  },
  {
    id: "ship",
    label: "To ship",
    count: 0,
    icon: `<svg ${ICON_ATTRS}><path d="M3 6h10.5v9H3z"/><path d="M13.5 9h3.7l3.3 3.3V15h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/></svg>`,
  },
  {
    id: "receive",
    label: "To receive",
    count: 0,
    icon: `<svg ${ICON_ATTRS}><path d="M12 3 3.5 7.5v9L12 21l8.5-4.5v-9L12 3Z"/><path d="m3.5 7.5 8.5 4.5 8.5-4.5M12 12v9"/></svg>`,
  },
  {
    id: "review",
    label: "To review",
    count: 0,
    icon: `<svg ${ICON_ATTRS}><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z"/></svg>`,
  },
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

function getCategoryKey(item: CatalogItem): string {
  const raw = (item as unknown as Record<string, unknown>).category;
  return typeof raw === "string" ? raw.trim().toLowerCase() : "";
}

function itemMatchesFilter(item: CatalogItem, filterId: string): boolean {
  if (filterId === ALL_FILTER_ID) return true;
  const filter = CATEGORY_FILTERS.find((entry) => entry.id === filterId);
  return Boolean(filter) && getCategoryKey(item).includes(filter!.match);
}

function renderOrderStatus(status: OrderStatus): string {
  const noun = status.count === 1 ? "order" : "orders";
  return `
    <button type="button" class="dashboard-order-status" data-order-status="${status.id}">
      <span class="dashboard-order-status__icon" aria-hidden="true">${status.icon}</span>
      <span class="dashboard-order-status__text">
        <strong>${escapeHtml(status.label)}</strong>
        <small>${status.count} ${noun}</small>
      </span>
    </button>`;
}

function renderFilters(): string {
  const filters = [
    { id: ALL_FILTER_ID, label: "All", count: catalogItems.length },
    ...CATEGORY_FILTERS.map((filter) => ({
      id: filter.id,
      label: filter.label,
      count: catalogItems.filter((item) => itemMatchesFilter(item, filter.id)).length,
    })).filter((filter) => filter.count > 0),
  ];

  if (filters.length <= 1) return "";

  const chips = filters
    .map(
      (filter) => `
        <button type="button" class="dashboard-filter ${filter.id === ALL_FILTER_ID ? 'is-active' : ''}" data-filter="${filter.id}" aria-pressed="${filter.id === ALL_FILTER_ID}">
          ${escapeHtml(filter.label)} <span class="dashboard-filter__count">${filter.count}</span>
        </button>`,
    )
    .join("");

  return `<div class="dashboard-filters" role="group" aria-label="Filter pieces by category" data-filter-bar>${chips}</div>`;
}

export function createDashboardPage(): HTMLElement {
  const user = getCurrentUser();
  const page = document.createElement("main");
  page.className = "site-main dashboard-page";
  page.id = "dashboard";

  if (!user) return page;

  const firstName = user.fullName.trim().split(/\s+/)[0] || user.fullName;

  page.innerHTML = `
    <div class="wrap dashboard-page__inner">
      <section class="dashboard-welcome" aria-labelledby="dashboard-title">
        <div class="dashboard-welcome__copy">
          <h1 id="dashboard-title">Welcome back, ${escapeHtml(firstName)}!</h1>
          <p>Keep an eye on your build, revisit saved pieces, or start shaping the next one.</p>
        </div>
        <div class="dashboard-welcome__mark" aria-hidden="true">WMA</div>
      </section>

      <section class="dashboard-orders" aria-labelledby="orders-title">
        <h2 id="orders-title" class="dashboard-orders__title">Your orders</h2>
        <nav class="dashboard-order-statuses" aria-label="Order status">
          ${ORDER_STATUSES.map(renderOrderStatus).join("")}
        </nav>
      </section>

      <section class="dashboard-catalog" aria-labelledby="catalog-title">
        <div class="dashboard-catalog__header">
          <h2 id="catalog-title">EXPLORE THE CATALOG</h2>
        </div>
        
        <div class="dashboard-catalog__filter-container">
           ${renderFilters()}
        </div>

        <p class="dashboard-sr-only" role="status" aria-live="polite" data-filter-status></p>
        <div id="dashboard-product-feed" class="dashboard-catalog__feed"></div>
      </section>
    </div>
  `;

  const feedMount = page.querySelector<HTMLElement>("#dashboard-product-feed");
  const filterBar = page.querySelector<HTMLElement>("[data-filter-bar]");
  const statusRegion = page.querySelector<HTMLElement>("[data-filter-status]");
  let activeFilter = ALL_FILTER_ID;

  const renderFeed = (announce: boolean): void => {
    if (!feedMount) return;
    const items = catalogItems.filter((item) => itemMatchesFilter(item, activeFilter));

    if (items.length === 0) {
      const empty = document.createElement("p");
      empty.className = "dashboard-empty";
      empty.textContent = "No pieces in this category yet.";
      feedMount.replaceChildren(empty);
    } else {
      feedMount.replaceChildren(createCatalogProductFeed(items));
    }

    if (announce && statusRegion) {
      statusRegion.textContent = `Showing ${items.length} ${items.length === 1 ? "piece" : "pieces"}`;
    }
  };

  renderFeed(false);

  filterBar?.addEventListener("click", (event) => {
    const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>("[data-filter]") : null;
    if (!button || !filterBar.contains(button)) return;

    const nextFilter = button.dataset.filter ?? ALL_FILTER_ID;
    if (nextFilter === activeFilter) return;

    activeFilter = nextFilter;
    
    filterBar.querySelectorAll<HTMLButtonElement>("[data-filter]").forEach((chip) => {
      const isSelected = chip === button;
      chip.setAttribute("aria-pressed", String(isSelected));
      if (isSelected) {
        chip.classList.add('is-active');
      } else {
        chip.classList.remove('is-active');
      }
    });
    
    feedMount?.classList.add("is-filtered");
    renderFeed(true);
  });

  // BAGO: Event listener para buksan ang bagong Orders Page mula sa dashboard
  page.querySelectorAll<HTMLButtonElement>("[data-order-status]").forEach((button) => {
    button.addEventListener("click", () => {
      const status = button.dataset.orderStatus;
      document.dispatchEvent(
        new CustomEvent("wma:open-orders", { detail: { status } })
      );
    });
  });

  return page;
}