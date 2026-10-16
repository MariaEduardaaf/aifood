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

// SSE with visible connection state. Never reloads the page (a reload while the
// server is down lands on the browser's error page): it retries forever with
// backoff (1s, 2s, 4s ... 15s) and shows the banner from the 2nd failure in a
// row. Before each retry a session check runs; only a 401 leaves for /login.
// The server says `event: bye` before its planned close: reconnect silently.
// Every (re)connection gets a fresh `refresh` snapshot from the server, which
// is the refetch after an outage.
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

    const fail = () => {
      es?.close();
      es = null;
      if (stopped) return;
      failures += 1;
      if (failures >= 2) setLost(true);
      timer = setTimeout(retry, Math.min(1000 * 2 ** (failures - 1), 15_000));
    };

    // Any staff role can read settings, so a 401 here means the session is gone
    const retry = async () => {
      try {
        const res = await fetch("/api/settings", { cache: "no-store" });
        if (stopped) return;
        if (res.status === 401) {
          window.location.assign("/login");
          return;
        }
      } catch {
        fail(); // server unreachable
        return;
      }
      connect();
    };

    const connect = () => {
      if (stopped) return;
      es = new EventSource(url);
      es.onopen = () => {
        failures = 0;
        setLost(false);
        handlersRef.current.open?.(undefined);
      };
      es.addEventListener("bye", () => {
        es?.close();
        connect();
      });
      for (const name of names) {
        es.addEventListener(name, (e) => {
          handlersRef.current[name]?.(parse((e as MessageEvent).data));
        });
      }
      // We manage reconnection ourselves (backoff + session check)
      es.onerror = fail;
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
