import { createCatalog } from "./Catalog.js";
import { createProcessSection } from "./ProcessSection.js";
import { catalogItems } from "../data/furnitureData.js";
import { applyCatalogProductChange, fetchCatalogProducts } from "../services/productService.js";
import { subscribeToProductsRealtime } from "../config/supabase.js";
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
    lead: " WMA Wood Craft specializes in designing and building custom mall kiosks, pop-up carts, motor carts, and in-line store setups that help businesses stand out, attract more customers, and maximize their selling space. From customized designs, signage, restaurant fixtures, and 3D design services to marketing solutions, we provide creative and practical business solutions that turn your ideas into eye-catching spaces designed to support your business growth.",
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

  let liveCatalogItems = [...catalogItems];
  let catalogRevision = 0;
  const initialCatalog = createCatalog({
    hero: heroConfig,
    items: catalogItems,
  });

  main.append(initialCatalog, createProcessSection());
  bindInquiryAction();

  const renderCatalog = (items: typeof catalogItems): void => {
    liveCatalogItems = [...items];
    const liveCatalog = createCatalog({
      hero: heroConfig,
      items: liveCatalogItems,
    });

    main.replaceChildren(liveCatalog, createProcessSection());
    bindInquiryAction();
  };

  const refreshCatalog = (): void => {
    const revisionAtRequest = catalogRevision;
    void fetchCatalogProducts().then((items) => {
      if (revisionAtRequest !== catalogRevision) return;
      renderCatalog(items);
    }).catch((error) => {
      console.error("[LandingPage] catalog refresh failed:", error);
    });
  };

  refreshCatalog();

  const stopProductsRealtime = subscribeToProductsRealtime((payload) => {
    console.log("[LandingPage] applying product change:", payload);
    catalogRevision++;
    const nextItems = applyCatalogProductChange(liveCatalogItems, payload);
    if (nextItems) renderCatalog(nextItems);
  });

  (main as HTMLElement & { destroy?: () => void }).destroy = () => {
    stopProductsRealtime();
  };

  return main;
}
