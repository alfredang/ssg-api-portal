import { useState, useCallback } from 'react';
import axios from 'axios';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useApi<T = unknown>() {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async (apiCall: () => Promise<T>) => {
    setState({ data: null, loading: true, error: null });
    try {
      const result = await apiCall();
      setState({ data: result, loading: false, error: null });
      return result;
    } catch (err: unknown) {
      let message: string;
      if (axios.isAxiosError(err) && err.response?.data) {
        const errData = err.response.data;
        const rawError = errData?.error;
        if (typeof rawError === 'string') {
          // Plain string error from our proxy e.g. "SSG API error: 403"
          message = rawError;
        } else if (rawError && typeof rawError === 'object') {
          // Structured SSG error object: { code, message, details }
          const detail = (rawError as any).details?.[0]?.message;
          message = detail || (rawError as any).message || JSON.stringify(rawError);
        } else if (typeof errData?.message === 'string') {
          message = errData.message;
        } else {
          message = err.message || 'An unexpected error occurred';
        }
      } else if (err instanceof Error) {
        message = err.message;
      } else {
        message = 'An unexpected error occurred';
      }
      setState({ data: null, loading: false, error: message });
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return { ...state, execute, reset };
}
