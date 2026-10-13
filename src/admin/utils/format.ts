import type { OrderStatus, ProductDimensions } from "../types/admin.js";

const currency = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});
const dateTime = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short" });
const shortDate = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" });

export const formatCurrency = (value: number): string => currency.format(value);
export const formatDateTime = (iso: string): string => dateTime.format(new Date(iso));
export const formatDate = (iso: string): string => shortDate.format(new Date(iso));

export const formatDimensions = ({ width, height, depth, unit }: ProductDimensions): string =>
  `${width} × ${height} × ${depth} ${unit}`;

export const createId = (prefix: string): string => {
  const uuid =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${uuid}`;
};

export type StatusTone = "warning" | "info" | "accent" | "success" | "danger";

export const ORDER_STATUS_META: Record<OrderStatus, { label: string; tone: StatusTone }> = {
  pending_payment: { label: "Pending / To Pay", tone: "warning" },
  to_ship: { label: "To Ship", tone: "info" },
  shipping: { label: "Shipping", tone: "accent" },
  completed: { label: "Completed", tone: "success" },
  cancelled: { label: "Cancelled", tone: "danger" },
};

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}