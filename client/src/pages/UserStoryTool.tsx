import { useState } from 'react';
import { Wand2, Copy, Trash2, BookOpen } from 'lucide-react';
import MarkdownOutput from '@/components/MarkdownOutput';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useLlm } from '@/hooks/useLlm';
import { cn } from '@/lib/utils';

// Persisted state
let _desc = 'Пользователь должен иметь возможность восстановить пароль через email, получить одноразовую ссылку и установить новый пароль';
let _type: 'story' | 'usecase' | 'both' = 'both';
let _role = 'Пользователь системы';
let _output = '';

const EXAMPLES = [
  'Пользователь хочет отфильтровать список заказов по дате и статусу',
  'Администратор должен видеть сводный дашборд с KPI за выбранный период',
  'Клиент оформляет возврат товара с указанием причины',
  'Сотрудник загружает и подписывает документ в системе ЭДО',
];

const ROLES = ['Пользователь системы', 'Администратор', 'Клиент', 'Менеджер', 'Аналитик', 'Оператор'];

export default function UserStoryTool() {
  const [desc, setDesc] = useState(_desc);
  const [type, setType] = useState<'story' | 'usecase' | 'both'>(_type);
  const [role, setRole] = useState(_role);
  const [output, setOutput] = useState(_output);
  const { toast } = useToast();
  const { loading, error, generate } = useLlm({ endpoint: '/api/generate/user-story' });

  const onGenerate = async () => {
    if (!desc.trim()) return;
    try {
      const result = await generate({ description: desc, type, role });
      setOutput(result);
      _output = result;
    } catch {}
  };

  const copy = () => {
    navigator.clipboard.writeText(output);
    toast({ title: 'Скопировано' });
  };

  const clear = () => {
    setDesc('');
    setOutput('');
    _desc = '';
    _output = '';
  };

  return (
    <div className="tool-container">
      <div className="tool-header flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-base font-semibold">User Story / Use Case Generator</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Генерация пользовательских историй и сценариев использования</p>
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
            {/* Type */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Тип:</span>
              {([
                { value: 'story', label: 'User Story' },
                { value: 'usecase', label: 'Use Case' },
                { value: 'both', label: 'Оба' },
              ] as const).map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => { setType(value); _type = value; }}
                  className={cn(
                    'px-2.5 py-1 rounded text-xs transition-colors',
                    type === value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Role */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground shrink-0">Роль актора:</span>
              <input
                value={role}
                onChange={(e) => { setRole(e.target.value); _role = e.target.value; }}
                className="flex-1 min-w-[160px] h-7 px-2 text-xs rounded border border-input bg-background"
                placeholder="Кто является актором?"
                data-testid="role-input"
              />
            </div>
            <div className="flex gap-1 flex-wrap">
              {ROLES.map((r) => (
                <button
                  key={r}
                  onClick={() => { setRole(r); _role = r; }}
                  className={cn(
                    'px-2 py-0.5 rounded-full text-[11px] transition-colors border',
                    role === r
                      ? 'border-primary/40 bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:text-foreground hover:border-border/80'
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 p-4 flex flex-col gap-3 overflow-auto">
            <label className="text-xs font-medium text-foreground">Описание функциональности</label>
            <textarea
              className="code-textarea flex-1 min-h-[120px]"
              value={desc}
              onChange={(e) => { setDesc(e.target.value); _desc = e.target.value; }}
              placeholder="Опишите функцию или бизнес-требование на естественном языке..."
              spellCheck={false}
              style={{ fontFamily: 'inherit', fontSize: '13px' }}
              data-testid="story-description"
            />

            <div className="space-y-1">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">Примеры</p>
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => { setDesc(ex); _desc = ex; }}
                  className="w-full text-left text-xs text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded hover:bg-muted/50 transition-colors"
                  style={{ whiteSpace: 'normal' }}
                >
                  {ex}
                </button>
              ))}
            </div>

            <Button
              onClick={onGenerate}
              disabled={loading || !desc.trim()}
              className="w-full gap-2"
              data-testid="story-generate"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full spinner" />
                  Генерация...
                </>
              ) : (
                <>
                  <Wand2 size={15} />
                  Сгенерировать
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Right: Output */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/30 shrink-0">
            <div className="flex items-center gap-2">
              <BookOpen size={12} className="text-muted-foreground" />
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                {type === 'story' ? 'User Story' : type === 'usecase' ? 'Use Case' : 'User Story + Use Case'}
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
                <p className="text-sm">Генерация...</p>
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
                <BookOpen size={32} className="opacity-20" />
                <p className="text-sm">Опишите функцию и нажмите «Сгенерировать»</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
