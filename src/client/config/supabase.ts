import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Vite exposes env vars prefixed with VITE_ through import.meta.env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Realtime is disabled."
  );
}

export const SUPABASE_ORDERS_CHANNEL = "orders-sync";
export const SUPABASE_ORDERS_TABLE = "orders";
export const SUPABASE_PRODUCTS_CHANNEL = "products-sync";
export const SUPABASE_PRODUCTS_TABLE = "products";

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      })
    : null;

/* ---------- Types ---------- */

export type OrderRow = Record<string, unknown>;

export type OrderEventType = "INSERT" | "UPDATE" | "DELETE";

export type OrderRealtimePayload = {
  eventType: OrderEventType;
  /** Row after the change. null for DELETE. */
  new: OrderRow | null;
  /** Row before the change. null for INSERT. Full row only if REPLICA IDENTITY FULL is set. */
  old: OrderRow | null;
  table: string;
  schema: string;
  commitTimestamp: string | null;
};

export type ProductRealtimePayload = Omit<OrderRealtimePayload, "table"> & { table: "products" };

/** Shape of the raw payload sent by supabase-js for postgres_changes events. */
type RawPostgresChange = {
  schema?: string;
  table?: string;
  eventType?: string;
  new?: Record<string, unknown>;
  old?: Record<string, unknown>;
  commit_timestamp?: string;
};

/* ---------- Helpers ---------- */

/** Returns the row object, or null when the value is missing or empty (e.g. `{}` on DELETE). */
function toRow(value: unknown): OrderRow | null {
  if (typeof value !== "object" || value === null) return null;
  if (Object.keys(value).length === 0) return null;
  return value as OrderRow;
}

/** Validates and normalizes a raw Realtime payload. Returns null for anything we should ignore. */
export function normalizeOrderPayload(raw: unknown): OrderRealtimePayload | null {
  if (typeof raw !== "object" || raw === null) return null;

  const payload = raw as RawPostgresChange;

  const table = payload.table ?? SUPABASE_ORDERS_TABLE;
  if (table !== SUPABASE_ORDERS_TABLE) return null;

  const eventType = payload.eventType;
  if (eventType !== "INSERT" && eventType !== "UPDATE" && eventType !== "DELETE") {
    return null;
  }

  return {
    eventType,
    new: eventType === "DELETE" ? null : toRow(payload.new),
    old: eventType === "INSERT" ? null : toRow(payload.old),
    table,
    schema: payload.schema ?? "public",
    commitTimestamp: payload.commit_timestamp ?? null,
  };
}

export function normalizeProductPayload(raw: unknown): ProductRealtimePayload | null {
  if (typeof raw !== "object" || raw === null) return null;

  const payload = raw as RawPostgresChange;
  const table = payload.table ?? SUPABASE_PRODUCTS_TABLE;
  const eventType = payload.eventType;
  if (table !== SUPABASE_PRODUCTS_TABLE) return null;
  if (eventType !== "INSERT" && eventType !== "UPDATE" && eventType !== "DELETE") return null;

  return {
    eventType,
    new: eventType === "DELETE" ? null : toRow(payload.new),
    old: eventType === "INSERT" ? null : toRow(payload.old),
    table: SUPABASE_PRODUCTS_TABLE,
    schema: payload.schema ?? "public",
    commitTimestamp: payload.commit_timestamp ?? null,
  };
}

/* ---------- Realtime subscription ---------- */

/**
 * Subscribes to INSERT, UPDATE and DELETE events on public.orders.
 * Returns an unsubscribe function. Call it on component unmount.
 */
export function subscribeToOrdersRealtime(
  onOrderChange: (payload: OrderRealtimePayload) => void,
  channelName: string = SUPABASE_ORDERS_CHANNEL
): () => void {
  const client = supabase;

  if (!client) {
    console.warn("[Realtime] Supabase client is not initialized. Skipping subscription.");
    return () => undefined;
  }

  // Unique topic per subscription avoids collisions under StrictMode or hot reload.
  const topic = `${channelName}-${Math.random().toString(36).slice(2, 10)}`;
  console.log("[Realtime] Subscribing to orders channel:", topic);

  const channel = client.channel(topic);

  channel.on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: SUPABASE_ORDERS_TABLE,
    },
    (payload: unknown) => {
      const normalized = normalizeOrderPayload(payload);
      if (!normalized) return;

      console.log("[Realtime] orders change received:", normalized.eventType, normalized);
      onOrderChange(normalized);
    }
  );

  channel.subscribe((status, err) => {
    switch (status as string) {
      case "SUBSCRIBED":
        console.log("[Realtime] Successfully subscribed to public.orders");
        break;
      case "CHANNEL_ERROR":
        console.error("[Realtime] orders channel error:", err);
        break;
      case "TIMED_OUT":
        console.warn("[Realtime] orders channel timed out. Check your connection and Realtime settings.");
        break;
      case "CLOSED":
        console.warn("[Realtime] orders channel closed.");
        break;
      default:
        console.log("[Realtime] orders channel status:", status);
    }
  });

  return () => {
    void client.removeChannel(channel);
  };
}

export function subscribeToProductsRealtime(
  onProductChange: (payload: ProductRealtimePayload) => void,
  channelName: string = SUPABASE_PRODUCTS_CHANNEL
): () => void {
  const client = supabase;
  if (!client) {
    console.warn("[Realtime] Supabase client is not initialized. Skipping products subscription.");
    return () => undefined;
  }

  const topic = `${channelName}-${Math.random().toString(36).slice(2, 10)}`;
  console.log("[Realtime] Subscribing to products channel:", topic);
  const channel = client.channel(topic);

  channel.on(
    "postgres_changes",
    { event: "*", schema: "public", table: SUPABASE_PRODUCTS_TABLE },
    (payload: unknown) => {
      const normalized = normalizeProductPayload(payload);
      if (!normalized) return;
      console.log("[Realtime] products change received:", normalized.eventType, normalized);
      onProductChange(normalized);
    }
  );

  channel.subscribe((status, err) => {
    switch (status as string) {
      case "SUBSCRIBED":
        console.log("[Realtime] Successfully subscribed to public.products");
        break;
      case "CHANNEL_ERROR":
        console.error("[Realtime] products channel error:", err);
        break;
      case "TIMED_OUT":
        console.warn("[Realtime] products channel timed out. Check your connection and Realtime settings.");
        break;
      case "CLOSED":
        console.warn("[Realtime] products channel closed.");
        break;
      default:
        console.log("[Realtime] products channel status:", status);
    }
  });

  return () => {
    void client.removeChannel(channel);
  };
}
