import { createCatalog } from "./Catalog.js";
import { createProcessSection } from "./ProcessSection.js";
import { catalogItems } from "../data/furnitureData.js";
import { applyCatalogProductChange, fetchCatalogProducts } from "../services/productService.js";
import { subscribeToProductsRealtime } from "../config/supabase.js";
import { getCurrentUser } from "../state/sessionManager.js";
import { uiState } from "../state/uiStateManager.js";
import { buildApiUrl } from "../config/api.js";

interface PublicReview {
  id: string;
  reviewer_name: string;
  rating: number;
  comment: string;
  created_at: string;
  product: { title: string; image_url?: string | null } | null;
}

function escapeReviewText(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character] ?? character);
}

const startDate = new Date(2020, 8);
const currentDate = new Date();
let yearsOfExperience = currentDate.getFullYear() - startDate.getFullYear();

if (currentDate.getMonth() < startDate.getMonth()) {
  yearsOfExperience--;
}

export function createLandingPage(): HTMLElement {
  const main = document.createElement("main");
  main.className = "site-main w-full max-w-full overflow-x-hidden";

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

  const reviewsSection = document.createElement("section");
  reviewsSection.className = "customer-reviews";
  reviewsSection.setAttribute("aria-labelledby", "customer-reviews-title");
  reviewsSection.innerHTML = `
    <div class="customer-reviews__inner">
      <header class="customer-reviews__header">
        <p class="customer-reviews__eyebrow">Customer stories</p>
        <h2 id="customer-reviews-title">Made for the way you work</h2>
        <p>customers review about the pieces we have built for them.</p>
      </header>
      <div class="customer-reviews__content" aria-live="polite">
        <p class="customer-reviews__message">Loading customer reviews...</p>
      </div>
    </div>`;

  main.append(initialCatalog, createProcessSection(), reviewsSection);
  bindInquiryAction();

  const renderCatalog = (items: typeof catalogItems): void => {
    liveCatalogItems = [...items];
    const liveCatalog = createCatalog({
      hero: heroConfig,
      items: liveCatalogItems,
    });

    main.replaceChildren(liveCatalog, createProcessSection(), reviewsSection);
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

  const loadPublicReviews = async () => {
    const content = reviewsSection.querySelector<HTMLElement>(".customer-reviews__content");
    if (!content) return;
    try {
      const response = await fetch(buildApiUrl("/reviews"));
      const payload = await response.json().catch(() => []);
      if (!response.ok) throw new Error(payload?.error || "Customer reviews are temporarily unavailable.");
      const reviews = Array.isArray(payload) ? payload as PublicReview[] : [];
      if (reviews.length === 0) {
        content.innerHTML = `<p class="customer-reviews__message">No reviews available.</p>`;
        return;
      }
      content.innerHTML = `<div class="customer-reviews__grid">${reviews.map((review) => {
        const rating = Math.max(1, Math.min(5, Math.round(Number(review.rating) || 0)));
        const productTitle = review.product?.title || "WMA Wood Craft product";
        const date = new Date(review.created_at);
        const dateLabel = Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en", { month: "short", year: "numeric" });
        return `
          <article class="testimonial-card">
            <div class="testimonial-card__rating" aria-label="Rated ${rating} out of 5 stars">${"★".repeat(rating)}${"☆".repeat(5 - rating)}</div>
            <blockquote>“${escapeReviewText(review.comment)}”</blockquote>
            <div class="testimonial-card__footer">
              <div class="testimonial-card__reviewer">
                <strong>${escapeReviewText(review.reviewer_name || "Customer")}</strong>
                <span>${dateLabel ? `Reviewed ${escapeReviewText(dateLabel)}` : "Customer review"}</span>
              </div>
              <p class="testimonial-card__product">For ${escapeReviewText(productTitle)}</p>
            </div>
          </article>`;
      }).join("")}</div>`;
    } catch (error) {
      console.error("[LandingPage] customer reviews could not be loaded:", error);
      content.innerHTML = `<p class="customer-reviews__message">Customer reviews are temporarily unavailable. Please try again later.</p>`;
    }
  };
  void loadPublicReviews();

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
