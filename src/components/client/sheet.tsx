"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";

type Slot = ReactNode | ((close: () => void) => ReactNode);

interface SheetProps {
  title: string;
  onClose: () => void;
  // Full-bleed content at the top of the sheet (e.g. a dish photo)
  media?: ReactNode;
  children: Slot;
  footer?: Slot;
}

// Bottom sheet on the native <dialog>: focus trap, Escape, inert page and
// focus restore come from the browser. Mount it to open it; onClose fires
// after the dialog has closed, so the parent unmounts it then.
export function Sheet({ title, onClose, media, children, footer }: SheetProps) {
  const t = useTranslations("common");
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const close = () => ref.current?.close();
  const render = (slot: Slot) => (typeof slot === "function" ? slot(close) : slot);

  return (
    <dialog
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="sheet"
      onClose={onClose}
      onClick={(e) => {
        // Clicks on the dimmed area land on the dialog element itself
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="sheet-panel">
        <div aria-hidden className="absolute left-1/2 top-2 z-10 h-1 w-10 -translate-x-1/2 rounded-full bg-foreground/20" />
        <button
          type="button"
          onClick={close}
          aria-label={t("close")}
          className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-card/90 text-foreground shadow-sm backdrop-blur hover:bg-card"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {media}
          <div className="px-5 pb-6 pt-6">{render(children)}</div>
        </div>
        {footer && (
          <div className="border-t border-border px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {render(footer)}
          </div>
        )}
      </div>
    </dialog>
  );
}
