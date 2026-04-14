import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

// Module-level persisted model selection
let _selectedModel: string | null = null;

export function getSelectedModel(): string | null {
  return _selectedModel;
}

export function setSelectedModel(model: string) {
  _selectedModel = model;
}

export interface OllamaInfo {
  models: string[];
  current: string;
  url: string;
}

export function useOllamaModels() {
  return useQuery<OllamaInfo>({
    queryKey: ['/api/ollama/models'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/ollama/models');
      return res.json();
    },
    retry: 1,
    staleTime: 30_000,
  });
}
