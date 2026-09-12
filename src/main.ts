import './styles/index.css';
import { initTheme } from './utils/theme';
import { createHeader } from "./layout/Header";
import { createFooter } from "./layout/Footer";
import { createCatalog } from "./layout/Catalog";
import type { FurnitureItem } from "./types/furniture";

// Initialize Theme on startup
initTheme();

const demoItems: FurnitureItem[] = [
  {
    id: "tbl-001",
    name: "Amber Grain Dining Table",
    category: "Tables",
    description: "Live-edge walnut top on a hand-joined oak trestle base.",
    dimensions: { width: 72, height: 30, depth: 38, unit: "in" },
    isCustomizable: true,
    inStock: true,
  },
  {
    id: "cab-014",
    name: "Heritage Sideboard",
    category: "Cabinets",
    description: "Three-door cabinet with dovetailed drawers and brass pulls.",
    dimensions: { width: 64, height: 34, depth: 20, unit: "in" },
    isCustomizable: true,
    inStock: false,
  },
  {
    id: "kio-003",
    name: "Market Display Kiosk",
    category: "Kiosks",
    description: "Modular pine kiosk built for weekend markets and pop-ups.",
    dimensions: { width: 48, height: 78, depth: 30, unit: "in" },
    inStock: true,
  },
  {
    id: "cus-021",
    name: "Custom Built-In Shelving",
    category: "Custom",
    description: "Floor-to-ceiling shelving, finished to match your millwork.",
    dimensions: { width: 96, height: 108, depth: 14, unit: "in" },
    isCustomizable: true,
  },
];

const app = document.querySelector<HTMLDivElement>("#app");

if (app) {
  app.innerHTML = "";
  app.append(
    createHeader({
      navLinks: [
        { label: "Collection", href: "#catalog", current: true },
        { label: "Our process", href: "#process" },
        { label: "Contact", href: "#contact" },
      ],
    }),

    (() => {
      const main = document.createElement("main");
      main.className = "site-main";
      main.append(
        createCatalog({
          hero: {
            eyebrow: "Built in the workshop, not the warehouse",
            title: "Furniture cut, joined, and finished by hand",
            lead: "WMA Wood Craft designs and builds solid-wood tables, cabinets, and custom pieces for homes and small businesses across the region.",
            primaryCta: { label: "Request a Quote", href: "#quote" },
            secondaryCta: { label: "View the collection", href: "#catalog" },
            stats: [
              { value: "14 yrs", label: "in the workshop" },
              { value: "600+", label: "pieces delivered" },
            ],
            swatchTag: "Walnut & oak, hand-finished",
          },
          items: demoItems,
        })
      );
      return main;
    })(),

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
          href: "https://instagram.com",
          iconSvg:
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/></svg>',
        },
        {
          label: "Facebook",
          href: "https://facebook.com",
          iconSvg:
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 21v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3V2h-3a5 5 0 0 0-5 5v2H7v4h3v8z"/></svg>',
        },
      ],
    })
  );
}