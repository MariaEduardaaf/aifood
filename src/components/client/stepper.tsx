"use client";

import { useTranslations } from "next-intl";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  // Item name, used in the button labels ("Remove one Croissant")
  name: string;
  min?: number;
  className?: string;
}

export function Stepper({ value, onChange, name, min = 0, className }: StepperProps) {
  const t = useTranslations("menu");
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-card",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label={t("decrease", { name })}
        className="flex h-11 w-11 items-center justify-center rounded-full text-foreground hover:bg-foreground/[0.06] disabled:opacity-40"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span aria-live="polite" className="min-w-[1.75rem] text-center text-base font-semibold tabular-nums">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        aria-label={t("increase", { name })}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
