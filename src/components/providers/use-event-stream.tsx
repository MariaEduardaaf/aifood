"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";

// SSE with visible connection state. Browser auto-reconnects while CONNECTING;
// if the stream is CLOSED we reopen it ourselves, and reload the page after 3 failures
// (a stale session then lands on the login page).
export function useEventStream(
  url: string,
  onMessage: (event: MessageEvent) => void,
): { lost: boolean } {
  const [lost, setLost] = useState(false);
  const handler = useRef(onMessage);
  handler.current = onMessage;

  useEffect(() => {
    let es: EventSource | null = null;
    let failures = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;

    const connect = () => {
      es = new EventSource(url);
      es.onmessage = (e) => {
        failures = 0;
        setLost(false);
        handler.current(e);
      };
      es.onerror = () => {
        failures += 1;
        setLost(true);
        if (failures >= 3) {
          window.location.reload();
          return;
        }
        if (es && es.readyState === EventSource.CLOSED && !stopped) {
          es.close();
          timer = setTimeout(connect, 3000);
        }
      };
    };
    connect();

    return () => {
      stopped = true;
      clearTimeout(timer);
      es?.close();
    };
  }, [url]);

  return { lost };
}

export function ReconnectBanner({ show }: { show: boolean }) {
  const t = useTranslations("errors");
  if (!show) return null;
  return (
    <div
      role="status"
      className="mb-4 flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-100 px-4 py-2 text-sm font-medium text-amber-900 dark:bg-amber-500/15 dark:text-amber-200"
    >
      <AlertTriangle className="h-4 w-4 shrink-0" />
      {t("reconnecting")}
    </div>
  );
}
