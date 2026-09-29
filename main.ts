import './src/client/styles/index.css';
import { initTheme } from './src/client/utils/theme';
import { createHeader, updateHeaderUI } from "./src/client/layout/Header";
import { createFooter } from "./src/client/layout/Footer";
import { createLandingPage } from "./src/client/layout/LandingPage";
import { createDashboardPage } from "./src/client/layout/DashboardPage";
import { createOrdersPage, type OrderStatusTab } from "./src/client/components/order/OrdersPage";
import { createCartPage } from "./src/client/components/Cart/Cartpage";
import { initNotificationDrawer } from "./src/client/components/notification/NotificationDrawer";
import { notificationManager } from "./src/client/state/notificationManager";
import { cartManager } from "./src/client/state/cartManager";

import { createAuthModal, attachAuthModalEvents } from "./src/client/components/auth/AuthModal";
import { createInquiryModal } from "./src/client/components/inquiry/InquiryModal";
import { getCurrentUser, SESSION_CHANGED_EVENT } from "./src/client/state/sessionManager";
import { uiState } from "./src/client/state/uiStateManager";

initTheme();

const app = document.querySelector<HTMLDivElement>("#app");

function renderApp() {
  if (!app) return;
  app.innerHTML = "";

  const currentUser = getCurrentUser();
  const main = currentUser ? createDashboardPage() : createLandingPage();

  app.append(
    createHeader({
      navLinks: [
        ...(currentUser
          ? [
              { label: "Dashboard", href: "#dashboard", current: true },
              { label: "Project tracker", href: "#project-tracker" },
            ]
          : [
              { label: "Collection", href: "#catalog", current: true },
              { label: "Our process", href: "#process" },
            ]),
        { label: "Contact", href: "#contact" },
      ],
    }),
    main,
    createFooter({
      quickLinks: currentUser
        ? [
            { label: "Dashboard", href: "#dashboard" },
            { label: "Project tracker", href: "#project-tracker" },
            { label: "Contact", href: "#contact" },
          ]
        : [
            { label: "Collection", href: "#catalog" },
            { label: "Request a quote", href: "#quote" },
            { label: "Contact", href: "#contact" },
          ],
      categoryLinks: [
        { label: "Tables", href: "#catalog" },
        { label: "Cabinets", href: "#catalog" },
        { label: "Kiosks", href: "#catalog" },
        { label: "Custom work", href: "#catalog" },
      ],
      socialLinks: [
        {
          label: "Instagram",
          href: "https://www.instagram.com/",
          iconSvg:
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/></svg>',
        },
        {
          label: "Facebook",
          href: "https://www.facebook.com/wm.arnuco1983/",
          iconSvg:
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 21v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3V2h-3a5 5 0 0 0-5 5v2H7v4h3v8z"/></svg>',
        },
      ],
    })
  );

  updateHeaderUI();
  updateCartBadge();
  updateNotificationBadge();
}

renderApp();

document.addEventListener(SESSION_CHANGED_EVENT, () => {
  renderApp();
});

const authModalElement = createAuthModal();
document.body.appendChild(authModalElement);
attachAuthModalEvents(authModalElement);

document.body.appendChild(createInquiryModal());

document.addEventListener('wma:open-inquiry', (e) => {
  e.preventDefault();
  if (!getCurrentUser()) {
    uiState.openModal('signup');
    return;
  }
  uiState.openInquiryModal();
});

let activeOrdersPage: HTMLElement | null = null;

document.addEventListener("wma:open-orders", (event) => {
  const customEvent = event as CustomEvent<{ status?: OrderStatusTab }>;
  const targetStatus = customEvent.detail?.status ?? "all";

  const dashboardPage = document.querySelector("#dashboard");
  if (dashboardPage) (dashboardPage as HTMLElement).hidden = true;

  activeOrdersPage?.remove();

  const appContainer = document.querySelector("#app");
  if (appContainer) {
    activeOrdersPage = createOrdersPage(targetStatus);
    const footer = appContainer.querySelector("footer");
    
    if (footer) {
      appContainer.insertBefore(activeOrdersPage, footer);
    } else {
      appContainer.appendChild(activeOrdersPage);
    }
    
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});

document.addEventListener("wma:close-orders", () => {
  activeOrdersPage?.remove();
  activeOrdersPage = null;

  const dashboardPage = document.querySelector("#dashboard");
  if (dashboardPage) (dashboardPage as HTMLElement).hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
});

let activeCartPage: HTMLElement | null = null;

document.addEventListener("wma:open-cart", () => {
  const currentMain = document.querySelector(".site-main") as HTMLElement;
  if (currentMain) currentMain.hidden = true;

  if (activeOrdersPage) activeOrdersPage.hidden = true;

  activeCartPage?.remove();

  const appContainer = document.querySelector("#app");
  if (appContainer) {
    activeCartPage = createCartPage();
    const footer = appContainer.querySelector("footer");
    
    if (footer) {
      appContainer.insertBefore(activeCartPage, footer);
    } else {
      appContainer.appendChild(activeCartPage);
    }
    
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});

document.addEventListener("wma:close-cart", () => {
  activeCartPage?.remove();
  activeCartPage = null;

  if (activeOrdersPage) {
    activeOrdersPage.hidden = false;
  } else {
    const currentMain = document.querySelector(".site-main") as HTMLElement;
    if (currentMain) currentMain.hidden = false;
  }
  
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// ==========================================
// BADGES MANAGEMENT SETUP
// ==========================================

initNotificationDrawer();

function updateCartBadge() {
  const badge = document.querySelector<HTMLElement>('#header-cart-btn .header-action-button__badge');
  if (badge) {
    const items = cartManager.getItems();
    const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
    badge.hidden = totalCount === 0;
    badge.textContent = String(totalCount);
  }
}

function updateNotificationBadge() {
  const badge = document.querySelector<HTMLElement>('#header-notifications-btn .header-action-button__badge');
  if (badge) {
    const unreadCount = notificationManager.getUnreadCount();
    badge.hidden = unreadCount === 0;
    badge.textContent = String(unreadCount);
  }
}

window.addEventListener('wma:cart-updated', () => {
  updateCartBadge();
});

window.addEventListener('wma:notifications-updated', (e) => {
  const customEvent = e as CustomEvent<{ unreadCount: number }>;
  const badge = document.querySelector<HTMLElement>('#header-notifications-btn .header-action-button__badge');
  if (badge) {
    badge.hidden = customEvent.detail.unreadCount === 0;
    badge.textContent = String(customEvent.detail.unreadCount);
  }
});

requestAnimationFrame(() => {
  updateCartBadge();
  updateNotificationBadge();
});