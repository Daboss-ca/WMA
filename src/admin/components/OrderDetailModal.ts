import { ORDER_STATUS_TRANSITIONS } from "../services/adminStore.js";
import type { Order, OrderStatus } from "../types/admin.js";
import { escapeHtml } from "../utils/dom.js";
import { formatCurrency, formatDateTime, ORDER_STATUS_META } from "../utils/format.js";
import { openModal } from "./Modal.js";
import { renderStatusChip } from "./StatusChip.js";

export interface OrderDetailOptions {
  order: Order;
  onChangeStatus: (next: OrderStatus) => void;
}

const PRIMARY_ACTION_LABEL: Partial<Record<OrderStatus, string>> = {
  pending_payment: "Approve payment",
  to_ship: "Mark as shipping",
};

export function openOrderDetailModal({ order, onChangeStatus }: OrderDetailOptions): void {
  const modal = openModal({ title: order.reference, eyebrow: "Order details", size: "lg" });
  const { customer, items, paymentProof, statusHistory } = order;

  modal.body.innerHTML = `
    <div class="admin-detail">
      <div class="admin-detail__summary">
        ${renderStatusChip(order.status)}
        <span>Total <strong class="admin-price">${formatCurrency(order.total)}</strong></span>
      </div>

      <section class="admin-detail__section">
        <h3 class="admin-section-title">Customer</h3>
        <dl class="admin-dl">
          <div><dt>Name</dt><dd>${escapeHtml(customer.name)}</dd></div>
          <div><dt>Contact</dt><dd>${escapeHtml(customer.phone)}<br /><span class="admin-muted">${escapeHtml(customer.email)}</span></dd></div>
          <div class="admin-dl__full"><dt>Delivery address</dt><dd>${escapeHtml(customer.address)}</dd></div>
        </dl>
      </section>

      <section class="admin-detail__section">
        <h3 class="admin-section-title">Items</h3>
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead><tr><th>Item</th><th>Qty</th><th>Unit</th><th>Subtotal</th></tr></thead>
            <tbody>
              ${items
                .map(
                  (item) => `
                <tr>
                  <td data-label="Item">${escapeHtml(item.title)}</td>
                  <td data-label="Qty">${item.quantity}</td>
                  <td data-label="Unit">${formatCurrency(item.unitPrice)}</td>
                  <td data-label="Subtotal">${formatCurrency(item.unitPrice * item.quantity)}</td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </section>

      <section class="admin-detail__section">
        <h3 class="admin-section-title">Payment proof</h3>
        ${
          paymentProof
            ? `
          <div class="admin-proof">
            ${
              paymentProof.dataUrl
                ? `<img class="admin-proof__img" src="${escapeHtml(paymentProof.dataUrl)}" alt="Payment proof for ${escapeHtml(order.reference)}" />`
                : `<div class="admin-proof__placeholder">Receipt on file</div>`
            }
            <dl class="admin-dl">
              <div><dt>File</dt><dd>${escapeHtml(paymentProof.fileName)}</dd></div>
              <div><dt>Reference no.</dt><dd class="admin-mono">${escapeHtml(paymentProof.referenceNo)}</dd></div>
              <div><dt>Submitted</dt><dd>${formatDateTime(paymentProof.submittedAt)}</dd></div>
            </dl>
          </div>`
            : `<p class="admin-muted">No payment proof uploaded yet. Ask the customer to resend it before approving.</p>`
        }
      </section>

      <section class="admin-detail__section">
        <h3 class="admin-section-title">Status timeline</h3>
        <ol class="admin-timeline">
          ${statusHistory
            .map(
              (event) => `
            <li>
              <span class="admin-timeline__label">${ORDER_STATUS_META[event.status].label}</span>
              <span class="admin-muted">${formatDateTime(event.at)}</span>
            </li>`
            )
            .join("")}
        </ol>
      </section>
    </div>`;

  const next = ORDER_STATUS_TRANSITIONS[order.status];
  const primary = next.find((status) => status !== "cancelled");
  const primaryLabel = primary ? PRIMARY_ACTION_LABEL[order.status] : undefined;

  modal.footer.innerHTML = `
    ${next.includes("cancelled") ? `<button type="button" class="btn btn--danger" data-cancel>Cancel order</button>` : ""}
    <span class="admin-grow"></span>
    <button type="button" class="btn btn--ghost" data-modal-dismiss>Close</button>
    ${primary && primaryLabel ? `<button type="button" class="btn btn--primary" data-advance>${primaryLabel}</button>` : ""}`;

  modal.footer.querySelector("[data-cancel]")?.addEventListener("click", () => {
    modal.close();
    onChangeStatus("cancelled");
  });

  if (primary) {
    const nextStatus = primary;
    modal.footer.querySelector("[data-advance]")?.addEventListener("click", () => {
      modal.close();
      onChangeStatus(nextStatus);
    });
  }
}