"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { ArrowLeft, ChevronRight, EyeOff, Plus, RefreshCw } from "lucide-react";
import { ALLERGEN_CODES, isAllergenCode, type AllergenCode } from "@/lib/allergens";
import { localizedText } from "@/lib/i18n/text";
import { cn, formatMoney } from "@/lib/utils";
import { AllergenIcon } from "./allergen-icon";
import { useCart } from "./cart-context";
import { Sheet } from "./sheet";
import { Stepper } from "./stepper";
import type { CategoryData, MenuData, MenuItemData } from "./types";

const HIDDEN_KEY = "aifood-hide-allergens";

// "Hide dishes containing" selection, kept for the browser session
function useHiddenAllergens() {
  const [hidden, setHidden] = useState<AllergenCode[]>([]);
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(HIDDEN_KEY) || "[]");
      if (Array.isArray(saved)) setHidden(saved.filter(isAllergenCode));
    } catch {
      // storage unavailable: start with no filter
    }
  }, []);
  const update = (next: AllergenCode[]) => {
    setHidden(next);
    try {
      sessionStorage.setItem(HIDDEN_KEY, JSON.stringify(next));
    } catch {
      // filter still works for this page view
    }
  };
  return [hidden, update] as const;
}

const knownAllergens = (codes: string[] | undefined) => (codes ?? []).filter(isAllergenCode);

function AllergenIcons({ codes, className }: { codes: AllergenCode[]; className?: string }) {
  const t = useTranslations("menu");
  const tA = useTranslations("allergens");
  if (codes.length === 0) return null;
  return (
    <div className={className}>
      <p className="sr-only">{t("contains", { list: codes.map((c) => tA(c)).join(", ") })}</p>
      <ul aria-hidden className="flex flex-wrap gap-1.5">
        {codes.map((code) => (
          <li
            key={code}
            title={tA(code)}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground/[0.07] text-foreground/75"
          >
            <AllergenIcon code={code} className="h-3.5 w-3.5" />
          </li>
        ))}
      </ul>
    </div>
  );
}

function CategoryTabs({
  categories,
  selected,
  onSelect,
  label,
}: {
  categories: CategoryData[];
  selected: string | null;
  onSelect: (id: string) => void;
  label: (c: CategoryData) => string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  const measure = () => {
    const el = ref.current;
    if (!el) return;
    setEdges({
      start: el.scrollLeft > 4,
      end: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
    });
  };

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [categories]);

  // Keep the active tab in view when it changes
  useEffect(() => {
    ref.current
      ?.querySelector<HTMLElement>('[aria-pressed="true"]')
      ?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [selected]);

  // Fade the edges that have more tabs behind them
  const mask =
    edges.start || edges.end
      ? `linear-gradient(to right, ${edges.start ? "transparent, #000 2rem" : "#000, #000"}, ${
          edges.end ? "#000 calc(100% - 3.5rem), transparent" : "#000"
        })`
      : undefined;

  return (
    <div className="relative">
      <div
        ref={ref}
        onScroll={measure}
        style={{ maskImage: mask, WebkitMaskImage: mask }}
        className="scrollbar-hide flex gap-1.5 overflow-x-auto px-4 pb-3"
      >
        {categories.map((category) => {
          const active = category.id === selected;
          return (
            <button
              key={category.id}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(category.id)}
              className={cn(
                "min-h-[44px] shrink-0 whitespace-nowrap rounded-full px-4 text-[0.9375rem] font-medium transition-colors",
                active
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground",
              )}
            >
              {label(category)}
            </button>
          );
        })}
      </div>
      {edges.end && (
        <ChevronRight
          aria-hidden
          className="pointer-events-none absolute right-1.5 top-3.5 h-4 w-4 text-muted-foreground"
        />
      )}
    </div>
  );
}

interface ItemText {
  name: string;
  description: string;
  price: string;
}

