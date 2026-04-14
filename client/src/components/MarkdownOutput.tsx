import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

interface Props {
  content: string;
  className?: string;
}

export default function MarkdownOutput({ content, className }: Props) {
  return (
    <div className={cn('p-4 text-sm leading-relaxed text-foreground markdown-output', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="text-base font-bold mb-2 mt-4 first:mt-0 text-foreground">{children}</h1>,
          h2: ({ children }) => <h2 className="text-sm font-bold mb-2 mt-4 first:mt-0 text-foreground">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-semibold mb-1.5 mt-3 first:mt-0 text-foreground">{children}</h3>,
          p: ({ children }) => <p className="mb-2 last:mb-0 text-foreground">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
          em: ({ children }) => <em className="italic text-muted-foreground">{children}</em>,
          ul: ({ children }) => <ul className="mb-2 ml-4 space-y-0.5 list-disc text-foreground">{children}</ul>,
          ol: ({ children }) => <ol className="mb-2 ml-4 space-y-0.5 list-decimal text-foreground">{children}</ol>,
          li: ({ children }) => <li className="text-foreground">{children}</li>,
          code: ({ inline, children, ...props }: any) =>
            inline ? (
              <code className="px-1.5 py-0.5 rounded text-[12px] font-mono bg-muted text-foreground border border-border/50">
                {children}
              </code>
            ) : (
              <code className="block text-[12.5px] font-mono leading-relaxed text-foreground">
                {children}
              </code>
            ),
          pre: ({ children }) => (
            <pre className="mb-3 p-3 rounded-md bg-muted border border-border overflow-x-auto text-[12.5px] font-mono leading-relaxed">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-primary/40 pl-3 my-2 text-muted-foreground italic">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-3 border-border" />,
          table: ({ children }) => (
            <div className="overflow-x-auto mb-3">
              <table className="w-full text-xs border-collapse border border-border">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-border px-2 py-1.5 bg-muted font-semibold text-left text-foreground">{children}</th>
          ),
          td: ({ children }) => (
            <td className="border border-border px-2 py-1.5 text-foreground">{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
