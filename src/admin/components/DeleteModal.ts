import { escapeHtml } from "../utils/dom.js";
import { openModal } from "./Modal.js";

export interface DeleteModalOptions {
  title?: string;
  itemName: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

/** Generic destructive confirmation. Used for deletes and for cancelling orders. */
export function openDeleteModal({
  title = "Delete item?",
  itemName,
  description = "This action can't be undone.",
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
}: DeleteModalOptions): void {
  let confirmed = false;

  const modal = openModal({
    title,
    eyebrow: "Confirm action",
    size: "sm",
    onClose: () => {
      if (!confirmed) onCancel?.();
    },
  });

  modal.body.innerHTML = `
    <p class="admin-muted">${escapeHtml(description)}</p>
    <div class="admin-callout admin-callout--danger"><strong>${escapeHtml(itemName)}</strong></div>`;

  modal.footer.innerHTML = `
    <button type="button" class="btn btn--ghost" data-modal-dismiss>Keep it</button>
    <button type="button" class="btn btn--danger" data-confirm>${escapeHtml(confirmLabel)}</button>`;

  modal.footer.querySelector<HTMLButtonElement>("[data-confirm]")?.addEventListener("click", () => {
    confirmed = true;
    modal.close();
    onConfirm();
  });
}