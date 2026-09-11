export interface FooterLink {
  label: string;
  href: string;
}

export interface SocialLink {
  label: string;
  href: string;
  /** Raw inline SVG markup for the icon (kept simple, no icon library dependency). */
  iconSvg: string;
}

export interface FooterProps {
  brandStory?: string;
  quickLinks: FooterLink[];
  categoryLinks: FooterLink[];
  socialLinks: SocialLink[];
  legalLinks?: FooterLink[];
}

const defaultBrandStory =
  "Every piece we build starts as rough timber in our workshop and leaves as furniture meant to outlast the room it's built for.";

/**
 * Builds the multi-column site footer. Purely presentational —
 * renders the link lists and social icons it's handed as props.
 */
export function createFooter(props: FooterProps): HTMLElement {
  const {
    brandStory = defaultBrandStory,
    quickLinks,
    categoryLinks,
    socialLinks,
    legalLinks = [
      { label: "Privacy", href: "#privacy" },
      { label: "Terms", href: "#terms" },
    ],
  } = props;

  const year = new Date().getFullYear();

  const footer = document.createElement("footer");
  footer.className = "site-footer";

  const renderLinkColumn = (title: string, links: FooterLink[]): string => `
    <div class="footer-col">
      <h3 class="footer-col__title">${title}</h3>
      <ul class="footer-col__list">
        ${links
          .map(
            (link) => `<li><a class="footer-col__link" href="${link.href}">${link.label}</a></li>`
          )
          .join("")}
      </ul>
    </div>
  `;

  footer.innerHTML = `
    <div class="site-footer__inner">
      <div class="footer-brand">
        <p class="footer-brand__wordmark">WMA Wood Craft</p>
        <p class="footer-brand__story">${brandStory}</p>
        <div class="footer-social">
          ${socialLinks
            .map(
              (social) => `
            <a class="footer-social__link" href="${social.href}" aria-label="${social.label}">
              ${social.iconSvg}
            </a>`
            )
            .join("")}
        </div>
      </div>

      ${renderLinkColumn("Quick links", quickLinks)}
      ${renderLinkColumn("Categories", categoryLinks)}
      ${renderLinkColumn("Studio", [
        { label: "Our process", href: "#process" },
        { label: "Careers", href: "#careers" },
        { label: "Contact", href: "#contact" },
      ])}
    </div>

    <div class="site-footer__bottom">
      <div class="site-footer__bottom-inner">
        <span>&copy; ${year} WMA Wood Craft. All rights reserved.</span>
        <nav class="site-footer__legal" aria-label="Legal">
          ${legalLinks.map((link) => `<a href="${link.href}">${link.label}</a>`).join("")}
        </nav>
      </div>
    </div>
  `;

  return footer;
}
