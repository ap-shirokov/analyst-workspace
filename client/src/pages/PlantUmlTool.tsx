import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Wand2, Copy, Trash2, RefreshCw, Download, Wifi, WifiOff,
  GitBranch, AlertCircle, Clock,
} from 'lucide-react';
import CodeEditor from '@/components/CodeEditor';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useLlm } from '@/hooks/useLlm';
import { usePersisted } from '@/hooks/usePersisted';
import { cn } from '@/lib/utils';

// Auto-render debounce delay in ms
const AUTO_RENDER_DELAY = 1500;

const EXAMPLES = [
  {
    label: 'Sequence', code: `@startuml
skinparam defaultFontName Arial
skinparam backgroundColor #FAFAFA

actor Пользователь
participant "Frontend" as FE
participant "Backend" as BE
database "PostgreSQL" as DB

Пользователь -> FE: Открывает страницу
FE -> BE: GET /api/orders
BE -> DB: SELECT * FROM orders
DB --> BE: Результат
BE --> FE: JSON ответ
FE --> Пользователь: Отображает список
@enduml`,
  },
  {
    label: 'Class', code: `@startuml
skinparam defaultFontName Arial
skinparam backgroundColor #FAFAFA

class Пользователь {
  +id: UUID
  +email: String
  +createdAt: DateTime
  +войти()
  +выйти()
}

class Заказ {
  +id: UUID
  +статус: СтатусЗаказа
  +сумма: Decimal
  +createdAt: DateTime
}

enum СтатусЗаказа {
  НОВЫЙ
  ПОДТВЕРЖДЁН
  ОТПРАВЛЕН
  ДОСТАВЛЕН
  ОТМЕНЁН
}

Пользователь "1" -- "0..*" Заказ : создаёт
Заказ -- СтатусЗаказа
@enduml`,
  },
  {
    label: 'Activity', code: `@startuml
skinparam defaultFontName Arial
skinparam backgroundColor #FAFAFA

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
@enduml`,
  },
  {
    label: 'Component', code: `@startuml
skinparam defaultFontName Arial
skinparam backgroundColor #FAFAFA

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
@enduml`,
  },
];

const PROMPT_EXAMPLES = [
  'Sequence диаграмма авторизации через email magic link',
  'Class диаграмма интернет-магазина с товарами, заказами, пользователями',
  'Activity диаграмма процесса доставки заказа',
  'Компонентная диаграмма микросервисной архитектуры',
];

