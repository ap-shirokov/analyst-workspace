import { useState, useMemo } from 'react';
import * as Diff from 'diff';
import { Copy, GitCompare, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { usePersisted } from '@/hooks/usePersisted';
import { cn } from '@/lib/utils';
import CodeEditor from '@/components/CodeEditor';

type DiffMode = 'chars' | 'words' | 'lines';

const DEFAULT_LEFT = `GET /api/v1/users/{id}
Описание: Получить пользователя по ID
Параметры:
  - id: integer (required)
Ответ: 200 OK { id, name, email }`;

const DEFAULT_RIGHT = `GET /api/v2/users/{userId}
Описание: Получить данные пользователя по идентификатору
Параметры:
  - userId: string (required, UUID формат)
  - include: string[] (optional)
Ответ: 200 OK { id, name, email, createdAt, role }`;

export default function DiffTool() {
  const [left, setLeft] = usePersisted('aw_diff_left', DEFAULT_LEFT);
  const [right, setRight] = usePersisted('aw_diff_right', DEFAULT_RIGHT);
  const [mode, setMode] = usePersisted<DiffMode>('aw_diff_mode', 'lines');
  const { toast } = useToast();

  const diff = useMemo(() => {
    if (!left && !right) return null;
    switch (mode) {
      case 'chars': return Diff.diffChars(left, right);
      case 'words': return Diff.diffWords(left, right);
      case 'lines': return Diff.diffLines(left, right);
    }
  }, [left, right, mode]);

  const stats = useMemo(() => {
    if (!diff) return null;
    const added = diff.filter(p => p.added).reduce((s, p) => s + (p.count || 0), 0);
    const removed = diff.filter(p => p.removed).reduce((s, p) => s + (p.count || 0), 0);
    const unit = mode === 'lines' ? 'строк' : mode === 'words' ? 'слов' : 'символов';
    return { added, removed, unit };
  }, [diff, mode]);

  const hasChanges = diff?.some(p => p.added || p.removed);
  const copy = (text: string) => { navigator.clipboard.writeText(text); toast({ title: 'Скопировано' }); };
  const clear = () => { setLeft(''); setRight(''); };

  const leftLines = useMemo(() => {
    if (!diff || mode !== 'lines') return null;
    const result: { text: string; removed: boolean }[] = [];
    for (const part of diff) {
      if (part.added) continue;
      const lines = part.value.split('\n');
      if (lines[lines.length - 1] === '') lines.pop();
      for (const line of lines) result.push({ text: line, removed: !!part.removed });
    }
    return result;
  }, [diff, mode]);

  const rightLines = useMemo(() => {
    if (!diff || mode !== 'lines') return null;
    const result: { text: string; added: boolean }[] = [];
    for (const part of diff) {
      if (part.removed) continue;
      const lines = part.value.split('\n');
      if (lines[lines.length - 1] === '') lines.pop();
      for (const line of lines) result.push({ text: line, added: !!part.added });
    }
    return result;
  }, [diff, mode]);

  const leftInline = useMemo(() => diff && mode !== 'lines' ? diff.filter(p => !p.added) : null, [diff, mode]);
  const rightInline = useMemo(() => diff && mode !== 'lines' ? diff.filter(p => !p.removed) : null, [diff, mode]);

  return (
    <div className="tool-container">
      <div className="tool-header flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-base font-semibold">Diff Checker</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Сравнение текстов и спецификаций</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground mr-1">Режим:</span>
            {(['lines', 'words', 'chars'] as DiffMode[]).map((m) => (
              <button key={m} onClick={() => setMode(m)}
                className={cn('px-2.5 py-1 rounded text-xs transition-colors',
                  mode === m ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80 text-muted-foreground')}>
                {m === 'lines' ? 'Строки' : m === 'words' ? 'Слова' : 'Символы'}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={clear} className="h-8 text-xs gap-1.5">
            <Trash2 size={13} />Очистить
          </Button>
        </div>
      </div>

      {diff && (
        <div className="px-4 py-1.5 border-b border-border flex items-center gap-4 text-xs bg-muted/20">
          <GitCompare size={12} className="text-muted-foreground" />
          {hasChanges ? (
            <>
              {stats!.removed > 0 && <span className="text-red-500 dark:text-red-400 font-medium">−{stats!.removed} {stats!.unit}</span>}
              {stats!.added > 0 && <span className="text-green-600 dark:text-green-400 font-medium">+{stats!.added} {stats!.unit}</span>}
            </>
          ) : <span className="text-muted-foreground">Тексты идентичны</span>}
        </div>
      )}

      {/* Input panels */}
      <div className="grid grid-cols-2 border-b border-border" style={{ height: '35%', minHeight: 140 }}>
        <div className="flex flex-col border-r border-border min-h-0 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/30 shrink-0">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Оригинал</span>
            <button onClick={() => copy(left)} className="text-muted-foreground hover:text-foreground"><Copy size={12} /></button>
          </div>
          <div className="flex-1 overflow-auto">
            <CodeEditor value={left} onChange={setLeft} lang="text" placeholder="Вставьте исходный текст..." minHeight="100%" />
          </div>
        </div>
        <div className="flex flex-col min-h-0 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/30 shrink-0">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Изменённый</span>
            <button onClick={() => copy(right)} className="text-muted-foreground hover:text-foreground"><Copy size={12} /></button>
          </div>
          <div className="flex-1 overflow-auto">
            <CodeEditor value={right} onChange={setRight} lang="text" placeholder="Вставьте изменённый текст..." minHeight="100%" />
          </div>
        </div>
      </div>

      {/* Diff output */}
      {diff && hasChanges ? (
        <div className="flex-1 grid grid-cols-2 overflow-hidden min-h-0">
          <div className="flex flex-col border-r border-border overflow-auto">
            <div className="px-3 py-1.5 border-b border-border bg-muted/30 shrink-0 sticky top-0 z-10">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Оригинал — изменения</span>
            </div>
            <pre className="text-xs font-mono flex-1 overflow-auto p-1">
              {mode === 'lines' && leftLines?.map((line, i) => (
                <div key={i} className={cn('flex items-start px-2 leading-6 min-h-[24px]', line.removed ? 'diff-removed' : '')}>
                  <span className="select-none w-4 shrink-0 text-right mr-2 text-muted-foreground/50">{line.removed ? '−' : ''}</span>
                  <span>{line.text || '\u00a0'}</span>
                </div>
              ))}
              {mode !== 'lines' && leftInline?.map((part, i) => (
                <span key={i} className={cn(part.removed ? 'diff-removed rounded-sm px-0.5' : '')}>{part.value}</span>
              ))}
            </pre>
          </div>
          <div className="flex flex-col overflow-auto">
            <div className="px-3 py-1.5 border-b border-border bg-muted/30 shrink-0 sticky top-0 z-10">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Изменённый — изменения</span>
            </div>
            <pre className="text-xs font-mono flex-1 overflow-auto p-1">
              {mode === 'lines' && rightLines?.map((line, i) => (
                <div key={i} className={cn('flex items-start px-2 leading-6 min-h-[24px]', line.added ? 'diff-added' : '')}>
                  <span className="select-none w-4 shrink-0 text-right mr-2 text-muted-foreground/50">{line.added ? '+' : ''}</span>
                  <span>{line.text || '\u00a0'}</span>
                </div>
              ))}
              {mode !== 'lines' && rightInline?.map((part, i) => (
                <span key={i} className={cn(part.added ? 'diff-added rounded-sm px-0.5' : '')}>{part.value}</span>
              ))}
            </pre>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          {!diff ? 'Введите тексты выше для сравнения' : 'Тексты идентичны — изменений нет'}
        </div>
      )}
    </div>
  );
}
