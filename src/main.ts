import './styles/index.css';
import { initTheme } from './utils/theme';
import { createHeader } from "./layout/Header";
import { createFooter } from "./layout/Footer";
import { createCatalog } from "./layout/Catalog";
import { catalogItems } from "./data/furnitureData";

// Initialize Theme on startup
initTheme();

const app = document.querySelector<HTMLDivElement>("#app");

if (app) {
  app.innerHTML = "";

  const main = document.createElement("main");
  main.className = "site-main";
  main.append(
    createCatalog({
      hero: {
        title: "YOU BRING THE PRODUCT, WE'LL BUILD THE KIOSK",
        lead: "WMA Wood Craft designs and builds solid-wood tables, cabinets, and custom pieces for homes and small businesses across the region.",
        primaryCta: { label: "Request a Quote", href: "#quote" },
        secondaryCta: { label: "View the collection", href: "#catalog" },
        stats: [
          { value: "6yrs", label: "in the workshop" },
          { value: "1.5k", label: "pieces delivered" },
        ],
        swatchTag: "Walnut & oak, hand-finished",
      },
      items: catalogItems,
    })
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
}