function ItemRow({
  item,
  text,
  ordering,
  quantity,
  onOpen,
  onQuantity,
}: {
  item: MenuItemData;
  text: ItemText;
  ordering: boolean;
  quantity: number;
  onOpen: () => void;
  onQuantity: (q: number) => void;
}) {
  const t = useTranslations("menu");
  const allergens = knownAllergens(item.allergens);

  return (
    <li className={cn("py-5", item.active === false && "opacity-60")}>
      <button
        type="button"
        onClick={onOpen}
        aria-haspopup="dialog"
        className="flex w-full gap-4 rounded-lg text-left"
      >
        <div className="min-w-0 flex-1">
          <h3 className="text-[1.0625rem] font-semibold leading-snug text-foreground">
            {text.name}
          </h3>
          {text.description && (
            <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {text.description}
            </p>
          )}
          <AllergenIcons codes={allergens} className="mt-2.5" />
        </div>
        {item.image_url && (
          <img
            src={item.image_url}
            alt=""
            loading="lazy"
            className="h-[5.5rem] w-[5.5rem] shrink-0 rounded-xl bg-foreground/[0.07] object-cover"
          />
        )}
      </button>

      <div className={cn("mt-2 flex items-center justify-between gap-3", ordering && "min-h-[44px]")}>
        <span className="text-base font-semibold tabular-nums text-price">{text.price}</span>
        {item.active === false ? (
          <span className="text-sm font-medium text-muted-foreground">{t("unavailable")}</span>
        ) : ordering ? (
          quantity === 0 ? (
            <button
              type="button"
              onClick={() => onQuantity(1)}
              aria-label={t("addItem", { name: text.name })}
              className="inline-flex h-11 items-center gap-1.5 rounded-full border border-primary/50 px-4 text-sm font-semibold text-price hover:bg-primary/10"
            >
              <Plus className="h-4 w-4" />
              {t("add")}
            </button>
          ) : (
            <Stepper value={quantity} onChange={onQuantity} name={text.name} />
          )
        ) : null}
      </div>
    </li>
  );
}

