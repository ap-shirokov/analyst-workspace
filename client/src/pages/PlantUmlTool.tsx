import { useState, useCallback, useRef } from 'react';
import { Wand2, Copy, Trash2, RefreshCw, Download, Wifi, WifiOff, GitBranch, AlertCircle } from 'lucide-react';
import CodeEditor from '@/components/CodeEditor';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useLlm } from '@/hooks/useLlm';
import { usePersisted } from '@/hooks/usePersisted';
import { cn } from '@/lib/utils';

const EXAMPLES = [
  { label: 'Sequence', code: `@startuml
actor User
participant "Frontend" as FE
participant "Backend" as BE
database "PostgreSQL" as DB

User -> FE: Открывает страницу
FE -> BE: GET /api/orders
BE -> DB: SELECT * FROM orders
DB --> BE: Результат
BE --> FE: JSON ответ
FE --> User: Отображает список
@enduml` },
  { label: 'Class', code: `@startuml
class User {
  +id: UUID
  +email: String
  +createdAt: DateTime
  +login()
  +logout()
}

class Order {
  +id: UUID
  +status: OrderStatus
  +totalAmount: Decimal
  +createdAt: DateTime
}

enum OrderStatus {
  PENDING
  CONFIRMED
  SHIPPED
  DELIVERED
  CANCELLED
}

User "1" -- "0..*" Order : создаёт
Order -- OrderStatus
@enduml` },
  { label: 'Activity', code: `@startuml
start
:Пользователь оформляет заказ;
:Проверка наличия товаров;
if (Товары в наличии?) then (да)
  :Резервирование товаров;
  :Обработка оплаты;
  if (Оплата прошла?) then (да)
    :Подтверждение заказа;
    :Отправка уведомления;
  else (нет)
    :Отмена резервирования;
    :Уведомление об ошибке;
  endif
else (нет)
  :Уведомление о недоступности;
endif
stop
@enduml` },
  { label: 'Component', code: `@startuml
package "Frontend" {
  [React App] as FE
  [Redux Store] as Store
}

package "Backend" {
  [Express API] as API
  [Auth Service] as Auth
  [Business Logic] as BL
}

database "SQLite" as DB
cloud "Ollama" as AI

FE --> API : HTTP/REST
FE --> Store : state
API --> Auth : validate
API --> BL : process
BL --> DB : query
BL --> AI : generate
@enduml` },
];

const PROMPT_EXAMPLES = [
  'Нарисуй sequence диаграмму авторизации через email magic link',
  'Создай class диаграмму для интернет-магазина с товарами, заказами и пользователями',
  'Покажи activity диаграмму процесса доставки заказа',
  'Нарисуй компонентную диаграмму микросервисной архитектуры',
];

