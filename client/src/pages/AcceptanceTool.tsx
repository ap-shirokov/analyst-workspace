import { Wand2, Copy, Trash2, CheckSquare } from 'lucide-react';
import MarkdownOutput from '@/components/MarkdownOutput';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useLlm } from '@/hooks/useLlm';
import { usePersisted } from '@/hooks/usePersisted';
import { cn } from '@/lib/utils';

const EXAMPLES = [
  'Как пользователь, я хочу фильтровать список товаров по цене и категории',
  'Как администратор, я хочу экспортировать отчёт в Excel',
  'Как клиент, я хочу отследить статус моей доставки в реальном времени',
  'Как менеджер, я хочу назначить задачу сотруднику и установить дедлайн',
];

export default function AcceptanceTool() {
  const [story, setStory] = usePersisted<string>('acceptance:story', 'Как зарегистрированный пользователь, я хочу восстановить пароль через email, чтобы получить доступ к аккаунту если забыл пароль');
  const [format, setFormat] = usePersisted<'gherkin' | 'checklist' | 'both'>('acceptance:format', 'gherkin');
  const [context, setContext] = usePersisted<string>('acceptance:context', '');
  const [output, setOutput] = usePersisted<string>('acceptance:output', '');
  const { toast } = useToast();
  const { loading, error, generate } = useLlm({ endpoint: '/api/generate/acceptance' });

  const onGenerate = async () => {
    if (!story.trim()) return;
    try {
      const result = await generate({ story, format, context });
      setOutput(result);
    } catch {}
  };

  const copy = () => {
    navigator.clipboard.writeText(output);
    toast({ title: 'Acceptance Criteria скопированы' });
  };

  const clear = () => {
    setStory('');
    setOutput('');
    setContext('');
  };

  return (
    <div className="tool-container">
      <div className="tool-header flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-base font-semibold">Acceptance Criteria Generator</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Генерация критериев приёмки на основе пользовательских историй</p>
        </div>
        <div className="flex items-center gap-2">
          {output && (
            <Button variant="outline" size="sm" onClick={copy} className="h-8 text-xs gap-1.5">
              <Copy size={13} />
              Копировать
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={clear} className="h-8 text-xs gap-1.5">
            <Trash2 size={13} />
            Очистить
          </Button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-0 overflow-hidden min-h-0">
        {/* Left */}
        <div className="flex flex-col border-r border-border min-h-0">
          <div className="p-4 space-y-3 border-b border-border shrink-0">
            {/* Format */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">Формат:</span>
              {([
                { value: 'gherkin', label: 'Gherkin (Given/When/Then)' },
                { value: 'checklist', label: 'Чеклист' },
                { value: 'both', label: 'Оба формата' },
              ] as const).map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setFormat(value)}
                  className={cn(
                    'px-2.5 py-1 rounded text-xs transition-colors',
                    format === value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 p-4 flex flex-col gap-3 overflow-auto">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1.5">User Story</label>
              <textarea
                className="code-textarea"
                style={{ minHeight: '90px', fontFamily: 'inherit', fontSize: '13px' }}
                value={story}
                onChange={(e) => setStory(e.target.value)}
                placeholder="Как [роль], я хочу [действие], чтобы [ценность]"
                spellCheck={false}
                data-testid="ac-story"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-foreground block mb-1.5">
                Дополнительный контекст{' '}
                <span className="text-muted-foreground font-normal">(опционально)</span>
              </label>
              <textarea
                className="code-textarea"
                style={{ minHeight: '70px', fontFamily: 'inherit', fontSize: '13px' }}
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Бизнес-правила, ограничения, технические детали, edge cases..."
                spellCheck={false}
                data-testid="ac-context"
              />
            </div>

            <div className="space-y-1">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">Примеры</p>
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setStory(ex)}
                  className="w-full text-left text-xs text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded hover:bg-muted/50 transition-colors"
                  style={{ whiteSpace: 'normal' }}
                >
                  {ex}
                </button>
              ))}
            </div>

            <Button
              onClick={onGenerate}
              disabled={loading || !story.trim()}
              className="w-full gap-2"
              data-testid="ac-generate"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full spinner" />
                  Генерация...
                </>
              ) : (
                <>
                  <Wand2 size={15} />
                  Сгенерировать AC
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Right: Output */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/30 shrink-0">
            <div className="flex items-center gap-2">
              <CheckSquare size={12} className="text-muted-foreground" />
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                Acceptance Criteria —{' '}
                {format === 'gherkin' ? 'Gherkin' : format === 'checklist' ? 'Чеклист' : 'Gherkin + Чеклист'}
              </span>
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
                <p className="text-sm">Генерация критериев приёмки...</p>
              </div>
            )}
            {error && !loading && (
              <div className="p-4 m-3 rounded-md badge-error text-xs">Ошибка: {error}</div>
            )}
            {!loading && !error && output && (
              <MarkdownOutput content={output} />
            )}
            {!loading && !error && !output && (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                <CheckSquare size={32} className="opacity-20" />
                <p className="text-sm">Введите User Story и нажмите «Сгенерировать»</p>
                <p className="text-xs text-center max-w-[240px]">
                  Поддерживаются форматы Gherkin (Given/When/Then) и простой чеклист
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
