// The 14 allergens that EU Regulation 1169/2011 (and Spain's RD 126/2015)
// require restaurants to declare. Codes are stored on MenuItem.allergens;
// labels live in messages/*.json under "allergens.<code>".
export const ALLERGEN_CODES = [
  "gluten",
  "crustaceans",
  "eggs",
  "fish",
  "peanuts",
  "soy",
  "milk",
  "nuts",
  "celery",
  "mustard",
  "sesame",
  "sulphites",
  "lupin",
  "molluscs",
] as const;

export type AllergenCode = (typeof ALLERGEN_CODES)[number];

export function isAllergenCode(value: string): value is AllergenCode {
  return (ALLERGEN_CODES as readonly string[]).includes(value);
}
