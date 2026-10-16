"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { readApiError } from "@/components/admin/api-errors";
import { Plus, Pencil, Trash2, Loader2, X } from "lucide-react";
import { Button, Card, CardContent, Input, Label, Badge } from "@/components/ui";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import {
  CURRENCIES,
  LanguageFields,
  TimezoneSelect,
  fieldClass,
} from "@/components/admin/regional-fields";

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  active: boolean;
  created_at: string;
}

const EMPTY_FORM = {
  name: "",
  slug: "",
  domain: "",
  active: true,
  default_locale: "es",
  enabled_locales: ["es", "en"] as string[],
  currency: "EUR",
  timezone: "Europe/Madrid",
};

export function RestaurantsManager() {
  const t = useTranslations("superadmin.restaurants");
  const tAdmin = useTranslations("admin");
  const tCommon = useTranslations("common");
  const tRoot = useTranslations();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [settingsReady, setSettingsReady] = useState(true);

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      const res = await fetch("/api/restaurants");
      if (res.ok) {
        const data = await res.json();
        setRestaurants(data);
      }
    } catch (err) {
      console.error("Error fetching restaurants:", err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingRestaurant(null);
    setFormData(EMPTY_FORM);
    setError("");
    setShowModal(true);
  };

  const openEditModal = (restaurant: Restaurant) => {
    setEditingRestaurant(restaurant);
    setFormData({
      name: restaurant.name,
      slug: restaurant.slug,
      domain: restaurant.domain ?? "",
      active: restaurant.active,
      default_locale: EMPTY_FORM.default_locale,
      enabled_locales: EMPTY_FORM.enabled_locales,
      currency: EMPTY_FORM.currency,
      timezone: EMPTY_FORM.timezone,
    });
    setError("");
    setSettingsReady(false);
    setShowModal(true);
    // Regional fields live in the restaurant's settings; load them before they can be saved.
    fetch(`/api/settings?restaurantId=${restaurant.id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((s) => {
        setFormData((f) => ({
          ...f,
          default_locale: s.default_locale ?? f.default_locale,
          enabled_locales: s.enabled_locales ?? f.enabled_locales,
          currency: s.currency ?? f.currency,
          timezone: s.timezone ?? f.timezone,
        }));
        setSettingsReady(true);
      })
      .catch(() => setError(t("saveError")));
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingRestaurant(null);
    setFormData(EMPTY_FORM);
    setError("");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData.name.trim() || !formData.slug.trim()) {
      setError(t("nameSlugRequired"));
      return;
    }

    setSaving(true);
    setError("");

    try {
      const url = editingRestaurant
        ? `/api/restaurants/${editingRestaurant.id}`
        : "/api/restaurants";
      const method = editingRestaurant ? "PATCH" : "POST";

      const regional = {
        default_locale: formData.default_locale,
        enabled_locales: formData.enabled_locales,
        currency: formData.currency,
        timezone: formData.timezone,
      };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          slug: formData.slug.trim(),
          domain: formData.domain.trim() || null,
          active: formData.active,
          // Create takes the regional fields directly; edits update the settings below.
          ...(editingRestaurant ? {} : regional),
        }),
      });
      // Edit: the regional fields belong to the restaurant's settings record.
      const settingsRes =
        res.ok && editingRestaurant
          ? await fetch("/api/settings", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ restaurantId: editingRestaurant.id, ...regional }),
            })
          : res;

      if (res.ok && settingsRes.ok) {
        toast(tAdmin("toast.saved"), "success");
        await fetchRestaurants();
        closeModal();
      } else {
        const msg = await readApiError(res.ok ? settingsRes : res, tRoot);
        setError(msg);
        toast(msg, "error");
      }
    } catch (err) {
      setError(t("saveError"));
      toast(t("saveError"), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (restaurant: Restaurant) => {
    if (!(await confirm({ message: t("confirmDelete") }))) return;

    try {
      const res = await fetch(`/api/restaurants/${restaurant.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast(tAdmin("toast.deleted"), "success");
        await fetchRestaurants();
      } else {
        toast(await readApiError(res, tRoot), "error");
      }
    } catch (err) {
      console.error("Error deleting restaurant:", err);
      toast(t("deleteError"), "error");
    }
  };

  const toggleActive = async (restaurant: Restaurant) => {
    try {
      const res = await fetch(`/api/restaurants/${restaurant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !restaurant.active }),
      });
      if (res.ok) {
        toast(tAdmin("toast.updated"), "success");
        await fetchRestaurants();
      } else {
        toast(await readApiError(res, tRoot), "error");
      }
    } catch (err) {
      console.error("Error updating restaurant:", err);
      toast(t("saveError"), "error");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {dialog}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t("subtitle")}
          </p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4 mr-2" />
          {t("newRestaurant")}
        </Button>
      </div>

      {restaurants.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t("empty")}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {restaurants.map((restaurant) => (
            <Card key={restaurant.id}>
              <CardContent className="py-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{restaurant.name}</h3>
                      <Badge variant={restaurant.active ? "default" : "secondary"}>
                        {restaurant.active ? tAdmin("active") : tAdmin("inactive")}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t("slugValue", { slug: restaurant.slug })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t("domainValue", { domain: restaurant.domain || "-" })}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleActive(restaurant)}
                    >
                      {restaurant.active ? t("deactivate") : t("activate")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(restaurant)}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      {tCommon("edit")}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(restaurant)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {tCommon("delete")}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showModal && (
        <div className="!mt-0 fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-lg my-8">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">
                {editingRestaurant ? t("editRestaurant") : t("newRestaurant")}
              </h2>
              <button
                onClick={closeModal}
                aria-label={tCommon("close")}
                className="p-1 rounded-lg hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{tAdmin("userName")}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(event) =>
                    setFormData({ ...formData, name: event.target.value })
                  }
                  placeholder={t("namePlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(event) =>
                    setFormData({ ...formData, slug: event.target.value })
                  }
                  placeholder={t("slugPlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="domain">{t("domainOptional")}</Label>
                <Input
                  id="domain"
                  value={formData.domain}
                  onChange={(event) =>
                    setFormData({ ...formData, domain: event.target.value })
                  }
                  placeholder="bistro.com"
                />
              </div>
              <div className="space-y-2">
                <Label>{t("languages")}</Label>
                <LanguageFields
                  enabled={formData.enabled_locales}
                  defaultLocale={formData.default_locale}
                  onChange={(next) => setFormData({ ...formData, ...next })}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="currency">{t("currency")}</Label>
                  <select
                    id="currency"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className={fieldClass}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">{t("timezone")}</Label>
                  <TimezoneSelect
                    id="timezone"
                    value={formData.timezone}
                    onChange={(v) => setFormData({ ...formData, timezone: v })}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="active"
                  type="checkbox"
                  checked={formData.active}
                  onChange={(event) =>
                    setFormData({ ...formData, active: event.target.checked })
                  }
                />
                <Label htmlFor="active">{tAdmin("active")}</Label>
              </div>

              {error && (
                <p role="alert" className="text-sm text-destructive">{error}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={closeModal}>
                  {tCommon("cancel")}
                </Button>
                <Button type="submit" disabled={saving || !settingsReady}>
                  {saving ? t("saving") : tCommon("save")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
