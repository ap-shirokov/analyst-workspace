import { Wand2, Copy, Trash2, Database } from 'lucide-react';
import CodeEditor from '@/components/CodeEditor';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useLlm } from '@/hooks/useLlm';
import { usePersisted } from '@/hooks/usePersisted';
import { cn } from '@/lib/utils';

const DIALECTS = ['PostgreSQL', 'MySQL', 'SQLite', 'MS SQL Server', 'Oracle', 'ClickHouse'];

const EXAMPLES = [
  'Получить список пользователей, которые не делали заказов за последние 90 дней',
  'Посчитать конверсию воронки продаж по этапам за текущий квартал',
  'Найти дубликаты записей в таблице clients по полям email и phone',
  'Рассчитать скользящее среднее выручки за 7 дней',
];

export default function SqlGenTool() {
  const [desc, setDesc] = usePersisted<string>('sql:desc', 'Получить топ-10 клиентов по сумме заказов за последние 30 дней, с информацией об их последнем заказе');
  const [dialect, setDialect] = usePersisted<string>('sql:dialect', 'PostgreSQL');
  const [output, setOutput] = usePersisted<string>('sql:output', '');
  const { toast } = useToast();
  const { loading, error, generate } = useLlm({ endpoint: '/api/generate/sql' });

  const onGenerate = async () => {
    if (!desc.trim()) return;
    try {
      const result = await generate({ description: desc, dialect });
      setOutput(result);
    } catch {}
  };

  const copy = () => {
    navigator.clipboard.writeText(output);
    toast({ title: 'SQL скопирован' });
  };

  const clear = () => {
    setDesc('');
    setOutput('');
  };

  // Extract raw SQL from markdown code blocks for display
  const displaySql = output
    ? output.replace(/```sql\n?/gi, '').replace(/```\n?/g, '').trim()
    : '';

  return (
    <div className="tool-container">
      <div className="tool-header flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-base font-semibold">SQL Generator</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Генерация SQL-запросов по описанию на естественном языке</p>
        </div>
        <div className="flex items-center gap-2">
          {output && (
            <Button variant="outline" size="sm" onClick={copy} className="h-8 text-xs gap-1.5">
              <Copy size={13} />
              Копировать SQL
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={clear} className="h-8 text-xs gap-1.5">
            <Trash2 size={13} />
            Очистить
          </Button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-0 overflow-hidden min-h-0">
        {/* Left: Input */}
        <div className="flex flex-col border-r border-border min-h-0">
          <div className="p-4 space-y-3 border-b border-border">
            {/* Dialect */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">Диалект:</span>
              {DIALECTS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDialect(d)}
                  className={cn(
                    'px-2.5 py-1 rounded text-xs transition-colors',
                    dialect === d
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                  )}
                  data-testid={`dialect-${d.replace(/\s/g, '-')}`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 p-4 flex flex-col gap-3 overflow-auto">
            <label className="text-xs font-medium text-foreground">Описание запроса</label>
            <textarea
              className="code-textarea flex-1 min-h-[120px]"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Опишите что должен делать запрос...
Например: Найти пользователей, зарегистрированных в 2024 году, с более чем 5 заказами"
              spellCheck={false}
              style={{ fontFamily: 'inherit', fontSize: '13px' }}
              data-testid="sql-description"
            />

            {/* Examples */}
            <div className="space-y-1">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">Примеры</p>
              <div className="space-y-1">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => setDesc(ex)}
                    className="w-full text-left text-xs text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded hover:bg-muted/50 transition-colors truncate"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={onGenerate}
              disabled={loading || !desc.trim()}
              className="w-full gap-2"
              data-testid="sql-generate"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full spinner" />
                  Генерация...
                </>
              ) : (
                <>
                  <Wand2 size={15} />
                  Сгенерировать SQL
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Right: Output */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/30 shrink-0">
            <div className="flex items-center gap-2">
              <Database size={12} className="text-muted-foreground" />
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{dialect} — Результат</span>
            </div>
            {output && (
              <button onClick={copy} className="text-muted-foreground hover:text-foreground transition-colors">
                <Copy size={12} />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-auto">
            {loading && (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full spinner" />
                <p className="text-sm">Генерация SQL...</p>
              </div>
            )}
            {error && !loading && (
              <div className="p-4 m-3 rounded-md badge-error text-xs font-mono">
                Ошибка: {error}
              </div>
            )}
            {!loading && !error && displaySql && (
              <CodeEditor
                value={displaySql}
                lang="sql"
                readOnly
                minHeight="100%"
              />
            )}
            {!loading && !error && !displaySql && (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                <Database size={32} className="opacity-20" />
                <p className="text-sm">Опишите запрос и нажмите «Сгенерировать»</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
