import type { FilterCategory, FurnitureItem } from "../types/furniture";
import { attachRippleToAll } from "./interactions";
import * as THREE from "three";
import gsap from "gsap";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { getCurrentUser } from "../state/sessionManager.js";
import { uiState } from "../state/uiStateManager.js";
import {
  createWmaMaterials,
  disposeWmaMaterials,
  buildKiosk,
  buildTable,
  buildCabinet,
  disposeWmaGroup,
  type AssemblyPart,
  type WmaMaterials,
} from "./Wmafurniture ";

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
            <a
              class="btn btn--primary"
              href="${hero.primaryCta.href}"
              ${hero.primaryCta.href === "#login" ? 'data-auth-mode="login"' : ""}
            >${hero.primaryCta.label}</a>
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

        <div
          id="hero-3d-container"
          style="position: relative; display: flex; align-items: center; justify-content: center; width: 100%; min-height: 520px; background: transparent;"
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

const CATEGORY_TRANSFORM: Record<string, { scale: number; offsetY: number }> = {
  Tables: { scale: 1.15, offsetY: 0 },
  Cabinets: { scale: 1.15, offsetY: 0 },
  Kiosks: { scale: 1.15, offsetY: 0 },
  Custom: { scale: 1.15, offsetY: 0 },
  All: { scale: 1.15, offsetY: 0 },
};
const DEFAULT_TRANSFORM = CATEGORY_TRANSFORM.Kiosks;

function buildPartsForCategory(category: string, materials: WmaMaterials): THREE.Group {
  let group: THREE.Group;

  if (category === "Tables") {
    group = buildTable(materials);
  } else if (category === "Cabinets") {
    group = buildCabinet(materials);
  } else {
    group = buildKiosk(materials); 
  }

  const transform = CATEGORY_TRANSFORM[category] ?? DEFAULT_TRANSFORM;
  group.scale.setScalar(transform.scale);
  group.position.y = transform.offsetY * transform.scale;

  return group;
}

function whenContainerSized(container: HTMLElement, callback: () => void): () => void {
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

function createAssemblyScene(container: HTMLElement): AssemblyScene {
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight || 1, 0.1, 1000);
  camera.position.set(0, 0.6, 6.4);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const environmentTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = environmentTexture;
  pmremGenerator.dispose();

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
  const keyLight = new THREE.DirectionalLight(0xfff1de, 1.3);
  keyLight.position.set(4, 7, 5);
  const fillLight = new THREE.DirectionalLight(0xffffff, 0.45);
  fillLight.position.set(-5, 3, 4);
  const rimLight = new THREE.DirectionalLight(0xd4af37, 0.55);
  rimLight.position.set(-4, -2, -5);
  scene.add(ambientLight, keyLight, fillLight, rimLight);

  const furnitureGroup = new THREE.Group();
  scene.add(furnitureGroup);

  const materials = createWmaMaterials();

  let activeGroup = buildPartsForCategory("Kiosks", materials);
  furnitureGroup.add(activeGroup);

  let currentCategory = "Kiosks";
  let isTransitioning = false;
  let pendingCategory: string | null = null;

  const cycleCategories = ["Kiosks", "Tables", "Cabinets"];
  let cycleIndex = 0;

  function transitionToCategory(category: string) {
    if (category === currentCategory && !isTransitioning) return;
    currentCategory = category;

    if (isTransitioning) {
      pendingCategory = category;
      return;
    }
    isTransitioning = true;

    const oldGroup = activeGroup;
    const meshesToDisassemble = oldGroup.children as AssemblyPart[];

    const explodeTl = gsap.timeline({
      onComplete: () => {
        furnitureGroup.remove(oldGroup);
        disposeWmaGroup(oldGroup);

        const newGroup = buildPartsForCategory(category, materials);
        newGroup.children.forEach((mesh) => {
          const m = mesh as AssemblyPart;
          m.position.set(m.userData.explodePos.x, m.userData.explodePos.y, m.userData.explodePos.z);
          m.scale.set(0, 0, 0);
        });

        furnitureGroup.add(newGroup);
        activeGroup = newGroup;

        const buildTl = gsap.timeline({
          onComplete: () => {
            isTransitioning = false;
            if (pendingCategory && pendingCategory !== category) {
              const next = pendingCategory;
              pendingCategory = null;
              transitionToCategory(next);
            } else {
              pendingCategory = null;
            }
          },
        });

        newGroup.children.forEach((mesh, idx) => {
          const m = mesh as AssemblyPart;
          buildTl
            .to(
              m.position,
              { x: m.userData.targetPos.x, y: m.userData.targetPos.y, z: m.userData.targetPos.z, duration: 1.1, ease: "power2.out" },
              idx * 0.08
            )
            .to(m.scale, { x: 1, y: 1, z: 1, duration: 1.1, ease: "power2.out" }, idx * 0.08);
        });
      },
    });

    meshesToDisassemble.forEach((mesh, idx) => {
      explodeTl
        .to(
          mesh.position,
          { x: mesh.userData.explodePos.x, y: mesh.userData.explodePos.y, z: mesh.userData.explodePos.z, duration: 0.8, ease: "power2.in" },
          idx * 0.05
        )
        .to(mesh.scale, { x: 0, y: 0, z: 0, duration: 0.8, ease: "power2.in" }, idx * 0.05);
    });
  }

  // --- RAYCASTER SETUP ---
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  function onPointerMove(event: PointerEvent) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(furnitureGroup, true);

    renderer.domElement.style.cursor = intersects.length > 0 ? "pointer" : "default";
  }

  function onClick(event: MouseEvent) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(furnitureGroup, true);

    if (intersects.length > 0 && !isTransitioning) {
      cycleIndex = (cycleIndex + 1) % cycleCategories.length;
      transitionToCategory(cycleCategories[cycleIndex]);
    }
  }

  renderer.domElement.addEventListener("pointermove", onPointerMove);
  renderer.domElement.addEventListener("click", onClick);

  let animationFrameId = 0;
  function animate() {
    if (!container.isConnected) {
      destroy();
      return;
    }
    animationFrameId = requestAnimationFrame(animate);
    furnitureGroup.rotation.y += 0.005;
    renderer.render(scene, camera);
  }
  animationFrameId = requestAnimationFrame(animate);

  function handleResize() {
    if (!container.clientWidth || !container.clientHeight) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }
  window.addEventListener("resize", handleResize);

  let destroyed = false;
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    cancelAnimationFrame(animationFrameId);
    window.removeEventListener("resize", handleResize);
    renderer.domElement.removeEventListener("pointermove", onPointerMove);
    renderer.domElement.removeEventListener("click", onClick);

    disposeWmaGroup(activeGroup);
    disposeWmaMaterials(materials);
    environmentTexture.dispose();

    renderer.dispose();
    if (renderer.domElement.parentElement === container) {
      container.removeChild(renderer.domElement);
    }
  }

  return { destroy };
}

