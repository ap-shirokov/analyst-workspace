import { useState, useEffect, useCallback } from 'react';
import { History, Trash2, ChevronDown, ChevronUp, Search, RefreshCw, Database, Code2, FileJson, BookOpen, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import MarkdownOutput from '@/components/MarkdownOutput';
import CodeEditor from '@/components/CodeEditor';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

interface HistoryEntry {
  id: number;
  tool: string;
  title: string;
  input: string;
  output: string;
  createdAt: number;
}

const TOOL_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  sql:          { label: 'SQL Generator',    icon: Database,    color: 'bg-blue-500/20 text-blue-400' },
  openapi:      { label: 'OpenAPI',          icon: FileJson,    color: 'bg-green-500/20 text-green-400' },
  'user-story': { label: 'User Story',       icon: BookOpen,    color: 'bg-purple-500/20 text-purple-400' },
  acceptance:   { label: 'Acceptance',       icon: CheckSquare, color: 'bg-orange-500/20 text-orange-400' },
};

const CODE_TOOLS = new Set(['sql', 'openapi']);

function getCodeLang(tool: string, input: string): 'sql' | 'yaml' | 'json' | 'text' {
  if (tool === 'sql') return 'sql';
  try {
    const parsed = JSON.parse(input);
    if (parsed.format === 'json') return 'json';
  } catch {}
  return 'yaml';
}

function stripCodeFences(text: string): string {
  return text.replace(/^```[\w]*\n?/i, '').replace(/\n?```$/i, '').trim();
}

export default function HistoryTool() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filterTool, setFilterTool] = useState<string>('all');
  const { toast } = useToast();

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/history');
      if (!res.ok) throw new Error('Failed to fetch history');
      const data: HistoryEntry[] = await res.json();
      setEntries(data);
    } catch (e: any) {
      toast({ title: 'Ошибка загрузки истории', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const deleteEntry = async (id: number) => {
    try {
      await fetch(`/api/history/${id}`, { method: 'DELETE' });
      setEntries(prev => prev.filter(e => e.id !== id));
      if (expandedId === id) setExpandedId(null);
      toast({ title: 'Запись удалена' });
    } catch (e: any) {
      toast({ title: 'Ошибка удаления', description: e.message, variant: 'destructive' });
    }
  };

  const clearAll = async () => {
    if (!confirm('Очистить всю историю? Это действие необратимо.')) return;
    try {
      await fetch('/api/history', { method: 'DELETE' });
      setEntries([]);
      setExpandedId(null);
      toast({ title: 'История очищена' });
    } catch (e: any) {
      toast({ title: 'Ошибка', description: e.message, variant: 'destructive' });
    }
  };

  const tools = ['all', ...Array.from(new Set(entries.map(e => e.tool)))];

  const filtered = entries.filter(e => {
    if (filterTool !== 'all' && e.tool !== filterTool) return false;
    if (search) {
      const q = search.toLowerCase();
      return e.title.toLowerCase().includes(q) || e.output.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="tool-container">
      <div className="tool-header">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-base font-semibold">История генераций</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Все результаты AI-генераций сохраняются в локальной SQLite базе данных
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={fetchHistory} className="h-8 text-xs gap-1.5">
              <RefreshCw size={13} />
              Обновить
            </Button>
            {entries.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAll} className="h-8 text-xs gap-1.5 text-destructive hover:text-destructive">
                <Trash2 size={13} />
                Очистить всё
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-xs">
            <Search size={13} className="text-muted-foreground shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по заголовку или результату..."
              className="flex-1 h-7 px-2 text-xs rounded border border-input bg-background"
            />
          </div>

          {/* Tool filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {tools.map(tool => {
              const meta = TOOL_META[tool];
              return (
                <button
                  key={tool}
                  onClick={() => setFilterTool(tool)}
                  className={cn(
                    'px-2.5 py-1 rounded text-xs transition-colors',
                    filterTool === tool
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                  )}
                >
                  {tool === 'all' ? 'Все' : (meta?.label ?? tool)}
                </button>
              );
            })}
          </div>

          <span className="text-xs text-muted-foreground ml-auto shrink-0">
            {filtered.length} из {entries.length}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">Загрузка истории...</p>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
            <History size={40} className="opacity-20" />
            {entries.length === 0 ? (
              <>
                <p className="text-sm font-medium">История пуста</p>
                <p className="text-xs text-center max-w-[280px]">
                  После первой AI-генерации результаты будут сохраняться здесь автоматически
                </p>
              </>
            ) : (
              <p className="text-sm">Ничего не найдено по запросу «{search}»</p>
            )}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="space-y-2 max-w-4xl">
            {filtered.map(entry => {
              const meta = TOOL_META[entry.tool] ?? { label: entry.tool, icon: History, color: 'bg-muted text-muted-foreground' };
              const Icon = meta.icon;
              const isExpanded = expandedId === entry.id;
              const isCode = CODE_TOOLS.has(entry.tool);
              const lang = getCodeLang(entry.tool, entry.input);
              const displayOutput = isCode ? stripCodeFences(entry.output) : entry.output;
              const timeAgo = formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true, locale: ru });

              let inputParsed: Record<string, string> = {};
              try { inputParsed = JSON.parse(entry.input); } catch {}

              return (
                <div
                  key={entry.id}
                  className="rounded-lg border border-border bg-card overflow-hidden"
                >
                  {/* Header row */}
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  >
                    <div className={cn('flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium shrink-0', meta.color)}>
                      <Icon size={11} />
                      {meta.label}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{entry.title}</p>
                      {/* Input params summary */}
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                        {Object.entries(inputParsed)
                          .filter(([k]) => !['description', 'story'].includes(k))
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(' · ')}
                      </p>
                    </div>

                    <span className="text-[11px] text-muted-foreground shrink-0">{timeAgo}</span>

                    <button
                      onClick={(e) => { e.stopPropagation(); deleteEntry(entry.id); }}
                      className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                      title="Удалить"
                    >
                      <Trash2 size={13} />
                    </button>

                    {isExpanded ? <ChevronUp size={14} className="text-muted-foreground shrink-0" /> : <ChevronDown size={14} className="text-muted-foreground shrink-0" />}
                  </div>

                  {/* Expanded output */}
                  {isExpanded && (
                    <div className="border-t border-border">
                      <div className="px-4 py-2 bg-muted/20 border-b border-border">
                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Результат</p>
                      </div>
                      {isCode ? (
                        <CodeEditor value={displayOutput} lang={lang} readOnly minHeight="200px" />
                      ) : (
                        <MarkdownOutput content={displayOutput} />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
