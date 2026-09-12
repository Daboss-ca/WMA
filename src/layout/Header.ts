import {
  initHeaderScrollEffect,
  initMobileNavToggle,
  initThemeToggle,
  attachRippleToAll,
} from "./interactions";

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
  const { brandName = "WMA Wood Craft", navLinks, ctaLabel = "Request a Quote", ctaHref = "#quote" } = props;

  const header = document.createElement("header");
  header.className = "site-header";

  header.innerHTML = `
    <div class="site-header__inner">
      <a class="brand" href="/" aria-label="${brandName} home">
        <span class="brand__mark" aria-hidden="true"></span>
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
        <div class="site-nav__actions" style="display: flex; align-items: center; gap: 0.75rem;">
          <button type="button" class="btn btn--icon theme-toggle" id="theme-toggle-btn" aria-label="Toggle theme">
          </button>
          <a class="btn btn--primary" href="${ctaHref}">${ctaLabel}</a>
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

  return header;
}