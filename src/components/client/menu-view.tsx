"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { ArrowLeft, Loader2, Image as ImageIcon } from "lucide-react";

interface MenuItem {
  id: string;
  name_pt: string;
  name_es: string;
  name_en: string;
  description_pt: string | null;
  description_es: string | null;
  description_en: string | null;
  price: number;
  image_url: string | null;
}

interface Category {
  id: string;
  name_pt: string;
  name_es: string;
  name_en: string;
  items: MenuItem[];
}

interface MenuViewProps {
  onBack: () => void;
}

export function MenuView({ onBack }: MenuViewProps) {
  const t = useTranslations("menu");
  const locale = useLocale();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    fetchMenu();
  }, []);

  const fetchMenu = async () => {
    try {
      const res = await fetch("/api/cardapio");
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
        if (data.length > 0) {
          setSelectedCategory(data[0].id);
        }
      }
    } catch (err) {
      console.error("Error fetching menu:", err);
    } finally {
      setLoading(false);
    }
  };

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

  const getDescription = (item: {
    description_pt: string | null;
    description_es: string | null;
    description_en: string | null;
  }) => {
    switch (locale) {
      case "es":
        return item.description_es;
      case "en":
        return item.description_en;
      default:
        return item.description_pt;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentCategory = categories.find((c) => c.id === selectedCategory);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-border/50">
        <div className="flex items-center gap-3 p-4">
          <button
            onClick={onBack}
            className="p-2.5 rounded-xl hover:bg-secondary transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg sm:text-xl font-bold text-gold">
            {t("title")}
          </h1>
        </div>

        {/* Category Tabs */}
        {categories.length > 0 && (
          <div className="flex overflow-x-auto gap-2 px-4 pb-4 scrollbar-hide">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all min-h-[44px] ${
                  selectedCategory === category.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary/50 text-muted-foreground hover:bg-secondary active:scale-95"
                }`}
              >
                {getName(category)}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Menu Items */}
      <main className="p-4">
        {categories.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">{t("empty")}</p>
          </div>
        ) : currentCategory ? (
          <div className="space-y-4">
            {currentCategory.items.map((item) => (
              <div
                key={item.id}
                className="card-premium rounded-2xl overflow-hidden"
              >
                <div className="flex gap-3 sm:gap-4 p-3 sm:p-4">
                  {/* Image */}
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-secondary flex-shrink-0 overflow-hidden">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={getName(item)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground mb-1 text-sm sm:text-base">
                      {getName(item)}
                    </h3>
                    {getDescription(item) && (
                      <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-2">
                        {getDescription(item)}
                      </p>
                    )}
                    <p className="text-base sm:text-lg font-bold text-primary">
                      R$ {Number(item.price).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </main>
    </div>
  );
}
