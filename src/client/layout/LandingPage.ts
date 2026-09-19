import { createCatalog } from "./Catalog.js";
import { createProcessSection } from "./ProcessSection.js";
import { createProfilePage } from "./ProfilePage.js";
import { catalogItems } from "../data/furnitureData.js";
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

  main.append(
    createCatalog({
      hero: {
        title: "YOU BRING THE PRODUCT, WE'LL BUILD THE KIOSK",
        lead: "WMA Wood Craft designs and builds solid-wood tables, cabinets, and custom pieces for homes and small businesses across the region.",
        primaryCta: { label: "Start a project", href: "#inquiry" },
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

  main.querySelector<HTMLAnchorElement>('a[href="#inquiry"]')?.addEventListener("click", (event) => {
    event.preventDefault();
    if (!getCurrentUser()) {
      uiState.openModal("signup");
      return;
    }
    uiState.openInquiryModal();
  });

  return main;
}