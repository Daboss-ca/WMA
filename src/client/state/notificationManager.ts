
export const NOTIFICATIONS_UPDATED_EVENT = 'wma:notifications-updated';

export type NotificationType = 'order' | 'system' | 'promo';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  isRead: boolean;
  actionUrl?: string;
}

export interface NotificationsUpdatedDetail {
  unreadCount: number;
  total: number;
}

declare global {
  interface WindowEventMap {
    'wma:notifications-updated': CustomEvent<NotificationsUpdatedDetail>;
  }
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const notifications: AppNotification[] = [
  {
    id: 'n-001',
    type: 'order',
    title: 'Your Oak Dining Table is in production',
    message:
      'Our craftsmen have started cutting and joining the solid oak top. Estimated completion is in about 12 days.',
    timestamp: Date.now() - 25 * MINUTE,
    isRead: false,
    actionUrl: '#orders',
  },
  {
    id: 'n-002',
    type: 'order',
    title: 'Payment received',
    message:
      'We received your 50% deposit for the Oak Dining Table. A receipt has been added to your order.',
    timestamp: Date.now() - 3 * HOUR,
    isRead: false,
    actionUrl: '#orders',
  },
  {
    id: 'n-003',
    type: 'system',
    title: 'Password changed',
    message:
      'Your account password was updated. Not you? Contact our support team right away.',
    timestamp: Date.now() - (DAY + 2 * HOUR),
    isRead: true,
  },
  {
    id: 'n-004',
    type: 'promo',
    title: 'Walnut season: 10% off custom cabinets',
    message:
      'Book a design consultation this month and take 10% off any custom cabinet build.',
    timestamp: Date.now() - 3 * DAY,
    isRead: true,
    actionUrl: '#catalog',
  },
];

function emitUpdate(): void {
  window.dispatchEvent(
    new CustomEvent<NotificationsUpdatedDetail>(NOTIFICATIONS_UPDATED_EVENT, {
      detail: { unreadCount: getUnreadCount(), total: notifications.length },
    }),
  );
}

export function getNotifications(): AppNotification[] {
  return notifications
    .map((n) => ({ ...n }))
    .sort((a, b) => b.timestamp - a.timestamp);
}

export function getUnreadCount(): number {
  return notifications.filter((n) => !n.isRead).length;
}

export function markAsRead(id: string): void {
  const target = notifications.find((n) => n.id === id);
  if (!target || target.isRead) return;
  target.isRead = true;
  emitUpdate();
}

export function markAllAsRead(): void {
  if (getUnreadCount() === 0) return;
  notifications.forEach((n) => {
    n.isRead = true;
  });
  emitUpdate();
}

export const notificationManager = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
