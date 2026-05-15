"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api-client/fetcher";

export interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
  refetch: () => void;
}

/**
 * Fetch GET /path on mount. Returns { data, loading, error, refetch }.
 * Auto-cancels the request if the component unmounts mid-fetch.
 *
 * Usage:
 *   const { data: opp, loading, error } = useApi<{ opportunity: Opportunity }>(`/api/opportunities/${id}`);
 */
export function useApi<T>(path: string | null): UseApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!path) {
      setLoading(false);
      return;
    }
    const ac = new AbortController();
    setLoading(true);
    setError(null);

    api
      .get<T>(path, { signal: ac.signal })
      .then((d) => {
        if (!ac.signal.aborted) setData(d);
      })
      .catch((err) => {
        if (ac.signal.aborted) return;
        if (err instanceof ApiError) setError(err);
        else setError(new ApiError((err as Error).message ?? "Fetch failed", 0));
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });

    return () => ac.abort();
  }, [path, tick]);

  return { data, loading, error, refetch: () => setTick((t) => t + 1) };
}
