import { useCallback, useEffect, useState } from 'react';

/**
 * Runs `fetcher(signal)` whenever `deps` change; aborts stale requests.
 * Previous data is kept while reloading to avoid flicker.
 *
 * const { data, error, isLoading, reload } = useFetch((signal) => listX(params, signal), [params]);
 */
export function useFetch(fetcher, deps) {
  const [state, setState] = useState({ data: null, error: null, isLoading: true });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    fetcher(controller.signal)
      .then((data) => setState({ data, error: null, isLoading: false }))
      .catch((error) => {
        if (error.name !== 'AbortError') setState((prev) => ({ ...prev, error, isLoading: false }));
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);
  return { ...state, reload };
}
