"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";

// Handlers by SSE event name ("order", "call", "refresh"; "message" for unnamed
// events). The reserved "open" handler runs on every (re)connection.
type Handlers = Record<string, (data: unknown) => void>;

const parse = (raw: string): unknown => {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
};

// SSE with visible connection state. Browser auto-reconnects while CONNECTING;
// if the stream is CLOSED we reopen it ourselves, and reload the page after 3
// failures in a row (a stale session then lands on the login page).
// Heartbeats are SSE comments: they keep the socket alive and fire no event.
export function useEventStream(url: string, handlers: Handlers): { lost: boolean } {
  const [lost, setLost] = useState(false);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    let es: EventSource | null = null;
    let failures = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    // Event names are read once per connection; callers pass a fixed set
    const names = Object.keys(handlersRef.current).filter((n) => n !== "open");

    const connect = () => {
      es = new EventSource(url);
      es.onopen = () => {
        failures = 0;
        setLost(false);
        handlersRef.current.open?.(undefined);
      };
      for (const name of names) {
        es.addEventListener(name, (e) => {
          failures = 0;
          setLost(false);
          handlersRef.current[name]?.(parse((e as MessageEvent).data));
        });
      }
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

interface LiveRecord {
  id: string;
  status: string;
}

interface LiveRecordsOptions<T extends LiveRecord> {
  streamUrl: string;
  // Named SSE event carrying one full record ("order" | "call")
  event: string;
  // Which records this screen shows (others are dropped, e.g. DELIVERED)
  keep: (record: T) => boolean;
  sort?: (a: T, b: T) => number;
  // A record appeared or changed status after the first snapshot: alert hook
  onChange?: (record: T, previous: T | undefined) => void;
}

// Live list for staff screens. The stream sends `event: refresh` with the full
// list (on connect and every 30s) and `event: <record>` with one changed
// record, merged in by id.
export function useLiveRecords<T extends LiveRecord>({
  streamUrl,
  event,
  keep,
  sort,
  onChange,
}: LiveRecordsOptions<T>) {
  const [records, setRecords] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const byId = useRef(new Map<string, T>());
  const loaded = useRef(false);
  const opts = useRef({ keep, sort, onChange });
  opts.current = { keep, sort, onChange };

  const commit = useCallback(() => {
    const list = Array.from(byId.current.values());
    if (opts.current.sort) list.sort(opts.current.sort);
    setRecords(list);
  }, []);

  const merge = useCallback(
    (incoming: T[], replace: boolean) => {
      const { keep, onChange } = opts.current;
      const next = replace ? new Map<string, T>() : new Map(byId.current);
      for (const record of incoming) {
        if (!record || typeof record.id !== "string") continue;
        const previous = byId.current.get(record.id);
        if (keep(record)) next.set(record.id, record);
        else next.delete(record.id);
        // Snapshots after a reconnect also alert for what arrived meanwhile
        if (loaded.current && keep(record) && previous?.status !== record.status) {
          onChange?.(record, previous);
        }
      }
      byId.current = next;
      loaded.current = true;
      setLoading(false);
      commit();
    },
    [commit],
  );

  const { lost } = useEventStream(streamUrl, {
    refresh: (data) => {
      if (Array.isArray(data)) merge(data as T[], true);
    },
    [event]: (data) => {
      if (data && typeof data === "object" && !Array.isArray(data)) merge([data as T], false);
    },
  });

  // Optimistic local removal after an action (the stream confirms it)
  const remove = useCallback(
    (id: string) => {
      byId.current.delete(id);
      commit();
    },
    [commit],
  );

  return { records, loading, lost, remove };
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
