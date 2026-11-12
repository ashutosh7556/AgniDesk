import { useEffect, useState } from 'react';
import { getHealth } from '../services/healthService.js';

/** Polls GET /api/health once on mount. status: 'checking' | 'online' | 'offline' */
export function useApiHealth() {
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    const controller = new AbortController();
    getHealth(controller.signal)
      .then(() => setStatus('online'))
      .catch((error) => {
        if (error.name !== 'AbortError') setStatus('offline');
      });
    return () => controller.abort();
  }, []);

  return status;
}
