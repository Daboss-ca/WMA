import type { FilterCategory, FurnitureItem } from "../types/furniture";
import { attachRippleToAll } from "../utils/interactions.js";
import * as THREE from "three";
import gsap from "gsap";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { getCurrentUser } from "../state/sessionManager.js";
import { uiState } from "../state/uiStateManager.js";
import { cartManager } from "../state/cartManager.js";
import {
  createWmaMaterials,
  disposeWmaMaterials,
  buildKiosk,
  buildTable,
  buildCabinet,
  disposeWmaGroup,
  type AssemblyPart,
  type WmaMaterials,
  WMA_WOOD_FINISHES,
} from "../components/catalog/WmaFurniture.js";

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

const defaultFilters: FilterCategory[] = [
  "All",
  "Tables",
  "Cabinets",
  "Kiosks",
  "Custom",
];

const INITIAL_VISIBLE_ITEMS = 6;

function getCatalogItemId(item: FurnitureItem): string {
  return (item as any).id || item.name.replace(/\s+/g, "-").toLowerCase();
}

function buildCartItemPayload(item: FurnitureItem) {
  const dimensions = item.dimensions
    ? `${item.dimensions.width}×${item.dimensions.height}×${item.dimensions.depth} ${item.dimensions.unit}`
    : "Standard";

  const imageUrl =
    item.imageUrl ||
    "https://placehold.co/160x160/2B1E16/D4A373?text=WMA";

  const title = item.name || "Custom Item";
  const price = Number(item.price) || 0;

  return {
    id: item.id,
    productId: String(item.id ?? getCatalogItemId(item)),
    title,
    name: title,
    category: item.category || "General",
    dimensions,
    unitPrice: price,
    price,
    imageUrl,
    image: imageUrl,
  };
}

function openCatalogLightbox(item: FurnitureItem): void {
  const existing = document.getElementById("catalog-lightbox");
  if (existing) existing.remove();

  const lightbox = document.createElement("div");
  lightbox.id = "catalog-lightbox";
  lightbox.className = "catalog-lightbox";
  lightbox.setAttribute("role", "dialog");
  lightbox.setAttribute("aria-modal", "true");
  lightbox.setAttribute("aria-label", `Preview ${item.name}`);

  lightbox.innerHTML = `
    <div class="catalog-lightbox__backdrop" data-lightbox-close="true"></div>
    <div class="catalog-lightbox__panel" role="document">
      <button
        type="button"
        class="catalog-lightbox__close"
        aria-label="Close image preview"
        data-lightbox-close="true"
      >×</button>

      <img
        src="${item.imageUrl || "https://placehold.co/1200x900/2B1E16/D4A373?text=WMA"}"
        alt="${item.imageAlt ?? item.name}"
      />

      <div class="catalog-lightbox__meta">
        <div>
          <p class="catalog-lightbox__eyebrow">${item.category}</p>
          <h3>${item.name}</h3>
        </div>

        <p>
          ${new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 0,
          }).format(item.price)}
        </p>
      </div>
    </div>
  `;

  const closeLightbox = () => lightbox.remove();

  lightbox.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;

    if (target.closest("[data-lightbox-close]")) {
      closeLightbox();
    }
  });

  document.addEventListener(
    "keydown",
    function handleKeydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeLightbox();
        document.removeEventListener("keydown", handleKeydown);
      }
    },
    { once: true }
  );

  document.body.appendChild(lightbox);

  requestAnimationFrame(() => {
    lightbox.classList.add("is-open");
  });
}

