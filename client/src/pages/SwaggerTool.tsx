import { useState, useRef } from 'react';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SwaggerTool() {
  const [loading, setLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleLoad = () => {
    setLoading(false);
    // Force light theme inside iframe regardless of app theme
    try {
      const iframe = iframeRef.current;
      if (!iframe?.contentDocument) return;
      const style = iframe.contentDocument.createElement('style');
      style.textContent = `
        body { color-scheme: light !important; }
        .swagger-ui { filter: none !important; }
      `;
      iframe.contentDocument.head.appendChild(style);
    } catch {
      // cross-origin — ignore, handled by wrapper below
    }
  };

  const reload = () => {
    setLoading(true);
    if (iframeRef.current) iframeRef.current.src = iframeRef.current.src;
  };

  return (
    <div className="tool-container">
      <div className="tool-header flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-foreground">Swagger Editor</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Редактирование и валидация OpenAPI/Swagger спецификаций</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={reload} className="h-8 gap-1.5 text-xs">
            <RefreshCw size={13} />Reload
          </Button>
          <a href="/swagger-editor/" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ExternalLink size={13} />Открыть отдельно
          </a>
        </div>
      </div>

      {/* Force light background wrapper — isolates iframe from dark theme */}
      <div className="flex-1 relative overflow-hidden bg-white">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Загрузка Swagger Editor...</p>
            </div>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src="/swagger-editor/"
          title="Swagger Editor"
          onLoad={handleLoad}
          style={{ height: '100%', width: '100%', border: 'none', colorScheme: 'light' }}
        />
      </div>
    </div>
  );
}
