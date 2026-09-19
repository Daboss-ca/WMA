import logoSvg from "../assets/logo/logo.svg";
import {
  initHeaderScrollEffect,
  initMobileNavToggle,
  initThemeToggle,
  attachRippleToAll,
} from "../utils/interactions.js";
import { getCurrentUser, clearSession, SESSION_CHANGED_EVENT } from "../state/sessionManager.js";
import { uiState } from "../state/uiStateManager.js";
import { applyTheme } from "../utils/theme.js";

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
        <div class="site-nav__actions" id="header-actions">
          <div id="auth-actions-container"></div>
        </div>
      </nav>
    </div>
  `;

  const toggleButton = header.querySelector<HTMLElement>(".nav-toggle");
  if (toggleButton) {
    initMobileNavToggle(header, toggleButton);
  }

  initHeaderScrollEffect(header);
  attachRippleToAll(header);

  const sectionIds = new Set(["catalog", "process", "dashboard", "project-tracker", "contact"]);
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
    uiState.closeProfile();
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

  document.addEventListener(SESSION_CHANGED_EVENT, () => {
    if (!getCurrentUser()) applyTheme("light");
    updateHeaderUI();
  });

  document.addEventListener("click", (event) => {
    const profileMenu = header.querySelector<HTMLElement>(".profile-menu");
    const profilePanel = header.querySelector<HTMLElement>("#profile-menu-panel");
    const profileTrigger = header.querySelector<HTMLButtonElement>("#profile-menu-trigger");
    if (!profileMenu || !profilePanel || !profileTrigger || profileMenu.contains(event.target as Node)) return;
    profilePanel.hidden = true;
    profileTrigger.setAttribute("aria-expanded", "false");
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const profilePanel = header.querySelector<HTMLElement>("#profile-menu-panel");
    const profileTrigger = header.querySelector<HTMLButtonElement>("#profile-menu-trigger");
    if (profilePanel && profileTrigger) {
      profilePanel.hidden = true;
      profileTrigger.setAttribute("aria-expanded", "false");
    }
  });

  return header;
}

export function updateHeaderUI(): void {
  const authContainer = document.getElementById("auth-actions-container");
  if (!authContainer) return;

  const currentUser = getCurrentUser();

  if (currentUser) {
    const initials = currentUser.fullName
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    authContainer.innerHTML = `
      <div class="header-authenticated-actions">
        <button type="button" class="header-action-button" aria-label="View cart" title="Cart">
          <svg class="header-action-button__icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
            <circle cx="8" cy="21" r="1"></circle>
            <circle cx="19" cy="21" r="1"></circle>
            <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"></path>
          </svg>
          <span class="header-action-button__badge" data-badge="count" aria-hidden="true" hidden></span>
        </button>
        <button type="button" class="header-action-button" aria-label="View notifications" title="Notifications">
          <svg class="header-action-button__icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path>
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path>
          </svg>
          <span class="header-action-button__badge header-action-button__badge--dot" data-badge="dot" aria-hidden="true" hidden></span>
        </button>
        <div class="profile-menu">
          <button type="button" class="profile-menu__trigger" id="profile-menu-trigger" aria-label="Open profile menu" aria-expanded="false" aria-controls="profile-menu-panel">
            <span class="user-avatar" aria-hidden="true">${initials}</span>
            <span class="profile-menu__name">${currentUser.fullName}</span>
            <span class="profile-menu__chevron" aria-hidden="true">&#8964;</span>
          </button>
          <div class="profile-menu__panel" id="profile-menu-panel" hidden>
            <div class="profile-menu__summary">
              <strong>${currentUser.fullName}</strong>
              <span>${currentUser.email}</span>
            </div>
            <button type="button" class="profile-menu__item" id="view-profile-btn">View / Edit Profile</button>
            <button type="button" class="profile-menu__item" id="settings-btn">Settings</button>
            <div class="profile-menu__display">
              <span>Display &amp; Accessibility</span>
              <button type="button" class="btn btn--icon theme-toggle" id="theme-toggle-btn" aria-label="Toggle theme"></button>
            </div>
            <button type="button" class="profile-menu__item profile-menu__item--danger" id="logout-btn">Log Out</button>
          </div>
        </div>
      </div>
    `;

    const profileTrigger = authContainer.querySelector<HTMLButtonElement>("#profile-menu-trigger");
    const profilePanel = authContainer.querySelector<HTMLElement>("#profile-menu-panel");
    const closeProfileMenu = (): void => {
      if (!profilePanel || !profileTrigger) return;
      profilePanel.hidden = true;
      profileTrigger.setAttribute("aria-expanded", "false");
    };

    profileTrigger?.addEventListener("click", () => {
      if (!profilePanel) return;
      profilePanel.hidden = !profilePanel.hidden;
      profileTrigger.setAttribute("aria-expanded", String(!profilePanel.hidden));
    });

    authContainer.querySelector("#view-profile-btn")?.addEventListener("click", () => {
      closeProfileMenu();
      uiState.openProfile();
    });
    authContainer.querySelector("#settings-btn")?.addEventListener("click", () => {
      closeProfileMenu();
      uiState.openProfile();
    });

    const themeBtn = authContainer.querySelector<HTMLElement>("#theme-toggle-btn");
    if (themeBtn) initThemeToggle(themeBtn);

    const logoutBtn = authContainer.querySelector("#logout-btn");
    logoutBtn?.addEventListener("click", () => {
      clearSession();
      uiState.closeProfile();
    });
  } else {
    authContainer.innerHTML = `
      <button type="button" class="btn btn--primary" id="header-signup-btn">Sign Up</button>
    `;

    const signUpBtn = authContainer.querySelector("#header-signup-btn");
    signUpBtn?.addEventListener("click", () => {
      uiState.openModal("signup");
    });
  }
}