function renderHero(hero: HeroContent): string {
  const stats = hero.stats ?? [];

  return `
    <section class="hero wrap px-4 sm:px-6">
      <div class="hero__grid">
        <div class="hero__content">
          ${
            hero.eyebrow
              ? `<span class="hero__eyebrow">${hero.eyebrow}</span>`
              : ""
          }

          <h1 class="hero__title">${hero.title}</h1>
          <p class="hero__lead">${hero.lead}</p>

          <div class="hero__actions">
            <a
              class="btn btn--primary"
              href="${hero.primaryCta.href}"
              ${
                hero.primaryCta.href === "#login"
                  ? 'data-auth-mode="login"'
                  : ""
              }
            >${hero.primaryCta.label}</a>

            ${
              hero.secondaryCta
                ? `<a class="btn btn--outline" href="${hero.secondaryCta.href}">
                    ${hero.secondaryCta.label}
                  </a>`
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
                        </div>
                      `
                    )
                    .join("")}
                </div>`
              : ""
          }
        </div>

        <div
          id="hero-3d-container"
          style="
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            min-height: 520px;
            background: transparent;
          "
          role="presentation"
          aria-hidden="true"
        ></div>
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
            >${filter}</button>
          `
        )
        .join("")}
    </div>
  `;
}

function renderCard(item: FurnitureItem, index: number): string {
  const { width, height, depth, unit } = item.dimensions;

  const formattedPrice = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(item.price);

  const safeId = getCatalogItemId(item);
  const cartPayload = buildCartItemPayload(item);
  const user = getCurrentUser();

  // Authentication controls card actions only.
  // It does not control the View more button.
  const actionsStyle = user
    ? "grid-template-columns: 1fr 1fr; gap: 8px;"
    : "grid-template-columns: 1fr;";

  const addToCartBtn = user
    ? `<button
         type="button"
         class="btn btn--primary btn--sm btn--block"
         data-action="add-to-cart"
         data-id="${safeId}"
         data-product-id="${cartPayload.productId}"
         data-title="${cartPayload.title}"
         data-category="${cartPayload.category}"
         data-price="${cartPayload.price}"
         data-dimensions="${cartPayload.dimensions}"
         data-image="${cartPayload.imageUrl}"
       >Add to Cart</button>`
    : "";

  const mediaMarkup = item.imageUrl
    ? `<button
         type="button"
         class="card__media-button"
         data-action="open-lightbox"
         data-id="${safeId}"
         aria-label="View larger image of ${item.name}"
       >
         <img
           src="${item.imageUrl}"
           alt="${item.imageAlt ?? item.name}"
           loading="lazy"
         />
       </button>`
    : `<button
         type="button"
         class="card__media-button card__media-button--placeholder"
         data-action="open-lightbox"
         data-id="${safeId}"
         aria-label="View larger image of ${item.name}"
       >
         <div class="card__media-placeholder">${item.name}</div>
       </button>`;

  return `
    <article
      class="card"
      data-category="${item.category}"
      style="--card-index: ${index}"
    >
      <div class="card__media">
        ${mediaMarkup}
        <span class="card__category">${item.category}</span>
      </div>

      <div class="card__body">
        <h3 class="card__title">${item.name}</h3>
        <p class="card__price">${formattedPrice}</p>
        <p class="card__description">${item.description}</p>

        <div class="card__meta">
          <span class="badge badge--dimension">
            ${width}×${height}×${depth} ${unit}
          </span>
        </div>
      </div>

      <div class="card__actions" style="display: grid; ${actionsStyle}">
        <button
          type="button"
          class="btn btn--secondary btn--sm btn--block"
          data-action="inquire"
          data-category="${item.category}"
        >
          Inquire
        </button>

        ${addToCartBtn}
      </div>
    </article>
  `;
}

/**
 * Creates the View more / Show less button.
 *
 * IMPORTANT:
 * This function does not check authentication.
 * The button is a catalog feature, not a user-session feature.
 *
 * The button is appended immediately after its catalog grid so that
 * both landing-page and dashboard catalogs use the same implementation.
 */
function appendViewMoreControl(
  grid: HTMLElement,
  id = "view-more-btn"
): HTMLButtonElement {
  const actions = document.createElement("div");

  actions.className = "catalog-actions";
  actions.style.display = "flex";
  actions.style.justifyContent = "center";
  actions.style.marginTop = "2.5rem";

  const button = document.createElement("button");

  button.type = "button";
  button.id = id;
  button.className = "btn btn--outline";
  button.dataset.action = "view-more";
  button.style.display = "none";
  button.textContent = "View more";
  button.setAttribute("aria-expanded", "false");

  actions.appendChild(button);

  // Insert the button container directly after this catalog grid.
  grid.insertAdjacentElement("afterend", actions);

  return button;
}

/**
 * Updates the visibility and label of the View more / Show less button.
 *
 * The control is visible only when the current catalog view contains
 * more than INITIAL_VISIBLE_ITEMS matching products.
 */
function updateViewMoreControl(
  button: HTMLButtonElement,
  totalMatchingItems: number,
  showAllItems: boolean
): void {
  const shouldShowButton =
    totalMatchingItems > INITIAL_VISIBLE_ITEMS;

  button.style.display = shouldShowButton ? "inline-flex" : "none";
  button.hidden = !shouldShowButton;

  button.textContent = showAllItems ? "Show less" : "View more";
  button.setAttribute("aria-expanded", String(showAllItems));
}

/**
 * Shows or hides a catalog card.
 */
function setCardVisibility(
  card: HTMLElement,
  isVisible: boolean
): void {
  card.style.display = isVisible ? "" : "none";

  if (isVisible) {
    card.removeAttribute("hidden");
  } else {
    card.setAttribute("hidden", "true");
  }
}

/**
 * Dashboard catalog feed.
 *
 * All cards are created in the DOM, and only the first six are initially
 * visible. The View more button is created independently of authentication.
 */
export function createCatalogProductFeed(
  items: FurnitureItem[]
): HTMLElement {
  const section = document.createElement("div");

  section.className = "dashboard-product-feed";
  section.id = "dashboard-catalog-grid";

  // Render every product instead of creating only the first six.
  // Visibility is managed by updateGridUI().
  section.innerHTML = `
    <div class="catalog-grid">
      ${items.map(renderCard).join("")}
    </div>
  `;

  const grid = section.querySelector<HTMLElement>(".catalog-grid");

  const cards = grid
    ? Array.from(grid.querySelectorAll<HTMLElement>(".card"))
    : [];

  // Always append the control when a grid exists, regardless of login state.
  const viewMoreBtn = grid
    ? appendViewMoreControl(grid, "dashboard-view-more-btn")
    : null;

  // Each dashboard catalog manages its own expansion state.
  let showAllItems = false;

  function updateGridUI(): void {
    cards.forEach((card, index) => {
      const shouldShowCard =
        showAllItems || index < INITIAL_VISIBLE_ITEMS;

      setCardVisibility(card, shouldShowCard);
    });

    if (viewMoreBtn) {
      updateViewMoreControl(
        viewMoreBtn,
        cards.length,
        showAllItems
      );
    }
  }

  // Apply the initial six-item limit and update the button immediately.
  updateGridUI();

  section.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;

    const lightboxTrigger =
      target.closest<HTMLButtonElement>(
        '[data-action="open-lightbox"]'
      );

    if (lightboxTrigger) {
      event.preventDefault();

      const itemId = lightboxTrigger.dataset.id;

      const item = items.find(
        (entry) => getCatalogItemId(entry) === itemId
      );

      if (item) {
        openCatalogLightbox(item);
      }

      return;
    }

    const addToCartBtn =
      target.closest<HTMLButtonElement>(
        '[data-action="add-to-cart"]'
      );

    if (addToCartBtn) {
      event.preventDefault();

      const itemId = addToCartBtn.dataset.id;

      const item = items.find(
        (entry) => getCatalogItemId(entry) === itemId
      );

      if (item) {
        const productId = String(
          addToCartBtn.dataset.productId ||
            addToCartBtn.dataset.id ||
            item.id ||
            ""
        ).trim();

        const title =
          addToCartBtn.dataset.title || item.name || "Custom Item";
        const category =
          addToCartBtn.dataset.category || item.category || "General";
        const price = Number(
          addToCartBtn.dataset.price ?? item.price ?? 0
        );
        const dimensions =
          addToCartBtn.dataset.dimensions ||
          (item.dimensions
            ? `${item.dimensions.width}×${item.dimensions.height}×${item.dimensions.depth} ${item.dimensions.unit}`
            : "Standard");
        const imageUrl =
          addToCartBtn.dataset.image ||
          item.imageUrl ||
          "https://placehold.co/160x160/2B1E16/D4A373?text=WMA";

        cartManager.addItem({
          id: productId,
          productId,
          title,
          name: title,
          category,
          dimensions,
          unitPrice: price,
          price,
          imageUrl,
          image: imageUrl,
        });

        const originalText = addToCartBtn.textContent;

        addToCartBtn.textContent = "Added to cart";
        addToCartBtn.style.backgroundColor =
          "var(--success-color, #4CAF50)";
        addToCartBtn.style.color = "#fff";

        setTimeout(() => {
          addToCartBtn.textContent = originalText;
          addToCartBtn.style.backgroundColor = "";
          addToCartBtn.style.color = "";
        }, 1200);
      }

      return;
    }

    const inquiryBtn =
      target.closest<HTMLButtonElement>(
        '[data-action="inquire"]'
      );

    if (inquiryBtn) {
      event.preventDefault();

      if (!getCurrentUser()) {
        uiState.openModal("login");
        return;
      }

      uiState.openInquiryModal(inquiryBtn.dataset.category);
      return;
    }

    // The View more / Show less handler works for logged-in and logged-out
    // users because it never checks getCurrentUser().
    const viewMoreClicked =
      target.closest<HTMLButtonElement>(
        '[data-action="view-more"]'
      );

    if (viewMoreClicked) {
      event.preventDefault();

      showAllItems = !showAllItems;

      updateGridUI();
    }
  });

  attachRippleToAll(section);

  return section;
}

const CATEGORY_TRANSFORM: Record<
  string,
  { scale: number; offsetY: number }
> = {
  Tables: { scale: 1.15, offsetY: 0 },
  Cabinets: { scale: 1.15, offsetY: 0 },
  Kiosks: { scale: 1.15, offsetY: 0 },
  Custom: { scale: 1.15, offsetY: 0 },
  All: { scale: 1.15, offsetY: 0 },
};

const DEFAULT_TRANSFORM = CATEGORY_TRANSFORM.Kiosks;

function buildPartsForCategory(
  category: string,
  materials: WmaMaterials
): THREE.Group {
  let group: THREE.Group;

  if (category === "Tables") {
    group = buildTable(materials);
  } else if (category === "Cabinets") {
    group = buildCabinet(materials);
  } else {
    group = buildKiosk(materials);
  }

  const transform =
    CATEGORY_TRANSFORM[category] ?? DEFAULT_TRANSFORM;

  group.scale.setScalar(transform.scale);
  group.position.y = transform.offsetY * transform.scale;

  return group;
}

function whenContainerSized(
  container: HTMLElement,
  callback: () => void
): () => void {
  const rect = container.getBoundingClientRect();

  if (rect.width > 0 && rect.height > 0) {
    callback();
    return () => {};
  }

  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const { width, height } = entry.contentRect;

      if (width > 0 && height > 0) {
        observer.disconnect();
        callback();
        return;
      }
    }
  });

  observer.observe(container);

  return () => observer.disconnect();
}

interface AssemblyScene {
  destroy: () => void;
}

function createAssemblyScene(
  container: HTMLElement
): AssemblyScene {
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    40,
    container.clientWidth / container.clientHeight || 1,
    0.1,
    1000
  );

  camera.position.set(0, 0.6, 6.4);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  });

  renderer.setSize(
    container.clientWidth,
    container.clientHeight
  );

  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, 2)
  );

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  container.appendChild(renderer.domElement);

  const pmremGenerator = new THREE.PMREMGenerator(renderer);

  const environmentTexture = pmremGenerator.fromScene(
    new RoomEnvironment(),
    0.04
  ).texture;

  scene.environment = environmentTexture;
  pmremGenerator.dispose();

  const ambientLight = new THREE.AmbientLight(
    0xffffff,
    0.35
  );

  const keyLight = new THREE.DirectionalLight(
    0xfff1de,
    1.3
  );

  keyLight.position.set(4, 7, 5);

  const fillLight = new THREE.DirectionalLight(
    0xffffff,
    0.45
  );

  fillLight.position.set(-5, 3, 4);

  const rimLight = new THREE.DirectionalLight(
    0xd4af37,
    0.55
  );

  rimLight.position.set(-4, -2, -5);

  scene.add(
    ambientLight,
    keyLight,
    fillLight,
    rimLight
  );

  const furnitureGroup = new THREE.Group();
  scene.add(furnitureGroup);

  const materials = createWmaMaterials();

  let activeGroup = buildPartsForCategory(
    "Kiosks",
    materials
  );

  furnitureGroup.add(activeGroup);

  let currentCategory = "Kiosks";
  let isTransitioning = false;
  let pendingCategory: string | null = null;
  let destroyed = false;
  const transitionTimelines = new Set<gsap.core.Timeline>();

  const cycleCategories = [
    "Kiosks",
    "Tables",
    "Cabinets",
  ];

  let cycleIndex = 0;
  let woodFinishIndex = 0;
  let autoCycleInterval: number | null = null;
  let interactionResumeTimeout: number | null = null;
  let isHovering = false;

  function applyWoodFinish(index: number): void {
    const finish = WMA_WOOD_FINISHES[index];
    const color = new THREE.Color(finish.color);

    gsap.to(materials.body.color, {
      r: color.r,
      g: color.g,
      b: color.b,
      duration: 1.4,
      ease: "sine.inOut",
      overwrite: true,
    });
    gsap.to(materials.body, {
      roughness: finish.roughness,
      clearcoatRoughness: finish.clearcoatRoughness,
      duration: 1.4,
      ease: "sine.inOut",
      overwrite: true,
    });
  }

  function cycleShowcase(): void {
    if (destroyed) return;

    cycleIndex = (cycleIndex + 1) % cycleCategories.length;
    woodFinishIndex = (woodFinishIndex + 1) % WMA_WOOD_FINISHES.length;
    applyWoodFinish(woodFinishIndex);
    transitionToCategory(cycleCategories[cycleIndex]);
  }

  function pauseAutoCycle(): void {
    if (autoCycleInterval !== null) {
      window.clearInterval(autoCycleInterval);
      autoCycleInterval = null;
    }
    if (interactionResumeTimeout !== null) {
      window.clearTimeout(interactionResumeTimeout);
      interactionResumeTimeout = null;
    }
  }

  function scheduleAutoCycleResume(delay = 1800): void {
    if (interactionResumeTimeout !== null) {
      window.clearTimeout(interactionResumeTimeout);
    }

    interactionResumeTimeout = window.setTimeout(() => {
      interactionResumeTimeout = null;
      if (destroyed || isHovering) return;
      autoCycleInterval = window.setInterval(cycleShowcase, 5000);
    }, delay);
  }

  function onPointerEnter(event: PointerEvent): void {
    if (event.pointerType === "touch") return;
    isHovering = true;
    pauseAutoCycle();
  }

  function onPointerLeave(event: PointerEvent): void {
    if (event.pointerType === "touch") return;
    isHovering = false;
    scheduleAutoCycleResume();
  }

  function onPointerDown(event: PointerEvent): void {
    pauseAutoCycle();
    if (event.pointerType === "touch") {
      scheduleAutoCycleResume(7000);
    }
  }

  function transitionToCategory(category: string): void {
    if (
      category === currentCategory &&
      !isTransitioning
    ) {
      return;
    }

    currentCategory = category;

    if (isTransitioning) {
      pendingCategory = category;
      return;
    }

    isTransitioning = true;

    const oldGroup = activeGroup;
    const meshesToDisassemble =
      oldGroup.children as AssemblyPart[];

    let explodeTl: gsap.core.Timeline;
    explodeTl = gsap.timeline({
      onComplete: () => {
        transitionTimelines.delete(explodeTl);
        if (destroyed) return;

        furnitureGroup.remove(oldGroup);
        disposeWmaGroup(oldGroup);

        const newGroup = buildPartsForCategory(
          category,
          materials
        );

        newGroup.children.forEach((mesh) => {
          const m = mesh as AssemblyPart;

          m.position.set(
            m.userData.explodePos.x,
            m.userData.explodePos.y,
            m.userData.explodePos.z
          );

          m.scale.set(0, 0, 0);
        });

        furnitureGroup.add(newGroup);
        activeGroup = newGroup;

        let buildTl: gsap.core.Timeline;
        buildTl = gsap.timeline({
          onComplete: () => {
            transitionTimelines.delete(buildTl);
            if (destroyed) return;

            isTransitioning = false;

            if (
              pendingCategory &&
              pendingCategory !== category
            ) {
              const next = pendingCategory;
              pendingCategory = null;
              transitionToCategory(next);
            } else {
              pendingCategory = null;
            }
          },
        });
        transitionTimelines.add(buildTl);

        newGroup.children.forEach((mesh, idx) => {
          const m = mesh as AssemblyPart;

          buildTl
            .to(
              m.position,
              {
                x: m.userData.targetPos.x,
                y: m.userData.targetPos.y,
                z: m.userData.targetPos.z,
                duration: 1.1,
                ease: "power2.out",
              },
              idx * 0.08
            )
            .to(
              m.scale,
              {
                x: 1,
                y: 1,
                z: 1,
                duration: 1.1,
                ease: "power2.out",
              },
              idx * 0.08
            );
        });
      },
    });
    transitionTimelines.add(explodeTl);

    meshesToDisassemble.forEach((mesh, idx) => {
      explodeTl
        .to(
          mesh.position,
          {
            x: mesh.userData.explodePos.x,
            y: mesh.userData.explodePos.y,
            z: mesh.userData.explodePos.z,
            duration: 0.8,
            ease: "power2.in",
          },
          idx * 0.05
        )
        .to(
          mesh.scale,
          {
            x: 0,
            y: 0,
            z: 0,
            duration: 0.8,
            ease: "power2.in",
          },
          idx * 0.05
        );
    });
  }

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  function onPointerMove(event: PointerEvent): void {
    const rect =
      renderer.domElement.getBoundingClientRect();

    mouse.x =
      ((event.clientX - rect.left) / rect.width) * 2 - 1;

    mouse.y =
      -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObject(
      furnitureGroup,
      true
    );

    renderer.domElement.style.cursor =
      intersects.length > 0 ? "pointer" : "default";
  }

  function onClick(event: MouseEvent): void {
    const rect =
      renderer.domElement.getBoundingClientRect();

    mouse.x =
      ((event.clientX - rect.left) / rect.width) * 2 - 1;

    mouse.y =
      -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObject(
      furnitureGroup,
      true
    );

    if (intersects.length > 0 && !isTransitioning) {
      cycleIndex =
        (cycleIndex + 1) % cycleCategories.length;

      woodFinishIndex =
        (woodFinishIndex + 1) % WMA_WOOD_FINISHES.length;
      applyWoodFinish(woodFinishIndex);

      transitionToCategory(
        cycleCategories[cycleIndex]
      );
    }
  }

  renderer.domElement.addEventListener(
    "pointermove",
    onPointerMove
  );

  renderer.domElement.addEventListener(
    "click",
    onClick
  );

  renderer.domElement.addEventListener(
    "pointerenter",
    onPointerEnter
  );

  renderer.domElement.addEventListener(
    "pointerleave",
    onPointerLeave
  );

  renderer.domElement.addEventListener(
    "pointerdown",
    onPointerDown
  );

  autoCycleInterval = window.setInterval(cycleShowcase, 5000);

  let animationFrameId = 0;

  function animate(): void {
    if (!container.isConnected) {
      destroy();
      return;
    }

    animationFrameId = requestAnimationFrame(animate);

    furnitureGroup.rotation.y += 0.005;

    renderer.render(scene, camera);
  }

  animationFrameId = requestAnimationFrame(animate);

  function handleResize(): void {
    if (
      !container.clientWidth ||
      !container.clientHeight
    ) {
      return;
    }

    camera.aspect =
      container.clientWidth / container.clientHeight;

    camera.updateProjectionMatrix();

    renderer.setSize(
      container.clientWidth,
      container.clientHeight
    );
  }

  window.addEventListener("resize", handleResize);

  function destroy(): void {
    if (destroyed) return;

    destroyed = true;

    if (autoCycleInterval !== null) {
      window.clearInterval(autoCycleInterval);
      autoCycleInterval = null;
    }

    if (interactionResumeTimeout !== null) {
      window.clearTimeout(interactionResumeTimeout);
      interactionResumeTimeout = null;
    }

    gsap.killTweensOf(materials.body.color);
    gsap.killTweensOf(materials.body);
    transitionTimelines.forEach((timeline) => timeline.kill());
    transitionTimelines.clear();

    cancelAnimationFrame(animationFrameId);

    window.removeEventListener(
      "resize",
      handleResize
    );

    renderer.domElement.removeEventListener(
      "pointermove",
      onPointerMove
    );

    renderer.domElement.removeEventListener(
      "click",
      onClick
    );

    renderer.domElement.removeEventListener(
      "pointerenter",
      onPointerEnter
    );

    renderer.domElement.removeEventListener(
      "pointerleave",
      onPointerLeave
    );

    renderer.domElement.removeEventListener(
      "pointerdown",
      onPointerDown
    );

    disposeWmaGroup(activeGroup);
    disposeWmaMaterials(materials);

    environmentTexture.dispose();
    renderer.dispose();

    if (
      renderer.domElement.parentElement === container
    ) {
      container.removeChild(renderer.domElement);
    }
  }

  return { destroy };
}

export function createCatalog(
  props: CatalogProps
): HTMLElement {
  const {
    hero,
    items,
    filters = defaultFilters,
  } = props;

  const shuffledItems = [...items];

  for (
    let i = shuffledItems.length - 1;
    i > 0;
    i--
  ) {
    const j = Math.floor(Math.random() * (i + 1));

    [shuffledItems[i], shuffledItems[j]] = [
      shuffledItems[j],
      shuffledItems[i],
    ];
  }

  const section = document.createElement("div");

  section.innerHTML = `
    ${renderHero(hero)}

    <div class="grain-seam" role="presentation"></div>

    <section class="section wrap px-4 sm:px-6" id="catalog">
      <div class="section__head">
        <div>
          <h2 class="section__title">WMA Collection</h2>
          <p class="section__subtitle">
            Discover custom mall kiosks, pop-up carts, motor carts, in-line stores, and restaurant setups built to showcase your brand, attract customers, and bring your vision to life.
        </div>
      </div>

      ${renderFilterBar(filters)}

      <div class="catalog-grid grid grid-cols-3">
        ${shuffledItems.map(renderCard).join("")}
      </div>

      <p class="catalog-empty" hidden>
        No pieces match that category yet — try another filter.
      </p>
    </section>
  `;

  const heroContainer =
    section.querySelector<HTMLElement>(
      "#hero-3d-container"
    );

  if (heroContainer) {
    whenContainerSized(heroContainer, () => {
      createAssemblyScene(heroContainer);
    });
  }

  const grid =
    section.querySelector<HTMLElement>(
      ".catalog-grid"
    );

  const emptyState =
    section.querySelector<HTMLElement>(
      ".catalog-empty"
    );

  const filterButtons = Array.from(
    section.querySelectorAll<HTMLButtonElement>(
      ".filter-badge"
    )
  );

  // Append the button independently of the current user's session.
  const viewMoreBtn = grid
    ? appendViewMoreControl(grid)
    : null;

  let currentCategory: string = "All";
  let showAllItems = false;

  function updateGridUI(): void {
    const cards = Array.from(
      section.querySelectorAll<HTMLElement>(
        ".card"
      )
    );

    let totalMatchesForCategory = 0;
    let currentlyShowingCount = 0;

    const maxVisible = showAllItems
      ? Number.POSITIVE_INFINITY
      : INITIAL_VISIBLE_ITEMS;

    cards.forEach((card) => {
      const cardCategory = card.dataset.category;

      const isMatch =
        currentCategory === "All" ||
        cardCategory === currentCategory;

      if (isMatch) {
        totalMatchesForCategory++;

        if (currentlyShowingCount < maxVisible) {
          setCardVisibility(card, true);
          currentlyShowingCount++;
        } else {
          setCardVisibility(card, false);
        }
      } else {
        setCardVisibility(card, false);
      }
    });

    if (emptyState) {
      emptyState.hidden =
        totalMatchesForCategory !== 0;
    }

    if (grid) {
      grid.hidden = totalMatchesForCategory === 0;
    }

    if (viewMoreBtn) {
      updateViewMoreControl(
        viewMoreBtn,
        totalMatchesForCategory,
        showAllItems
      );
    }
  }

  // Set the initial visibility and button state.
  updateGridUI();

  section.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;

    const lightboxTrigger =
      target.closest<HTMLButtonElement>(
        '[data-action="open-lightbox"]'
      );

    if (lightboxTrigger) {
      event.preventDefault();

      const itemId = lightboxTrigger.dataset.id;

      const item = shuffledItems.find(
        (entry) =>
          getCatalogItemId(entry) === itemId
      );

      if (item) {
        openCatalogLightbox(item);
      }

      return;
    }

    const addToCartBtn =
      target.closest<HTMLButtonElement>(
        '[data-action="add-to-cart"]'
      );

    if (addToCartBtn) {
      event.preventDefault();

      const itemId = addToCartBtn.dataset.id;

      const item = shuffledItems.find(
        (entry) =>
          getCatalogItemId(entry) === itemId
      );

      if (item) {
        const productId = String(
          addToCartBtn.dataset.productId ||
            addToCartBtn.dataset.id ||
            item.id ||
            ""
        ).trim();

        const title =
          addToCartBtn.dataset.title || item.name || "Custom Item";
        const category =
          addToCartBtn.dataset.category || item.category || "General";
        const price = Number(
          addToCartBtn.dataset.price ?? item.price ?? 0
        );
        const dimensions =
          addToCartBtn.dataset.dimensions ||
          (item.dimensions
            ? `${item.dimensions.width}×${item.dimensions.height}×${item.dimensions.depth} ${item.dimensions.unit}`
            : "Standard");
        const imageUrl =
          addToCartBtn.dataset.image ||
          item.imageUrl ||
          "https://placehold.co/160x160/2B1E16/D4A373?text=WMA";

        cartManager.addItem({
          id: productId,
          productId,
          title,
          name: title,
          category,
          dimensions,
          unitPrice: price,
          price,
          imageUrl,
          image: imageUrl,
        });

        const originalText =
          addToCartBtn.textContent;

        addToCartBtn.textContent = "Added to cart";

        addToCartBtn.style.backgroundColor =
          "var(--success-color, #4CAF50)";

        addToCartBtn.style.color = "#fff";

        setTimeout(() => {
          addToCartBtn.textContent = originalText;
          addToCartBtn.style.backgroundColor = "";
          addToCartBtn.style.color = "";
        }, 1200);
      }

      return;
    }

    const inquiryBtn =
      target.closest<HTMLButtonElement>(
        '[data-action="inquire"]'
      );

    if (inquiryBtn) {
      event.preventDefault();

      if (!getCurrentUser()) {
        uiState.openModal("login");
        return;
      }

      uiState.openInquiryModal(
        inquiryBtn.dataset.category
      );

      return;
    }

    const filterBtn =
      target.closest<HTMLButtonElement>(
        ".filter-badge"
      );

    if (filterBtn) {
      currentCategory =
        filterBtn.dataset.filter as FilterCategory;

      // Reset pagination when the category changes.
      showAllItems = false;

      filterButtons.forEach((btn) => {
        btn.setAttribute(
          "aria-pressed",
          String(btn === filterBtn)
        );
      });

      updateGridUI();
      return;
    }

    // Shared View more / Show less handler.
    // No authentication check is performed here.
    const viewMoreClicked =
      target.closest<HTMLButtonElement>(
        '[data-action="view-more"]'
      );

    if (viewMoreClicked) {
      event.preventDefault();

      showAllItems = !showAllItems;

      updateGridUI();
      return;
    }
  });

  attachRippleToAll(section);

  return section;
}
