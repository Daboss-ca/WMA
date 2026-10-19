import logoSvg from "../../client/assets/logo/logo.svg";
import { createSidebar, type SidebarItem } from "../components/Sidebar.js";
import type { AdminRouteKey } from "../types/admin.js";
import { escapeHtml, fromHTML } from "../utils/dom.js";

const SIDEBAR_KEY = "wma-admin:sidebar-collapsed";
const THEME_KEY = "wma-admin-theme";
const MOBILE_QUERY = "(max-width: 959px)";

export interface AdminLayoutOptions {
  navItems: SidebarItem[];
  adminName?: string;
  onLogout?: () => void;
}

export interface AdminLayoutController {
  element: HTMLElement;
  setActive: (key: AdminRouteKey) => void;
  setHeading: (title: string, subtitle: string) => void;
  setContent: (node: HTMLElement) => void;
}

export function createAdminDashboardLayout({
  navItems,
  adminName = "Admin",
  onLogout,
}: AdminLayoutOptions): AdminLayoutController {
  const initials = adminName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const preferredTheme = (localStorage.getItem(THEME_KEY) as "light" | "dark" | null) ?? "dark";
  const collapsedAtStart = localStorage.getItem(SIDEBAR_KEY) === "1";

  const shell = fromHTML<HTMLElement>(`
    <div class="admin-app admin-shell w-full max-w-full overflow-x-hidden${collapsedAtStart ? " is-sidebar-collapsed" : ""}" data-theme="${preferredTheme}">
      <div class="admin-shell__overlay" data-overlay></div>

      <div class="admin-shell__main">
        <header class="site-header admin-header">
          <div class="site-header__inner">
            <button type="button" class="nav-toggle" aria-label="Toggle navigation" aria-expanded="false" aria-controls="admin-sidebar">
              <span class="nav-toggle__bar"></span>
              <span class="nav-toggle__bar"></span>
              <span class="nav-toggle__bar"></span>
            </button>

            <a class="brand" href="#/admin/overview" aria-label="WMA Wood Craft admin home">
              <img src="${logoSvg}" alt="" class="brand__logo-img" width="36" height="36" />
              <span class="brand__wordmark">WMA <strong>Wood Craft</strong></span>
            </a>

            <div class="admin-header__actions">
              <div class="profile-menu">
                <button type="button" class="profile-menu__trigger" aria-expanded="false" aria-controls="admin-profile-panel" aria-label="Open admin menu">
                  <span class="user-avatar" aria-hidden="true">${escapeHtml(initials)}</span>
                  <span class="profile-menu__name">${escapeHtml(adminName)}</span>
                  <span class="profile-menu__chevron" aria-hidden="true">&#8964;</span>
                </button>
                <div class="profile-menu__panel" id="admin-profile-panel" hidden>
                  <div class="profile-menu__summary">
                    <strong>${escapeHtml(adminName)}</strong>
                    <span>Administrator</span>
                  </div>
                  <button type="button" class="admin-theme-toggle profile-menu__theme" data-theme-toggle aria-label="Switch to light mode">
                    <span class="admin-theme-toggle__icon" aria-hidden="true">${preferredTheme === "dark" ? "☀" : "☾"}</span>
                    <span class="admin-theme-toggle__label">${preferredTheme === "dark" ? "Light mode" : "Dark mode"}</span>
                  </button>
                  <button type="button" class="profile-menu__item profile-menu__item--danger" data-action="logout">Log out</button>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main class="admin-main w-full max-w-full overflow-x-hidden">
          <div class="admin-page-head">
            <div>
              <p class="admin-eyebrow">Admin console</p>
              <h1 class="admin-page-title" data-heading></h1>
              <p class="admin-page-subtitle" data-subtitle></p>
            </div>
          </div>
          <div class="admin-page-content" data-content></div>
        </main>
      </div>
    </div>`);

  const navToggle = shell.querySelector<HTMLButtonElement>(".nav-toggle") as HTMLButtonElement;
  const overlay = shell.querySelector<HTMLElement>("[data-overlay]") as HTMLElement;
  const headingEl = shell.querySelector<HTMLElement>("[data-heading]") as HTMLElement;
  const subtitleEl = shell.querySelector<HTMLElement>("[data-subtitle]") as HTMLElement;
  const contentEl = shell.querySelector<HTMLElement>("[data-content]") as HTMLElement;
  const themeToggle = shell.querySelector<HTMLButtonElement>("[data-theme-toggle]") as HTMLButtonElement;
  const profileTrigger = shell.querySelector<HTMLButtonElement>(".profile-menu__trigger") as HTMLButtonElement;
  const profilePanel = shell.querySelector<HTMLElement>("#admin-profile-panel") as HTMLElement;
  const profileMenu = profileTrigger.closest<HTMLElement>(".profile-menu") as HTMLElement;

  const isMobile = (): boolean => window.matchMedia(MOBILE_QUERY).matches;

  const applyTheme = (theme: "dark" | "light"): void => {
    shell.dataset.theme = theme;
    shell.classList.toggle("is-light", theme === "light");
    shell.classList.toggle("is-dark", theme === "dark");
    localStorage.setItem(THEME_KEY, theme);

    const icon = themeToggle.querySelector<HTMLElement>(".admin-theme-toggle__icon");
    const label = themeToggle.querySelector<HTMLElement>(".admin-theme-toggle__label");
    if (icon) icon.textContent = theme === "dark" ? "☀" : "☾";
    if (label) label.textContent = theme === "dark" ? "Light mode" : "Dark mode";
    themeToggle.setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
  };

  const setCollapsed = (collapsed: boolean): void => {
    shell.classList.toggle("is-sidebar-collapsed", collapsed);
    localStorage.setItem(SIDEBAR_KEY, collapsed ? "1" : "0");
  };
  const toggleCollapsed = (): void => setCollapsed(!shell.classList.contains("is-sidebar-collapsed"));

  const setDrawer = (open: boolean): void => {
    shell.classList.toggle("is-drawer-open", open);
    navToggle.setAttribute("aria-expanded", String(open));
  };
  const closeDrawer = (): void => setDrawer(false);

  const setProfileOpen = (open: boolean): void => {
    profilePanel.hidden = !open;
    profileTrigger.setAttribute("aria-expanded", String(open));
  };

  const sidebar = createSidebar({
    items: navItems,
    activeKey: "overview",
    onToggleCollapse: toggleCollapsed,
    onNavigate: closeDrawer,
  });
  shell.insertBefore(sidebar.element, shell.querySelector(".admin-shell__main"));

  themeToggle?.addEventListener("click", () => {
    const nextTheme = shell.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
  });

  navToggle.addEventListener("click", () => {
    if (isMobile()) setDrawer(!shell.classList.contains("is-drawer-open"));
  });
  overlay.addEventListener("click", closeDrawer);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeDrawer();
      setProfileOpen(false);
    }
  });

  profileTrigger.addEventListener("click", (event) => {
    event.stopPropagation();
    // I-convert sa strict boolean para mawala ang type issue sa 'hidden'
    const isCurrentlyHidden = Boolean(profilePanel.hidden);
    setProfileOpen(isCurrentlyHidden);
  });
  document.addEventListener("click", (event) => {
    if (!profileMenu.contains(event.target as Node)) setProfileOpen(false);
  });
  profilePanel.addEventListener("click", (event) => {
    const action = (event.target as HTMLElement).closest<HTMLElement>("[data-action]")?.dataset.action;
    setProfileOpen(false);
    if (action === "logout") onLogout?.();
  });

  return {
    element: shell,
    setActive: (key) => sidebar.setActive(key),
    setHeading: (title, subtitle) => {
      headingEl.textContent = title;
      subtitleEl.textContent = subtitle;
      document.title = `${title} · WMA Admin`;
    },
    setContent: (node) => contentEl.replaceChildren(node),
  };
}
