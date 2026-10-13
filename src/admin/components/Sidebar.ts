import type { AdminRouteKey } from "../types/admin.js";
import { escapeHtml, fromHTML } from "../utils/dom.js";
import { icon, type IconName } from "./icons.js";

export interface SidebarItem {
  key: AdminRouteKey;
  label: string;
  href: string;
  icon: IconName;
}

export interface SidebarController {
  element: HTMLElement;
  setActive: (key: AdminRouteKey) => void;
}

interface SidebarOptions {
  items: SidebarItem[];
  activeKey: AdminRouteKey;
  onToggleCollapse: () => void;
  onNavigate: () => void;
}

export function createSidebar({ items, activeKey, onToggleCollapse, onNavigate }: SidebarOptions): SidebarController {
  const element = fromHTML<HTMLElement>(`
    <aside class="admin-sidebar" id="admin-sidebar" aria-label="Admin navigation">
      <div class="admin-sidebar__brand">
        <span class="admin-sidebar__mark" aria-hidden="true">W</span>
        <span class="admin-sidebar__wordmark admin-sidebar__label">WMA <strong>Wood Craft</strong></span>
        <span class="admin-sidebar__badge">Admin</span>
      </div>
      <nav class="admin-sidebar__nav">
        <ul class="admin-sidebar__list">
          ${items
            .map(
              (item) => `
            <li>
              <a class="admin-sidebar__link" href="${item.href}" data-key="${item.key}" title="${escapeHtml(item.label)}">
                ${icon(item.icon, 20)}
                <span class="admin-sidebar__label">${escapeHtml(item.label)}</span>
              </a>
            </li>`
            )
            .join("")}
        </ul>
      </nav>
      <button type="button" class="admin-sidebar__collapse" title="Collapse sidebar">
        ${icon("collapse", 18)}
        <span class="admin-sidebar__label">Collapse</span>
      </button>
    </aside>`);

  element.querySelector(".admin-sidebar__collapse")?.addEventListener("click", onToggleCollapse);
  element.querySelectorAll<HTMLAnchorElement>(".admin-sidebar__link").forEach((link) => {
    link.addEventListener("click", onNavigate);
  });

  const setActive = (key: AdminRouteKey): void => {
    element.querySelectorAll<HTMLAnchorElement>(".admin-sidebar__link").forEach((link) => {
      const isActive = link.dataset.key === key;
      link.classList.toggle("is-active", isActive);
      if (isActive) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  };

  setActive(activeKey);
  return { element, setActive };
}