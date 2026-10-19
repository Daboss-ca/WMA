import { ORDER_STATUS_TRANSITIONS } from "../services/adminStore.js";
import type { Order, OrderStatus } from "../types/admin.js";
import { escapeHtml, fromHTML } from "../utils/dom.js";
import { formatCurrency, formatDate, ORDER_STATUS_META } from "../utils/format.js";
import { icon } from "./icons.js";
import { renderStatusChip } from "./StatusChip.js";

export interface OrderTableOptions {
  orders: Order[];
  updatingOrderIds?: ReadonlySet<string>;
  onView: (order: Order) => void;
  onStatusChange: (order: Order, next: OrderStatus) => void;
}

const renderStatusControl = (order: Order, updating: boolean): string => {
  const next = ORDER_STATUS_TRANSITIONS[order.status];
  if (next.length === 0) return `<span class="admin-muted">Locked</span>`;

  const options = [order.status, ...next]
    .map((status) =>
      `<option value="${status}" ${status === order.status ? "selected" : ""}>${ORDER_STATUS_META[status].label}</option>`
    )
    .join("");

  return `<select class="admin-select" data-action="status" aria-label="Change status for ${escapeHtml(order.reference)}" ${updating ? "disabled" : ""}>${options}</select>`;
};

const getCustomerDisplayName = (order: Order): string => {
  const value = order.customer.name?.trim();
  if (value && value !== "Guest customer") return value;

  const emailName = order.customer.email?.trim();
  if (emailName) return emailName.split("@")[0].replace(/[._-]+/g, " ").replace(/\s+/g, " ").trim() || "Guest customer";

  return "Guest customer";
};

export function createOrderTable({ orders, updatingOrderIds = new Set(), onView, onStatusChange }: OrderTableOptions): HTMLElement {
  const wrap = fromHTML<HTMLElement>(`
    <div class="w-full overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0 rounded-xl border border-gray-200/20 shadow-sm admin-table-wrap">
      <table class="w-full min-w-[600px] text-left border-collapse admin-table admin-table--orders">
        <thead>
          <tr>
            <th scope="col">Order</th>
            <th scope="col">Customer</th>
            <th scope="col">Item</th>
            <th scope="col">QTY</th>
            <th scope="col">Item price</th>
            <th scope="col">Order total</th>
            <th scope="col">Payment</th>
            <th scope="col">Status</th>
            <th scope="col">Update</th>
            <th scope="col"><span class="visually-hidden">Actions</span></th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </div>`);

  const tbody = wrap.querySelector("tbody") as HTMLTableSectionElement;

  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10"><div class="admin-empty">No orders match this view.</div></td></tr>`;
    return wrap;
  }

  tbody.innerHTML = orders.map((order) => {
    const items = order.items.length > 0
      ? order.items
      : [{ productId: "", title: "No items", unitPrice: 0, quantity: 0 }];
    const rowSpan = items.length;

    return items.map((item, index) => `
      <tr data-id="${escapeHtml(order.id)}">
        ${index === 0 ? `
        <td data-label="Order" rowspan="${rowSpan}">
          <strong class="admin-mono">${escapeHtml(order.reference)}</strong>
          <span class="admin-muted admin-block">${formatDate(order.createdAt)}</span>
        </td>
        <td data-label="Customer" rowspan="${rowSpan}">
          <strong>${escapeHtml(getCustomerDisplayName(order))}</strong>
          <span class="admin-muted admin-block">${escapeHtml(order.customer.email || "No email on file")}</span>
        </td>` : ""}
        <td data-label="Item">${escapeHtml(item.title)}</td>
        <td data-label="QTY">${item.quantity > 0 ? escapeHtml(String(item.quantity)) : "—"}</td>
        <td data-label="Item price">${item.quantity > 0 ? `<span class="admin-price">${formatCurrency(item.unitPrice)}</span>` : "—"}</td>
        ${index === 0 ? `
        <td data-label="Order total" rowspan="${rowSpan}"><span class="admin-price">${formatCurrency(order.total)}</span></td>
        <td data-label="Payment" rowspan="${rowSpan}">
          ${order.paymentProof
            ? `<button type="button" class="admin-link" data-action="view">Receipt uploaded</button>`
            : `<span class="admin-muted">Not uploaded</span>`}
        </td>
        <td data-label="Status" rowspan="${rowSpan}">${renderStatusChip(order.status)}</td>
        <td data-label="Update" rowspan="${rowSpan}">${renderStatusControl(order, updatingOrderIds.has(order.id))}</td>
        <td class="admin-table__actions" rowspan="${rowSpan}">
          <button type="button" class="admin-icon-btn" data-action="view" aria-label="View order ${escapeHtml(order.reference)}" title="View details">${icon("eye")}</button>
        </td>` : ""}
      </tr>`).join("");
  }).join("");

  const findOrder = (target: HTMLElement): Order | undefined => {
    const id = target.closest("tr")?.dataset.id;
    return orders.find((order) => order.id === id);
  };

  tbody.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const button = target.closest<HTMLButtonElement>("[data-action='view']");
    const order = button ? findOrder(target) : undefined;
    if (order) onView(order);
  });

  tbody.addEventListener("change", (event) => {
    const select = event.target as HTMLSelectElement;
    if (select.dataset.action !== "status") return;
    const order = findOrder(select);
    if (order && select.value !== order.status) onStatusChange(order, select.value as OrderStatus);
  });

  return wrap;
}
