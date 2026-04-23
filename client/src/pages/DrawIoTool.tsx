import { useRef, useState, useEffect, useCallback } from 'react';
import { Download, Maximize2, RefreshCw, FileImage, Info, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface DrawIoMessage {
  event: string;
  xml?: string;
  data?: string;
  format?: string;
}

// How long to wait for draw.io 'init' before showing error/reload button
const INIT_TIMEOUT_MS = 12000;

export default function DrawIoTool() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'timeout'>('loading');
  const [exporting, setExporting] = useState(false);
  const [iframeKey, setIframeKey] = useState(0); // bump to force iframe reload
  const pendingExportRef = useRef<((data: string) => void) | null>(null);
  const initTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { toast } = useToast();

  const sendMessage = useCallback((msg: object) => {
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify(msg), '*');
  }, []);

  // Start the init timeout whenever iframe key changes (new load)
  useEffect(() => {
    setReady(false);
    setLoadState('loading');

    if (initTimerRef.current) clearTimeout(initTimerRef.current);
    initTimerRef.current = setTimeout(() => {
      setLoadState((prev) => {
        if (prev === 'loading') return 'timeout';
        return prev;
      });
    }, INIT_TIMEOUT_MS);

    return () => {
      if (initTimerRef.current) clearTimeout(initTimerRef.current);
    };
  }, [iframeKey]);

  // Handle messages from draw.io
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (!e.data) return;
      let msg: DrawIoMessage;
      try {
        msg = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
      } catch { return; }

      switch (msg.event) {
        case 'init':
          if (initTimerRef.current) clearTimeout(initTimerRef.current);
          setReady(true);
          setLoadState('ready');
          sendMessage({
            action: 'configure',
            config: {
              defaultEdgeStyle: 'orthogonalEdgeStyle',
              ui: 'atlas',
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
            },
          });
          break;

        case 'export':
          if (msg.data && pendingExportRef.current) {
            pendingExportRef.current(msg.data);
            pendingExportRef.current = null;
          }
          break;

        default:
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [sendMessage]);

  // ── Export helpers ─────────────────────────────────────────────────────
  const requestExport = useCallback((
    format: string,
    opts: object,
    onData: (data: string) => void,
    errorMsg: string,
  ) => {
    if (!ready) return;
    setExporting(true);

    const timeout = setTimeout(() => {
      setExporting(false);
      pendingExportRef.current = null;
      toast({ title: errorMsg, variant: 'destructive' });
    }, 8000);

    pendingExportRef.current = (data) => {
      clearTimeout(timeout);
      setExporting(false);
      onData(data);
    };

    sendMessage({ action: 'export', format, ...opts });
  }, [ready, sendMessage, toast]);

  const downloadDrawio = useCallback(() => {
    requestExport('xml', {}, (xml) => {
      const blob = new Blob([xml], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `diagram-${Date.now()}.drawio`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Диаграмма скачана (.drawio)' });
    }, 'Не удалось экспортировать .drawio');
  }, [requestExport, toast]);

  const downloadPng = useCallback(() => {
    requestExport('png', { scale: 2, background: '#ffffff' }, (data) => {
      const link = document.createElement('a');
      link.href = `data:image/png;base64,${data}`;
      link.download = `diagram-${Date.now()}.png`;
      link.click();
      toast({ title: 'PNG скачан' });
    }, 'Не удалось экспортировать PNG');
  }, [requestExport, toast]);

  const resetDiagram = useCallback(() => {
    if (!ready) return;
    sendMessage({
      action: 'load',
      xml: '<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel>',
    });
    toast({ title: 'Холст очищен' });
  }, [ready, sendMessage, toast]);

  const reloadIframe = () => {
    setIframeKey((k) => k + 1);
  };

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
              variant="outline" size="sm"
              onClick={downloadDrawio}
              disabled={!ready || exporting}
              className="h-8 text-xs gap-1.5"
              title="Скачать файл .drawio"
            >
              <Download size={13} /> .drawio
            </Button>
            <Button
              variant="outline" size="sm"
              onClick={downloadPng}
              disabled={!ready || exporting}
              className="h-8 text-xs gap-1.5"
            >
              <FileImage size={13} /> PNG
            </Button>
            <Button
              variant="ghost" size="sm"
              onClick={resetDiagram}
              disabled={!ready}
              className="h-8 text-xs gap-1.5"
              title="Очистить холст"
            >
              <RefreshCw size={13} /> Очистить
            </Button>
            <Button
              variant="ghost" size="sm"
              onClick={reloadIframe}
              className="h-8 text-xs gap-1.5"
              title="Перезагрузить редактор"
            >
              <RotateCcw size={13} />
            </Button>
            <Button
              variant="ghost" size="sm"
              onClick={openFullscreen}
              className="h-8 text-xs"
            >
              <Maximize2 size={13} />
            </Button>
          </div>
        </div>

        {/* Info banner */}
        <div className="mt-2 flex items-start gap-2 px-3 py-2 rounded-md bg-muted/50 border border-border">
          <Info size={13} className="text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Редактор загружается с <strong>embed.diagrams.net</strong> — нужен интернет.
            Данные диаграммы хранятся только в браузере.
            Кнопка <strong>.drawio</strong> скачивает файл, совместимый с{' '}
            <a href="https://www.diagrams.net" target="_blank" rel="noreferrer" className="underline hover:text-foreground">
              diagrams.net
            </a>.
          </p>
        </div>
      </div>

      {/* iframe container */}
      <div className="flex-1 relative overflow-hidden min-h-0">

        {/* Loading overlay */}
        {loadState === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background z-10 text-muted-foreground">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full spinner" />
            <p className="text-sm">Загрузка редактора Draw.io...</p>
            <p className="text-xs opacity-60">Требуется подключение к интернету</p>
          </div>
        )}

        {/* Timeout overlay — shown if init never fires */}
        {loadState === 'timeout' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background z-10 text-muted-foreground">
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-foreground">Редактор не загрузился</p>
              <p className="text-xs max-w-[280px] text-center">
                Проверьте подключение к интернету — редактор загружается с embed.diagrams.net
              </p>
            </div>
            <Button onClick={reloadIframe} className="gap-2">
              <RotateCcw size={14} /> Перезагрузить
            </Button>
          </div>
        )}

        {/* Export spinner */}
        {exporting && (
          <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-2 rounded-md bg-card border border-border shadow-lg z-20 text-xs">
            <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full spinner" />
            Экспорт...
          </div>
        )}

        <iframe
          key={iframeKey}
          ref={iframeRef}
          src="https://embed.diagrams.net/?embed=1&ui=atlas&spin=1&proto=json&configure=1&noSaveBtn=1&noExitBtn=1&saveAndExit=0&lang=ru"
          className="w-full h-full border-0"
          title="Draw.io Editor"
          allow="fullscreen"
        />
      </div>
    </div>
  );
}
