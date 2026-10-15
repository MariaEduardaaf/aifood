"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  ChefHat,
  GripVertical,
  Image as ImageIcon,
  X,
  Check,
  FolderOpen,
} from "lucide-react";
import { ImageUpload } from "@/components/ui/image-upload";

interface MenuItem {
  id: string;
  category_id: string;
  name_pt: string;
  name_es: string;
  name_en: string;
  description_pt: string | null;
  description_es: string | null;
  description_en: string | null;
  price: number;
  image_url: string | null;
  active: boolean;
  order: number;
}

interface Category {
  id: string;
  name_pt: string;
  name_es: string;
  name_en: string;
  order: number;
  active: boolean;
  items: MenuItem[];
}

interface MenuManagerProps {
  restaurantId?: string;
}

export function MenuManager({ restaurantId }: MenuManagerProps) {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const locale = useLocale() as "pt" | "es" | "en";
  const itemName = (i: MenuItem) => i[`name_${locale}`] || i.name_pt;
  const itemDescription = (i: MenuItem) => i[`description_${locale}`] || i.description_pt;
  const categoryName = (c: Category) => c[`name_${locale}`] || c.name_pt;

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [saving, setSaving] = useState(false);

  // Form states
  const [categoryForm, setCategoryForm] = useState({
    name_pt: "",
    name_es: "",
    name_en: "",
  });

  const [itemForm, setItemForm] = useState({
    category_id: "",
    name_pt: "",
    name_es: "",
    name_en: "",
    description_pt: "",
    description_es: "",
    description_en: "",
    price: "",
    image_url: "",
  });

  useEffect(() => {
    fetchCategories();
  }, [restaurantId]);

  const fetchCategories = async () => {
    try {
      const query = restaurantId ? `?restaurantId=${restaurantId}` : "";
      const res = await fetch(`/api/categories${query}`);
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
    } finally {
      setLoading(false);
    }
  };

  const openCategoryModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({
        name_pt: category.name_pt,
        name_es: category.name_es,
        name_en: category.name_en,
      });
    } else {
      setEditingCategory(null);
      setCategoryForm({ name_pt: "", name_es: "", name_en: "" });
    }
    setShowCategoryModal(true);
  };

  const openItemModal = (categoryId: string, item?: MenuItem) => {
    if (item) {
      setEditingItem(item);
      setItemForm({
        category_id: item.category_id,
        name_pt: item.name_pt,
        name_es: item.name_es,
        name_en: item.name_en,
        description_pt: item.description_pt || "",
        description_es: item.description_es || "",
        description_en: item.description_en || "",
        price: String(item.price),
        image_url: item.image_url || "",
      });
    } else {
      setEditingItem(null);
      setItemForm({
        category_id: categoryId,
        name_pt: "",
        name_es: "",
        name_en: "",
        description_pt: "",
        description_es: "",
        description_en: "",
        price: "",
        image_url: "",
      });
    }
    setSelectedCategoryId(categoryId);
    setShowItemModal(true);
  };

  const saveCategory = async () => {
    setSaving(true);
    try {
      const url = editingCategory
        ? `/api/categories/${editingCategory.id}`
        : "/api/categories";
      const method = editingCategory ? "PUT" : "POST";

      const payload = editingCategory
        ? categoryForm
        : { ...categoryForm, ...(restaurantId ? { restaurantId } : {}) };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await fetchCategories();
        setShowCategoryModal(false);
      }
    } catch (err) {
      console.error("Error saving category:", err);
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm(t("menuPage.confirmDeleteCategory"))) return;

    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchCategories();
      }
    } catch (err) {
      console.error("Error deleting category:", err);
    }
  };

  const saveItem = async () => {
    setSaving(true);
    try {
      const url = editingItem ? `/api/items/${editingItem.id}` : "/api/items";
      const method = editingItem ? "PUT" : "POST";

      const payload = {
        ...itemForm,
        price: parseFloat(itemForm.price),
        description_pt: itemForm.description_pt || null,
        description_es: itemForm.description_es || null,
        description_en: itemForm.description_en || null,
        image_url: itemForm.image_url || null,
        ...(restaurantId && !editingItem ? { restaurantId } : {}),
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await fetchCategories();
        setShowItemModal(false);
      }
    } catch (err) {
      console.error("Error saving item:", err);
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm(t("menuPage.confirmDeleteItem"))) return;

    try {
      const res = await fetch(`/api/items/${id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchCategories();
      }
    } catch (err) {
      console.error("Error deleting item:", err);
    }
  };

  const toggleItemActive = async (item: MenuItem) => {
    try {
      await fetch(`/api/items/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !item.active }),
      });
      await fetchCategories();
    } catch (err) {
      console.error("Error toggling item:", err);
    }
  };

  const toggleCategoryActive = async (category: Category) => {
    try {
      await fetch(`/api/categories/${category.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !category.active }),
      });
      await fetchCategories();
    } catch (err) {
      console.error("Error toggling category:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{t("menu")}</h1>
        <button
          onClick={() => openCategoryModal()}
          className="btn-gold px-4 py-3 rounded-xl font-medium flex items-center justify-center gap-2 min-h-[44px]"
        >
          <Plus className="h-5 w-5" />
          <span>{t("newCategory")}</span>
        </button>
      </div>

      {/* Categories */}
      {categories.length === 0 ? (
        <div className="card-premium rounded-2xl p-12 text-center">
          <FolderOpen className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {t("menuPage.noCategories")}
          </h3>
          <p className="text-muted-foreground mb-6">
            {t("menuPage.noCategoriesHint")}
          </p>
          <button
            onClick={() => openCategoryModal()}
            className="btn-gold px-6 py-3 rounded-xl font-medium inline-flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            {t("menuPage.createFirstCategory")}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {categories.map((category) => (
            <div
              key={category.id}
              className={`card-premium rounded-2xl overflow-hidden ${
                !category.active ? "opacity-60" : ""
              }`}
            >
              {/* Category Header */}
              <div className="p-4 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <GripVertical className="h-5 w-5 text-muted-foreground cursor-move flex-shrink-0 hidden sm:block" />
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground truncate">
                      {categoryName(category)}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {t("menuPage.itemsCount", { count: category.items.length })} •{" "}
                      {category.active ? t("active") : t("inactive")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => openItemModal(category.id)}
                    className="p-2 rounded-lg hover:bg-secondary transition-colors text-primary min-w-[40px] min-h-[40px] flex items-center justify-center"
                    title={t("menuPage.addItem")}
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => toggleCategoryActive(category)}
                    className={`p-2 rounded-lg transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center ${
                      category.active
                        ? "text-green-500 hover:bg-green-500/10"
                        : "text-muted-foreground hover:bg-secondary"
                    }`}
                    title={category.active ? t("menuPage.deactivate") : t("menuPage.activate")}
                  >
                    <Check className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => openCategoryModal(category)}
                    className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground min-w-[40px] min-h-[40px] flex items-center justify-center"
                    title={tCommon("edit")}
                  >
                    <Pencil className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => deleteCategory(category.id)}
                    className="p-2 rounded-lg hover:bg-red-500/10 transition-colors text-red-500 min-w-[40px] min-h-[40px] flex items-center justify-center"
                    title={tCommon("delete")}
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Items */}
              <div className="p-4">
                {category.items.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    {t("menuPage.noItems")}
                  </p>
                ) : (
                  <div className="grid gap-3">
                    {category.items.map((item) => (
                      <div
                        key={item.id}
                        className={`flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 rounded-xl bg-secondary/30 border border-border/30 ${
                          !item.active ? "opacity-60" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                          {/* Image */}
                          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={itemName(item)}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <ImageIcon className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground/50" />
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-foreground truncate text-sm sm:text-base">
                              {itemName(item)}
                            </h4>
                            {itemDescription(item) && (
                              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                                {itemDescription(item)}
                              </p>
                            )}
                            {/* Price - mobile */}
                            <p className="font-bold text-primary text-sm mt-1 sm:hidden">
                              R$ {Number(item.price).toFixed(2)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
                          {/* Price - desktop */}
                          <div className="text-right hidden sm:block">
                            <p className="font-bold text-primary">
                              R$ {Number(item.price).toFixed(2)}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => toggleItemActive(item)}
                              className={`p-2 rounded-lg transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center ${
                                item.active
                                  ? "text-green-500 hover:bg-green-500/10"
                                  : "text-muted-foreground hover:bg-secondary"
                              }`}
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openItemModal(category.id, item)}
                              className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground min-w-[40px] min-h-[40px] flex items-center justify-center"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => deleteItem(item.id)}
                              className="p-2 rounded-lg hover:bg-red-500/10 transition-colors text-red-500 min-w-[40px] min-h-[40px] flex items-center justify-center"
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

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="card-premium rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-foreground">
                {editingCategory ? t("menuPage.editCategory") : t("newCategory")}
              </h3>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="p-2 rounded-lg hover:bg-secondary transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t("menuPage.namePt")}
                </label>
                <input
                  type="text"
                  value={categoryForm.name_pt}
                  onChange={(e) =>
                    setCategoryForm({
                      ...categoryForm,
                      name_pt: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder={t("menuPage.categoryPlaceholderPt")}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t("menuPage.nameEs")}
                </label>
                <input
                  type="text"
                  value={categoryForm.name_es}
                  onChange={(e) =>
                    setCategoryForm({
                      ...categoryForm,
                      name_es: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder={t("menuPage.categoryPlaceholderEs")}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t("menuPage.nameEn")}
                </label>
                <input
                  type="text"
                  value={categoryForm.name_en}
                  onChange={(e) =>
                    setCategoryForm({
                      ...categoryForm,
                      name_en: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder={t("menuPage.categoryPlaceholderEn")}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCategoryModal(false)}
                className="flex-1 btn-secondary-premium py-3 rounded-xl font-medium"
              >
                {tCommon("cancel")}
              </button>
              <button
                onClick={saveCategory}
                disabled={saving || !categoryForm.name_pt}
                className="flex-1 btn-gold py-3 rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="h-5 w-5 animate-spin" />}
                {tCommon("save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="card-premium rounded-2xl p-6 w-full max-w-lg my-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-foreground">
                {editingItem ? t("menuPage.editItem") : t("newItem")}
              </h3>
              <button
                onClick={() => setShowItemModal(false)}
                className="p-2 rounded-lg hover:bg-secondary transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {/* Names */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t("menuPage.namePt")} *
                  </label>
                  <input
                    type="text"
                    value={itemForm.name_pt}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, name_pt: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t("menuPage.nameEs")} *
                  </label>
                  <input
                    type="text"
                    value={itemForm.name_es}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, name_es: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t("menuPage.nameEn")} *
                  </label>
                  <input
                    type="text"
                    value={itemForm.name_en}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, name_en: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              {/* Descriptions */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t("menuPage.descPt")}
                </label>
                <textarea
                  value={itemForm.description_pt}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, description_pt: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t("menuPage.descEs")}
                </label>
                <textarea
                  value={itemForm.description_es}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, description_es: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t("menuPage.descEn")}
                </label>
                <textarea
                  value={itemForm.description_en}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, description_en: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  rows={2}
                />
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t("menuPage.priceLabel")}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={itemForm.price}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, price: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="0.00"
                />
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t("menuPage.dishImage")}
                </label>
                <ImageUpload
                  value={itemForm.image_url}
                  onChange={(url) =>
                    setItemForm({ ...itemForm, image_url: url })
                  }
                  disabled={saving}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowItemModal(false)}
                className="flex-1 btn-secondary-premium py-3 rounded-xl font-medium"
              >
                {tCommon("cancel")}
              </button>
              <button
                onClick={saveItem}
                disabled={
                  saving ||
                  !itemForm.name_pt ||
                  !itemForm.name_es ||
                  !itemForm.name_en ||
                  !itemForm.price
                }
                className="flex-1 btn-gold py-3 rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
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
