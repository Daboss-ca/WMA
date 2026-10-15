import "./styles/admin.css";
import type { IconName } from "./components/icons.js";
import { createAdminDashboardLayout } from "./layouts/AdminDashboardLayout.js";
import { createAdminOrdersPage } from "./pages/AdminOrdersPage.js";
import { createAdminOverviewPage } from "./pages/AdminOverviewPage.js";
import { createAdminProductsPage } from "./pages/AdminProductsPage.js";
import type { AdminPage, AdminRouteKey } from "./types/admin.js";
import { clearAdminSession } from "../client/state/sessionManager.js";

interface AdminRouteDefinition {
  label: string;
  title: string;
  subtitle: string;
  icon: IconName;
  create: () => AdminPage;
}

const ROUTES: Record<AdminRouteKey, AdminRouteDefinition> = {
  overview: {
    label: "Overview",
    title: "Dashboard",
    subtitle: "Revenue, orders and catalog at a glance.",
    icon: "overview",
    create: createAdminOverviewPage,
  },
  products: {
    label: "Products",
    title: "Products",
    subtitle: "Publish, edit and retire woodcraft listings.",
    icon: "products",
    create: createAdminProductsPage,
  },
  orders: {
    label: "Orders",
    title: "Orders",
    subtitle: "Verify payment proofs and move orders through fulfilment.",
    icon: "orders",
    create: createAdminOrdersPage,
  },
};

const routeHash = (key: AdminRouteKey): string => `#/admin/${key}`;
const ROUTE_KEYS = Object.keys(ROUTES) as AdminRouteKey[];

export function mountAdminApp(root: HTMLElement): () => void {
  const layout = createAdminDashboardLayout({
    navItems: ROUTE_KEYS.map((key) => ({
      key,
      label: ROUTES[key].label,
      href: routeHash(key),
      icon: ROUTES[key].icon,
    })),
    onLogout: () => {
      clearAdminSession();
      window.location.hash = "#/";
    },
  });

  root.replaceChildren(layout.element);

  let page: AdminPage | null = null;

  const currentKey = (): AdminRouteKey =>
    ROUTE_KEYS.find((key) => window.location.hash === routeHash(key)) ?? "overview";

  const render = (): void => {
    const key = currentKey();
    const definition = ROUTES[key];
    const next = definition.create();

    page?.destroy();
    page = next;

    layout.setActive(key);
    layout.setHeading(definition.title, definition.subtitle);
    layout.setContent(next.element);
    window.scrollTo({ top: 0 });
  };

  const onHashChange = (): void => render();
  window.addEventListener("hashchange", onHashChange);

  const hashIsRoute = ROUTE_KEYS.some((key) => window.location.hash === routeHash(key));
  if (hashIsRoute) render();
  else window.location.hash = routeHash("overview");

  return () => {
    window.removeEventListener("hashchange", onHashChange);
    page?.destroy();
    page = null;
  };
}
