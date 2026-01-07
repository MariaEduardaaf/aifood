"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  X,
  Minus,
  Plus,
  Trash2,
  Loader2,
  ShoppingCart,
  Check,
  Image as ImageIcon,
} from "lucide-react";
import { useCart } from "./cart-context";

interface CartModalProps {
  tableId: string;
  onClose: () => void;
  onOrderSuccess: () => void;
}

export function CartModal({ tableId, onClose, onOrderSuccess }: CartModalProps) {
  const t = useTranslations("cart");
  const locale = useLocale();
  const {
    items,
    updateQuantity,
    updateNotes,
    removeItem,
    clearCart,
    total,
    itemCount,
  } = useCart();

  const [orderNotes, setOrderNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const getName = (item: {
    name_pt: string;
    name_es: string;
    name_en: string;
  }) => {
    switch (locale) {
      case "es":
        return item.name_es;
      case "en":
        return item.name_en;
      default:
        return item.name_pt;
    }
  };

  const handleSubmitOrder = async () => {
    if (items.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId,
          items: items.map((item) => ({
            menuItemId: item.menuItem.id,
            quantity: item.quantity,
            notes: item.notes || undefined,
          })),
          notes: orderNotes || undefined,
        }),
      });

      const data = await res.json();

      if (res.status === 429) {
        setError(data.message || t("rateLimitError"));
        return;
      }

      if (!res.ok) {
        setError(data.error || t("orderError"));
        return;
      }

      // Sucesso
      setSuccess(true);
      clearCart();

      // Fechar apos 2 segundos
      setTimeout(() => {
        onOrderSuccess();
      }, 2000);
    } catch (err) {
      console.error("Error submitting order:", err);
      setError(t("orderError"));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="card-premium rounded-2xl p-8 w-full max-w-md text-center animate-in fade-in zoom-in duration-300">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/20 mb-6">
            <Check className="h-10 w-10 text-green-500" />
          </div>
          <h3 className="text-2xl font-bold text-foreground mb-2">
            {t("orderSuccess")}
          </h3>
          <p className="text-muted-foreground">{t("orderSuccessMessage")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="card-premium rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col animate-in slide-in-from-bottom sm:fade-in sm:zoom-in duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold text-foreground">{t("title")}</h3>
            <span className="px-2 py-0.5 bg-primary/10 text-primary text-sm rounded-full font-medium">
              {itemCount}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">{t("emptyCart")}</p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.menuItem.id}
                className="flex gap-3 p-3 rounded-xl bg-secondary/30 border border-border/30"
              >
                {/* Image */}
                <div className="w-16 h-16 rounded-lg bg-secondary flex-shrink-0 overflow-hidden">
                  {item.menuItem.image_url ? (
                    <img
                      src={item.menuItem.image_url}
                      alt={getName(item.menuItem)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="h-5 w-5 text-muted-foreground/30" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-foreground text-sm truncate">
                    {getName(item.menuItem)}
                  </h4>
                  <p className="text-sm text-primary font-bold">
                    R$ {(Number(item.menuItem.price) * item.quantity).toFixed(2)}
                  </p>

                  {/* Notes input */}
                  <input
                    type="text"
                    value={item.notes || ""}
                    onChange={(e) =>
                      updateNotes(item.menuItem.id, e.target.value)
                    }
                    placeholder={t("itemNotes")}
                    className="mt-2 w-full px-2 py-1 text-xs rounded-lg bg-background/50 border border-border/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                </div>

                {/* Quantity Controls */}
                <div className="flex flex-col items-end justify-between">
                  <button
                    onClick={() => removeItem(item.menuItem.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  <div className="flex items-center gap-1 bg-secondary rounded-lg">
                    <button
                      onClick={() =>
                        updateQuantity(item.menuItem.id, item.quantity - 1)
                      }
                      className="p-1.5 rounded-lg hover:bg-secondary/80 transition-colors"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-6 text-center text-sm font-bold">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        updateQuantity(item.menuItem.id, item.quantity + 1)
                      }
                      className="p-1.5 rounded-lg hover:bg-secondary/80 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Order Notes */}
          {items.length > 0 && (
            <div className="pt-4 border-t border-border/50">
              <label className="block text-sm font-medium text-foreground mb-2">
                {t("orderNotes")}
              </label>
              <textarea
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder={t("orderNotesPlaceholder")}
                className="w-full px-3 py-2 text-sm rounded-xl bg-secondary/50 border border-border/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                rows={2}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-4 border-t border-border/50 space-y-4">
            {/* Error */}
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-sm">
                {error}
              </div>
            )}

            {/* Total */}
            <div className="flex items-center justify-between">
              <span className="text-lg font-medium text-muted-foreground">
                {t("total")}
              </span>
              <span className="text-2xl font-bold text-primary">
                R$ {total.toFixed(2)}
              </span>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmitOrder}
              disabled={loading || items.length === 0}
              className="w-full btn-gold py-4 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Check className="h-5 w-5" />
                  {t("submitOrder")}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
