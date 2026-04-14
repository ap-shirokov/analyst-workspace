import { useState, useMemo } from 'react';
import * as Diff from 'diff';
import { Copy, GitCompare, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

let _left = `GET /api/v1/users/{id}
Описание: Получить пользователя по ID
Параметры:
  - id: integer (required)
Ответ: 200 OK { id, name, email }`;

let _right = `GET /api/v2/users/{userId}
Описание: Получить данные пользователя по идентификатору
Параметры:
  - userId: string (required, UUID формат)
  - include: string[] (optional)
Ответ: 200 OK { id, name, email, createdAt, role }`;

let _mode: 'chars' | 'words' | 'lines' = 'lines';

type DiffMode = 'chars' | 'words' | 'lines';

export default function DiffTool() {
  const [left, setLeft] = useState(_left);
  const [right, setRight] = useState(_right);
  const [mode, setMode] = useState<DiffMode>(_mode);
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
  const clear = () => { setLeft(''); setRight(''); _left = ''; _right = ''; };
  const onLeft = (e: React.ChangeEvent<HTMLTextAreaElement>) => { setLeft(e.target.value); _left = e.target.value; };
  const onRight = (e: React.ChangeEvent<HTMLTextAreaElement>) => { setRight(e.target.value); _right = e.target.value; };

  // Render left panel lines: show removed highlighted, unchanged normal
  const leftLines = useMemo(() => {
    if (!diff || mode !== 'lines') return null;
    const result: { text: string; removed: boolean }[] = [];
    for (const part of diff) {
      if (part.added) continue;
      const lines = part.value.split('\n');
      if (lines[lines.length - 1] === '') lines.pop();
      for (const line of lines) {
        result.push({ text: line, removed: !!part.removed });
      }
    }
    return result;
  }, [diff, mode]);

  // Render right panel lines: show added highlighted, unchanged normal
  const rightLines = useMemo(() => {
    if (!diff || mode !== 'lines') return null;
    const result: { text: string; added: boolean }[] = [];
    for (const part of diff) {
      if (part.removed) continue;
      const lines = part.value.split('\n');
      if (lines[lines.length - 1] === '') lines.pop();
      for (const line of lines) {
        result.push({ text: line, added: !!part.added });
      }
    }
    return result;
  }, [diff, mode]);

  // Word/char inline diff for right panel
  const rightInline = useMemo(() => {
    if (!diff || mode === 'lines') return null;
    return diff.filter(p => !p.removed);
  }, [diff, mode]);

  // Word/char inline diff for left panel
  const leftInline = useMemo(() => {
    if (!diff || mode === 'lines') return null;
    return diff.filter(p => !p.added);
  }, [diff, mode]);

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
              <button key={m} onClick={() => { setMode(m); _mode = m; }}
                className={cn('px-2.5 py-1 rounded text-xs transition-colors',
                  mode === m ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                )}>
                {m === 'lines' ? 'Строки' : m === 'words' ? 'Слова' : 'Символы'}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={clear} className="h-8 text-xs gap-1.5">
            <Trash2 size={13} />Очистить
          </Button>
        </div>
      </div>

      {/* Stats */}
      {diff && (
        <div className="px-4 py-1.5 border-b border-border flex items-center gap-4 text-xs bg-muted/20">
          <GitCompare size={12} className="text-muted-foreground" />
          {hasChanges ? (
            <>
              {stats!.removed > 0 && <span className="text-red-500 dark:text-red-400 font-medium">−{stats!.removed} {stats!.unit}</span>}
              {stats!.added > 0 && <span className="text-green-600 dark:text-green-400 font-medium">+{stats!.added} {stats!.unit}</span>}
            </>
          ) : (
            <span className="text-muted-foreground">Изменений нет — тексты идентичны</span>
          )}
        </div>
      )}

      {/* Input panels */}
      <div className="grid grid-cols-2 border-b border-border" style={{ height: '35%', minHeight: 140 }}>
        {/* Left input */}
        <div className="flex flex-col border-r border-border min-h-0">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/30 shrink-0">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Оригинал</span>
            <button onClick={() => copy(left)} className="text-muted-foreground hover:text-foreground transition-colors"><Copy size={12} /></button>
          </div>
          <textarea className="code-textarea flex-1 rounded-none border-0 resize-none" style={{ borderRadius: 0 }}
            value={left} onChange={onLeft} placeholder="Вставьте исходный текст..." spellCheck={false} />
        </div>
        {/* Right input */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/30 shrink-0">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Изменённый</span>
            <button onClick={() => copy(right)} className="text-muted-foreground hover:text-foreground transition-colors"><Copy size={12} /></button>
          </div>
          <textarea className="code-textarea flex-1 rounded-none border-0 resize-none" style={{ borderRadius: 0 }}
            value={right} onChange={onRight} placeholder="Вставьте изменённый текст..." spellCheck={false} />
        </div>
      </div>

      {/* Diff output */}
      {diff && hasChanges && (
        <div className="flex-1 grid grid-cols-2 overflow-hidden min-h-0">
          {/* Left diff — removed highlighted */}
          <div className="flex flex-col border-r border-border overflow-auto">
            <div className="px-3 py-1.5 border-b border-border bg-muted/30 shrink-0 sticky top-0 z-10">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Оригинал</span>
            </div>
            <pre className="text-xs font-mono flex-1 overflow-auto">
              {mode === 'lines' && leftLines?.map((line, i) => (
                <div key={i} className={cn('flex items-start px-2 leading-6 min-h-[24px]', line.removed ? 'diff-removed' : '')}>
                  <span className="select-none w-4 shrink-0 text-right mr-2 text-muted-foreground/50">
                    {line.removed ? '−' : ''}
                  </span>
                  <span>{line.text || '\u00a0'}</span>
                </div>
              ))}
              {mode !== 'lines' && leftInline?.map((part, i) => (
                <span key={i} className={cn(part.removed ? 'diff-removed rounded-sm px-0.5' : '')}>
                  {part.value}
                </span>
              ))}
            </pre>
          </div>

          {/* Right diff — added highlighted */}
          <div className="flex flex-col overflow-auto">
            <div className="px-3 py-1.5 border-b border-border bg-muted/30 shrink-0 sticky top-0 z-10">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Изменённый</span>
            </div>
            <pre className="text-xs font-mono flex-1 overflow-auto">
              {mode === 'lines' && rightLines?.map((line, i) => (
                <div key={i} className={cn('flex items-start px-2 leading-6 min-h-[24px]', line.added ? 'diff-added' : '')}>
                  <span className="select-none w-4 shrink-0 text-right mr-2 text-muted-foreground/50">
                    {line.added ? '+' : ''}
                  </span>
                  <span>{line.text || '\u00a0'}</span>
                </div>
              ))}
              {mode !== 'lines' && rightInline?.map((part, i) => (
                <span key={i} className={cn(part.added ? 'diff-added rounded-sm px-0.5' : '')}>
                  {part.value}
                </span>
              ))}
            </pre>
          </div>
        </div>
      )}

      {/* Empty state */}
      {(!diff || !hasChanges) && (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          {!diff ? 'Введите тексты выше для сравнения' : 'Тексты идентичны — изменений нет'}
        </div>
      )}
    </div>
  );
}
