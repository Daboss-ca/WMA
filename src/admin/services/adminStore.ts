import type { AdminStats, Order, OrderStatus, Product, ProductInput, TrendPoint } from "../types/admin.js";
import { buildApiUrl } from "../../client/config/api.js";
import { subscribeToOrdersRealtime, SUPABASE_ORDERS_CHANNEL, type OrderRealtimePayload } from "../../client/config/supabase.js";

const REVENUE_STATUSES: readonly OrderStatus[] = ["to_ship", "shipping", "completed"];

export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending_payment: ["to_ship", "cancelled"],
  to_ship: ["shipping", "cancelled"],
  shipping: [],
  completed: [],
  cancelled: [],
};

export class AdminStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminStorageError";
  }
}

type Listener = () => void;

const sum = (values: number[]): number => values.reduce((total, value) => total + value, 0);

function buildRevenueTrend(orders: Order[], days = 7): TrendPoint[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Array.from({ length: days }, (_, index) => {
    const start = new Date(today);
    start.setDate(today.getDate() - (days - 1 - index));
    const end = new Date(start);
    end.setDate(start.getDate() + 1);

    const value = sum(
      orders
        .filter((order) => {
          const time = new Date(order.createdAt).getTime();
          return time >= start.getTime() && time < end.getTime();
        })
        .map((order) => order.total)
    );

    return { label: start.toLocaleDateString("en-PH", { weekday: "short" }), value };
  });
}

class AdminStore {
  private products: Product[] = [];
  private orders: Order[] = [];
  private readonly userId = "admin-wma";
  private readonly listeners = new Set<Listener>();
  private realtimeUnsubscribe: (() => void) | null = null;
  private realtimeRefreshTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.startRealtimeSync();
    this.refreshAll().catch((error) => {
      console.error("[adminStore] initial load failed:", error);
    });
  }

  private requireUserId(): string {
    return this.userId;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private scheduleOrdersRefresh(payload: OrderRealtimePayload): void {
    if (payload.table !== "orders" || !["INSERT", "UPDATE", "DELETE"].includes(payload.eventType)) return;

    if (this.realtimeRefreshTimer) clearTimeout(this.realtimeRefreshTimer);
    this.realtimeRefreshTimer = setTimeout(() => {
      this.realtimeRefreshTimer = null;
      void this.refreshOrders().catch((error) => {
        console.error("[adminStore] realtime order list refresh failed:", error);
      });
    }, 75);
  }

  startRealtimeSync(): () => void {
    if (this.realtimeUnsubscribe) {
      return () => this.stopRealtimeSync();
    }

    this.realtimeUnsubscribe = subscribeToOrdersRealtime((payload) => {
      console.log("[adminStore] refreshing full order state after payload:", payload);
      this.scheduleOrdersRefresh(payload);
    }, SUPABASE_ORDERS_CHANNEL);

    return () => this.stopRealtimeSync();
  }

  stopRealtimeSync(): void {
    if (this.realtimeRefreshTimer) {
      clearTimeout(this.realtimeRefreshTimer);
      this.realtimeRefreshTimer = null;
    }
    if (!this.realtimeUnsubscribe) {
      return;
    }

    this.realtimeUnsubscribe();
    this.realtimeUnsubscribe = null;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const userId = this.requireUserId();
    const normalizedPath = path.startsWith("/admin") ? path : `/admin${path.startsWith("/") ? path : `/${path}`}`;
    const url = new URL(buildApiUrl(normalizedPath));
    url.searchParams.set("user_id", userId);

    const { headers, ...rest } = init ?? {};
    const response = await fetch(url.toString(), {
      ...rest,
      headers: {
        "Content-Type": "application/json",
        ...(headers ?? {}),
      },
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new AdminStorageError(payload?.error ?? `Request failed (${response.status}).`);
    }

    return (await response.json()) as T;
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }

  async refreshProducts(): Promise<Product[]> {
    const next = await this.request<Product[]>("/products");
    this.products = next.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    this.emit();
    return [...this.products];
  }

  async refreshOrders(): Promise<Order[]> {
    const next = await this.request<Order[]>("/orders");
    this.orders = next.sort((_a, b) => new Date(b.createdAt).getTime() - new Date(b.createdAt).getTime());
    this.emit();
    return [...this.orders];
  }

  async refreshAll(): Promise<void> {
    await Promise.all([this.refreshProducts(), this.refreshOrders()]);
  }

  listProducts(): Product[] {
    return [...this.products].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  getProduct(id: string): Product | undefined {
    return this.products.find((item) => item.id === id);
  }

  async createProduct(input: ProductInput): Promise<Product> {
    const product = await this.request<Product>("/products", {
      method: "POST",
      body: JSON.stringify(input),
    });
    this.products = [product, ...this.products.filter((item) => item.id !== product.id)];
    this.emit();
    return product;
  }

  async updateProduct(id: string, input: ProductInput): Promise<Product> {
    const product = await this.request<Product>(`/products/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(input),
    });
    this.products = this.products.map((item) => item.id === id ? product : item);
    this.emit();
    return product;
  }

  async deleteProduct(id: string): Promise<void> {
    await this.request<{ success: boolean }>(`/products/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    this.products = this.products.filter((item) => item.id !== id);
    this.emit();
  }

  listOrders(): Order[] {
    return [...this.orders].sort((_a, b) => new Date(b.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  getOrder(id: string): Order | undefined {
    return this.orders.find((item) => item.id === id);
  }

  async updateOrderStatus(id: string, next: OrderStatus): Promise<Order> {
    const existing = this.orders.find((order) => order.id === id);
    if (!existing) throw new AdminStorageError(`Order not found: ${id}`);

    if (existing.status === next) return existing;

    const allowedNext = ORDER_STATUS_TRANSITIONS[existing.status] ?? [];
    if (!allowedNext.includes(next)) {
      throw new AdminStorageError(`An order can't move from "${existing.status}" to "${next}".`);
    }

    const updated = await this.request<Order>(`/orders/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: next }),
    });

    await this.refreshOrders();
    return this.orders.find((order) => order.id === id) ?? updated;
  }

  getStats(): AdminStats {
    const orders = this.listOrders();
    const products = this.listProducts();
    const revenueOrders = orders.filter((order) => REVENUE_STATUSES.includes(order.status));

    return {
      totalRevenue: sum(revenueOrders.map((order) => order.total)),
      totalProducts: products.length,
      totalOrders: orders.length,
      pendingOrders: orders.filter((order) => order.status === "pending_payment").length,
      completedShipments: orders.filter((order) => order.status === "completed").length,
      revenueTrend: buildRevenueTrend(revenueOrders),
    };
  }

}

export const adminStore = new AdminStore();
