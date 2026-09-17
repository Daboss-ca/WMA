import logoSvg from "../assets/logo/logo.svg";
import {
  initHeaderScrollEffect,
  initMobileNavToggle,
  initThemeToggle,
  attachRippleToAll,
} from "./interactions.js";
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

  const sectionIds = new Set(["catalog", "process", "contact"]);
  const navLinkElements = Array.from(header.querySelectorAll<HTMLAnchorElement>(".site-nav__link"));

  const setActiveNavLink = (sectionId: string): void => {
    navLinkElements.forEach((link) => {
      if (link.getAttribute("href") === `#${sectionId}`) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  };

  header.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const navLink = target.closest<HTMLAnchorElement>(".site-nav__link");
    const sectionId = navLink?.getAttribute("href")?.slice(1);
    const section = sectionId ? document.getElementById(sectionId) : null;

    if (!navLink || !sectionId || !sectionIds.has(sectionId) || !section) return;

    event.preventDefault();
    setActiveNavLink(sectionId);
    history.pushState(null, "", `#${sectionId}`);
    section.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  requestAnimationFrame(() => {
    const initialSectionId = sectionIds.has(window.location.hash.slice(1))
      ? window.location.hash.slice(1)
      : navLinkElements.find((link) => link.getAttribute("aria-current") === "page")?.getAttribute("href")?.slice(1);

    if (initialSectionId) setActiveNavLink(initialSectionId);

    const sections = Array.from(sectionIds)
      .map((sectionId) => document.getElementById(sectionId))
      .filter((section): section is HTMLElement => section !== null);

    if (!sections.length || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleSection = entries
          .filter((entry) => entry.isIntersecting)
          .sort((first, second) => second.intersectionRatio - first.intersectionRatio)[0];

        if (visibleSection) setActiveNavLink(visibleSection.target.id);
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0, 0.25, 0.5, 1] }
    );

    sections.forEach((section) => observer.observe(section));
  });

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
    // Guest State UI (Sign Up CTA Button)
    authContainer.innerHTML = `
      <button type="button" id="open-signup-btn" class="btn btn--primary">Sign Up</button>
    `;

    const openSignupBtn = document.getElementById("open-signup-btn");
    openSignupBtn?.addEventListener("click", () => {
      uiState.openModal("signup");
    });
  }
}