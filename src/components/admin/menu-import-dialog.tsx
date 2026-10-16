"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Download, Upload, Loader2, X } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { apiErrorMessage } from "./api-errors";

interface ImportResult {
  created: { categories: number; items: number };
  updated: { items: number };
  errors: { row: number; message: string }[];
}

interface Props {
  restaurantId?: string;
  onClose: () => void;
  onImported: () => void;
}

export function MenuImportDialog({ restaurantId, onClose, onImported }: Props) {
  const t = useTranslations("admin.import");
  const tCommon = useTranslations("common");
  const tErr = useTranslations("errors");
  const tRoot = useTranslations();
  const toast = useToast();
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [csv, setCsv] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const canSubmit = !busy && (file !== null || url.trim() !== "" || csv.trim() !== "");

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      let init: RequestInit;
      if (file) {
        const form = new FormData();
        form.append("file", file);
        if (restaurantId) form.append("restaurantId", restaurantId);
        init = { method: "POST", body: form };
      } else {
        init = {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(csv.trim() ? { csv } : { url: url.trim() }),
            ...(restaurantId ? { restaurantId } : {}),
          }),
        };
      }
      const res = await fetch("/api/admin/menu/import", init);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = apiErrorMessage(res.status, data, tRoot);
        setError(msg);
        toast(msg, "error");
        return;
      }
      setResult(data as ImportResult);
      toast(t("done"), "success");
      onImported();
    } catch {
      setError(tErr("generic"));
      toast(tErr("generic"), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="!mt-0 fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-title"
        className="card-premium my-8 w-full max-w-lg rounded-2xl p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 id="import-title" className="text-xl font-bold text-foreground">
            {t("title")}
          </h3>
          <button
            onClick={onClose}
            aria-label={tCommon("close")}
            className="rounded-lg p-2 transition-colors hover:bg-secondary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {result ? (
          <div className="space-y-4">
            <ul className="grid grid-cols-3 gap-3 text-center">
              {[
                [result.created.categories, t("categoriesCreated")],
                [result.created.items, t("itemsCreated")],
                [result.updated.items, t("itemsUpdated")],
              ].map(([n, label]) => (
                <li key={label} className="rounded-xl border border-border/50 bg-secondary/30 p-3">
                  <p className="text-2xl font-bold text-foreground">{n}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </li>
              ))}
            </ul>
            {result.errors.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium text-destructive">
                  {t("rowErrors", { count: result.errors.length })}
                </p>
                <ul className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-border/50 p-3 text-sm">
                  {result.errors.map((e, i) => (
                    <li key={i} className="text-muted-foreground">
                      <span className="font-medium text-foreground">{t("row", { row: e.row })}</span>{" "}
                      {e.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <button
              onClick={onClose}
              className="btn-gold min-h-[44px] w-full rounded-xl py-3 font-medium"
            >
              {tCommon("close")}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("intro")}</p>
            <a
              href="/menu-template.csv"
              download
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              <Download className="h-4 w-4" />
              {t("downloadTemplate")}
            </a>
            <p className="-mt-2 text-xs text-muted-foreground">{t("templateHint")}</p>

            <div>
              <label htmlFor="import-url" className="mb-2 block text-sm font-medium">
                {t("urlLabel")}
              </label>
              <input
                id="import-url"
                type="url"
                value={url}
                disabled={file !== null || csv.trim() !== ""}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/e/.../pub?output=csv"
                className="w-full rounded-xl border border-border/50 bg-secondary/50 px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
              />
              <p className="mt-1 text-xs text-muted-foreground">{t("urlHint")}</p>
            </div>

            <p className="text-center text-xs uppercase tracking-wide text-muted-foreground">
              {t("or")}
            </p>

            <div>
              <label htmlFor="import-csv" className="mb-2 block text-sm font-medium">
                {t("pasteLabel")}
              </label>
              <textarea
                id="import-csv"
                rows={4}
                value={csv}
                disabled={file !== null}
                onChange={(e) => setCsv(e.target.value)}
                placeholder={t("pastePlaceholder")}
                className="w-full rounded-xl border border-border/50 bg-secondary/50 px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
              />
            </div>

            <p className="text-center text-xs uppercase tracking-wide text-muted-foreground">
              {t("or")}
            </p>

            <label className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border px-4 py-3 text-sm text-foreground hover:bg-secondary/40">
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="truncate">{file ? file.name : t("chooseFile")}</span>
              <input
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="btn-secondary-premium min-h-[44px] flex-1 rounded-xl py-3 font-medium"
              >
                {tCommon("cancel")}
              </button>
              <button
                onClick={submit}
                disabled={!canSubmit}
                className="btn-gold flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl py-3 font-medium disabled:opacity-50"
              >
                {busy && <Loader2 className="h-5 w-5 animate-spin" />}
                {t("run")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
