import type { FurnitureItem } from "../types/furniture";

// Import Kiosk image assets dynamically for Vite
import img1 from "../assets/catalogs/kiosk/img1.png";
import img2 from "../assets/catalogs/kiosk/img2.png";
import img3 from "../assets/catalogs/kiosk/img3.png";
import img4 from "../assets/catalogs/kiosk/img4.png";
import img5 from "../assets/catalogs/kiosk/img5.png";
import img6 from "../assets/catalogs/kiosk/img6.png";
import img7 from "../assets/catalogs/kiosk/img7.png";
import img8 from "../assets/catalogs/kiosk/img8.png";

export const catalogItems: FurnitureItem[] = [
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
    id: "kio-005",
    name: "Luminous Display Mobile Cart",
    category: "Kiosks",
    description: "Sleek white mobile cart featuring perimeter warm LED lighting, acrylic signage mounts, and heavy-duty caster wheels.",
    dimensions: { width: 48, height: 40, depth: 26, unit: "in" },
    imageUrl: img5,
    imageAlt: "Luminous Display Mobile Cart with LED perimeter lighting",
    isCustomizable: true,
    inStock: true,
  },
  {
    id: "kio-006",
    name: "Artisanal Coffee & Brew Bar",
    category: "Kiosks",
    description: "Compact espresso service cart with a natural oak countertop, contrast black frame, white paneling, and mobile wheels.",
    dimensions: { width: 52, height: 38, depth: 28, unit: "in" },
    imageUrl: img6,
    imageAlt: "Artisanal Coffee Bar Cart with natural oak top",
    isCustomizable: true,
    inStock: true,
  },
  {
    id: "kio-007",
    name: "Executive Bistro & Bar Counter",
    category: "Kiosks",
    description: "Dual-tier mobile beverage bar featuring an elevated serving shelf, ambient backlit front paneling, and lockable casters.",
    dimensions: { width: 54, height: 44, depth: 30, unit: "in" },
    imageUrl: img7,
    imageAlt: "Executive Bistro Bar Counter with elevated shelf",
    isCustomizable: true,
    inStock: true,
  },
  {
    id: "kio-008",
    name: "Sweet Delight Ice Cream Stand",
    category: "Kiosks",
    description: "Themed dessert display stand with 3D waffle-pattern front panel, white drip trim, overhead signage frame, and heavy-duty wheels.",
    dimensions: { width: 48, height: 82, depth: 28, unit: "in" },
    imageUrl: img8,
    imageAlt: "Themed Ice Cream Stand with waffle texture paneling",
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