import { createCatalog } from "./Catalog.js";
import { createProcessSection } from "./ProcessSection.js";
import { catalogItems } from "../data/furnitureData.js";
import { fetchCatalogProducts } from "../services/productService.js";
import { getCurrentUser } from "../state/sessionManager.js";
import { uiState } from "../state/uiStateManager.js";

const startDate = new Date(2020, 8);
const currentDate = new Date();
let yearsOfExperience = currentDate.getFullYear() - startDate.getFullYear();

if (currentDate.getMonth() < startDate.getMonth()) {
  yearsOfExperience--;
}

export function createLandingPage(): HTMLElement {
  const main = document.createElement("main");
  main.className = "site-main";

  const heroConfig = {
    title: "YOU BRING THE PRODUCT, WE'LL BUILD THE KIOSK",
    lead: "WMA Wood Craft designs and builds solid-wood tables, cabinets, and custom pieces for homes and small businesses across the region.",
    primaryCta: { label: "Start a project", href: "#inquiry" },
    stats: [
      { value: `${yearsOfExperience}yrs`, label: "in the workshop" },
      { value: "1.5k", label: "pieces delivered" },
    ],
  };

  const bindInquiryAction = () => {
    main.querySelector<HTMLAnchorElement>('a[href="#inquiry"]')?.addEventListener("click", (event) => {
      event.preventDefault();
      if (!getCurrentUser()) {
        uiState.openModal("signup");
        return;
      }
      uiState.openInquiryModal();
    });
  };

  const initialCatalog = createCatalog({
    hero: heroConfig,
    items: catalogItems,
  });

  main.append(initialCatalog, createProcessSection());
  bindInquiryAction();

  void fetchCatalogProducts().then((items) => {
    const liveCatalog = createCatalog({
      hero: heroConfig,
      items,
    });

    main.replaceChildren(liveCatalog, createProcessSection());
    bindInquiryAction();
  });

  return main;
}