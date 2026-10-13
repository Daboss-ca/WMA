/* ---------- Catalog ---------- */

export const PRODUCT_CATEGORIES = ["Kiosk", "Table", "Cabinet", "Custom"] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export type DimensionUnit = "cm" | "in";

export interface ProductDimensions {
  width: number;
  height: number;
  depth: number;
  unit: DimensionUnit;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  category: ProductCategory;
  dimensions: ProductDimensions;
  /** Price in PHP. */
  price: number;
  /** Remote http(s) URL or a data: URL produced by a local file upload. */
  imageUrl: string;
  createdAt: string;
  updatedAt: string;
}

export type ProductInput = Omit<Product, "id" | "createdAt" | "updatedAt">;

/* ---------- Orders ---------- */

export const ORDER_STATUSES = ["pending_payment", "to_ship", "shipping", "completed", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface OrderCustomer {
  name: string;
  email: string;
  phone: string;
  address: string;
}

export interface OrderItem {
  productId: string;
  title: string;
  unitPrice: number;
  quantity: number;
}

export interface PaymentProof {
  fileName: string;
  dataUrl: string;
  referenceNo: string;
  submittedAt: string;
}

export interface OrderStatusEvent {
  status: OrderStatus;
  at: string;
}

export interface Order {
  id: string;
  reference: string;
  customer: OrderCustomer;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  paymentProof: PaymentProof | null;
  statusHistory: OrderStatusEvent[];
  createdAt: string;
  updatedAt: string;
}

/* ---------- Stats & navigation ---------- */

export interface TrendPoint {
  label: string;
  value: number;
}

export interface AdminStats {
  totalRevenue: number;
  totalProducts: number;
  totalOrders: number;
  pendingOrders: number;
  completedShipments: number;
  revenueTrend: TrendPoint[];
}

export type AdminRouteKey = "overview" | "products" | "orders";

export interface AdminPage {
  element: HTMLElement;
  destroy: () => void;
}