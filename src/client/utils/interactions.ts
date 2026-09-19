import { toggleTheme, applyTheme, getInitialTheme, type Theme } from "../utils/theme";

export function initHeaderScrollEffect(
  header: HTMLElement,
  threshold = 24
): () => void {
  const onScroll = () => {
    header.classList.toggle("site-header--scrolled", window.scrollY > threshold);
  };

  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
  return () => window.removeEventListener("scroll", onScroll);
}

export function initMobileNavToggle(
  header: HTMLElement,
  toggleButton: HTMLElement
): () => void {
  const onClick = () => {
    const isOpen = header.classList.toggle("site-header--menu-open");
    toggleButton.setAttribute("aria-expanded", String(isOpen));
  };

  toggleButton.addEventListener("click", onClick);
  return () => toggleButton.removeEventListener("click", onClick);
}

export function initThemeToggle(button: HTMLElement): () => void {
  const updateIconAndLabel = (theme: Theme) => {
    button.setAttribute("aria-label", `Switch to ${theme === "light" ? "dark" : "light"} mode`);
    button.innerHTML = theme === "dark" 
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
  };

  const initialTheme = getInitialTheme();
  applyTheme(initialTheme);
  updateIconAndLabel(initialTheme);

  const onClick = () => {
    const newTheme = toggleTheme();
    updateIconAndLabel(newTheme);
  };

  button.addEventListener("click", onClick);
  return () => button.removeEventListener("click", onClick);
}

export function attachRipple(button: HTMLElement): () => void {
  const onPointerDown = (event: PointerEvent) => {
    const rect = button.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    button.style.setProperty("--ripple-x", `${x}%`);
    button.style.setProperty("--ripple-y", `${y}%`);

    button.classList.remove("btn--rippling");
    void button.offsetWidth;
    button.classList.add("btn--rippling");
  };

  const onAnimationEnd = () => button.classList.remove("btn--rippling");

  button.addEventListener("pointerdown", onPointerDown);
  button.addEventListener("animationend", onAnimationEnd);

  return () => {
    button.removeEventListener("pointerdown", onPointerDown);
    button.removeEventListener("animationend", onAnimationEnd);
  };
}

export function attachRippleToAll(root: ParentNode): void {
  root.querySelectorAll<HTMLElement>(".btn").forEach(attachRipple);
}