import { useOllamaModels, getSelectedModel, setSelectedModel } from '@/hooks/useOllamaModel';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Bot, ChevronDown, AlertCircle } from 'lucide-react';

interface Props {
  collapsed: boolean;
}

export default function OllamaStatus({ collapsed }: Props) {
  const { data, isLoading, isError } = useOllamaModels();
  const [selected, setSelected] = useState<string>('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (data) {
      const saved = getSelectedModel();
      const initial = saved && data.models.includes(saved) ? saved : data.current;
      setSelected(initial);
      setSelectedModel(initial);
    }
  }, [data]);

  const onSelect = (model: string) => {
    setSelected(model);
    setSelectedModel(model);
    setOpen(false);
  };

  if (collapsed) {
    return (
      <div className="flex justify-center px-2 py-1.5">
        <div className={cn(
          'w-2 h-2 rounded-full',
          isLoading ? 'bg-yellow-400' : isError ? 'bg-red-500' : 'bg-green-400'
        )} title={isError ? 'Ollama недоступна' : selected} />
      </div>
    );
  }

  return (
    <div className="px-2 py-2 border-t border-sidebar-border">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Bot size={11} className="text-[hsl(var(--sidebar-foreground))] opacity-50 shrink-0" />
        <span className="text-[10px] uppercase tracking-widest font-semibold text-[hsl(var(--sidebar-foreground))] opacity-40">
          Ollama
        </span>
        <div className={cn(
          'w-1.5 h-1.5 rounded-full ml-auto shrink-0',
          isLoading ? 'bg-yellow-400' : isError ? 'bg-red-500' : 'bg-green-400'
        )} />
      </div>

      {isError ? (
        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded text-[11px] badge-error">
          <AlertCircle size={11} />
          <span>Ollama не запущена</span>
        </div>
      ) : isLoading ? (
        <div className="px-2 py-1.5 text-[11px] text-[hsl(var(--sidebar-foreground))] opacity-40">
          Подключение...
        </div>
      ) : data && data.models.length > 0 ? (
        <div className="relative">
          <button
            onClick={() => setOpen((p) => !p)}
            className="w-full flex items-center justify-between gap-1 px-2 py-1.5 rounded text-[11px] font-mono
              text-[hsl(var(--sidebar-foreground))] bg-[hsl(var(--sidebar-accent))] hover:brightness-110 transition-all truncate"
          >
            <span className="truncate">{selected || data.current}</span>
            <ChevronDown size={11} className={cn('shrink-0 transition-transform', open && 'rotate-180')} />
          </button>

          {open && (
            <div className="absolute bottom-full left-0 right-0 mb-1 rounded border border-sidebar-border
              bg-[hsl(var(--sidebar-background))] shadow-lg z-50 max-h-48 overflow-y-auto">
              {data.models.map((m) => (
                <button
                  key={m}
                  onClick={() => onSelect(m)}
                  className={cn(
                    'w-full text-left px-2.5 py-1.5 text-[11px] font-mono truncate transition-colors',
                    'text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))]',
                    m === selected && 'text-[hsl(var(--sidebar-primary))] font-medium'
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="px-2 py-1.5 text-[11px] text-[hsl(var(--sidebar-foreground))] opacity-40 font-mono">
          {data?.current || OLLAMA_MODEL_ENV}
        </div>
      )}
    </div>
  );
}

// Fallback display if models list is empty
const OLLAMA_MODEL_ENV = 'llama3';
