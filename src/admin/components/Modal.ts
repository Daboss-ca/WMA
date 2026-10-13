import { icon } from "./icons.js";
import { escapeHtml, fromHTML, getAdminHost } from "../utils/dom.js";

export interface ModalOptions {
  title: string;
  eyebrow?: string;
  size?: "sm" | "md" | "lg";
  onClose?: () => void;
}

export interface ModalController {
  body: HTMLElement;
  footer: HTMLElement;
  close: () => void;
}

let modalCount = 0;

/** Any element with [data-modal-dismiss] inside the modal closes it. */
export function openModal({ title, eyebrow, size = "md", onClose }: ModalOptions): ModalController {
  modalCount += 1;
  const titleId = `admin-modal-title-${modalCount}`;
  const previouslyFocused = document.activeElement as HTMLElement | null;

  const root = fromHTML<HTMLElement>(`
    <div class="admin-modal" role="presentation">
      <div class="admin-modal__backdrop" data-modal-dismiss></div>
      <div class="admin-modal__panel admin-modal__panel--${size}" role="dialog" aria-modal="true" aria-labelledby="${titleId}">
        <header class="admin-modal__header">
          <div>
            ${eyebrow ? `<p class="admin-eyebrow">${escapeHtml(eyebrow)}</p>` : ""}
            <h2 class="admin-modal__title" id="${titleId}">${escapeHtml(title)}</h2>
          </div>
          <button type="button" class="admin-icon-btn" data-modal-dismiss aria-label="Close dialog">${icon("close")}</button>
        </header>
        <div class="admin-modal__body"></div>
        <footer class="admin-modal__footer"></footer>
      </div>
    </div>`);

  const body = root.querySelector<HTMLElement>(".admin-modal__body") as HTMLElement;
  const footer = root.querySelector<HTMLElement>(".admin-modal__footer") as HTMLElement;
  let closed = false;

  const onKeydown = (event: KeyboardEvent): void => {
    if (event.key === "Escape") close();
  };

  const close = (): void => {
    if (closed) return;
    closed = true;
    document.removeEventListener("keydown", onKeydown);
    root.remove();
    previouslyFocused?.focus?.();
    onClose?.();
  };

  root.addEventListener("click", (event) => {
    if ((event.target as HTMLElement).closest("[data-modal-dismiss]")) close();
  });
  document.addEventListener("keydown", onKeydown);

  getAdminHost().appendChild(root);
  requestAnimationFrame(() => {
    root.classList.add("is-open");
    body.querySelector<HTMLElement>("input, select, textarea, button")?.focus();
  });

  return { body, footer, close };
}