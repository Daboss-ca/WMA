import type { OrderStatus } from "../types/admin.js";
import { escapeHtml } from "../utils/dom.js";
import { ORDER_STATUS_META } from "../utils/format.js";

export function renderStatusChip(status: OrderStatus): string {
  const meta = ORDER_STATUS_META[status];
  return `<span class="admin-chip admin-chip--${meta.tone}">${escapeHtml(meta.label)}</span>`;
}