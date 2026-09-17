import './src/client/styles/index.css';
import { initTheme } from './src/client/utils/theme';
import { createHeader } from "./src/client/layout/Header";
import { createFooter } from "./src/client/layout/Footer";
import { createCatalog } from "./src/client/layout/Catalog";
import { createProcessSection } from "./src/client/layout/ProcessSection"; // BAGO: Import ProcessSection
import { catalogItems } from "./src/client/data/furnitureData";

// BAGO: I-import ang Auth Components at UI State Manager
import { createAuthModal, attachAuthModalEvents } from "./src/client/components/auth/AuthModal";
import { createInquiryModal } from "./src/client/components/inquiry/InquiryModal";
import { getCurrentUser } from "./src/client/state/sessionManager";
import { uiState } from "./src/client/state/uiStateManager";

initTheme();

// Dynamic computation para sa years in the workshop (Started September 2020)
const startDate = new Date(2020, 8); // September (0-indexed)
const currentDate = new Date();
let yearsOfExperience = currentDate.getFullYear() - startDate.getFullYear();

if (currentDate.getMonth() < startDate.getMonth()) {
  yearsOfExperience--;
}

const app = document.querySelector<HTMLDivElement>("#app");

if (app) {
  app.innerHTML = "";

  const main = document.createElement("main");
  main.className = "site-main";
  
  // BAGO: Append Catalog at ProcessSection sa loob ng main content
  main.append(
    createCatalog({
      hero: {
        title: "YOU BRING THE PRODUCT, WE'LL BUILD THE KIOSK",
        lead: "WMA Wood Craft designs and builds solid-wood tables, cabinets, and custom pieces for homes and small businesses across the region.",
        primaryCta: { label: "Login", href: "#login" },
        secondaryCta: { label: "View the collection", href: "#catalog" },
        stats: [
          { value: `${yearsOfExperience}yrs`, label: "in the workshop" },
          { value: "1.5k", label: "pieces delivered" },
        ],
      },
      items: catalogItems,
    }),
    createProcessSection() // BAGO: I-render ang Our Process section
  );

  app.append(
    createHeader({
      navLinks: [
        { label: "Collection", href: "#catalog", current: true },
        { label: "Our process", href: "#process" },
        { label: "Contact", href: "#contact" },
      ],
    }),
    main,
    createFooter({
      quickLinks: [
        { label: "Collection", href: "#catalog" },
        { label: "Request a quote", href: "#quote" },
        { label: "Contact", href: "#contact" },
      ],
      categoryLinks: [
        { label: "Tables", href: "#catalog" },
        { label: "Cabinets", href: "#catalog" },
        { label: "Kiosks", href: "#catalog" },
        { label: "Custom work", href: "#catalog" },
      ],
      socialLinks: [
        {
          label: "Instagram",
          href: "https://www.instagram.com/",
          iconSvg:
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/></svg>',
        },
        {
          label: "Facebook",
          href: "https://www.facebook.com/wm.arnuco1983/",
          iconSvg:
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 21v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3V2h-3a5 5 0 0 0-5 5v2H7v4h3v8z"/></svg>',
        },
      ],
    })
  );

  // Auth Modal Setup
  const authModalElement = createAuthModal();
  document.body.appendChild(authModalElement);
  attachAuthModalEvents(authModalElement);

  document.body.appendChild(createInquiryModal());

  // Override default behavior ng Hero CTA "Login" button
  const heroLoginBtn = document.querySelector('a[href="#login"]');
  heroLoginBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    uiState.openModal('login');
  });

  document.addEventListener('wma:open-inquiry', (e) => {
    e.preventDefault();

    if (!getCurrentUser()) {
      uiState.openModal('signup');
      return;
    }

    uiState.openInquiryModal();
  });
}