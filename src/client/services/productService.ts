import { catalogItems } from "../data/furnitureData.js";
import { buildApiUrl } from "../config/api.js";
import { normalizeImagePath } from "../utils/imagePaths.js";
import type { FurnitureCategory, FurnitureDimensions, FurnitureItem } from "../types/furniture.js";
import type { ProductRealtimePayload } from "../config/supabase.js";

type ProductApiRow = {
  id?: string | number;
  title?: string;
  name?: string;
  category?: string;
  description?: string;
  price?: number | string;
  image_url?: string;
  imageUrl?: string;
  dimensions?: string | { width?: number; height?: number; depth?: number; unit?: "in" | "cm" };
  stock?: number | string;
};

function toNumber(value: unknown, fallback = 0): number {
  const numeric = Number(value ?? fallback);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function parseDimensions(raw: unknown): FurnitureDimensions {
  if (typeof raw === "string") {
    const match = raw.match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)(?:\s*(cm|in))?/i);

    if (match) {
      const [, width, height, depth, unit] = match;
      return {
        width: Number(width),
        height: Number(height),
        depth: Number(depth),
        unit: unit && unit.toLowerCase() === "in" ? "in" : "cm",
      };
    }

    return { width: 0, height: 0, depth: 0, unit: "in" };
  }

  if (typeof raw === "object" && raw) {
    const value = raw as Record<string, unknown>;
    const width = toNumber(value.width);
    const height = toNumber(value.height);
    const depth = toNumber(value.depth);
    const unit = value.unit === "in" ? "in" : "cm";

    return { width, height, depth, unit };
  }

  return { width: 0, height: 0, depth: 0, unit: "in" };
}

function normalizeCategory(rawCategory: unknown): FurnitureCategory {
  const category = String(rawCategory ?? "Custom").trim();

  if (/table/i.test(category)) return "Tables";
  if (/cabinet/i.test(category)) return "Cabinets";
  if (/kiosk/i.test(category)) return "Kiosks";

  return "Custom";
}

export function mapCatalogRow(row: ProductApiRow): FurnitureItem {
  const title = String(row.title ?? row.name ?? "Custom Item").trim() || "Custom Item";
  const price = toNumber(row.price);
  const imageUrl = normalizeImagePath(String(row.image_url ?? row.imageUrl ?? "").trim());

  return {
    id: String(row.id ?? title),
    name: title,
    category: normalizeCategory(row.category),
    description: String(row.description ?? `${title} handcrafted for everyday living.`),
    price,
    dimensions: parseDimensions(row.dimensions),
    imageUrl: imageUrl || catalogItems[0]?.imageUrl || "",
    imageAlt: title,
    inStock: toNumber(row.stock) > 0,
    isCustomizable: true,
  };
}

export function applyCatalogProductChange(
  current: FurnitureItem[],
  payload: ProductRealtimePayload
): FurnitureItem[] | null {
  const rawId = payload.new?.id ?? payload.old?.id;
  if (typeof rawId !== "string" && typeof rawId !== "number") return null;
  const id = String(rawId);

  if (payload.eventType === "DELETE") {
    return current.filter((item) => String(item.id) !== id);
  }

  if (!payload.new) return null;
  const product = mapCatalogRow(payload.new as ProductApiRow);
  const index = current.findIndex((item) => String(item.id) === id);
  if (index < 0) return [...current, product];

  return current.map((item, itemIndex) => itemIndex === index ? product : item);
}

export async function fetchCatalogProducts(): Promise<FurnitureItem[]> {
  try {
    const response = await fetch(buildApiUrl("/products"));
    if (!response.ok) {
      throw new Error(`Catalog fetch failed with status ${response.status}`);
    }

    const payload = await response.json();
    const rows = Array.isArray(payload)
      ? payload
      : Array.isArray((payload as { products?: ProductApiRow[] })?.products)
        ? (payload as { products: ProductApiRow[] }).products
        : [];

    if (!rows.length) {
      return catalogItems;
    }

    return rows.map(mapCatalogRow);
  } catch (error) {
    console.warn("Falling back to local catalog data:", error);
    return catalogItems;
  }
}
