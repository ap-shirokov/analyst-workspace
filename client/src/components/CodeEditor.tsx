import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { sql } from '@codemirror/lang-sql';
import { yaml } from '@codemirror/lang-yaml';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from 'codemirror';
import { useEffect, useState } from 'react';

type Lang = 'json' | 'sql' | 'yaml' | 'text';

interface Props {
  value: string;
  onChange?: (val: string) => void;
  lang?: Lang;
  readOnly?: boolean;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

const lightTheme = EditorView.theme({
  '&': { backgroundColor: 'hsl(220 14% 96%)' },
  '.cm-gutters': { backgroundColor: 'hsl(214 32% 91%)', border: 'none' },
  '.cm-activeLineGutter': { backgroundColor: 'hsl(214 32% 88%)' },
  '.cm-activeLine': { backgroundColor: 'hsl(214 32% 93%)' },
});

const darkTheme = EditorView.theme({
  '&': { backgroundColor: 'hsl(222 47% 7%)' },
  '.cm-gutters': { backgroundColor: 'hsl(222 47% 8%)', border: 'none' },
}, { dark: true });

function getExtensions(lang: Lang) {
  switch (lang) {
    case 'json': return [json()];
    case 'sql': return [sql()];
    case 'yaml': return [yaml()];
    default: return [];
  }
}

export default function CodeEditor({ value, onChange, lang = 'text', readOnly = false, placeholder, className, minHeight = '200px' }: Props) {
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains('dark')
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      readOnly={readOnly}
      placeholder={placeholder}
      theme={isDark ? [oneDark, darkTheme] : lightTheme}
      extensions={getExtensions(lang)}
      className={className}
      style={{ minHeight, fontSize: '13px', fontFamily: "'JetBrains Mono', monospace" }}
      basicSetup={{
        lineNumbers: true,
        foldGutter: true,
        highlightActiveLine: true,
        highlightSelectionMatches: true,
        autocompletion: true,
        bracketMatching: true,
        closeBrackets: true,
        indentOnInput: true,
      }}
    />
  );
}