export default function PlantUmlTool() {
  const [code, setCode] = usePersisted<string>('plantuml:code', EXAMPLES[0].code);
  const [mode, setMode] = usePersisted<'local' | 'online'>('plantuml:mode', 'local');
  const [prompt, setPrompt] = usePersisted<string>('plantuml:prompt', '');
  const [imgSrc, setImgSrc] = useState<string>('');
  const [renderError, setRenderError] = useState<string>('');
  const [rendering, setRendering] = useState(false);
  const [autoRenderCountdown, setAutoRenderCountdown] = useState(0); // seconds left
  const imgRef = useRef<HTMLImageElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const { toast } = useToast();
  const { loading: aiLoading, error: aiError, generate } = useLlm({ endpoint: '/api/generate/plantuml' });

  // ── Core render function ──────────────────────────────────────────────
  const render = useCallback(async (src: string, renderMode: 'local' | 'online') => {
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
        setImgSrc(URL.createObjectURL(blob));
      } else {
        const encoded = await encodeForPlantuml(src);
        setImgSrc(`https://www.plantuml.com/plantuml/png/${encoded}`);
      }
    } catch (e: any) {
      setRenderError(e.message);
      setImgSrc('');
    } finally {
      setRendering(false);
    }
  }, []);

  // ── Debounced auto-render on code change ──────────────────────────────
  const scheduleRender = useCallback((src: string, renderMode: 'local' | 'online') => {
    // Clear existing timers
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (countdownTimer.current) clearInterval(countdownTimer.current);

    // Only auto-render if code has @startuml
    if (!src.includes('@startuml')) {
      setAutoRenderCountdown(0);
      return;
    }

    // Start countdown display
    const seconds = AUTO_RENDER_DELAY / 1000;
    setAutoRenderCountdown(seconds);
    countdownTimer.current = setInterval(() => {
      setAutoRenderCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimer.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Schedule the actual render
    debounceTimer.current = setTimeout(() => {
      render(src, renderMode);
    }, AUTO_RENDER_DELAY);
  }, [render]);

  // Trigger schedule on code or mode change
  useEffect(() => {
    scheduleRender(code, mode);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (countdownTimer.current) clearInterval(countdownTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, mode]);

  // ── Manual render (button) ────────────────────────────────────────────
  const renderNow = () => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (countdownTimer.current) clearInterval(countdownTimer.current);
    setAutoRenderCountdown(0);
    render(code, mode);
  };

  // ── AI generate ───────────────────────────────────────────────────────
  const onAiGenerate = async () => {
    if (!prompt.trim()) return;
    try {
      const result = await generate({ prompt, existingCode: code });
      const extracted = result.match(/@startuml[\s\S]*?@enduml/i)?.[0] ?? result;
      setCode(extracted.trim());
      // render will be triggered by the code change effect above
    } catch {}
  };

  // ── Download PNG ──────────────────────────────────────────────────────
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

  const copyCode = () => { navigator.clipboard.writeText(code); toast({ title: 'Код скопирован' }); };

  const clear = () => {
    setCode('');
    setImgSrc('');
    setRenderError('');
    setPrompt('');
    setAutoRenderCountdown(0);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (countdownTimer.current) clearInterval(countdownTimer.current);
  };

  const onModeChange = (m: 'local' | 'online') => {
    setMode(m);
    // Will trigger re-render via effect since mode is a dependency
  };

  return (
    <div className="tool-container">
      <div className="tool-header">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-base font-semibold">PlantUML Editor</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Диаграммы из текста — sequence, class, activity, component и другие
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Mode toggle */}
            <div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
              <button
                onClick={() => onModeChange('local')}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors',
                  mode === 'local'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                title="Локальный рендеринг через plantuml.jar + Java"
              >
                <WifiOff size={11} /> Локально
              </button>
              <button
                onClick={() => onModeChange('online')}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors',
                  mode === 'online'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                title="Онлайн рендеринг через plantuml.com"
              >
                <Wifi size={11} /> Онлайн
              </button>
            </div>

            {imgSrc && (
              <Button variant="outline" size="sm" onClick={download} className="h-8 text-xs gap-1.5">
                <Download size={13} /> PNG
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={copyCode} className="h-8 text-xs gap-1.5">
              <Copy size={13} /> Код
            </Button>
            <Button variant="ghost" size="sm" onClick={clear} className="h-8 text-xs gap-1.5">
              <Trash2 size={13} /> Очистить
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
              placeholder="Опишите диаграмму и нажмите Enter... Например: sequence диаграмма регистрации"
              className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <Button
            size="sm"
            onClick={onAiGenerate}
            disabled={aiLoading || !prompt.trim()}
            className="h-8 gap-1.5 text-xs shrink-0"
          >
            {aiLoading
              ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full spinner" />
              : <Wand2 size={13} />}
            Сгенерировать
          </Button>
        </div>

        {/* Prompt examples */}
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
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                PlantUML код
              </span>
              {/* Auto-render countdown badge */}
              {autoRenderCountdown > 0 && (
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock size={10} />
                  рендер через {autoRenderCountdown}с
                </span>
              )}
            </div>
            {/* Quick example buttons */}
            <div className="flex gap-1">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex.label}
                  onClick={() => { setCode(ex.code); setRenderError(''); }}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {ex.label}
                </button>
              ))}
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

          {/* Manual render button */}
          <div className="p-3 border-t border-border shrink-0">
            <Button
              onClick={renderNow}
              disabled={rendering || !code.trim()}
              className="w-full gap-2"
              variant="outline"
            >
              {rendering
                ? <><div className="w-4 h-4 border-2 border-primary/40 border-t-primary rounded-full spinner" /> Рендеринг...</>
                : <><RefreshCw size={14} /> Рендерить сейчас</>}
            </Button>
            <p className="text-[11px] text-muted-foreground mt-1.5 text-center">
              {mode === 'local'
                ? 'Локально: нужны Java + plantuml.jar в папке проекта'
                : 'Онлайн: рендеринг через plantuml.com'}
              {' · '}авто-рендер через {AUTO_RENDER_DELAY / 1000}с после остановки печати
            </p>
          </div>
        </div>

        {/* Right: Preview */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/30 shrink-0">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              Предпросмотр — {mode === 'local' ? 'локальный рендер' : 'plantuml.com'}
            </span>
            {imgSrc && !rendering && (
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
                {mode === 'local' && (renderError.includes('Java') || renderError.includes('java')) && (
                  <div className="mt-2 p-2 bg-muted rounded text-xs text-muted-foreground space-y-1">
                    <p>1. Установите Java: <a href="https://adoptium.net" target="_blank" rel="noreferrer" className="underline">adoptium.net</a></p>
                    <p>2. Скачайте plantuml.jar: <a href="https://plantuml.com/download" target="_blank" rel="noreferrer" className="underline">plantuml.com/download</a></p>
                    <p>3. Положите jar в папку проекта</p>
                    <p className="pt-1">Или переключитесь в <strong>Онлайн</strong>-режим</p>
                  </div>
                )}
                <button
                  onClick={renderNow}
                  className="mt-3 w-full text-xs py-1.5 rounded border border-border hover:bg-muted transition-colors"
                >
                  Попробовать снова
                </button>
              </div>
            )}

            {aiError && !aiLoading && !renderError && !imgSrc && (
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
                onError={() => {
                  setRenderError('Не удалось загрузить изображение диаграммы');
                  setImgSrc('');
                }}
              />
            )}

            {!imgSrc && !rendering && !renderError && (
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <GitBranch size={40} className="opacity-20" />
                <p className="text-sm">Начните вводить код — диаграмма обновится автоматически</p>
                <p className="text-xs text-center max-w-[240px] opacity-70">
                  Или опишите диаграмму выше — ИИ напишет код
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── PlantUML online encoder ───────────────────────────────────────────────────
async function encodeForPlantuml(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
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
    const b1 = data[i], b2 = data[i + 1] ?? 0, b3 = data[i + 2] ?? 0;
    r += chars[b1 >> 2]
      + chars[((b1 & 3) << 4) | (b2 >> 4)]
      + chars[((b2 & 15) << 2) | (b3 >> 6)]
      + chars[b3 & 63];
  }
  return r;
}