function ItemSheet({
  item,
  text,
  ordering,
  onClose,
  onAdd,
}: {
  item: MenuItemData;
  text: ItemText;
  ordering: boolean;
  onClose: () => void;
  onAdd: (quantity: number) => void;
}) {
  const t = useTranslations("menu");
  const tA = useTranslations("allergens");
  const locale = useLocale();
  const { currency } = useCart();
  const [quantity, setQuantity] = useState(1);
  const allergens = knownAllergens(item.allergens);

  return (
    <Sheet
      title={text.name}
      onClose={onClose}
      media={
        item.image_url ? (
          <img src={item.image_url} alt={text.name} className="aspect-[4/3] w-full bg-foreground/[0.07] object-cover" />
        ) : null
      }
      footer={
        ordering && item.active !== false
          ? (close) => (
              <div className="flex items-center gap-3">
                <Stepper value={quantity} onChange={setQuantity} min={1} name={text.name} />
                <button
                  type="button"
                  onClick={() => {
                    onAdd(quantity);
                    close();
                  }}
                  className="flex h-12 flex-1 items-center justify-between gap-3 rounded-full bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  <span>{t("addToOrder")}</span>
                  <span className="tabular-nums">
                    {formatMoney(Number(item.price) * quantity, currency, locale)}
                  </span>
                </button>
              </div>
            )
          : undefined
      }
    >
      <h2 className={cn("text-2xl font-semibold leading-tight tracking-tight", !item.image_url && "pr-12")}>
        {text.name}
      </h2>
      <p className="mt-1.5 text-lg font-semibold tabular-nums text-price">{text.price}</p>
      {item.active === false && (
        <p className="mt-2 text-sm font-medium text-muted-foreground">{t("unavailable")}</p>
      )}
      {text.description && (
        <p className="mt-4 max-w-prose text-[0.9375rem] leading-relaxed text-foreground/85">
          {text.description}
        </p>
      )}

      <section className="mt-6">
        <h3 className="text-sm font-semibold text-foreground">{t("allergensTitle")}</h3>
        {allergens.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {allergens.map((code) => (
              <li
                key={code}
                className="inline-flex items-center gap-2 rounded-full bg-foreground/[0.07] px-3 py-1.5 text-sm text-foreground"
              >
                <AllergenIcon code={code} className="h-4 w-4 text-price" />
                {tA(code)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("noAllergensListed")}</p>
        )}
      </section>
    </Sheet>
  );
}

function AllergenSheet({
  hidden,
  onChange,
  onClose,
}: {
  hidden: AllergenCode[];
  onChange: (next: AllergenCode[]) => void;
  onClose: () => void;
}) {
  const t = useTranslations("menu");
  const tA = useTranslations("allergens");

  return (
    <Sheet
      title={t("allergensTitle")}
      onClose={onClose}
      footer={(close) => (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => onChange([])}
            disabled={hidden.length === 0}
            className="h-12 flex-1 rounded-full border border-border font-semibold text-foreground hover:bg-foreground/[0.06] disabled:opacity-40"
          >
            {t("showAll")}
          </button>
          <button
            type="button"
            onClick={close}
            className="h-12 flex-1 rounded-full bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {t("done")}
          </button>
        </div>
      )}
    >
      <h2 className="pr-12 text-2xl font-semibold leading-tight tracking-tight">{t("allergensTitle")}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("filterHint")}</p>
      <ul className="mt-5 grid grid-cols-2 gap-2">
        {ALLERGEN_CODES.map((code) => {
          const on = hidden.includes(code);
          return (
            <li key={code}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => onChange(on ? hidden.filter((c) => c !== code) : [...hidden, code])}
                className={cn(
                  "flex min-h-[48px] w-full items-center gap-2.5 rounded-xl border px-3 text-left text-sm font-medium transition-colors",
                  on
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-card text-foreground hover:bg-foreground/[0.06]",
                )}
              >
                <AllergenIcon code={code} className="h-5 w-5 shrink-0 text-price" />
                <span className="flex-1">{tA(code)}</span>
                {on && (
                  <>
                    <EyeOff aria-hidden className="h-4 w-4 shrink-0 text-price" />
                    <span className="sr-only">{t("hiddenState")}</span>
                  </>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-5 rounded-xl bg-foreground/[0.07] px-4 py-3 text-sm leading-relaxed text-foreground/85">
        {t("allergenDisclaimer")}
      </p>
    </Sheet>
  );
}

function MenuSkeleton() {
  return (
    <div aria-hidden className="space-y-6 pt-6">
      <div className="shimmer h-6 w-40 rounded-md" />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex gap-4">
          <div className="flex-1 space-y-2.5">
            <div className="shimmer h-4 w-2/3 rounded" />
            <div className="shimmer h-3 w-full rounded" />
            <div className="shimmer h-3 w-1/2 rounded" />
            <div className="shimmer mt-3 h-4 w-16 rounded" />
          </div>
          <div className="shimmer h-[5.5rem] w-[5.5rem] rounded-xl" />
        </div>
      ))}
    </div>
  );
}

interface MenuViewProps {
  menu: MenuData | null;
  error: boolean;
  onRetry: () => void;
  restaurantName: string;
  onBack: () => void;
  onOpenCart: () => void;
}

export function MenuView({ menu, error, onRetry, restaurantName, onBack, onOpenCart }: MenuViewProps) {
  const t = useTranslations("menu");
  const tA = useTranslations("allergens");
  const locale = useLocale();
  const { items: cartItems, addItem, updateQuantity, itemCount, total, currency } = useCart();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [openItem, setOpenItem] = useState<MenuItemData | null>(null);
  const [showAllergens, setShowAllergens] = useState(false);
  const [hidden, setHidden] = useHiddenAllergens();

  const categories = menu?.categories ?? [];
  const fallback = menu?.settings.default_locale ?? locale;
  const ordering = menu?.settings.ordering_enabled ?? false;

  useEffect(() => {
    if (!selectedCategory && categories.length > 0) setSelectedCategory(categories[0].id);
  }, [categories, selectedCategory]);

  const textOf = (item: MenuItemData): ItemText => ({
    name: localizedText(item.names, locale, fallback),
    description: localizedText(item.descriptions, locale, fallback),
    price: formatMoney(item.price, currency, locale),
  });

  const quantityOf = (id: string) => cartItems.find((c) => c.menuItem.id === id)?.quantity ?? 0;

  const setQuantity = (item: MenuItemData, quantity: number) => {
    if (quantityOf(item.id) === 0) {
      addItem({ id: item.id, names: item.names, price: item.price, image_url: item.image_url }, quantity);
    } else {
      updateQuantity(item.id, quantity);
    }
  };

  const current = categories.find((c) => c.id === selectedCategory);
  const visibleItems = (current?.items ?? []).filter(
    (item) => !knownAllergens(item.allergens).some((a) => hidden.includes(a)),
  );
  const hiddenCount = (current?.items.length ?? 0) - visibleItems.length;

  return (
    <div className={cn("min-h-screen bg-background", ordering && itemCount > 0 ? "pb-32" : "pb-12")}>
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-2 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={onBack}
            aria-label={t("back")}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-foreground/[0.06]"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-muted-foreground">{restaurantName}</p>
            <h1 className="text-lg font-semibold leading-tight tracking-tight">{t("title")}</h1>
          </div>
          <button
            type="button"
            onClick={() => setShowAllergens(true)}
            aria-haspopup="dialog"
            className="relative inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-border bg-card px-3.5 text-sm font-medium text-foreground hover:bg-foreground/[0.06]"
          >
            <AllergenIcon code="gluten" className="h-4 w-4 text-price" />
            {t("allergensTitle")}
            {hidden.length > 0 && (
              <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1 text-xs font-semibold tabular-nums text-primary-foreground">
                <span className="sr-only">{t("hiddenCount", { count: hidden.length })}</span>
                <span aria-hidden>{hidden.length}</span>
              </span>
            )}
          </button>
        </div>

        <div className="mx-auto max-w-2xl">
          {categories.length > 1 && (
            <CategoryTabs
              categories={categories}
              selected={selectedCategory}
              onSelect={(id) => {
                setSelectedCategory(id);
                window.scrollTo({ top: 0 });
              }}
              label={(c) => localizedText(c.names, locale, fallback)}
            />
          )}
          {hidden.length > 0 && (
            <div className="flex items-center gap-2 px-4 pb-3 text-sm text-foreground/85">
              <EyeOff aria-hidden className="h-4 w-4 shrink-0 text-price" />
              <p className="min-w-0 flex-1 truncate">
                {t("hidingWith", { list: hidden.map((c) => tA(c)).join(", ") })}
              </p>
              <button
                type="button"
                onClick={() => setHidden([])}
                className="-my-2 min-h-[44px] shrink-0 px-2 font-semibold text-price underline underline-offset-4"
              >
                {t("showAll")}
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4">
        {error ? (
          <div className="py-20 text-center">
            <p className="text-lg font-semibold text-foreground">{t("loadError")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("loadErrorHint")}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 font-semibold text-primary-foreground"
            >
              <RefreshCw className="h-4 w-4" />
              {t("retry")}
            </button>
          </div>
        ) : !menu ? (
          <MenuSkeleton />
        ) : categories.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-lg font-semibold text-foreground">{t("empty")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("emptyHint")}</p>
          </div>
        ) : current ? (
          <section aria-labelledby="category-title">
            <h2 id="category-title" className="pt-6 text-xl font-semibold tracking-tight text-foreground">
              {localizedText(current.names, locale, fallback)}
            </h2>
            {visibleItems.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-foreground">
                  {current.items.length === 0 ? t("noItems") : t("allHidden")}
                </p>
                {hiddenCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setHidden([])}
                    className="mt-4 h-11 rounded-full border border-border px-5 text-sm font-semibold hover:bg-foreground/[0.06]"
                  >
                    {t("showAll")}
                  </button>
                )}
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {visibleItems.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    text={textOf(item)}
                    ordering={ordering}
                    quantity={quantityOf(item.id)}
                    onOpen={() => setOpenItem(item)}
                    onQuantity={(q) => setQuantity(item, q)}
                  />
                ))}
              </ul>
            )}
            {hiddenCount > 0 && visibleItems.length > 0 && (
              <p className="border-t border-border py-5 text-center text-sm text-muted-foreground">
                {t("hiddenDishes", { count: hiddenCount })}
              </p>
            )}
          </section>
        ) : null}
      </main>

      {ordering && itemCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onOpenCart}
            className="mx-auto flex h-14 w-full max-w-2xl items-center gap-3 rounded-full bg-primary pl-2 pr-5 text-primary-foreground shadow-[0_8px_24px_-6px_rgba(0,0,0,0.35)] hover:bg-primary/95"
          >
            <span className="flex h-10 min-w-[2.5rem] items-center justify-center rounded-full bg-primary-foreground/15 px-2 font-semibold tabular-nums">
              {itemCount}
            </span>
            <span className="flex-1 text-left font-semibold">{t("viewOrder")}</span>
            <span className="font-semibold tabular-nums">{formatMoney(total, currency, locale)}</span>
          </button>
        </div>
      )}
      <p aria-live="polite" className="sr-only">
        {ordering && itemCount > 0 ? t("cartStatus", { count: itemCount }) : ""}
      </p>

      {openItem && (
        <ItemSheet
          item={openItem}
          text={textOf(openItem)}
          ordering={ordering}
          onClose={() => setOpenItem(null)}
          onAdd={(q) => setQuantity(openItem, quantityOf(openItem.id) + q)}
        />
      )}
      {showAllergens && (
        <AllergenSheet hidden={hidden} onChange={setHidden} onClose={() => setShowAllergens(false)} />
      )}
    </div>
  );
}
