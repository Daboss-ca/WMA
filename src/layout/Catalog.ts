import type { FilterCategory, FurnitureItem } from "../types/furniture";
import { attachRippleToAll } from "./interactions";

export interface HeroContent {
  eyebrow?: string;
  title: string;
  lead: string;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  stats?: { value: string; label: string }[];
  swatchTag?: string;
}

export interface CatalogProps {
  hero: HeroContent;
  items: FurnitureItem[];
  filters?: FilterCategory[];
}

const defaultFilters: FilterCategory[] = ["All", "Tables", "Cabinets", "Kiosks", "Custom"];

function renderHero(hero: HeroContent): string {
  const stats = hero.stats ?? [];

  return `
    <section class="hero wrap">
      <div class="hero__grid">
        <div class="hero__content">
          ${hero.eyebrow ? `<span class="hero__eyebrow">${hero.eyebrow}</span>` : ""}
          <h1 class="hero__title">${hero.title}</h1>
          <p class="hero__lead">${hero.lead}</p>
          <div class="hero__actions">
            <a class="btn btn--primary" href="${hero.primaryCta.href}">${hero.primaryCta.label}</a>
            ${
              hero.secondaryCta
                ? `<a class="btn btn--outline" href="${hero.secondaryCta.href}">${hero.secondaryCta.label}</a>`
                : ""
            }
          </div>
          ${
            stats.length
              ? `<div class="hero__stats">
                  ${stats
                    .map(
                      (stat) => `
                    <div>
                      <span class="hero__stat-value">${stat.value}</span>
                      <span class="hero__stat-label">${stat.label}</span>
                    </div>`
                    )
                    .join("")}
                </div>`
              : ""
          }
        </div>

        <div class="hero__swatch" role="img" aria-label="Sample of hand-finished timber grain">
          ${hero.swatchTag ? `<span class="hero__swatch-tag">${hero.swatchTag}</span>` : ""}
        </div>
      </div>
    </section>
  `;
}

function renderFilterBar(filters: FilterCategory[]): string {
  return `
    <div class="filter-bar" role="group" aria-label="Filter by category">
      ${filters
        .map(
          (filter, index) => `
        <button
          type="button"
          class="filter-badge"
          data-filter="${filter}"
          aria-pressed="${index === 0 ? "true" : "false"}"
        >${filter}</button>`
        )
        .join("")}
    </div>
  `;
}

function renderCard(item: FurnitureItem, index: number): string {
  const { width, height, depth, unit } = item.dimensions;

  return `
    <article class="card" data-category="${item.category}" style="--card-index: ${index}">
      <div class="card__media">
        ${
          item.imageUrl
            ? `<img src="${item.imageUrl}" alt="${item.imageAlt ?? item.name}" loading="lazy" />`
            : `<div class="card__media-placeholder">${item.name}</div>`
        }
        <span class="card__category">${item.category}</span>
      </div>

      <div class="card__body">
        <h3 class="card__title">${item.name}</h3>
        <p class="card__description">${item.description}</p>

        <div class="card__meta">
          <span class="badge badge--dimension">${width}×${height}×${depth} ${unit}</span>
          ${item.isCustomizable ? `<span class="badge badge--customizable">Customizable</span>` : ""}
          ${item.inStock ? `<span class="badge badge--in-stock badge--dot">In stock</span>` : ""}
        </div>
      </div>

      <div class="card__actions">
        <a href="#contact" class="btn btn--secondary btn--sm btn--block">
          Inquire ${item.category}
        </a>
      </div>
    </article>
  `;
}

export function createCatalog(props: CatalogProps): HTMLElement {
  const { hero, items, filters = defaultFilters } = props;

  const section = document.createElement("div");
  section.innerHTML = `
    ${renderHero(hero)}
    <div class="grain-seam" role="presentation"></div>
    <section class="section wrap" id="catalog">
      <div class="section__head">
        <div>
          <h2 class="section__title">Our collection</h2>
          <p class="section__subtitle">Hand-built pieces, made to the dimensions and finish your space calls for.</p>
        </div>
      </div>
      ${renderFilterBar(filters)}
      <div class="catalog-grid">
        ${items.map(renderCard).join("")}
      </div>
      <p class="catalog-empty" hidden>No pieces match that category yet — try another filter.</p>
    </section>
  `;

  const grid = section.querySelector<HTMLElement>(".catalog-grid");
  const emptyState = section.querySelector<HTMLElement>(".catalog-empty");
  const filterButtons = Array.from(section.querySelectorAll<HTMLButtonElement>(".filter-badge"));

  // Filtering System gamit ang Event Delegation para sigurado ang pag-listen sa clicks
  section.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const filterBtn = target.closest<HTMLButtonElement>(".filter-badge");

    if (!filterBtn) return;

    const selectedCategory = filterBtn.dataset.filter as FilterCategory;

    // Update active button state
    filterButtons.forEach((btn) => {
      btn.setAttribute("aria-pressed", String(btn === filterBtn));
    });

    // Kunin ang lahat ng cards sa mismong instant ng click
    const cards = Array.from(section.querySelectorAll<HTMLElement>(".card"));
    let visibleCount = 0;

    cards.forEach((card) => {
      const cardCategory = card.dataset.category;
      const isMatch = selectedCategory === "All" || cardCategory === selectedCategory;

      if (isMatch) {
        card.style.display = "";
        card.removeAttribute("hidden");
        visibleCount++;
      } else {
        card.style.display = "none";
        card.setAttribute("hidden", "true");
      }
    });

    if (emptyState) emptyState.hidden = visibleCount !== 0;
    if (grid) grid.hidden = visibleCount === 0;
  });

  attachRippleToAll(section);

  return section;
}