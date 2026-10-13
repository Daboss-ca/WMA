import type { AdminStats, Order, OrderStatus, Product, ProductInput, TrendPoint } from "../types/admin.js";

const API_BASE = "http://localhost:5000/api/admin";
const REVENUE_STATUSES: readonly OrderStatus[] = ["to_ship", "shipping", "completed"];

/** Business rule: which status moves are allowed from each state. */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending_payment: ["to_ship", "cancelled"],
  to_ship: ["shipping", "cancelled"],
  shipping: ["completed"],
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
  private readonly listeners = new Set<Listener>();

  constructor() {
    void this.refreshAll();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      ...init,
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error ?? "Request failed.");
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
    this.orders = next.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    this.emit();
    return [...this.orders];
  }

  async refreshAll(): Promise<void> {
    await Promise.all([this.refreshProducts(), this.refreshOrders()]);
  }

  /* ---------- Products ---------- */

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
    await this.refreshProducts();
    return product;
  }

  async updateProduct(id: string, input: ProductInput): Promise<Product> {
    const product = await this.request<Product>(`/products/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(input),
    });
    await this.refreshProducts();
    return product;
  }

  async deleteProduct(id: string): Promise<void> {
    await this.request<{ success: boolean }>(`/products/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    this.products = this.products.filter((item) => item.id !== id);
    this.emit();
  }

  /* ---------- Orders ---------- */

  listOrders(): Order[] {
    return [...this.orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getOrder(id: string): Order | undefined {
    return this.orders.find((item) => item.id === id);
  }

  async updateOrderStatus(id: string, next: OrderStatus): Promise<Order> {
    const existing = this.orders.find((order) => order.id === id);
    if (!existing) throw new Error(`Order not found: ${id}`);

    if (!ORDER_STATUS_TRANSITIONS[existing.status].includes(next)) {
      throw new Error(`An order can't move from "${existing.status}" to "${next}".`);
    }

    const updated = await this.request<Order>(`/orders/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: next }),
    });

    this.orders = this.orders.map((order) => (order.id === id ? updated : order));
    this.emit();
    return updated;
  }

  /* ---------- Stats ---------- */

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

  resetDemoData(): void {
    this.products = [];
    this.orders = [];
    this.emit();
  }
}

export const adminStore = new AdminStore();