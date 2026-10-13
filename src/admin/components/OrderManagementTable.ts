import { ORDER_STATUS_TRANSITIONS } from "../services/adminStore.js";
import type { Order, OrderStatus } from "../types/admin.js";
import { escapeHtml, fromHTML } from "../utils/dom.js";
import { formatCurrency, formatDate, ORDER_STATUS_META } from "../utils/format.js";
import { icon } from "./icons.js";
import { renderStatusChip } from "./StatusChip.js";

export interface OrderTableOptions {
  orders: Order[];
  onView: (order: Order) => void;
  onStatusChange: (order: Order, next: OrderStatus) => void;
}

const summarizeItems = (order: Order): string => {
  const [first, ...rest] = order.items;
  if (!first) return "No items";
  const head = `${escapeHtml(first.title)} ×${first.quantity}`;
  return rest.length ? `${head} · +${rest.length} more` : head;
};

const renderStatusControl = (order: Order): string => {
  const next = ORDER_STATUS_TRANSITIONS[order.status];
  if (next.length === 0) return `<span class="admin-muted">Final</span>`;

  const options = [order.status, ...next]
    .map(
      (status) =>
        `<option value="${status}" ${status === order.status ? "selected" : ""}>${ORDER_STATUS_META[status].label}</option>`
    )
    .join("");

  return `<select class="admin-select" data-action="status" aria-label="Change status for ${escapeHtml(order.reference)}">${options}</select>`;
};

const getCustomerDisplayName = (order: Order): string => {
  const value = order.customer.name?.trim();
  if (value && value !== "Guest customer") return value;

  const emailName = order.customer.email?.trim();
  if (emailName) return emailName.split("@")[0].replace(/[._-]+/g, " ").replace(/\s+/g, " ").trim() || "Guest customer";

  return "Guest customer";
};

export function createOrderTable({ orders, onView, onStatusChange }: OrderTableOptions): HTMLElement {
  const wrap = fromHTML<HTMLElement>(`
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th scope="col">Order</th>
            <th scope="col">Customer</th>
            <th scope="col">Items</th>
            <th scope="col">Total</th>
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
    tbody.innerHTML = `<tr><td colspan="8"><div class="admin-empty">No orders match this view.</div></td></tr>`;
    return wrap;
  }

  tbody.innerHTML = orders
    .map(
      (order) => `
    <tr data-id="${escapeHtml(order.id)}">
      <td data-label="Order">
        <strong class="admin-mono">${escapeHtml(order.reference)}</strong>
        <span class="admin-muted admin-block">${formatDate(order.createdAt)}</span>
      </td>
      <td data-label="Customer">
        <strong>${escapeHtml(getCustomerDisplayName(order))}</strong>
        <span class="admin-muted admin-block">${escapeHtml(order.customer.email || "No email on file")}</span>
      </td>
      <td data-label="Items">${summarizeItems(order)}</td>
      <td data-label="Total"><span class="admin-price">${formatCurrency(order.total)}</span></td>
      <td data-label="Payment">
        ${
          order.paymentProof
            ? `<button type="button" class="admin-link" data-action="view">Receipt uploaded</button>`
            : `<span class="admin-muted">Not uploaded</span>`
        }
      </td>
      <td data-label="Status">${renderStatusChip(order.status)}</td>
      <td data-label="Update">${renderStatusControl(order)}</td>
      <td class="admin-table__actions">
        <button type="button" class="admin-icon-btn" data-action="view" aria-label="View order ${escapeHtml(order.reference)}" title="View details">${icon("eye")}</button>
      </td>
    </tr>`
    )
    .join("");

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
    if (order) onStatusChange(order, select.value as OrderStatus);
  });

  return wrap;
}