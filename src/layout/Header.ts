import logoSvg from "../assets/logo/logo.svg";
import {
  initHeaderScrollEffect,
  initMobileNavToggle,
  initThemeToggle,
  attachRippleToAll,
} from "./interactions";
import { getCurrentUser, clearSession } from "../state/sessionManager.js";
import { uiState } from "../state/uiStateManager.js";

export interface NavLink {
  label: string;
  href: string;
  current?: boolean;
}

export interface HeaderProps {
  brandName?: string;
  navLinks: NavLink[];
  ctaLabel?: string;
  ctaHref?: string;
}

export function createHeader(props: HeaderProps): HTMLElement {
  const { brandName = "WMA Wood Craft", navLinks } = props;

  const header = document.createElement("header");
  header.className = "site-header";
  header.id = "site-header";

  header.innerHTML = `
    <div class="site-header__inner">
      <a class="brand" href="/" aria-label="${brandName} home">
        <img src="${logoSvg}" alt="${brandName} Logo" class="brand__logo-img" width="40" height="40" />
        <span class="brand__wordmark">WMA <strong>Wood Craft</strong></span>
      </a>

      <button
        type="button"
        class="nav-toggle"
        aria-label="Toggle navigation menu"
        aria-expanded="false"
        aria-controls="primary-navigation"
      >
        <span class="nav-toggle__bar"></span>
        <span class="nav-toggle__bar"></span>
        <span class="nav-toggle__bar"></span>
      </button>

      <nav class="site-nav" id="primary-navigation" aria-label="Primary">
        <ul class="site-nav__list">
          ${navLinks
            .map(
              (link) => `
            <li>
              <a
                class="site-nav__link"
                href="${link.href}"
                ${link.current ? 'aria-current="page"' : ""}
              >${link.label}</a>
            </li>`
            )
            .join("")}
        </ul>
        <div class="site-nav__actions" id="header-actions" style="display: flex; align-items: center; gap: 0.75rem;">
          <button type="button" class="btn btn--icon theme-toggle" id="theme-toggle-btn" aria-label="Toggle theme">
          </button>
          <!-- Dynamic Auth UI (Login CTA o User Profile) -->
          <div id="auth-actions-container"></div>
        </div>
      </nav>
    </div>
  `;

  const toggleButton = header.querySelector<HTMLElement>(".nav-toggle");
  if (toggleButton) {
    initMobileNavToggle(header, toggleButton);
  }

  const themeBtn = header.querySelector<HTMLElement>("#theme-toggle-btn");
  if (themeBtn) {
    initThemeToggle(themeBtn);
  }

  initHeaderScrollEffect(header);
  attachRippleToAll(header);

  // Initial render ng Auth buttons/avatar
  setTimeout(() => updateHeaderUI(), 0);

  return header;
}

// BAGO: In-export na function para i-update ang Header depende sa Session State
export function updateHeaderUI(): void {
  const authContainer = document.getElementById("auth-actions-container");
  if (!authContainer) return;

  const currentUser = getCurrentUser();

  if (currentUser) {
    // Logged-in State UI (Avatar/Name + Logout)
    authContainer.innerHTML = `
      <div class="user-profile-badge" style="display: flex; align-items: center; gap: 0.5rem;">
        <span class="user-avatar" style="background: #2563eb; color: #fff; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.875rem;">
          ${currentUser.fullName.charAt(0).toUpperCase()}
        </span>
        <span class="user-name" style="font-weight: 500; font-size: 0.9rem;">${currentUser.fullName}</span>
        <button type="button" id="logout-btn" class="btn btn--outline" style="margin-left: 0.5rem; padding: 6px 12px; font-size: 0.85rem;">Logout</button>
      </div>
    `;

    const logoutBtn = document.getElementById("logout-btn");
    logoutBtn?.addEventListener("click", () => {
      clearSession();
      updateHeaderUI();
    });
  } else {
    // Guest State UI (Sign In CTA Button)
    authContainer.innerHTML = `
      <button type="button" id="open-login-btn" class="btn btn--primary">Sign In</button>
    `;

    const openLoginBtn = document.getElementById("open-login-btn");
    openLoginBtn?.addEventListener("click", () => {
      uiState.openModal("login");
    });
  }
}