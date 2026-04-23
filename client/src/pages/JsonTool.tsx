import { useCallback, useEffect, useState } from 'react';
import {
  Copy, Wand2, Trash2, FileJson, AlertCircle, CheckCircle2,
  Minimize2, ArrowRight, Wrench, ChevronRight,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePersisted } from '@/hooks/usePersisted';
import { cn } from '@/lib/utils';
import CodeEditor from '@/components/CodeEditor';
import { jsonrepair } from 'jsonrepair';

type ValidationState = 'idle' | 'valid' | 'error';

interface JsonFix {
  description: string;
  fixed: string;
}

const DEFAULT_INPUT = `{
  "name": "Analyst Workspace",
  "version": "1.0.0",
  "tools": ["swagger", "json", "uuid", "diff"],
  "ai": true
}`;

/**
 * Deep-analyse JSON and return ALL found issues with individual fixes.
 * Each fix is independent and can be applied separately.
 */
function analyzeJsonErrors(input: string): JsonFix[] {
  if (!input.trim()) return [];
  try { JSON.parse(input); return []; } catch {}

  const fixes: JsonFix[] = [];

  // ── Fix 1: jsonrepair (always offered first if it produces something different) ──
  try {
    const repaired = jsonrepair(input);
    if (repaired !== input) {
      fixes.push({ description: 'Исправить всё автоматически (jsonrepair)', fixed: repaired });
    }
  } catch {}

  // ── Fix 2: trailing commas before } or ] ──
  if (/,\s*[}\]]/.test(input)) {
    const fixed = input.replace(/,(\s*[}\]])/g, '$1');
    try { JSON.parse(fixed); } catch {}  // may still be invalid but that's ok
    fixes.push({ description: 'Убрать лишние запятые перед } или ]', fixed });
  }

  // ── Fix 3: single quotes → double quotes ──
  if (/'/.test(input)) {
    const fixed = input.replace(/'/g, '"');
    fixes.push({ description: "Заменить одинарные кавычки ' на двойные \"", fixed });
  }

  // ── Fix 4: unquoted keys { key: value } → { "key": value } ──
  if (/(?:^|[{,])\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/.test(input)) {
    const fixed = input.replace(/((?:^|[{,])\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)(\s*:)/g, '$1"$2"$3');
    fixes.push({ description: 'Взять неквотированные ключи в двойные кавычки', fixed });
  }

  // ── Fix 5: missing closing brackets/braces ──
  const stack: string[] = [];
  for (const ch of input) {
    if (ch === '{') stack.push('}');
    else if (ch === '[') stack.push(']');
    else if (ch === '}' || ch === ']') stack.pop();
  }
  if (stack.length > 0) {
    const closing = stack.reverse().join('');
    fixes.push({
      description: `Добавить ${stack.length} закрывающих скобок (${closing})`,
      fixed: input.trimEnd() + '\n' + closing,
    });
  }

  // ── Fix 6: comments (// or /* */) — not valid JSON ──
  if (/\/\/|\/\*/.test(input)) {
    const fixed = input
      .replace(/\/\/[^\n]*/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    fixes.push({ description: 'Удалить комментарии (// и /* */)', fixed });
  }

  // ── Fix 7: Python-style True/False/None → true/false/null ──
  if (/\b(True|False|None)\b/.test(input)) {
    const fixed = input
      .replace(/\bTrue\b/g, 'true')
      .replace(/\bFalse\b/g, 'false')
      .replace(/\bNone\b/g, 'null');
    fixes.push({ description: 'Заменить Python-значения (True→true, False→false, None→null)', fixed });
  }

  return fixes;
}

export default function JsonTool() {
  const [input, setInput] = usePersisted('aw_json_input', DEFAULT_INPUT);
  const [output, setOutput] = usePersisted('aw_json_output', '');
  const [parseError, setParseError] = useState('');
  const [validation, setValidation] = useState<ValidationState>('idle');
  const [indent, setIndent] = usePersisted('aw_json_indent', 2);
  const [fixes, setFixes] = useState<JsonFix[]>([]);
  const { toast } = useToast();

  // ── Run validation whenever input changes ──────────────────────────────
  useEffect(() => {
    if (!input.trim()) {
      setValidation('idle');
      setParseError('');
      setFixes([]);
      return;
    }
    try {
      JSON.parse(input);
      setValidation('valid');
      setParseError('');
      setFixes([]);
    } catch (e: any) {
      setValidation('error');
      setParseError(e.message);
      setFixes(analyzeJsonErrors(input));
    }
  }, [input]);

  // ── Actions ────────────────────────────────────────────────────────────
  const format = useCallback(() => {
    try {
      setOutput(JSON.stringify(JSON.parse(input), null, indent));
    } catch (e: any) {
      toast({ title: 'Невалидный JSON', description: e.message, variant: 'destructive' });
    }
  }, [input, indent, setOutput, toast]);

  const minify = useCallback(() => {
    try {
      setOutput(JSON.stringify(JSON.parse(input)));
    } catch (e: any) {
      toast({ title: 'Невалидный JSON', description: e.message, variant: 'destructive' });
    }
  }, [input, setOutput, toast]);

  const applyFix = (fix: JsonFix) => {
    setInput(fix.fixed);
    // Format immediately if now valid
    try {
      const formatted = JSON.stringify(JSON.parse(fix.fixed), null, indent);
      setOutput(formatted);
      toast({ title: 'Исправление применено', description: fix.description });
    } catch {
      toast({ title: 'Исправление применено', description: 'Могут остаться другие ошибки' });
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Скопировано' });
  };

  const clear = () => {
    setInput('');
    setOutput('');
    setParseError('');
    setValidation('idle');
    setFixes([]);
  };

  return (
    <div className="tool-container">
      <div className="tool-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold">JSON Formatter & Validator</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Форматирование, минификация, валидация и умное исправление JSON
            </p>
          </div>
          <button onClick={clear} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Очистить">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* ── Validation status bar ───────────────────────────────────────── */}
      {validation !== 'idle' && (
        <div className={cn(
          'px-4 py-1.5 flex items-center gap-2 text-xs font-medium border-b shrink-0',
          validation === 'valid' ? 'badge-valid' : 'badge-error',
        )}>
          {validation === 'valid'
            ? <><CheckCircle2 size={13} /> JSON валиден</>
            : <><AlertCircle size={13} /> {parseError}</>}
        </div>
      )}

      {/* ── Fix suggestions ─────────────────────────────────────────────── */}
      {validation === 'error' && fixes.length > 0 && (
        <div className="px-4 py-2.5 border-b border-border bg-amber-500/5 shrink-0">
          <div className="flex items-center gap-1.5 mb-2">
            <Wrench size={12} className="text-amber-500" />
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
              Найдено {fixes.length} {fixes.length === 1 ? 'исправление' : fixes.length < 5 ? 'исправления' : 'исправлений'} — нажмите чтобы применить
            </span>
          </div>
          {/* List all fixes vertically, like IntelliJ */}
          <div className="flex flex-col gap-1">
            {fixes.map((fix, i) => (
              <button
                key={i}
                onClick={() => applyFix(fix)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-md text-xs transition-all border text-left',
                  i === 0
                    ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90 font-medium'
                    : 'bg-card text-foreground border-border hover:border-primary/40 hover:bg-muted/50',
                )}
              >
                <ChevronRight size={11} className="shrink-0" />
                <span>{fix.description}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Main panels ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* Input */}
        <div className="flex flex-col flex-1 border-r border-border min-h-0 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/30 shrink-0">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Вход</span>
            <button onClick={() => copy(input)} className="text-muted-foreground hover:text-foreground transition-colors">
              <Copy size={12} />
            </button>
          </div>
          <div className="flex-1 overflow-auto">
            <CodeEditor
              value={input}
              onChange={setInput}
              lang="json"
              placeholder="Вставьте JSON сюда..."
              minHeight="100%"
            />
          </div>
        </div>

        {/* Center controls */}
        <div className="flex flex-col items-center justify-center gap-2 px-3 shrink-0 bg-muted/10 border-r border-border">
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] text-muted-foreground">Отступ</span>
            <div className="flex gap-1">
              {[2, 4].map((n) => (
                <button
                  key={n}
                  onClick={() => setIndent(n)}
                  className={cn(
                    'w-7 h-7 rounded text-xs font-mono transition-colors',
                    indent === n
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground',
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div className="w-px h-4 bg-border" />
          <button
            onClick={() => {
              try { JSON.parse(input); toast({ title: 'JSON валиден' }); }
              catch (e: any) { toast({ title: 'Ошибка JSON', description: e.message, variant: 'destructive' }); }
            }}
            title="Validate"
            className="flex flex-col items-center gap-1 p-2 rounded hover:bg-muted transition-colors group"
          >
            <FileJson size={16} className="text-muted-foreground group-hover:text-foreground" />
            <span className="text-[9px] text-muted-foreground uppercase tracking-wide">Validate</span>
          </button>
          <button
            onClick={format}
            title="Format"
            className="flex flex-col items-center gap-1 p-2 rounded bg-primary/10 hover:bg-primary/20 transition-colors"
          >
            <div className="flex items-center gap-0.5">
              <Wand2 size={14} className="text-primary" />
              <ArrowRight size={10} className="text-primary" />
            </div>
            <span className="text-[9px] text-primary uppercase tracking-wide font-medium">Format</span>
          </button>
          <button
            onClick={minify}
            title="Minify"
            className="flex flex-col items-center gap-1 p-2 rounded hover:bg-muted transition-colors group"
          >
            <Minimize2 size={16} className="text-muted-foreground group-hover:text-foreground" />
            <span className="text-[9px] text-muted-foreground uppercase tracking-wide">Minify</span>
          </button>
        </div>

        {/* Output */}
        <div className="flex flex-col flex-1 min-h-0 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/30 shrink-0">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Результат</span>
            <button onClick={() => copy(output)} className="text-muted-foreground hover:text-foreground transition-colors">
              <Copy size={12} />
            </button>
          </div>
          {parseError && !output ? (
            <div className="p-4 m-3 rounded-md badge-error text-xs font-mono leading-relaxed">
              <div className="font-semibold mb-1 flex items-center gap-1 not-italic font-sans">
                <AlertCircle size={12} /> Ошибка парсинга
              </div>
              {parseError}
              {fixes.length > 0 && (
                <div className="mt-2 pt-2 border-t border-destructive/20 not-italic text-muted-foreground font-sans">
                  Используй кнопки исправления выше
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              <CodeEditor
                value={output}
                lang="json"
                readOnly
                placeholder="Результат форматирования..."
                minHeight="100%"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
