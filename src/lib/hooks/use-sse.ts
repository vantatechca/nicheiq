"use client";

import { useEffect, useRef, useState } from "react";

interface Options<T> {
  url: string;
  parse?: (raw: string) => T | null;
  enabled?: boolean;
  onMessage?: (item: T) => void;
}

export function useSse<T>({ url, parse, enabled = true, onMessage }: Options<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [connected, setConnected] = useState(false);
  const ref = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const es = new EventSource(url);
    ref.current = es;
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.onmessage = (ev) => {
      try {
        const parsed = parse ? parse(ev.data) : (JSON.parse(ev.data) as T);
        if (parsed) {
          setItems((prev) => [parsed, ...prev].slice(0, 100));
          onMessage?.(parsed);
        }
      } catch {
        /* ignore */
      }
    };
    return () => {
      es.close();
      ref.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, enabled]);

  return { items, connected };
}