export default function PlantUmlTool() {
  const [code, setCode] = usePersisted<string>('plantuml:code', EXAMPLES[0].code);
  const [mode, setMode] = usePersisted<'local' | 'online'>('plantuml:mode', 'local');
  const [prompt, setPrompt] = usePersisted<string>('plantuml:prompt', '');
  const [imgSrc, setImgSrc] = useState<string>('');
  const [renderError, setRenderError] = useState<string>('');
  const [rendering, setRendering] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const { toast } = useToast();
  const { loading: aiLoading, error: aiError, generate } = useLlm({ endpoint: '/api/generate/plantuml' });

  // Render diagram
  const render = useCallback(async (src = code, renderMode = mode) => {
    if (!src.trim()) return;
    setRendering(true);
    setRenderError('');
    try {
      if (renderMode === 'local') {
        const res = await fetch('/api/plantuml/render', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: src }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: 'Ошибка рендеринга' }));
          throw new Error(data.error || `HTTP ${res.status}`);
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setImgSrc(url);
      } else {
        // Online: use plantuml.com public server
        const encoded = await encodeForPlantuml(src);
        setImgSrc(`https://www.plantuml.com/plantuml/png/${encoded}`);
      }
    } catch (e: any) {
      setRenderError(e.message);
      setImgSrc('');
    } finally {
      setRendering(false);
    }
  }, [code, mode]);

  // AI generate
  const onAiGenerate = async () => {
    if (!prompt.trim()) return;
    try {
      const result = await generate({ prompt, existingCode: code });
      // Extract plantuml code from markdown fences if present
      const extracted = result.match(/@startuml[\s\S]*?@enduml/i)?.[0] ?? result;
      setCode(extracted.trim());
      await render(extracted.trim(), mode);
    } catch {}
  };

  // Download PNG
  const download = async () => {
    if (!imgSrc) return;
    try {
      const response = await fetch(imgSrc);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'diagram.png';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: 'Ошибка скачивания', variant: 'destructive' });
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    toast({ title: 'Код скопирован' });
  };

  const clear = () => {
    setCode('');
    setImgSrc('');
    setRenderError('');
    setPrompt('');
  };

  const onModeChange = (m: 'local' | 'online') => {
    setMode(m);
    if (imgSrc) render(code, m);
  };

  return (
    <div className="tool-container">
      <div className="tool-header">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-base font-semibold">PlantUML Editor</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Диаграммы из текста — sequence, class, activity, component и другие</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Mode toggle */}
            <div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
              <button
                onClick={() => onModeChange('local')}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors',
                  mode === 'local' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
                title="Локальный рендеринг через plantuml.jar (нужна Java)"
              >
                <WifiOff size={11} />
                Локально
              </button>
              <button
                onClick={() => onModeChange('online')}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors',
                  mode === 'online' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
                title="Онлайн рендеринг через plantuml.com"
              >
                <Wifi size={11} />
                Онлайн
              </button>
            </div>

            {imgSrc && (
              <Button variant="outline" size="sm" onClick={download} className="h-8 text-xs gap-1.5">
                <Download size={13} />
                PNG
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={copyCode} className="h-8 text-xs gap-1.5">
              <Copy size={13} />
              Код
            </Button>
            <Button variant="ghost" size="sm" onClick={clear} className="h-8 text-xs gap-1.5">
              <Trash2 size={13} />
              Очистить
            </Button>
          </div>
        </div>

        {/* AI prompt bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 bg-muted/50 border border-border rounded-md px-3 py-1.5">
            <Wand2 size={13} className="text-muted-foreground shrink-0" />
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onAiGenerate()}
              placeholder="Опишите диаграмму и нажмите Enter или кнопку... Например: sequence диаграмма регистрации пользователя"
              className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <Button
            size="sm"
            onClick={onAiGenerate}
            disabled={aiLoading || !prompt.trim()}
            className="h-8 gap-1.5 text-xs shrink-0"
          >
            {aiLoading ? (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full spinner" />
            ) : (
              <Wand2 size={13} />
            )}
            Сгенерировать
          </Button>
        </div>

        {/* AI prompt examples */}
        <div className="flex gap-1.5 flex-wrap mt-2">
          {PROMPT_EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => setPrompt(ex)}
              className="text-[11px] px-2 py-0.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-0 overflow-hidden min-h-0">
        {/* Left: Code editor */}
        <div className="flex flex-col border-r border-border min-h-0">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/30 shrink-0">
            <div className="flex items-center gap-2">
              <GitBranch size={12} className="text-muted-foreground" />
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">PlantUML код</span>
            </div>
            <div className="flex items-center gap-2">
              {/* Quick examples */}
              <div className="flex gap-1">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex.label}
                    onClick={() => { setCode(ex.code); setImgSrc(''); setRenderError(''); }}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {ex.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <CodeEditor
              value={code}
              onChange={setCode}
              lang="text"
              minHeight="100%"
              placeholder="@startuml&#10;...&#10;@enduml"
            />
          </div>

          {/* Render button */}
          <div className="p-3 border-t border-border shrink-0">
            <Button
              onClick={() => render()}
              disabled={rendering || !code.trim()}
              className="w-full gap-2"
            >
              {rendering ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full spinner" />
                  Рендеринг...
                </>
              ) : (
                <>
                  <RefreshCw size={14} />
                  Рендерить диаграмму
                </>
              )}
            </Button>
            {mode === 'local' && (
              <p className="text-[11px] text-muted-foreground mt-1.5 text-center">
                Требуется Java и <code className="font-mono">plantuml.jar</code> в папке проекта
              </p>
            )}
          </div>
        </div>

        {/* Right: Preview */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/30 shrink-0">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              Предпросмотр — {mode === 'local' ? 'локальный рендер' : 'plantuml.com'}
            </span>
            {imgSrc && (
              <button onClick={download} className="text-muted-foreground hover:text-foreground transition-colors" title="Скачать PNG">
                <Download size={12} />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-white dark:bg-zinc-900">
            {rendering && (
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full spinner" />
                <p className="text-sm">Рендеринг диаграммы...</p>
              </div>
            )}

            {renderError && !rendering && (
              <div className="max-w-sm w-full p-4 rounded-lg border border-destructive/30 bg-destructive/10">
                <div className="flex items-center gap-2 text-destructive mb-2">
                  <AlertCircle size={14} />
                  <span className="text-sm font-medium">Ошибка рендеринга</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{renderError}</p>
                {mode === 'local' && renderError.includes('Java') && (
                  <p className="text-xs text-muted-foreground mt-2 p-2 bg-muted rounded">
                    Проверьте: установлена ли Java (<code>java -version</code>) и лежит ли <code>plantuml.jar</code> в папке проекта
                  </p>
                )}
              </div>
            )}

            {aiError && !aiLoading && !renderError && (
              <div className="p-3 rounded-md badge-error text-xs max-w-sm">
                AI ошибка: {aiError}
              </div>
            )}

            {imgSrc && !rendering && !renderError && (
              <img
                ref={imgRef}
                src={imgSrc}
                alt="PlantUML диаграмма"
                className="max-w-full max-h-full object-contain"
                style={{ imageRendering: 'crisp-edges' }}
              />
            )}

            {!imgSrc && !rendering && !renderError && (
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <GitBranch size={40} className="opacity-20" />
                <p className="text-sm">Напишите код и нажмите «Рендерить»</p>
                <p className="text-xs text-center max-w-[240px]">
                  Или опишите диаграмму выше — ИИ напишет код за вас
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Encode PlantUML code for plantuml.com URL (deflate + base64url)
async function encodeForPlantuml(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  // Use CompressionStream (available in modern browsers)
  const cs = new CompressionStream('deflate-raw');
  const writer = cs.writable.getWriter();
  writer.write(data);
  writer.close();
  const compressed = await new Response(cs.readable).arrayBuffer();
  return encode64(new Uint8Array(compressed));
}

function encode64(data: Uint8Array): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';
  let r = '';
  for (let i = 0; i < data.length; i += 3) {
    if (i + 2 === data.length) {
      r += append3bytes(data[i], data[i + 1], 0);
    } else if (i + 1 === data.length) {
      r += append3bytes(data[i], 0, 0);
    } else {
      r += append3bytes(data[i], data[i + 1], data[i + 2]);
    }
  }
  return r;
  function append3bytes(b1: number, b2: number, b3: number) {
    const c1 = b1 >> 2;
    const c2 = ((b1 & 0x3) << 4) | (b2 >> 4);
    const c3 = ((b2 & 0xf) << 2) | (b3 >> 6);
    const c4 = b3 & 0x3f;
    return chars[c1] + chars[c2] + chars[c3] + chars[c4];
  }
}
