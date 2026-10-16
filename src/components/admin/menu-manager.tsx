"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { readApiError } from "./api-errors";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Image as ImageIcon,
  X,
  Check,
  FolderOpen,
  ChevronUp,
  ChevronDown,
  Upload,
} from "lucide-react";
import { ImageUpload } from "@/components/ui/image-upload";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { formatMoney } from "@/lib/utils";
import { ALLERGEN_CODES, type AllergenCode } from "@/lib/allergens";
import { localizedText } from "@/lib/i18n/text";
import { AllergenIcon } from "@/components/client/allergen-icon";
import { MenuImportDialog } from "./menu-import-dialog";

type TextMap = Record<string, string>;

interface MenuItem {
  id: string;
  category_id: string;
  names: TextMap;
  descriptions: TextMap;
  price: number | string;
  image_url: string | null;
  allergens: string[];
  active: boolean;
  order: number;
}

interface Category {
  id: string;
  names: TextMap;
  order: number;
  active: boolean;
  items: MenuItem[];
}

interface MenuSettings {
  default_locale: string;
  enabled_locales: string[];
  currency: string;
}

interface MenuManagerProps {
  restaurantId?: string;
}

const inputClass =
  "w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50";
const iconBtn =
  "p-2 rounded-lg transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none";

// Drop empty strings so the API only stores languages that were filled in.
const compact = (map: TextMap): TextMap =>
  Object.fromEntries(Object.entries(map).filter(([, v]) => v.trim() !== ""));

