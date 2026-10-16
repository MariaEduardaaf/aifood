"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";

interface ConfirmOptions {
  message: string;
  title?: string;
  confirmLabel?: string;
  // Defaults to "Cancel"; pass "Go back" when the action itself is a cancellation
  cancelLabel?: string;
  destructive?: boolean;
}

// In-app replacement for window.confirm().
//   const { confirm, dialog } = useConfirm();
//   if (!(await confirm({ message }))) return;
//   ... render {dialog} once in the component tree.
export function useConfirm() {
  const [state, setState] = useState<
    (ConfirmOptions & { resolve: (ok: boolean) => void }) | null
  >(null);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => setState({ ...options, resolve })),
    [],
  );

  const close = (ok: boolean) => {
    state?.resolve(ok);
    setState(null);
  };

  const dialog: ReactNode = state ? (
    <ConfirmDialog {...state} onClose={close} />
  ) : null;

  return { confirm, dialog };
}

function ConfirmDialog({
  message,
  title,
  confirmLabel,
  cancelLabel,
  destructive = true,
  onClose,
}: ConfirmOptions & { onClose: (ok: boolean) => void }) {
  const t = useTranslations("common");
  const tAdmin = useTranslations("admin");
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="!mt-0 fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={() => onClose(false)}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        onClick={(e) => e.stopPropagation()}
        className="card-premium w-full max-w-sm rounded-2xl p-6"
      >
        <h3 id="confirm-title" className="mb-2 text-lg font-bold text-foreground">
          {title ?? tAdmin("confirmTitle")}
        </h3>
        <p id="confirm-message" className="mb-6 text-sm text-muted-foreground">
          {message}
        </p>
        <div className="flex gap-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={() => onClose(false)}
            className="btn-secondary-premium min-h-[44px] flex-1 rounded-xl py-3 font-medium"
          >
            {cancelLabel ?? t("cancel")}
          </button>
          <button
            type="button"
            onClick={() => onClose(true)}
            className={`min-h-[44px] flex-1 rounded-xl py-3 font-medium ${
              destructive
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : "btn-gold"
            }`}
          >
            {confirmLabel ?? t("delete")}
          </button>
        </div>
      </div>
    </div>
  );
}
