import { escapeHtml, fromHTML, getAdminHost } from "../utils/dom.js";

export type ToastTone = "success" | "error" | "info";

const TOAST_DURATION_MS = 3200;

export function showToast(message: string, tone: ToastTone = "info"): void {
  const host = getAdminHost();
  let stack = host.querySelector<HTMLElement>(".admin-toasts");
  if (!stack) {
    stack = fromHTML<HTMLElement>(`<div class="admin-toasts" role="status" aria-live="polite"></div>`);
    host.appendChild(stack);
  }

  const toast = fromHTML<HTMLElement>(`<div class="admin-toast admin-toast--${tone}">${escapeHtml(message)}</div>`);
  stack.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("is-visible"));

  window.setTimeout(() => {
    toast.classList.remove("is-visible");
    window.setTimeout(() => toast.remove(), 300);
  }, TOAST_DURATION_MS);
}