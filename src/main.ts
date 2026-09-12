import './styles/index.css';
import { initTheme } from './utils/theme';
import { createHeader } from "./layout/Header";
import { createFooter } from "./layout/Footer";
import { createCatalog } from "./layout/Catalog";
import type { FurnitureItem } from "./types/furniture";

// Import Kiosk image assets dynamically for Vite
import img1 from "./assets/catalogs/kiosk/img1.png";
import img2 from "./assets/catalogs/kiosk/img2.png";
import img3 from "./assets/catalogs/kiosk/img3.png";
import img4 from "./assets/catalogs/kiosk/img4.png";

// Initialize Theme on startup
initTheme();

const demoItems: FurnitureItem[] = [
  {
    id: "kio-001",
    name: "Classic Market Display Kiosk",
    category: "Kiosks",
    description: "Modular pine kiosk built for weekend markets and pop-ups.",
    dimensions: { width: 48, height: 78, depth: 30, unit: "in" },
    imageUrl: img1,
    imageAlt: "Classic Market Display Kiosk",
    inStock: true,
  },
  {
    id: "kio-002",
    name: "Modular Retail Kiosk",
    category: "Kiosks",
    description: "Versatile wooden kiosk setup designed for retail product displays.",
    dimensions: { width: 60, height: 80, depth: 36, unit: "in" },
    imageUrl: img2,
    imageAlt: "Modular Retail Kiosk",
    isCustomizable: true,
    inStock: true,
  },
  {
    id: "kio-003",
    name: "Commercial Mall Kiosk",
    category: "Kiosks",
    description: "Premium finished hardwood kiosk tailored for indoor mall spaces.",
    dimensions: { width: 72, height: 84, depth: 42, unit: "in" },
    imageUrl: img3,
    imageAlt: "Commercial Mall Kiosk",
    isCustomizable: true,
    inStock: false,
  },
  {
    id: "kio-004",
    name: "Custom Event & Food Kiosk",
    category: "Kiosks",
    description: "Heavy-duty custom timber kiosk with integrated counter space.",
    dimensions: { width: 96, height: 90, depth: 48, unit: "in" },
    imageUrl: img4,
    imageAlt: "Custom Event & Food Kiosk",
    isCustomizable: true,
    inStock: true,
  },
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