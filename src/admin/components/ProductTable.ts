import type { Product } from "../types/admin.js";
import { escapeHtml, fromHTML } from "../utils/dom.js";
import { formatCurrency, formatDate, formatDimensions } from "../utils/format.js";
import { icon } from "./icons.js";

export interface ProductTableOptions {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}

export function createProductTable({ products, onEdit, onDelete }: ProductTableOptions): HTMLElement {
  const wrap = fromHTML<HTMLElement>(`
    <div class="w-full overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0 rounded-xl border border-gray-200/20 shadow-sm admin-table-wrap">
      <table class="w-full min-w-[600px] text-left border-collapse admin-table">
        <thead>
          <tr>
            <th scope="col">Item</th>
            <th scope="col">Category</th>
            <th scope="col">Dimensions</th>
            <th scope="col">Price</th>
            <th scope="col">Updated</th>
            <th scope="col"><span class="visually-hidden">Actions</span></th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </div>`);

  const tbody = wrap.querySelector("tbody") as HTMLTableSectionElement;

  if (products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="admin-empty">No items match your filters.</div></td></tr>`;
    return wrap;
  }

  tbody.innerHTML = products
    .map(
      (product) => `
    <tr data-id="${escapeHtml(product.id)}">
      <td data-label="Item">
        <div class="admin-item">
          ${
            product.imageUrl
              ? `<img class="admin-thumb" src="${escapeHtml(product.imageUrl)}" alt="" loading="lazy" />`
              : `<span class="admin-thumb admin-thumb--empty" aria-hidden="true">${icon("products", 20)}</span>`
          }
          <div class="admin-item__text">
            <strong class="admin-item__title">${escapeHtml(product.title)}</strong>
            <p class="admin-item__desc">${escapeHtml(product.description)}</p>
          </div>
        </div>
      </td>
      <td data-label="Category"><span class="admin-chip admin-chip--neutral">${escapeHtml(product.category)}</span></td>
      <td data-label="Dimensions">${escapeHtml(formatDimensions(product.dimensions))}</td>
      <td data-label="Price"><span class="admin-price">${formatCurrency(product.price)}</span></td>
      <td data-label="Updated">${formatDate(product.updatedAt)}</td>
      <td class="admin-table__actions">
        <button type="button" class="admin-icon-btn" data-action="edit" aria-label="Edit ${escapeHtml(product.title)}" title="Edit">${icon("edit")}</button>
        <button type="button" class="admin-icon-btn admin-icon-btn--danger" data-action="delete" aria-label="Delete ${escapeHtml(product.title)}" title="Delete">${icon("trash")}</button>
      </td>
    </tr>`
    )
    .join("");

  tbody.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-action]");
    if (!button) return;

    const id = button.closest("tr")?.dataset.id;
    const product = products.find((item) => item.id === id);
    if (!product) return;

    if (button.dataset.action === "edit") onEdit(product);
    if (button.dataset.action === "delete") onDelete(product);
  });

  return wrap;
}
