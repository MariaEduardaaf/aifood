// Locale-aware number formatting (33.33 -> "33,3 %" in fr/es).
export const formatPercent = (value: number, locale: string) =>
  new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }).format(value / 100);

export const formatNumber = (value: number, locale: string, digits = 1) =>
  new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
