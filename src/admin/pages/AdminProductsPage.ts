import { icon } from "../components/icons.js";
import { openProductModal } from "../components/AddEditProductModal.js";
import { openDeleteModal } from "../components/DeleteModal.js";
import { createProductTable } from "../components/ProductTable.js";
import { showToast } from "../components/Toast.js";
import { adminStore } from "../services/adminStore.js";
import { PRODUCT_CATEGORIES, type AdminPage, type Product, type ProductCategory } from "../types/admin.js";
import { fromHTML } from "../utils/dom.js";

type CategoryFilter = "All" | ProductCategory;

export function createAdminProductsPage(): AdminPage {
  let query = "";
  let category: CategoryFilter = "All";

  const categories: CategoryFilter[] = ["All", ...PRODUCT_CATEGORIES];

  const element = fromHTML<HTMLElement>(`
    <div class="admin-products">
      <div class="admin-toolbar">
        <label class="admin-search">
          ${icon("search", 18)}
          <input type="search" placeholder="Search title or description" aria-label="Search products" />
        </label>
        <div class="admin-segmented" role="group" aria-label="Filter by category">
          ${categories.map((item) => `<button type="button" data-category="${item}">${item}</button>`).join("")}
        </div>
        <button type="button" class="btn btn--primary" data-add>${icon("plus", 18)}<span>Add new item</span></button>
      </div>
      <p class="admin-meta" data-meta></p>
      <div data-table></div>
    </div>`);

  const searchInput = element.querySelector<HTMLInputElement>('input[type="search"]') as HTMLInputElement;
  const segmented = element.querySelector<HTMLElement>(".admin-segmented") as HTMLElement;
  const meta = element.querySelector<HTMLElement>("[data-meta]") as HTMLElement;
  const tableHost = element.querySelector<HTMLElement>("[data-table]") as HTMLElement;

  const openCreate = (): void => {
    openProductModal({
      onSubmit: (input) => {
        adminStore.createProduct(input);
        showToast(`“${input.title}” published`, "success");
      },
    });
  };

  const openEdit = (product: Product): void => {
    openProductModal({
      product,
      onSubmit: (input) => {
        adminStore.updateProduct(product.id, input);
        showToast(`“${input.title}” updated`, "success");
      },
    });
  };

  const confirmDelete = (product: Product): void => {
    openDeleteModal({
      itemName: product.title,
      description: "This item will disappear from the storefront catalog. Existing orders keep their saved details.",
      onConfirm: () => {
        adminStore.deleteProduct(product.id);
        showToast("Item deleted", "info");
      },
    });
  };

  const syncSegments = (): void => {
    segmented.querySelectorAll<HTMLButtonElement>("[data-category]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.category === category);
    });
  };

  const renderTable = (): void => {
    const all = adminStore.listProducts();
    const term = query.trim().toLowerCase();

    const products = all.filter(
      (product) =>
        (category === "All" || product.category === category) &&
        (!term || `${product.title} ${product.description}`.toLowerCase().includes(term))
    );

    meta.textContent = `Showing ${products.length} of ${all.length} items`;
    tableHost.replaceChildren(createProductTable({ products, onEdit: openEdit, onDelete: confirmDelete }));
  };

  searchInput.addEventListener("input", () => {
    query = searchInput.value;
    renderTable();
  });

  segmented.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-category]");
    if (!button) return;
    category = button.dataset.category as CategoryFilter;
    syncSegments();
    renderTable();
  });

  element.querySelector("[data-add]")?.addEventListener("click", openCreate);

  syncSegments();
  renderTable();
  const unsubscribe = adminStore.subscribe(renderTable);
  return { element, destroy: unsubscribe };
}