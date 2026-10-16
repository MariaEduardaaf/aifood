import type { AllergenCode } from "@/lib/allergens";

// Admin-side icons for the 14 EU allergens. Emoji keep this dependency free
// (lucide has no allergen set); always render next to the translated label.
export const ALLERGEN_ICONS: Record<AllergenCode, string> = {
  gluten: "🌾",
  crustaceans: "🦐",
  eggs: "🥚",
  fish: "🐟",
  peanuts: "🥜",
  soy: "🫘",
  milk: "🥛",
  nuts: "🌰",
  celery: "🥬",
  mustard: "🟡",
  sesame: "⚪",
  sulphites: "🍷",
  lupin: "🌼",
  molluscs: "🐚",
};
