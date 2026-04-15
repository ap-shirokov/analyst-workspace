import { useCallback, useState } from 'react';
import { Copy, Wand2, Trash2, FileJson, AlertCircle, CheckCircle2, Minimize2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { usePersisted } from '@/hooks/usePersisted';
import { cn } from '@/lib/utils';
import CodeEditor from '@/components/CodeEditor';

type ValidationState = 'idle' | 'valid' | 'error';

const DEFAULT_INPUT = `{
  "name": "Analyst Workspace",
  "version": "1.0.0",
  "tools": ["swagger", "json", "uuid", "diff"],
  "ai": true
}`;

export default function JsonTool() {
  const [input, setInput] = usePersisted('aw_json_input', DEFAULT_INPUT);
  const [output, setOutput] = usePersisted('aw_json_output', '');
  const [error, setError] = useState('');
  const [validation, setValidation] = useState<ValidationState>('idle');
  const [indent, setIndent] = usePersisted('aw_json_indent', 2);
  const { toast } = useToast();

  const format = useCallback(() => {
    try {
      const parsed = JSON.parse(input);
      const formatted = JSON.stringify(parsed, null, indent);
      setOutput(formatted); setError(''); setValidation('valid');
    } catch (e: any) {
      setError(e.message); setOutput(''); setValidation('error');
    }
  }, [input, indent, setOutput]);

  const minify = useCallback(() => {
    try {
      const minified = JSON.stringify(JSON.parse(input));
      setOutput(minified); setError(''); setValidation('valid');
    } catch (e: any) {
      setError(e.message); setOutput(''); setValidation('error');
    }
  }, [input, setOutput]);

  const validate = useCallback(() => {
    try {
      JSON.parse(input);
      setError(''); setValidation('valid');
      toast({ title: 'JSON валиден', description: 'Синтаксических ошибок не найдено.' });
    } catch (e: any) {
      setError(e.message); setValidation('error');
      toast({ title: 'Ошибка JSON', description: e.message, variant: 'destructive' });
    }
  }, [input, toast]);

  const copy = (text: string) => { navigator.clipboard.writeText(text); toast({ title: 'Скопировано' }); };
  const clear = () => { setInput(''); setOutput(''); setError(''); setValidation('idle'); };

  const onInputChange = (val: string) => {
    setInput(val);
    if (!val.trim()) { setValidation('idle'); setError(''); return; }
    try { JSON.parse(val); setValidation('valid'); setError(''); }
    catch (e: any) { setValidation('error'); setError(e.message); }
  };

  return (
    <div className="tool-container">
      <div className="tool-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold">JSON Formatter & Validator</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Форматирование, минификация и валидация JSON</p>
          </div>
          <Button size="sm" variant="ghost" onClick={clear} className="h-8 text-xs gap-1.5">
            <Trash2 size={13} />Clear
          </Button>
        </div>
      </div>

      {validation !== 'idle' && (
        <div className={cn('px-4 py-1.5 flex items-center gap-2 text-xs font-medium border-b',
          validation === 'valid' ? 'badge-valid' : 'badge-error')}>
          {validation === 'valid'
            ? <><CheckCircle2 size={13} /> JSON валиден</>
            : <><AlertCircle size={13} /> {error}</>}
        </div>
      )}

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Input */}
        <div className="flex flex-col flex-1 border-r border-border min-h-0 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/30 shrink-0">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Вход</span>
            <button onClick={() => copy(input)} className="text-muted-foreground hover:text-foreground transition-colors"><Copy size={12} /></button>
          </div>
          <div className="flex-1 overflow-auto">
            <CodeEditor value={input} onChange={onInputChange} lang="json" placeholder="Вставьте JSON сюда..." minHeight="100%" />
          </div>
        </div>

        {/* Center controls */}
        <div className="flex flex-col items-center justify-center gap-2 px-3 shrink-0 bg-muted/10 border-r border-border">
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] text-muted-foreground">Отступ</span>
            <div className="flex gap-1">
              {[2, 4].map((n) => (
                <button key={n} onClick={() => setIndent(n)}
                  className={cn('w-7 h-7 rounded text-xs font-mono transition-colors',
                    indent === n ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80 text-muted-foreground')}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div className="w-px h-4 bg-border" />
          <button onClick={validate} title="Validate"
            className="flex flex-col items-center gap-1 p-2 rounded hover:bg-muted transition-colors group">
            <FileJson size={16} className="text-muted-foreground group-hover:text-foreground" />
            <span className="text-[9px] text-muted-foreground uppercase tracking-wide">Validate</span>
          </button>
          <button onClick={format} title="Format"
            className="flex flex-col items-center gap-1 p-2 rounded bg-primary/10 hover:bg-primary/20 transition-colors">
            <div className="flex items-center gap-0.5">
              <Wand2 size={14} className="text-primary" /><ArrowRight size={10} className="text-primary" />
            </div>
            <span className="text-[9px] text-primary uppercase tracking-wide font-medium">Format</span>
          </button>
          <button onClick={minify} title="Minify"
            className="flex flex-col items-center gap-1 p-2 rounded hover:bg-muted transition-colors group">
            <Minimize2 size={16} className="text-muted-foreground group-hover:text-foreground" />
            <span className="text-[9px] text-muted-foreground uppercase tracking-wide">Minify</span>
          </button>
        </div>

        {/* Output */}
        <div className="flex flex-col flex-1 min-h-0 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/30 shrink-0">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Результат</span>
            <button onClick={() => copy(output)} className="text-muted-foreground hover:text-foreground transition-colors"><Copy size={12} /></button>
          </div>
          {error && !output ? (
            <div className="p-4 m-3 rounded-md badge-error text-xs font-mono leading-relaxed">
              <div className="font-semibold mb-1 flex items-center gap-1"><AlertCircle size={12} />Ошибка парсинга</div>
              {error}
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              <CodeEditor value={output} lang="json" readOnly placeholder="Результат форматирования..." minHeight="100%" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
