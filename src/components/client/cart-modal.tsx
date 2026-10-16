"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { localizedText } from "@/lib/i18n/text";
import { formatMoney } from "@/lib/utils";
import { useCart } from "./cart-context";
import { Sheet } from "./sheet";
import { Stepper } from "./stepper";

interface CartModalProps {
  token: string;
  fallbackLocale: string;
  onClose: () => void;
  onOrderSuccess: () => void;
}

export function CartModal({ token, fallbackLocale, onClose, onOrderSuccess }: CartModalProps) {
  const t = useTranslations("cart");
  const tErr = useTranslations("errors");
  const locale = useLocale();
  const toast = useToast();
  const { items, updateQuantity, updateNotes, removeItem, clearCart, total, itemCount, currency } =
    useCart();

  const [orderNotes, setOrderNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmitOrder = async (close: () => void) => {
    if (items.length === 0) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table: token,
          items: items.map((item) => ({
            menuItemId: item.menuItem.id,
            quantity: item.quantity,
            notes: item.notes?.trim() || undefined,
          })),
          notes: orderNotes.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const message =
          res.status === 429
            ? t("rateLimitError")
            : data.error === "ordering_disabled"
              ? t("orderingDisabled")
              : t("orderError");
        setError(message);
        toast(message, "error");
        return;
      }

      clearCart();
      toast(t("orderSuccess"), "success");
      close();
      onOrderSuccess();
    } catch {
      setError(tErr("generic"));
      toast(tErr("generic"), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet
      title={t("title")}
      onClose={onClose}
      footer={
        items.length > 0
          ? (close) => (
              <div className="space-y-3">
                {error && (
                  <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300">
                    {error}
                  </p>
                )}
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-medium text-muted-foreground">{t("total")}</span>
                  <span className="text-2xl font-semibold tabular-nums text-foreground">
                    {formatMoney(total, currency, locale)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleSubmitOrder(close)}
                  disabled={loading}
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-primary text-base font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {loading && <Loader2 className="h-5 w-5 animate-spin" />}
                  {loading ? t("sending") : t("submitOrder")}
                </button>
              </div>
            )
          : undefined
      }
    >
      <h2 className="pr-12 text-2xl font-semibold leading-tight tracking-tight">
        {t("title")}
        {itemCount > 0 && (
          <span className="ml-2 align-middle text-base font-medium text-muted-foreground tabular-nums">
            {t("itemCount", { count: itemCount })}
          </span>
        )}
      </h2>

      {items.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">{t("emptyCart")}</p>
      ) : (
        <>
          <ul className="mt-4 divide-y divide-border">
            {items.map((item) => {
              const name = localizedText(item.menuItem.names, locale, fallbackLocale);
              const notesId = `notes-${item.menuItem.id}`;
              return (
                <li key={item.menuItem.id} className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold leading-snug text-foreground">{name}</p>
                      <p className="mt-0.5 text-sm tabular-nums text-muted-foreground">
                        {formatMoney(Number(item.menuItem.price) * item.quantity, currency, locale)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.menuItem.id)}
                      aria-label={t("removeItem", { name })}
                      className="-mr-2 -mt-2 flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-red-700 dark:hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <label htmlFor={notesId} className="sr-only">
                      {t("itemNotesLabel", { name })}
                    </label>
                    <input
                      id={notesId}
                      type="text"
                      value={item.notes || ""}
                      maxLength={200}
                      onChange={(e) => updateNotes(item.menuItem.id, e.target.value)}
                      placeholder={t("itemNotes")}
                      className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                    />
                    <Stepper
                      value={item.quantity}
                      onChange={(q) => updateQuantity(item.menuItem.id, q)}
                      name={name}
                    />
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="border-t border-border pt-4">
            <label htmlFor="order-notes" className="block text-sm font-semibold text-foreground">
              {t("orderNotes")}
            </label>
            <textarea
              id="order-notes"
              value={orderNotes}
              maxLength={200}
              onChange={(e) => setOrderNotes(e.target.value)}
              placeholder={t("orderNotesPlaceholder")}
              rows={2}
              className="mt-2 w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>
        </>
      )}
    </Sheet>
  );
}
