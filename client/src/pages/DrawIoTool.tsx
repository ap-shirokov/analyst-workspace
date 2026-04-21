import { useRef, useState, useEffect, useCallback } from 'react';
import { Download, Maximize2, RefreshCw, FileImage, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

// draw.io embed protocol messages
interface DrawIoMessage {
  event: string;
  xml?: string;
  data?: string;
  format?: string;
}

export default function DrawIoTool() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const pendingExportRef = useRef<((xml: string) => void) | null>(null);
  const { toast } = useToast();

  // Send message to draw.io iframe
  const sendMessage = useCallback((msg: object) => {
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify(msg), '*');
  }, []);

  // Handle messages from draw.io
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (!e.data) return;
      let msg: DrawIoMessage;
      try {
        msg = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
      } catch {
        return;
      }

      switch (msg.event) {
        case 'init':
          // draw.io ready — configure it
          setReady(true);
          setLoading(false);
          sendMessage({
            action: 'configure',
            config: {
              defaultEdgeStyle: 'orthogonalEdgeStyle',
              ui: 'atlas',           // clean UI
              grid: 1,
              guides: 1,
              tooltips: 1,
              connect: 1,
              arrows: 1,
              fold: 1,
              page: 1,
              pageScale: 1,
              pageWidth: 1169,
              pageHeight: 827,
              background: '#ffffff',
              zoom: 1,
            },
          });
          break;

        case 'export':
          // draw.io sends XML after export request
          if (msg.data && pendingExportRef.current) {
            pendingExportRef.current(msg.data);
            pendingExportRef.current = null;
          }
          break;

        case 'autosave':
          // Autosave events — we can track unsaved changes here
          break;

        default:
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [sendMessage]);

  // Request XML export then trigger download
  const downloadDiagram = useCallback(() => {
    if (!ready) return;
    setExporting(true);

    const timeout = setTimeout(() => {
      setExporting(false);
      toast({ title: 'Не удалось экспортировать', description: 'Попробуйте ещё раз', variant: 'destructive' });
    }, 5000);

    pendingExportRef.current = (xmlData: string) => {
      clearTimeout(timeout);
      setExporting(false);
      // xmlData comes as base64 or raw XML depending on format
      // We request format: xml so it's raw XML string
      const blob = new Blob([xmlData], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `diagram-${Date.now()}.drawio`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Диаграмма скачана' });
    };

    sendMessage({ action: 'export', format: 'xml' });
  }, [ready, sendMessage, toast]);

  // Export as PNG
  const downloadPng = useCallback(() => {
    if (!ready) return;
    setExporting(true);

    const timeout = setTimeout(() => {
      setExporting(false);
      toast({ title: 'Не удалось экспортировать PNG', variant: 'destructive' });
    }, 8000);

    pendingExportRef.current = (data: string) => {
      clearTimeout(timeout);
      setExporting(false);
      // data is base64 PNG
      const link = document.createElement('a');
      link.href = `data:image/png;base64,${data}`;
      link.download = `diagram-${Date.now()}.png`;
      link.click();
      toast({ title: 'PNG скачан' });
    };

    sendMessage({ action: 'export', format: 'png', scale: 2, background: '#ffffff' });
  }, [ready, sendMessage, toast]);

  const resetDiagram = useCallback(() => {
    if (!ready) return;
    sendMessage({ action: 'load', xml: '<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel>' });
    toast({ title: 'Диаграмма очищена' });
  }, [ready, sendMessage, toast]);

  const openFullscreen = () => {
    iframeRef.current?.requestFullscreen?.();
  };

  return (
    <div className="tool-container">
      <div className="tool-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold">Draw.io Editor</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Визуальный редактор диаграмм — drag & drop, блок-схемы, архитектурные схемы
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={downloadDiagram}
              disabled={!ready || exporting}
              className="h-8 text-xs gap-1.5"
              title="Скачать файл .drawio (можно открыть в draw.io Desktop или draw.io онлайн)"
            >
              <Download size={13} />
              .drawio
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadPng}
              disabled={!ready || exporting}
              className="h-8 text-xs gap-1.5"
            >
              <FileImage size={13} />
              PNG
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetDiagram}
              disabled={!ready}
              className="h-8 text-xs gap-1.5"
              title="Очистить холст"
            >
              <RefreshCw size={13} />
              Очистить
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={openFullscreen}
              className="h-8 text-xs gap-1.5"
            >
              <Maximize2 size={13} />
            </Button>
          </div>
        </div>

        {/* Info banner */}
        <div className="mt-2 flex items-start gap-2 px-3 py-2 rounded-md bg-muted/50 border border-border">
          <Info size={13} className="text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Редактор работает через <strong>embed.diagrams.net</strong> — нужен интернет для загрузки редактора.
            Данные диаграммы хранятся только в браузере, ничего не отправляется в облако.
            Кнопка <strong>.drawio</strong> скачивает файл, который можно открыть в&nbsp;
            <a href="https://www.diagrams.net" target="_blank" rel="noreferrer" className="underline hover:text-foreground">
              diagrams.net
            </a> или десктопном приложении.
          </p>
        </div>
      </div>

      {/* iframe container */}
      <div className="flex-1 relative overflow-hidden min-h-0">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background z-10 text-muted-foreground">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full spinner" />
            <p className="text-sm">Загрузка редактора Draw.io...</p>
          </div>
        )}
        {exporting && (
          <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-2 rounded-md bg-card border border-border shadow-lg z-20 text-xs">
            <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full spinner" />
            Экспорт...
          </div>
        )}
        <iframe
          ref={iframeRef}
          src="https://embed.diagrams.net/?embed=1&ui=atlas&spin=1&proto=json&configure=1&noSaveBtn=1&noExitBtn=1&saveAndExit=0&lang=ru"
          className="w-full h-full border-0"
          title="Draw.io Editor"
          allow="fullscreen"
          onLoad={() => {
            // iframe loaded — wait for 'init' message from draw.io
            setTimeout(() => {
              if (!ready) setLoading(false);
            }, 8000);
          }}
        />
      </div>
    </div>
  );
}
