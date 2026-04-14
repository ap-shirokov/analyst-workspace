import { useState, useRef } from 'react';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SwaggerTool() {
  const [loading, setLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleLoad = () => setLoading(false);

  const reload = () => {
    setLoading(true);
    if (iframeRef.current) {
      // eslint-disable-next-line no-self-assign
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  // В dev режиме iframe указывает на /swagger-editor/ на том же порту
  const swaggerUrl = '/swagger-editor/';

  return (
    <div className="tool-container">
      <div className="tool-header flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-foreground">Swagger Editor</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Редактирование и валидация OpenAPI/Swagger спецификаций</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={reload} className="h-8 gap-1.5 text-xs">
            <RefreshCw size={13} />
            Reload
          </Button>
          <a
            href={swaggerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink size={13} />
            Открыть отдельно
          </a>
        </div>
      </div>
      <div className="flex-1 relative overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full spinner" />
              <p className="text-sm text-muted-foreground">Загрузка Swagger Editor...</p>
            </div>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={swaggerUrl}
          className="swagger-iframe"
          title="Swagger Editor"
          onLoad={handleLoad}
          style={{ height: '100%', width: '100%', border: 'none' }}
        />
      </div>
    </div>
  );
}
