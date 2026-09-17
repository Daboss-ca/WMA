/**
 * Data shapes consumed by the presentational layout components.
 * This file defines structure only — no fetching, no mutation,
 * no business rules. If a `furniture.ts` already exists in your
 * project, merge these members into it rather than replacing it
 * wholesale.
 */

export type FurnitureCategory =
  | "Tables"
  | "Cabinets"
  | "Kiosks"
  | "Custom";

export type FilterCategory = "All" | FurnitureCategory;

export interface FurnitureDimensions {
  width: number;
  height: number;
  depth: number;
  unit: "in" | "cm";
}

export interface FurnitureItem {
  id: string;
  name: string;
  category: FurnitureCategory;
  description: string;
  dimensions: FurnitureDimensions;
  imageUrl?: string;
  imageAlt?: string;
  isCustomizable?: boolean;
  inStock?: boolean;
}
