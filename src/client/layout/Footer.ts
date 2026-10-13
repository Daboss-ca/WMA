export interface FooterLink {
  label: string;
  href: string;
}

export interface SocialLink {
  label: string;
  href: string;
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

const privacyPolicyText = `
  <h3>Privacy Policy</h3>
  <p>WMA Wood Craft respects your privacy and is committed to protecting the personal information you share with us.</p>
  <p>We collect information needed to process inquiries, orders, payments, and customer support requests. This may include your name, contact information, delivery details, and proof-of-payment information when relevant.</p>
  <p>We use this information solely to fulfill your orders, communicate updates, improve service quality, and maintain secure records. We do not sell or rent personal information to third parties.</p>
  <p>We may also use basic analytics to improve our website experience and service performance. Any payment detail or document shared is handled with care and used only for order verification and support purposes.</p>
  <p>By using this website, you agree to the collection and use of your information as described in this policy.</p>
`;

const termsText = `
  <h3>Terms & Conditions</h3>
  <p>By accessing and using the WMA Wood Craft website, you agree to comply with these Terms & Conditions.</p>
  <p>All product images, text, and descriptions are provided for informational purposes and may vary slightly from the final delivered piece due to natural wood grain, finish treatment, and craftsmanship variations.</p>
  <p>Orders are subject to confirmation, availability, and payment verification. We reserve the right to decline or cancel orders when necessary.</p>
  <p>Customers are responsible for providing accurate contact information, delivery details, and payment references. Delays caused by incomplete or incorrect information are not the responsibility of WMA Wood Craft.</p>
  <p>Payments made through accepted methods are considered final once order verification is completed. Proof of payment and reference numbers may be requested for validation.</p>
  <p>WMA Wood Craft is committed to craftsmanship, transparency, and customer satisfaction. We reserve the right to update these terms from time to time, with changes taking effect once posted on the website.</p>
`;

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
  footer.id = "contact";

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

  const renderSocialLink = (social: SocialLink): string => `
    <a
      class="footer-social__link"
      href="${social.href}"
      aria-label="${social.label}"
      target="_blank"
      rel="noopener noreferrer"
    >
      ${social.iconSvg}
    </a>
  `;

  footer.innerHTML = `
    <div class="site-footer__inner">
      <div class="footer-brand">
        <p class="footer-brand__wordmark">WMA Wood Craft</p>
        <p class="footer-brand__story">${brandStory}</p>

        <div class="footer-brand__contact">
          <a href="tel:+6395406034">0997 143 3002</a>
          <a href="mailto:wma1983@gmail.com">wma1983@gmail.com</a>
        </div>

        <div class="footer-social">
          ${socialLinks.map(renderSocialLink).join("")}
        </div>
      </div>

      ${renderLinkColumn("Quick links", quickLinks)}
      ${renderLinkColumn("Categories", categoryLinks)}
    </div>

    <div class="site-footer__bottom">
      <div class="site-footer__bottom-inner">
        <span>&copy; ${year} WMA Wood Craft. All rights reserved.</span>
        <nav class="site-footer__legal" aria-label="Legal">
          ${legalLinks
            .map(
              (link) => `<a href="${link.href}" data-legal-link="${link.label.toLowerCase()}">${link.label}</a>`
            )
            .join("")}
        </nav>
      </div>
    </div>
  `;

  const legalModal = document.createElement("div");
  legalModal.className = "footer-legal-modal";
  legalModal.setAttribute("aria-hidden", "true");
  legalModal.innerHTML = `
    <div class="footer-legal-modal__backdrop" data-close-legal-modal="true"></div>
    <div class="footer-legal-modal__panel" role="dialog" aria-modal="true" aria-labelledby="footer-legal-modal-title">
      <button type="button" class="footer-legal-modal__close" aria-label="Close legal information">×</button>
      <div class="footer-legal-modal__content">
        <p class="footer-legal-modal__eyebrow">WMA Wood Craft</p>
        <h3 id="footer-legal-modal-title">Privacy Policy</h3>
      </div>
    </div>
  `;

  const modalTitle = legalModal.querySelector("#footer-legal-modal-title");
  const modalContent = legalModal.querySelector(".footer-legal-modal__content");

  const openLegalModal = (type: "privacy" | "terms") => {
    const isPrivacy = type === "privacy";
    if (modalTitle) modalTitle.textContent = isPrivacy ? "Privacy Policy" : "Terms & Conditions";
    if (modalContent) {
      modalContent.innerHTML = `
        <p class="footer-legal-modal__eyebrow">WMA Wood Craft</p>
        <h3 id="footer-legal-modal-title">${isPrivacy ? "Privacy Policy" : "Terms & Conditions"}</h3>
        ${isPrivacy ? privacyPolicyText : termsText}
      `;
    }
    legalModal.classList.add("is-open");
    legalModal.setAttribute("aria-hidden", "false");
  };

  const closeLegalModal = () => {
    legalModal.classList.remove("is-open");
    legalModal.setAttribute("aria-hidden", "true");
  };

  legalModal.querySelector("[data-close-legal-modal]")?.addEventListener("click", closeLegalModal);
  legalModal.querySelector(".footer-legal-modal__close")?.addEventListener("click", closeLegalModal);

  footer.querySelectorAll<HTMLAnchorElement>("[data-legal-link]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const type = (link.dataset.legalLink || "privacy") as "privacy" | "terms";
      openLegalModal(type === "terms" ? "terms" : "privacy");
    });
  });

  footer.appendChild(legalModal);
  return footer;
}