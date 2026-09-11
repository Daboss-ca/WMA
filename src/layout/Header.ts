import {
  initHeaderScrollEffect,
  initMobileNavToggle,
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

/**
 * Builds the sticky site header. Purely presentational: it renders
 * whatever `navLinks`/labels it's given and wires up visual-only
 * behavior (scroll glass effect, mobile menu, button ripple).
 * It performs no navigation, routing, or data fetching itself.
 */
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
        <a class="btn btn--primary" href="${ctaHref}">${ctaLabel}</a>
      </nav>
    </div>
  `;

  const toggleButton = header.querySelector<HTMLElement>(".nav-toggle");
  if (toggleButton) {
    initMobileNavToggle(header, toggleButton);
  }

  initHeaderScrollEffect(header);
  attachRippleToAll(header);

  return header;
}
