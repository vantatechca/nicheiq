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

  // Stash callbacks in refs so the EventSource handlers always read the
  // latest closures without forcing a reconnect on every parent render.
  const parseRef = useRef(parse);
  const onMessageRef = useRef(onMessage);
  useEffect(() => {
    parseRef.current = parse;
    onMessageRef.current = onMessage;
  });

  useEffect(() => {
    if (!enabled) return;
    const es = new EventSource(url);
    ref.current = es;
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.onmessage = (ev) => {
      try {
        const p = parseRef.current;
        const parsed = p ? p(ev.data) : (JSON.parse(ev.data) as T);
        if (parsed) {
          setItems((prev) => [parsed, ...prev].slice(0, 100));
          onMessageRef.current?.(parsed);
        }
      } catch {
        /* ignore */
      }
    };
    return () => {
      es.close();
      ref.current = null;
    };
  }, [url, enabled]);

  return { items, connected };
}
