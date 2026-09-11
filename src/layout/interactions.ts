/**
 * Presentational interaction helpers shared across layout components.
 *
 * Everything here is purely visual: toggling a CSS class in response
 * to scroll/click/pointer events. None of it reads or writes
 * application/business state — it only ever touches the DOM it's
 * handed.
 */

/**
 * Toggles `site-header--scrolled` on the header once the page has
 * scrolled past `threshold`. Returns a cleanup function.
 */
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

/**
 * Wires a hamburger toggle button to open/close the mobile nav by
 * toggling `site-header--menu-open` on the header element.
 */
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

/**
 * Attaches a pointer-position ripple effect to any `.btn` element.
 * Purely decorative: sets the ripple origin via CSS custom
 * properties and toggles the animation class for one run.
 */
export function attachRipple(button: HTMLElement): () => void {
  const onPointerDown = (event: PointerEvent) => {
    const rect = button.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    button.style.setProperty("--ripple-x", `${x}%`);
    button.style.setProperty("--ripple-y", `${y}%`);

    button.classList.remove("btn--rippling");
    // Force reflow so the animation can restart on rapid re-clicks.
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

/** Convenience: attaches ripple to every `.btn` found within a root element. */
export function attachRippleToAll(root: ParentNode): void {
  root.querySelectorAll<HTMLElement>(".btn").forEach(attachRipple);
}
