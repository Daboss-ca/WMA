import './src/client/styles/index.css';
import { initTheme } from './src/client/utils/theme';
import { createHeader, updateHeaderUI } from "./src/client/layout/Header";
import { createFooter } from "./src/client/layout/Footer";
import { createLandingPage } from "./src/client/layout/LandingPage";
import { createDashboardPage } from "./src/client/layout/DashboardPage";
import { createProfilePage } from "./src/client/layout/ProfilePage";
import { createOrdersPage, type OrderStatusTab } from "./src/client/components/order/OrdersPage";
import { createCartPage } from "./src/client/components/Cart/Cartpage";
import { initNotificationDrawer } from "./src/client/components/notification/NotificationDrawer";
import { notificationManager } from "./src/client/state/notificationManager";
import { cartManager } from "./src/client/state/cartManager";

import { createAuthModal, attachAuthModalEvents } from "./src/client/components/auth/AuthModal";
import { createInquiryModal } from "./src/client/components/inquiry/InquiryModal";
import { getCurrentUser, isAdminSession, SESSION_CHANGED_EVENT } from "./src/client/state/sessionManager";
import { uiState } from "./src/client/state/uiStateManager";
import { mountAdminApp } from "./src/admin/index";

initTheme();

const app = document.querySelector<HTMLDivElement>("#app");

function isAdminRoute(): boolean {
  return window.location.hash.startsWith("#/admin");
}

function renderApp() {
  if (!app) return;

  app.querySelectorAll<HTMLElement>(".site-header").forEach((header) => {
    (header as HTMLElement & { destroy?: () => void }).destroy?.();
  });

  app.querySelectorAll<HTMLElement>(".site-main").forEach((page) => {
    (page as HTMLElement & { destroy?: () => void }).destroy?.();
  });

  if (isAdminRoute()) {
    if (!isAdminSession()) {
      window.location.hash = "";
      return;
    }

    app.innerHTML = "";
    const adminRoot = document.createElement("div");
    adminRoot.id = "admin-root";
    app.appendChild(adminRoot);
    mountAdminApp(adminRoot);
    return;
  }

  if (isAdminSession() && !isAdminRoute()) {
    window.location.hash = "#/admin/overview";
    return;
  }

  app.innerHTML = "";

  const currentUser = getCurrentUser();
  const main = currentUser ? createDashboardPage() : createLandingPage();
  const profilePage = createProfilePage();

  app.append(
    createHeader({
      navLinks: [
        ...(currentUser
          ? [{ label: "Dashboard", href: "#dashboard", current: true }]
          : [
              { label: "Collection", href: "#catalog", current: true },
              { label: "Our process", href: "#process" },
            ]),
        { label: "Contact", href: "#contact" },
      ],
    }),
    main,
    profilePage,
    createFooter({
      quickLinks: currentUser
        ? [
            { label: "Dashboard", href: "#dashboard" },
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

document.addEventListener("wma:open-profile", () => {
  const profilePage = document.querySelector<HTMLElement>("#profile-page");
  const mainSections = Array.from(document.querySelectorAll<HTMLElement>(".site-main"));

  mainSections.forEach((section) => {
    section.hidden = true;
  });

  if (profilePage) {
    profilePage.hidden = false;
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
});

document.addEventListener("wma:close-profile", () => {
  const profilePage = document.querySelector<HTMLElement>("#profile-page");
  const mainSections = Array.from(document.querySelectorAll<HTMLElement>(".site-main"));

  if (profilePage) {
    profilePage.hidden = true;
  }

  mainSections.forEach((section) => {
    section.hidden = false;
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
});

renderApp();

document.addEventListener(SESSION_CHANGED_EVENT, () => {
  renderApp();
});

window.addEventListener("hashchange", () => {
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

function insertPageBeforeFooter(page: HTMLElement): void {
  const appContainer = document.querySelector<HTMLElement>("#app");
  if (!appContainer) return;

  // If this page is attached somewhere else, detach it before moving it.
  if (page.parentNode && page.parentNode !== appContainer) {
    page.remove();
  }

  // Avoid inserting the same page twice.
  if (page.parentNode === appContainer) return;

  const footer = appContainer.querySelector<HTMLElement>("footer");

  /*
   * insertBefore() only accepts a reference node that is a DIRECT child
   * of appContainer. A footer can be nested inside a wrapper, so find the
   * top-level child that contains it before trying to insert before it.
   */
  let insertionAnchor: Element | null = null;

  if (footer) {
    insertionAnchor = footer;

    while (
      insertionAnchor.parentElement &&
      insertionAnchor.parentElement !== appContainer
    ) {
      insertionAnchor = insertionAnchor.parentElement;
    }

    // The anchor is valid only if it is still a direct child of #app.
    if (insertionAnchor.parentElement !== appContainer) {
      insertionAnchor = null;
    }
  }

  if (insertionAnchor?.parentNode === appContainer) {
    appContainer.insertBefore(page, insertionAnchor);
  } else {
    // Safe fallback when the footer is missing, nested unexpectedly,
    // or has been replaced during a render.
    appContainer.appendChild(page);
  }
}

document.addEventListener("wma:open-orders", (event) => {
  const customEvent = event as CustomEvent<{ status?: OrderStatusTab }>;
  const targetStatus = customEvent.detail?.status ?? "all";

  const dashboardPage = document.querySelector("#dashboard");
  if (dashboardPage) (dashboardPage as HTMLElement).hidden = true;

  if (activeOrdersPage) {
    (activeOrdersPage as HTMLElement & { destroy?: () => void }).destroy?.();
    activeOrdersPage.remove();
  }

  activeOrdersPage = createOrdersPage(targetStatus);
  insertPageBeforeFooter(activeOrdersPage);

  window.scrollTo({ top: 0, behavior: "smooth" });
});

document.addEventListener("wma:close-orders", () => {
  (activeOrdersPage as (HTMLElement & { destroy?: () => void }) | null)?.destroy?.();
  activeOrdersPage?.remove();
  activeOrdersPage = null;

  const dashboardPage = document.querySelector<HTMLElement>("#dashboard");
  if (dashboardPage && !activeCartPage) dashboardPage.hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
});

let activeCartPage: HTMLElement | null = null;

document.addEventListener("wma:open-cart", () => {
  const currentMain = document.querySelector(".site-main") as HTMLElement;
  if (currentMain) currentMain.hidden = true;

  if (activeOrdersPage) activeOrdersPage.hidden = true;

  activeCartPage?.remove();

  activeCartPage = createCartPage();
  insertPageBeforeFooter(activeCartPage);

  window.scrollTo({ top: 0, behavior: "smooth" });
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

// When a user navigates using the header links, close any overlay page first.
// This prevents Orders/Cart from remaining mounted and appearing to stack below
// the landing/dashboard content after navigation.
document.addEventListener("wma:navigate-section", () => {
  activeCartPage?.remove();
  activeCartPage = null;

  if (activeOrdersPage) {
    (activeOrdersPage as HTMLElement & { destroy?: () => void }).destroy?.();
    activeOrdersPage.remove();
  }
  activeOrdersPage = null;

  document.querySelectorAll<HTMLElement>(".site-main").forEach((section) => {
    section.hidden = false;
  });

  const dashboardPage = document.querySelector<HTMLElement>("#dashboard");
  if (dashboardPage) dashboardPage.hidden = false;
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
