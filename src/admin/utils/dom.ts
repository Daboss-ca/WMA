const ENTITY_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ENTITY_MAP[char] ?? char);
}

export function fromHTML<T extends Element = HTMLElement>(markup: string): T {
  const template = document.createElement("template");
  template.innerHTML = markup.trim();
  return template.content.firstElementChild as T;
}

/** Overlays (modals, toasts) mount inside the admin app so admin-scoped styles apply. */
export function getAdminHost(): HTMLElement {
  return document.querySelector<HTMLElement>(".admin-app") ?? document.body;
}