export function createCatalog(props: CatalogProps): HTMLElement {
  const { hero, items, filters = defaultFilters } = props;

  // BAGO: I-shuffle ang items array (Fisher-Yates) para random ang unang order sa HTML
  // Maiiwasan nito na mapuno ng iisang category (ex. Kiosks) ang first 6 items.
  const shuffledItems = [...items];
  for (let i = shuffledItems.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledItems[i], shuffledItems[j]] = [shuffledItems[j], shuffledItems[i]];
  }

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
        ${shuffledItems.map(renderCard).join("")}
      </div>
      
      <!-- View more button container -->
      <div class="catalog-actions" style="display: flex; justify-content: center; margin-top: 2.5rem;">
        <button type="button" class="btn btn--outline" id="view-more-btn" style="display: none;">View more</button>
      </div>

      <p class="catalog-empty" hidden>No pieces match that category yet — try another filter.</p>
    </section>
  `;

  const heroContainer = section.querySelector<HTMLElement>("#hero-3d-container");
  if (heroContainer) {
    whenContainerSized(heroContainer, () => {
      createAssemblyScene(heroContainer);
    });
  }

  const grid = section.querySelector<HTMLElement>(".catalog-grid");
  const emptyState = section.querySelector<HTMLElement>(".catalog-empty");
  const filterButtons = Array.from(section.querySelectorAll<HTMLButtonElement>(".filter-badge"));
  const viewMoreBtn = section.querySelector<HTMLButtonElement>("#view-more-btn");

  // BAGO: Pinalitan ang boolean isExpanded ng number visibleLimit
  let currentCategory: string = "All";
  let visibleLimit: number = 6;
  const ITEMS_TO_ADD = 3;

  function updateGridUI() {
    const cards = Array.from(section.querySelectorAll<HTMLElement>(".card"));
    let totalMatchesForCategory = 0;
    let currentlyShowingCount = 0;

    cards.forEach((card) => {
      const cardCategory = card.dataset.category;
      const isMatch = currentCategory === "All" || cardCategory === currentCategory;

      if (isMatch) {
        totalMatchesForCategory++;
        // Kung hindi pa lumalagpas sa limit (6, 9, 12, etc.), ipakita. Kung lumagpas, itago.
        if (currentlyShowingCount < visibleLimit) {
          card.style.display = "";
          card.removeAttribute("hidden");
          currentlyShowingCount++;
        } else {
          card.style.display = "none";
          card.setAttribute("hidden", "true");
        }
      } else {
        card.style.display = "none";
        card.setAttribute("hidden", "true");
      }
    });

    if (emptyState) emptyState.hidden = totalMatchesForCategory !== 0;
    if (grid) grid.hidden = totalMatchesForCategory === 0;

    // Ipakita ang button kung mas marami pang total items kaysa sa kasalukuyang nakikita
    if (viewMoreBtn) {
      if (totalMatchesForCategory > visibleLimit) {
        viewMoreBtn.style.display = "inline-flex";
      } else {
        viewMoreBtn.style.display = "none";
      }
    }
  }

  updateGridUI();

  section.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;

    const inquiryLink = target.closest<HTMLAnchorElement>('.card__actions a[href="#contact"]');
    if (inquiryLink && !getCurrentUser()) {
      event.preventDefault();
      uiState.openModal("login");
      return;
    }

    if (inquiryLink) {
      event.preventDefault();
      uiState.openInquiryModal(inquiryLink.closest<HTMLElement>(".card")?.dataset.category);
      return;
    }
    
    // Filter click handler
    const filterBtn = target.closest<HTMLButtonElement>(".filter-badge");
    if (filterBtn) {
      currentCategory = filterBtn.dataset.filter as FilterCategory;
      visibleLimit = 6; // Reset the limit back to 6 whenever a new filter is clicked

      filterButtons.forEach((btn) => {
        btn.setAttribute("aria-pressed", String(btn === filterBtn));
      });

      updateGridUI();
      return;
    }

    // View more click handler
    const viewMoreClicked = target.closest<HTMLButtonElement>("#view-more-btn");
    if (viewMoreClicked) {
      visibleLimit += ITEMS_TO_ADD; // BAGO: Magdagdag lang ng 3 images sa grid
      updateGridUI();
      return;
    }
  });

  attachRippleToAll(section);

  return section;
}