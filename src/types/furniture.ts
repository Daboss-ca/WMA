export type FurnitureCategory = 'tables' | 'cabinets' | 'kiosks' | 'chairs' | 'custom';

export interface FurnitureItem {
  id: string;
  name: string;
  category: FurnitureCategory;
  description: string;
  dimensions?: string;
  imageUrl: string;
  isCustomizable: boolean;
}