"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Options<T> {
  url: string;
  parse?: (raw: string) => T | null;
  enabled?: boolean;
  onMessage?: (item: T) => void;
  /** Give up (set `failed`) after this many consecutive failed connections. */
  maxRetries?: number;
}

const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS = 30_000;

export function useSse<T>({ url, parse, enabled = true, onMessage, maxRetries = 6 }: Options<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [connected, setConnected] = useState(false);
  // True once we've exhausted maxRetries — the UI can show a "reconnect"
  // affordance instead of a perpetual "Reconnecting…".
  const [failed, setFailed] = useState(false);

  // Stash callbacks in refs so the EventSource handlers always read the
  // latest closures without forcing a reconnect on every parent render.
  const parseRef = useRef(parse);
  const onMessageRef = useRef(onMessage);
  useEffect(() => {
    parseRef.current = parse;
    onMessageRef.current = onMessage;
  });

  const esRef = useRef<EventSource | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptsRef = useRef(0);
  // Bumping this forces the connection effect to re-run (manual retry).
  const [cycle, setCycle] = useState(0);

  const retry = useCallback(() => {
    attemptsRef.current = 0;
    setFailed(false);
    setCycle((c) => c + 1);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const clearTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const connect = () => {
      if (cancelled) return;
      const es = new EventSource(url);
      esRef.current = es;

      es.onopen = () => {
        if (cancelled) return;
        attemptsRef.current = 0; // a healthy connection resets the backoff
        setConnected(true);
        setFailed(false);
      };

      es.onmessage = (ev) => {
        try {
          const p = parseRef.current;
          const parsed = p ? p(ev.data) : (JSON.parse(ev.data) as T);
          if (parsed) {
            setItems((prev) => [parsed, ...prev].slice(0, 100));
            onMessageRef.current?.(parsed);
          }
        } catch {
          /* ignore a malformed frame */
        }
      };

      es.onerror = () => {
        if (cancelled) return;
        setConnected(false);
        // Take over reconnection. The browser's built-in EventSource retry is
        // unbounded and has no backoff, so a hard failure — e.g. a 401 after
        // the session expires, which closes the stream — would otherwise loop
        // forever, hammering the endpoint. Close it and reconnect on our own
        // exponential-backoff schedule with a hard cap.
        es.close();
        esRef.current = null;

        if (attemptsRef.current >= maxRetries) {
          setFailed(true); // give up; surface a manual retry to the caller
          return;
        }
        const delay = Math.min(BASE_DELAY_MS * 2 ** attemptsRef.current, MAX_DELAY_MS);
        attemptsRef.current += 1;
        clearTimer();
        timerRef.current = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      cancelled = true;
      clearTimer();
      esRef.current?.close();
      esRef.current = null;
    };
  }, [url, enabled, maxRetries, cycle]);

  return { items, connected, failed, retry };
}