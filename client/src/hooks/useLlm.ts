import { useState, useCallback } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { getSelectedModel } from '@/hooks/useOllamaModel';

interface UseLlmOptions {
  endpoint: string;
}

interface LlmState {
  output: string;
  loading: boolean;
  error: string | null;
}

export function useLlm({ endpoint }: UseLlmOptions) {
  const [state, setState] = useState<LlmState>({
    output: '',
    loading: false,
    error: null,
  });

  const generate = useCallback(
    async (payload: Record<string, string>) => {
      setState({ output: '', loading: true, error: null });
      try {
        const model = getSelectedModel();
        const res = await apiRequest('POST', endpoint, { ...payload, ...(model ? { model } : {}) });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setState({ output: data.result || '', loading: false, error: null });
        return data.result as string;
      } catch (e: any) {
        const msg = e.message || 'Ошибка генерации';
        setState({ output: '', loading: false, error: msg });
        throw e;
      }
    },
    [endpoint]
  );

  return { ...state, generate };
}