export function MenuManager({ restaurantId }: MenuManagerProps) {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const tErr = useTranslations("errors");
  const tRoot = useTranslations();
  const tAllergens = useTranslations("allergens");
  const locale = useLocale();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();

  const [settings, setSettings] = useState<MenuSettings>({
    default_locale: "es",
    enabled_locales: ["es", "en"],
    currency: "EUR",
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [categoryNames, setCategoryNames] = useState<TextMap>({});
  const [itemForm, setItemForm] = useState({
    category_id: "",
    names: {} as TextMap,
    descriptions: {} as TextMap,
    price: "",
    image_url: "",
    allergens: [] as string[],
    active: true,
  });

  const { default_locale: defaultLocale, currency } = settings;
  // Default language first, then the rest in the configured order.
  const locales = useMemo(
    () => [
      defaultLocale,
      ...settings.enabled_locales.filter((l) => l !== defaultLocale),
    ],
    [defaultLocale, settings.enabled_locales],
  );
  const langName = useMemo(() => {
    const dn = new Intl.DisplayNames([locale], { type: "language" });
    return (code: string) => {
      const n = dn.of(code) ?? code;
      return n.charAt(0).toUpperCase() + n.slice(1);
    };
  }, [locale]);

  const query = restaurantId ? `?restaurantId=${restaurantId}` : "";

  const fetchCategories = async () => {
    try {
      const res = await fetch(`/api/categories${query}`);
      if (res.ok) setCategories(await res.json());
      else toast(tErr("generic"), "error");
    } catch {
      toast(tErr("generic"), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch(`/api/settings${query}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => {
        if (s?.default_locale && Array.isArray(s.enabled_locales)) {
          setSettings({
            default_locale: s.default_locale,
            enabled_locales: s.enabled_locales,
            currency: s.currency || "EUR",
          });
        }
      })
      .catch(() => {});
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  const catName = (c: Category) => localizedText(c.names, locale, defaultLocale);
  const itemName = (i: MenuItem) => localizedText(i.names, locale, defaultLocale);
  const itemDescription = (i: MenuItem) =>
    localizedText(i.descriptions, locale, defaultLocale);

  const apiError = (res: Response) => readApiError(res, tRoot);

  // Runs a mutation, reports through toasts, refreshes on success.
  const mutate = async (
    url: string,
    method: string,
    body: unknown,
    successMsg: string,
  ) => {
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (!res.ok) {
        toast(await apiError(res), "error");
        return false;
      }
      toast(successMsg, "success");
      await fetchCategories();
      return true;
    } catch {
      toast(tErr("generic"), "error");
      return false;
    }
  };

  const openCategoryModal = (category?: Category) => {
    setEditingCategory(category ?? null);
    setCategoryNames(category ? { ...category.names } : {});
    setFormError(null);
    setShowCategoryModal(true);
  };

  const openItemModal = (categoryId: string, item?: MenuItem) => {
    setEditingItem(item ?? null);
    setItemForm({
      category_id: categoryId,
      names: item ? { ...item.names } : {},
      descriptions: item ? { ...item.descriptions } : {},
      price: item ? String(item.price) : "",
      image_url: item?.image_url || "",
      allergens: item ? [...item.allergens] : [],
      active: item?.active ?? true,
    });
    setFormError(null);
    setShowItemModal(true);
  };

  const saveCategory = async () => {
    setSaving(true);
    setFormError(null);
    try {
      const names = compact(categoryNames);
      const res = await fetch(
        editingCategory ? `/api/categories/${editingCategory.id}` : "/api/categories",
        {
          method: editingCategory ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            editingCategory
              ? { names }
              : { names, ...(restaurantId ? { restaurantId } : {}) },
          ),
        },
      );
      if (res.ok) {
        toast(t("menuPage.categorySaved"), "success");
        await fetchCategories();
        setShowCategoryModal(false);
      } else {
        const msg = await apiError(res);
        setFormError(msg);
        toast(msg, "error");
      }
    } catch {
      setFormError(tErr("generic"));
      toast(tErr("generic"), "error");
    } finally {
      setSaving(false);
    }
  };

  const saveItem = async () => {
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        category_id: itemForm.category_id,
        names: compact(itemForm.names),
        descriptions: compact(itemForm.descriptions),
        price: parseFloat(itemForm.price.replace(",", ".")),
        image_url: itemForm.image_url || null,
        allergens: itemForm.allergens,
        active: itemForm.active,
        ...(restaurantId && !editingItem ? { restaurantId } : {}),
      };
      const res = await fetch(
        editingItem ? `/api/items/${editingItem.id}` : "/api/items",
        {
          method: editingItem ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (res.ok) {
        toast(t("menuPage.itemSaved"), "success");
        await fetchCategories();
        setShowItemModal(false);
      } else {
        const msg = await apiError(res);
        setFormError(msg);
        toast(msg, "error");
      }
    } catch {
      setFormError(tErr("generic"));
      toast(tErr("generic"), "error");
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async (c: Category) => {
    if (!(await confirm({ message: t("menuPage.confirmDeleteCategory") }))) return;
    await mutate(`/api/categories/${c.id}`, "DELETE", undefined, t("menuPage.categoryDeleted"));
  };

  const deleteItem = async (i: MenuItem) => {
    if (!(await confirm({ message: t("menuPage.confirmDeleteItem") }))) return;
    await mutate(`/api/items/${i.id}`, "DELETE", undefined, t("menuPage.itemDeleted"));
  };

  const toggleItemActive = (i: MenuItem) =>
    mutate(
      `/api/items/${i.id}`,
      "PUT",
      { active: !i.active },
      i.active ? t("menuPage.itemHidden") : t("menuPage.itemShown"),
    );

  const toggleCategoryActive = (c: Category) =>
    mutate(
      `/api/categories/${c.id}`,
      "PUT",
      { active: !c.active },
      c.active ? t("menuPage.categoryHidden") : t("menuPage.categoryShown"),
    );

  // Swap with the neighbour: renumber every category by position so equal or
  // gapped `order` values from older data cannot break the swap.
  const moveCategory = async (index: number, dir: -1 | 1) => {
    const next = [...categories];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    setCategories(next.map((c, order) => ({ ...c, order })));
    try {
      const results = await Promise.all(
        next.map((c, order) =>
          c.order === order
            ? Promise.resolve(true)
            : fetch(`/api/categories/${c.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ order }),
              }).then((r) => r.ok),
        ),
      );
      if (results.every(Boolean)) toast(t("menuPage.orderSaved"), "success");
      else toast(tErr("generic"), "error");
    } catch {
      toast(tErr("generic"), "error");
    }
    await fetchCategories();
  };

  const toggleAllergen = (code: string) =>
    setItemForm((f) => ({
      ...f,
      allergens: f.allergens.includes(code)
        ? f.allergens.filter((a) => a !== code)
        : [...f.allergens, code],
    }));

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const priceValid = Number.isFinite(parseFloat(itemForm.price.replace(",", "."))) &&
    parseFloat(itemForm.price.replace(",", ".")) >= 0;
  const itemValid = !!itemForm.names[defaultLocale]?.trim() && priceValid;

  return (
    <div className="space-y-6">
      {dialog}

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="text-2xl font-bold">{t("menu")}</h1>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={() => setShowImport(true)}
            className="btn-secondary-premium flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 py-3 font-medium"
          >
            <Upload className="h-5 w-5" />
            <span>{t("import.open")}</span>
          </button>
          <button
            onClick={() => openCategoryModal()}
            className="btn-gold flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 py-3 font-medium"
          >
            <Plus className="h-5 w-5" />
            <span>{t("newCategory")}</span>
          </button>
        </div>
      </div>

      {categories.length === 0 ? (
        <div className="card-premium rounded-2xl p-12 text-center">
          <FolderOpen className="mx-auto mb-4 h-16 w-16 text-muted-foreground/50" />
          <h3 className="mb-2 text-lg font-semibold text-foreground">
            {t("menuPage.noCategories")}
          </h3>
          <p className="mb-6 text-muted-foreground">{t("menuPage.noCategoriesHint")}</p>
          <button
            onClick={() => openCategoryModal()}
            className="btn-gold inline-flex items-center gap-2 rounded-xl px-6 py-3 font-medium"
          >
            <Plus className="h-5 w-5" />
            {t("menuPage.createFirstCategory")}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {categories.map((category, index) => (
            <div
              key={category.id}
              className={`card-premium overflow-hidden rounded-2xl ${
                !category.active ? "opacity-60" : ""
              }`}
            >
              <div className="flex flex-col justify-between gap-3 border-b border-border/50 p-4 sm:flex-row sm:items-center">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-foreground">{catName(category)}</h3>
                  <p className="text-xs text-muted-foreground">
                    {t("menuPage.itemsCount", { count: category.items.length })} •{" "}
                    {category.active ? t("active") : t("inactive")}
                  </p>
                </div>
                <div className="flex items-center gap-1 self-end sm:self-auto">
                  <button
                    onClick={() => moveCategory(index, -1)}
                    disabled={index === 0}
                    className={`${iconBtn} text-muted-foreground hover:bg-secondary`}
                    aria-label={t("menuPage.moveUp")}
                    title={t("menuPage.moveUp")}
                  >
                    <ChevronUp className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => moveCategory(index, 1)}
                    disabled={index === categories.length - 1}
                    className={`${iconBtn} text-muted-foreground hover:bg-secondary`}
                    aria-label={t("menuPage.moveDown")}
                    title={t("menuPage.moveDown")}
                  >
                    <ChevronDown className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => openItemModal(category.id)}
                    className={`${iconBtn} text-primary hover:bg-secondary`}
                    title={t("menuPage.addItem")}
                    aria-label={t("menuPage.addItem")}
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => toggleCategoryActive(category)}
                    aria-pressed={category.active}
                    className={`${iconBtn} ${
                      category.active
                        ? "text-success hover:bg-success/10"
                        : "text-muted-foreground hover:bg-secondary"
                    }`}
                    title={category.active ? t("menuPage.deactivate") : t("menuPage.activate")}
                    aria-label={category.active ? t("menuPage.deactivate") : t("menuPage.activate")}
                  >
                    <Check className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => openCategoryModal(category)}
                    className={`${iconBtn} text-muted-foreground hover:bg-secondary`}
                    title={tCommon("edit")}
                    aria-label={tCommon("edit")}
                  >
                    <Pencil className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => deleteCategory(category)}
                    className={`${iconBtn} text-destructive hover:bg-destructive/10`}
                    title={tCommon("delete")}
                    aria-label={tCommon("delete")}
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="p-4">
                {category.items.length === 0 ? (
                  <p className="py-4 text-center text-muted-foreground">{t("menuPage.noItems")}</p>
                ) : (
                  <div className="grid gap-3">
                    {category.items.map((item) => (
                      <div
                        key={item.id}
                        className={`flex flex-col gap-3 rounded-xl border border-border/30 bg-secondary/30 p-3 sm:flex-row sm:items-center sm:gap-4 ${
                          !item.active ? "opacity-60" : ""
                        }`}
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
                          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-secondary sm:h-16 sm:w-16">
                            {item.image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.image_url} alt={itemName(item)} className="h-full w-full object-cover" />
                            ) : (
                              <ImageIcon className="h-5 w-5 text-muted-foreground/50 sm:h-6 sm:w-6" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="truncate text-sm font-medium text-foreground sm:text-base">
                              {itemName(item)}
                            </h4>
                            {itemDescription(item) && (
                              <p className="truncate text-xs text-muted-foreground sm:text-sm">
                                {itemDescription(item)}
                              </p>
                            )}
                            {item.allergens.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1.5 text-muted-foreground">
                                {item.allergens.map((code) => (
                                  <span key={code} role="img" aria-label={tAllergens(code)} title={tAllergens(code)} className="leading-none">
                                    <AllergenIcon code={code as AllergenCode} className="h-4 w-4" />
                                  </span>
                                ))}
                              </div>
                            )}
                            <p className="mt-1 text-sm font-bold text-price sm:hidden">
                              {formatMoney(item.price, currency, locale)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 sm:justify-end sm:gap-4">
                          <p className="hidden text-right font-bold text-price sm:block">
                            {formatMoney(item.price, currency, locale)}
                          </p>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => toggleItemActive(item)}
                              aria-label={item.active ? t("menuPage.deactivate") : t("menuPage.activate")}
                              title={item.active ? t("menuPage.deactivate") : t("menuPage.activate")}
                              aria-pressed={item.active}
                              className={`${iconBtn} ${
                                item.active
                                  ? "text-success hover:bg-success/10"
                                  : "text-muted-foreground hover:bg-secondary"
                              }`}
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openItemModal(category.id, item)}
                              aria-label={tCommon("edit")}
                              className={`${iconBtn} text-muted-foreground hover:bg-secondary`}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => deleteItem(item)}
                              aria-label={tCommon("delete")}
                              className={`${iconBtn} text-destructive hover:bg-destructive/10`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showImport && (
        <MenuImportDialog
          restaurantId={restaurantId}
          onClose={() => setShowImport(false)}
          onImported={fetchCategories}
        />
      )}

      {showCategoryModal && (
        <div className="!mt-0 fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" className="card-premium w-full max-w-md rounded-2xl p-6">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-foreground">
                {editingCategory ? t("menuPage.editCategory") : t("newCategory")}
              </h3>
              <button
                onClick={() => setShowCategoryModal(false)}
                aria-label={tCommon("close")}
                className="rounded-lg p-2 transition-colors hover:bg-secondary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {locales.map((l) => (
                <div key={l}>
                  <label htmlFor={`cat-${l}`} className="mb-2 block text-sm font-medium">
                    {t("menuPage.nameIn", { language: langName(l) })}
                    {l === defaultLocale && " *"}
                  </label>
                  <input
                    id={`cat-${l}`}
                    type="text"
                    value={categoryNames[l] ?? ""}
                    onChange={(e) => setCategoryNames({ ...categoryNames, [l]: e.target.value })}
                    className={inputClass}
                  />
                </div>
              ))}
            </div>

            {formError && (
              <p role="alert" className="mt-4 text-sm text-destructive">
                {formError}
              </p>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowCategoryModal(false)}
                className="btn-secondary-premium min-h-[44px] flex-1 rounded-xl py-3 font-medium"
              >
                {tCommon("cancel")}
              </button>
              <button
                onClick={saveCategory}
                disabled={saving || !categoryNames[defaultLocale]?.trim()}
                className="btn-gold flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl py-3 font-medium disabled:opacity-50"
              >
                {saving && <Loader2 className="h-5 w-5 animate-spin" />}
                {tCommon("save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {showItemModal && (
        <div className="!mt-0 fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            className="card-premium flex max-h-[92vh] w-full max-w-xl flex-col rounded-2xl p-6"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-foreground">
                {editingItem ? t("menuPage.editItem") : t("newItem")}
              </h3>
              <button
                onClick={() => setShowItemModal(false)}
                aria-label={tCommon("close")}
                className="rounded-lg p-2 transition-colors hover:bg-secondary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 overflow-y-auto pr-2">
              {locales.map((l) => (
                <fieldset key={l} className="space-y-2">
                  <legend className="mb-1 text-sm font-semibold text-foreground">
                    {langName(l)}
                    {l === defaultLocale && (
                      <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {t("menuPage.required")}
                      </span>
                    )}
                  </legend>
                  <input
                    type="text"
                    aria-label={t("menuPage.nameIn", { language: langName(l) })}
                    placeholder={t("menuPage.namePlaceholder")}
                    value={itemForm.names[l] ?? ""}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, names: { ...itemForm.names, [l]: e.target.value } })
                    }
                    className={inputClass}
                  />
                  <textarea
                    aria-label={t("menuPage.descIn", { language: langName(l) })}
                    placeholder={t("menuPage.descPlaceholder")}
                    value={itemForm.descriptions[l] ?? ""}
                    onChange={(e) =>
                      setItemForm({
                        ...itemForm,
                        descriptions: { ...itemForm.descriptions, [l]: e.target.value },
                      })
                    }
                    className={`${inputClass} resize-none`}
                    rows={2}
                  />
                </fieldset>
              ))}

              <div>
                <label htmlFor="item-price" className="mb-2 block text-sm font-medium">
                  {t("menuPage.priceLabel", { currency })}
                </label>
                <input
                  id="item-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={itemForm.price}
                  onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                  className={inputClass}
                  placeholder="0.00"
                />
              </div>

              <fieldset>
                <legend className="mb-2 text-sm font-medium">{t("menuPage.allergens")}</legend>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {ALLERGEN_CODES.map((code) => {
                    const icon = <AllergenIcon code={code} className="h-4 w-4 shrink-0" />;
                    const on = itemForm.allergens.includes(code);
                    return (
                      <label
                        key={code}
                        className={`flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors focus-within:ring-2 focus-within:ring-primary/50 ${
                          on
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border/50 bg-secondary/30 text-muted-foreground hover:bg-secondary/60"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => toggleAllergen(code)}
                          className="sr-only"
                        />
                        <span aria-hidden className="flex-shrink-0 text-base leading-none">{icon}</span>
                        <span className="leading-tight">{tAllergens(code)}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <div>
                <p className="mb-2 text-sm font-medium">{t("menuPage.dishImage")}</p>
                <ImageUpload
                  value={itemForm.image_url}
                  onChange={(url) => setItemForm({ ...itemForm, image_url: url })}
                  disabled={saving}
                />
              </div>

              <label className="flex min-h-[44px] cursor-pointer items-center justify-between gap-3 rounded-xl border border-border/30 bg-secondary/30 p-4">
                <span>
                  <span className="block text-sm font-medium text-foreground">
                    {t("menuPage.available")}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {t("menuPage.availableHint")}
                  </span>
                </span>
                <input
                  type="checkbox"
                  role="switch"
                  checked={itemForm.active}
                  onChange={(e) => setItemForm({ ...itemForm, active: e.target.checked })}
                  className="h-5 w-5 accent-[hsl(var(--primary))]"
                />
              </label>
            </div>

            {formError && (
              <p role="alert" className="mt-4 text-sm text-destructive">
                {formError}
              </p>
            )}

            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setShowItemModal(false)}
                className="btn-secondary-premium min-h-[44px] flex-1 rounded-xl py-3 font-medium"
              >
                {tCommon("cancel")}
              </button>
              <button
                onClick={saveItem}
                disabled={saving || !itemValid}
                className="btn-gold flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl py-3 font-medium disabled:opacity-50"
              >
                {saving && <Loader2 className="h-5 w-5 animate-spin" />}
                {tCommon("save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
