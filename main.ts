import './src/client/styles/index.css';
import { initTheme } from './src/client/utils/theme';
import { createHeader, updateHeaderUI } from "./src/client/layout/Header";
import { createFooter } from "./src/client/layout/Footer";
import { createCatalog } from "./src/client/layout/Catalog";
import { createProcessSection } from "./src/client/layout/ProcessSection"; 
import { createProfilePage } from "./src/client/layout/ProfilePage";
import { catalogItems } from "./src/client/data/furnitureData";

import { createAuthModal, attachAuthModalEvents } from "./src/client/components/auth/AuthModal";
import { createInquiryModal } from "./src/client/components/inquiry/InquiryModal";
import { getCurrentUser, SESSION_CHANGED_EVENT } from "./src/client/state/sessionManager";
import { uiState } from "./src/client/state/uiStateManager";

initTheme();

// Dynamic computation para sa years in the workshop
const startDate = new Date(2020, 8); 
const currentDate = new Date();
let yearsOfExperience = currentDate.getFullYear() - startDate.getFullYear();

if (currentDate.getMonth() < startDate.getMonth()) {
  yearsOfExperience--;
}

const app = document.querySelector<HTMLDivElement>("#app");

function renderApp() {
  if (!app) return;
  app.innerHTML = "";

  const main = document.createElement("main");
  main.className = "site-main";
  
  // DITO NA NAKALAGAY YUNG "Start a project" bilang nag-iisang button sa taas
  main.append(
    createCatalog({
      hero: {
        title: "YOU BRING THE PRODUCT, WE'LL BUILD THE KIOSK",
        lead: "WMA Wood Craft designs and builds solid-wood tables, cabinets, and custom pieces for homes and small businesses across the region.",
        primaryCta: { label: "Inquire Now", href: "#inquiry" }, 
        secondaryCta: undefined, 
        stats: [
          { value: `${yearsOfExperience}yrs`, label: "in the workshop" },
          { value: "1.5k", label: "pieces delivered" },
        ],
      },
      items: catalogItems,
    }),
    createProcessSection(), 
    createProfilePage()
  );

  const profilePage = main.querySelector<HTMLElement>("#profile-page");
  const collectionSections = Array.from(main.children).filter(
    (section): section is HTMLElement => section !== profilePage
  );

  document.addEventListener("wma:open-profile", () => {
    collectionSections.forEach((section) => { section.hidden = true; });
    if (profilePage) profilePage.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  document.addEventListener("wma:close-profile", () => {
    if (profilePage) profilePage.hidden = true;
    collectionSections.forEach((section) => { section.hidden = false; });
  });

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

  updateHeaderUI();

  // Simple event listener para sa nag-iisang Start a Project button
  const heroStartProjectBtn = document.querySelector('a[href="#inquiry"]');
  heroStartProjectBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    if (!getCurrentUser()) {
      uiState.openModal('signup');
      return;
    }
    uiState.openInquiryModal();
  });
}

// Initial render
renderApp();

// Mag-re-render o mag-update kapag nagbago ang session (Login / Logout)
document.addEventListener(SESSION_CHANGED_EVENT, () => {
  renderApp();
});

// Modals Setup (Isang beses lang i-append sa body para hindi mag-duplicate)
const authModalElement = createAuthModal();
document.body.appendChild(authModalElement);
attachAuthModalEvents(authModalElement);

document.body.appendChild(createInquiryModal());

document.addEventListener('wma:open-inquiry', (e) => {
  e.preventDefault();
  if (!getCurrentUser()) {
    uiState.openModal('signup');
    return;
  }
  uiState.openInquiryModal();
});