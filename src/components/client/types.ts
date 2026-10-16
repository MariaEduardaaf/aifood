// Shapes of the public guest API (GET /api/menu?table=<qr_token>).
export type LocaleMap = Record<string, string>;

export interface MenuItemData {
  id: string;
  names: LocaleMap;
  descriptions: LocaleMap;
  price: number | string;
  image_url: string | null;
  allergens: string[];
  // Absent when the API already filters out unavailable items
  active?: boolean;
}

export interface CategoryData {
  id: string;
  names: LocaleMap;
  items: MenuItemData[];
}

export interface GuestSettings {
  currency: string;
  enabled_locales: string[];
  default_locale: string;
  ordering_enabled: boolean;
}

export interface MenuData {
  restaurant: { name: string };
  settings: GuestSettings;
  categories: CategoryData[];
}
