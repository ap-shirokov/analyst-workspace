import { useState, useCallback } from 'react';
import { v4 as uuidv4, v1 as uuidv1 } from 'uuid';
import { Copy, RefreshCw, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Persisted state
let _uuids: string[] = [];
let _version: 'v4' | 'v1' = 'v4';
let _count = 1;

const generate = (version: 'v4' | 'v1', count: number): string[] =>
  Array.from({ length: count }, () => (version === 'v4' ? uuidv4() : uuidv1()));

export default function UuidTool() {
  const [uuids, setUuids] = useState<string[]>(() => {
    if (_uuids.length === 0) _uuids = generate('v4', 1);
    return _uuids;
  });
  const [version, setVersion] = useState<'v4' | 'v1'>(_version);
  const [count, setCount] = useState(_count);
  const [uppercase, setUppercase] = useState(false);
  const [noBraces, setNoBraces] = useState(false);
  const { toast } = useToast();

  const gen = useCallback((v = version, c = count) => {
    const result = generate(v, c);
    setUuids(result);
    _uuids = result;
  }, [version, count]);

  const format = (uid: string) => {
    let s = uid;
    if (noBraces) s = s.replace(/-/g, '');
    if (uppercase) s = s.toUpperCase();
    return s;
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'UUID скопирован' });
  };

  const copyAll = () => {
    navigator.clipboard.writeText(uuids.map(format).join('\n'));
    toast({ title: `${uuids.length} UUID скопированы` });
  };

  const addMore = () => {
    const extra = generate(version, count);
    const next = [...uuids, ...extra];
    setUuids(next);
    _uuids = next;
  };

  const clear = () => {
    setUuids([]);
    _uuids = [];
  };

  const onVersionChange = (v: 'v4' | 'v1') => {
    setVersion(v);
    _version = v;
    gen(v, count);
  };

  const onCountChange = (c: number) => {
    const n = Math.max(1, Math.min(100, c));
    setCount(n);
    _count = n;
  };

  return (
    <div className="tool-container">
      <div className="tool-header">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-base font-semibold">UUID Generator</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Генерация уникальных идентификаторов</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={copyAll} disabled={uuids.length === 0} className="h-8 text-xs gap-1.5">
              <Copy size={13} />
              Копировать все
            </Button>
            <Button variant="ghost" size="sm" onClick={clear} className="h-8 text-xs gap-1.5">
              <Trash2 size={13} />
              Очистить
            </Button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Version */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Версия:</span>
            {(['v4', 'v1'] as const).map((v) => (
              <button
                key={v}
                onClick={() => onVersionChange(v)}
                className={cn(
                  'px-3 py-1 rounded text-xs font-medium transition-colors',
                  version === v
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                )}
                data-testid={`version-${v}`}
              >
                {v.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Count */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Количество:</span>
            <input
              type="number"
              min={1}
              max={100}
              value={count}
              onChange={(e) => onCountChange(Number(e.target.value))}
              className="w-16 h-7 px-2 text-xs rounded border border-input bg-background text-center"
              data-testid="count-input"
            />
          </div>

          {/* Format options */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={uppercase}
                onChange={(e) => setUppercase(e.target.checked)}
                className="w-3 h-3"
              />
              <span className="text-muted-foreground">UPPERCASE</span>
            </label>
            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={noBraces}
                onChange={(e) => setNoBraces(e.target.checked)}
                className="w-3 h-3"
              />
              <span className="text-muted-foreground">Без дефисов</span>
            </label>
          </div>

          <Button size="sm" onClick={() => gen()} className="h-8 text-xs gap-1.5">
            <RefreshCw size={13} />
            Сгенерировать
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-1.5 max-w-3xl">
          {uuids.map((uid, i) => (
            <div
              key={i}
              className="group flex items-center gap-3 px-4 py-2.5 rounded-md bg-card border border-border hover:border-primary/30 transition-all"
              data-testid={`uuid-item-${i}`}
            >
              <span className="text-[11px] text-muted-foreground w-6 text-right shrink-0 font-mono">
                {i + 1}
              </span>
              <span className="uuid-item flex-1 text-foreground select-all">
                {format(uid)}
              </span>
              <button
                onClick={() => copy(format(uid))}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
                title="Копировать"
              >
                <Copy size={13} />
              </button>
            </div>
          ))}

          {uuids.length > 0 && (
            <button
              onClick={addMore}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-xs text-muted-foreground hover:text-primary mt-2"
              data-testid="add-more"
            >
              <Plus size={13} />
              Добавить ещё {count}
            </button>
          )}

          {uuids.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Нажмите «Сгенерировать» для создания UUID
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
