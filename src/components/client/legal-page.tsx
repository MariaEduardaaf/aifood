"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";

export interface LegalSection {
  heading: string;
  paragraphs: string[];
}

interface LegalPageProps {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}

// Shared layout for /privacy and /cookies (content comes from the page)
export function LegalPage({ title, updated, intro, sections }: LegalPageProps) {
  const t = useTranslations("legal");
  const router = useRouter();

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-2 py-2">
          <button
            type="button"
            onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}
            aria-label={t("back")}
            className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-foreground/[0.06]"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <p className="truncate text-sm font-medium text-muted-foreground">{title}</p>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-5 pb-16 pt-8">
        <h1 className="text-3xl font-semibold leading-tight tracking-tight text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("updated", { date: updated })}</p>
        <p className="mt-6 max-w-[68ch] text-base leading-relaxed text-foreground/85">{intro}</p>
        {sections.map((section) => (
          <section key={section.heading} className="mt-10">
            <h2 className="text-lg font-semibold text-foreground">{section.heading}</h2>
            {section.paragraphs.map((p, i) => (
              <p key={i} className="mt-3 max-w-[68ch] text-base leading-relaxed text-foreground/85">
                {p}
              </p>
            ))}
          </section>
        ))}
      </main>
    </div>
  );
}
