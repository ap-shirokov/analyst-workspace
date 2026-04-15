import { Wand2, Copy, Trash2, FileJson } from 'lucide-react';
import CodeEditor from '@/components/CodeEditor';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useLlm } from '@/hooks/useLlm';
import { usePersisted } from '@/hooks/usePersisted';
import { cn } from '@/lib/utils';

const EXAMPLES = [
  'API для аутентификации: регистрация, логин, обновление токена, выход',
  'API каталога товаров: список, поиск, фильтрация, детали товара, отзывы',
  'API для управления пользователями: CRUD, роли, профиль, загрузка аватара',
  'API платежной системы: создание платежа, проверка статуса, возврат',
];

export default function OpenApiGenTool() {
  const [desc, setDesc] = usePersisted<string>('openapi:desc', 'REST API для управления задачами (ToDo). Операции: создание, получение списка, обновление статуса, удаление. Задача содержит: id, title, description, status (todo/in_progress/done), priority (low/medium/high), createdAt, updatedAt');
  const [version, setVersion] = usePersisted<'3.0' | '3.1'>('openapi:version', '3.0');
  const [output, setOutput] = usePersisted<string>('openapi:output', '');
  const [format, setFormat] = usePersisted<'yaml' | 'json'>('openapi:format', 'yaml');
  const { toast } = useToast();
  const { loading, error, generate } = useLlm({ endpoint: '/api/generate/openapi' });

  const onGenerate = async () => {
    if (!desc.trim()) return;
    try {
      const result = await generate({ description: desc, version, format });
      setOutput(result);
    } catch {}
  };

  const copy = () => {
    navigator.clipboard.writeText(output);
    toast({ title: 'OpenAPI спецификация скопирована' });
  };

  const clear = () => {
    setDesc('');
    setOutput('');
  };

  // Strip markdown code fences if model wraps in them
  const displayCode = output
    ? output.replace(/^```(yaml|json|yml)?\n?/i, '').replace(/\n?```$/i, '').trim()
    : '';

  const editorLang = format === 'json' ? 'json' : 'yaml';

  return (
    <div className="tool-container">
      <div className="tool-header flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-base font-semibold">OpenAPI Generator</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Генерация OpenAPI/Swagger спецификаций по описанию</p>
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
        {/* Left: Input */}
        <div className="flex flex-col border-r border-border min-h-0">
          <div className="p-4 space-y-3 border-b border-border shrink-0">
            {/* Version */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Версия:</span>
                {(['3.0', '3.1'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setVersion(v)}
                    className={cn(
                      'px-2.5 py-1 rounded text-xs transition-colors',
                      version === v
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                    )}
                  >
                    OAS {v}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Формат:</span>
                {(['yaml', 'json'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    className={cn(
                      'px-2.5 py-1 rounded text-xs transition-colors uppercase',
                      format === f
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1 p-4 flex flex-col gap-3 overflow-auto">
            <label className="text-xs font-medium text-foreground">Описание API</label>
            <textarea
              className="code-textarea flex-1 min-h-[140px]"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Опишите API: назначение, ресурсы, операции, модели данных...
Например: API для блога — посты, комментарии, теги, авторы"
              spellCheck={false}
              style={{ fontFamily: 'inherit', fontSize: '13px' }}
              data-testid="openapi-description"
            />

            <div className="space-y-1">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">Примеры</p>
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setDesc(ex)}
                  className="w-full text-left text-xs text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded hover:bg-muted/50 transition-colors"
                  style={{ whiteSpace: 'normal', textAlign: 'left' }}
                >
                  {ex}
                </button>
              ))}
            </div>

            <Button
              onClick={onGenerate}
              disabled={loading || !desc.trim()}
              className="w-full gap-2"
              data-testid="openapi-generate"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full spinner" />
                  Генерация...
                </>
              ) : (
                <>
                  <Wand2 size={15} />
                  Сгенерировать OpenAPI
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Right: Output */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/30 shrink-0">
            <div className="flex items-center gap-2">
              <FileJson size={12} className="text-muted-foreground" />
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                OpenAPI {version} — {format.toUpperCase()}
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
                <p className="text-sm">Генерация спецификации...</p>
              </div>
            )}
            {error && !loading && (
              <div className="p-4 m-3 rounded-md badge-error text-xs">Ошибка: {error}</div>
            )}
            {!loading && !error && displayCode && (
              <CodeEditor
                value={displayCode}
                lang={editorLang}
                readOnly
                minHeight="100%"
              />
            )}
            {!loading && !error && !displayCode && (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                <FileJson size={32} className="opacity-20" />
                <p className="text-sm">Опишите API и нажмите «Сгенерировать»</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
