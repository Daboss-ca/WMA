/**
 * NotificationDrawer.ts
 * Right-side slide-out drawer. Call initNotificationDrawer() once at startup.
 *
 * Events (all on `window`):
 *   wma:open-notifications   -> opens the drawer
 *   wma:close-notifications  -> closes the drawer
 *   wma:notifications-updated -> re-renders the list while open
 */
import {
  NOTIFICATIONS_UPDATED_EVENT,
  getNotifications,
  getUnreadCount,
  markAllAsRead,
  markAsRead,
} from '../../state/notificationManager';
import type { AppNotification, NotificationType } from '../../state/notificationManager';

export const OPEN_NOTIFICATIONS_EVENT = 'wma:open-notifications';
export const CLOSE_NOTIFICATIONS_EVENT = 'wma:close-notifications';

declare global {
  interface WindowEventMap {
    'wma:open-notifications': CustomEvent<void>;
    'wma:close-notifications': CustomEvent<void>;
  }
}

/* ---------------------------------- Icons --------------------------------- */

const svg = (paths: string, size = 20): string =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths}</svg>`;

const ICONS: Record<NotificationType | 'bell' | 'close', string> = {
  order: svg(
    '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
  ),
  system: svg(
    '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  ),
  promo: svg(
    '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>',
  ),
  bell: svg(
    '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    28,
  ),
  close: svg('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'),
};

/* --------------------------------- Helpers -------------------------------- */

function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.round((timestamp - Date.now()) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 60) return 'Just now';
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour');
  if (abs < 7 * 86400) return rtf.format(Math.round(diffSec / 86400), 'day');
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function navigateTo(url: string): void {
  if (url.startsWith('#')) window.location.hash = url;
  else window.location.assign(url);
}

const requestClose = (): void => {
  window.dispatchEvent(new CustomEvent(CLOSE_NOTIFICATIONS_EVENT));
};

/* ---------------------------------- State --------------------------------- */

let backdrop: HTMLDivElement;
let drawer: HTMLDivElement;
let content: HTMLElement;
let countBadge: HTMLElement;
let markAllBtn: HTMLButtonElement;
let closeBtn: HTMLButtonElement;

let isMounted = false;
let isOpen = false;
let lastFocused: HTMLElement | null = null;

/* -------------------------------- Rendering ------------------------------- */

function buildItem(n: AppNotification): HTMLLIElement {
  const li = document.createElement('li');

  const btn = h('button', `notification-item${n.isRead ? '' : ' is-unread'}`);
  btn.type = 'button';
  btn.dataset.id = n.id;

  const icon = h('span', `notification-item__icon notification-item__icon--${n.type}`);
  icon.innerHTML = ICONS[n.type];

  const title = h('span', 'notification-item__title', n.title);
  if (!n.isRead) title.prepend(h('span', 'notification-visually-hidden', 'Unread: '));

  const time = h('time', 'notification-item__time', formatRelativeTime(n.timestamp));
  time.dateTime = new Date(n.timestamp).toISOString();

  const body = h('span', 'notification-item__body');
  body.append(title, h('span', 'notification-item__message', n.message), time);

  btn.append(icon, body);
  if (!n.isRead) {
    const dot = h('span', 'notification-item__dot');
    dot.setAttribute('aria-hidden', 'true');
    btn.append(dot);
  }

  li.append(btn);
  return li;
}

function buildEmptyState(): HTMLElement {
  const wrap = h('div', 'notification-empty');
  wrap.innerHTML = `
    <span class="notification-empty__icon">${ICONS.bell}</span>
    <h3 class="notification-empty__title">You're all caught up</h3>
    <p class="notification-empty__text">Order updates, payment confirmations and workshop news will show up here.</p>`;
  return wrap;
}

function render(): void {
  const items = getNotifications();
  const unread = getUnreadCount();

  // Remember which row had focus so a re-render doesn't drop it.
  const active = document.activeElement;
  const focusedId =
    active instanceof HTMLElement && content.contains(active)
      ? active.closest<HTMLElement>('[data-id]')?.dataset.id
      : undefined;

  countBadge.hidden = unread === 0;
  countBadge.textContent = String(unread);
  countBadge.setAttribute('aria-label', `${unread} unread`);
  markAllBtn.disabled = unread === 0;

  if (items.length === 0) {
    content.replaceChildren(buildEmptyState());
  } else {
    const list = h('ul', 'notification-list');
    list.append(...items.map(buildItem));
    content.replaceChildren(list);
  }

  if (focusedId) {
    content
      .querySelector<HTMLElement>(`[data-id="${CSS.escape(focusedId)}"]`)
      ?.focus({ preventScroll: true });
  }
}

/* ------------------------------ Open / close ------------------------------ */

function openDrawer(): void {
  if (isOpen) return;
  isOpen = true;
  lastFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;

  render(); // also refreshes the relative timestamps
  backdrop.classList.add('is-open');
  drawer.classList.add('is-open');
  document.body.classList.add('notifications-open');
  requestAnimationFrame(() => closeBtn.focus({ preventScroll: true }));
}

function closeDrawer(): void {
  if (!isOpen) return;
  isOpen = false;

  backdrop.classList.remove('is-open');
  drawer.classList.remove('is-open');
  document.body.classList.remove('notifications-open');

  if (lastFocused && document.contains(lastFocused)) lastFocused.focus({ preventScroll: true });
  lastFocused = null;
}

function handleKeydown(e: KeyboardEvent): void {
  if (!isOpen) return;

  if (e.key === 'Escape') {
    e.preventDefault();
    requestClose();
    return;
  }

  if (e.key !== 'Tab') return;

  // Keep keyboard focus inside the drawer while it's open.
  const focusables = Array.from(
    drawer.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]'),
  );
  if (focusables.length === 0) return;

  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  const current = document.activeElement;

  if (!(current instanceof Node) || !drawer.contains(current)) {
    e.preventDefault();
    first.focus();
  } else if (e.shiftKey && current === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && current === last) {
    e.preventDefault();
    first.focus();
  }
}

/* ---------------------------------- Mount --------------------------------- */

function mount(): void {
  backdrop = h('div', 'notification-backdrop');

  drawer = h('div', 'notification-drawer');
  drawer.setAttribute('role', 'dialog');
  drawer.setAttribute('aria-modal', 'true');
  drawer.setAttribute('aria-labelledby', 'notification-drawer-title');
  drawer.innerHTML = `
    <header class="notification-drawer__header">
      <div class="notification-drawer__heading">
        <h2 class="notification-drawer__title" id="notification-drawer-title">Notifications</h2>
        <span class="notification-drawer__count" hidden></span>
      </div>
      <div class="notification-drawer__actions">
        <button type="button" class="notification-drawer__mark-all">Mark all as read</button>
        <button type="button" class="notification-drawer__close" aria-label="Close notifications">${ICONS.close}</button>
      </div>
    </header>
    <div class="notification-drawer__body"></div>`;

  content = drawer.querySelector<HTMLElement>('.notification-drawer__body')!;
  countBadge = drawer.querySelector<HTMLElement>('.notification-drawer__count')!;
  markAllBtn = drawer.querySelector<HTMLButtonElement>('.notification-drawer__mark-all')!;
  closeBtn = drawer.querySelector<HTMLButtonElement>('.notification-drawer__close')!;

  backdrop.addEventListener('click', requestClose);
  closeBtn.addEventListener('click', requestClose);
  markAllBtn.addEventListener('click', markAllAsRead);

  // One delegated listener for every row.
  content.addEventListener('click', (e) => {
    const row = (e.target as HTMLElement).closest<HTMLElement>('.notification-item');
    const notification = getNotifications().find((n) => n.id === row?.dataset.id);
    if (!notification) return;

    markAsRead(notification.id);
    if (notification.actionUrl) {
      requestClose();
      navigateTo(notification.actionUrl);
    }
  });

  document.body.append(backdrop, drawer);
}

/** Mounts the drawer once and wires up its window events. Safe to call twice. */
export function initNotificationDrawer(): void {
  if (isMounted) return;
  isMounted = true;

  mount();

  window.addEventListener(OPEN_NOTIFICATIONS_EVENT, openDrawer);
  window.addEventListener(CLOSE_NOTIFICATIONS_EVENT, closeDrawer);
  window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, () => {
    if (isOpen) render();
  });
  window.addEventListener('keydown', handleKeydown);
}
