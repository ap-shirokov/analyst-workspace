import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import {
  Code2,
  Braces,
  Hash,
  GitCompare,
  Database,
  FileJson,
  BookOpen,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  Layers,
  History,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import OllamaStatus from '@/components/OllamaStatus';

const tools = [
  {
    group: 'Стандарты',
    items: [
      { path: '/swagger', label: 'Swagger Editor', icon: Code2, badge: 'IDE' },
    ],
  },
  {
    group: 'Утилиты',
    items: [
      { path: '/json', label: 'JSON Formatter', icon: Braces, badge: null },
      { path: '/uuid', label: 'UUID Generator', icon: Hash, badge: null },
      { path: '/diff', label: 'Diff Checker', icon: GitCompare, badge: null },
    ],
  },
  {
    group: 'AI-генераторы',
    items: [
      { path: '/sql-gen', label: 'SQL Generator', icon: Database, badge: 'AI' },
      { path: '/openapi-gen', label: 'OpenAPI Generator', icon: FileJson, badge: 'AI' },
      { path: '/user-story', label: 'User Story / Use Case', icon: BookOpen, badge: 'AI' },
      { path: '/acceptance', label: 'Acceptance Criteria', icon: CheckSquare, badge: 'AI' },
    ],
  },
  {
    group: 'Данные',
    items: [
      { path: '/history', label: 'История', icon: History, badge: null },
    ],
  },
];

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  const toggleTheme = () => {
    setDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle('dark', next);
      return next;
    });
  };

  // Init dark mode
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', dark);
  }

  const isActive = (path: string) => {
    if (path === '/swagger' && (location === '/' || location === '/swagger')) return true;
    return location === path;
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Sidebar */}
        <aside
          className={cn(
            'flex flex-col transition-all duration-200 border-r border-sidebar-border shrink-0',
            'bg-[hsl(var(--sidebar-background))]',
            collapsed ? 'w-14' : 'w-56'
          )}
        >
          {/* Logo */}
          <div className={cn(
            'flex items-center h-14 px-3 border-b border-sidebar-border shrink-0',
            collapsed ? 'justify-center' : 'justify-between'
          )}>
            {!collapsed && (
              <div className="flex items-center gap-2">
                {/* SVG Logo */}
                <svg aria-label="Analyst Workspace" viewBox="0 0 28 28" width="28" height="28" fill="none" className="shrink-0">
                  <rect width="28" height="28" rx="6" fill="hsl(221 83% 53%)"/>
                  <path d="M7 9h8M7 14h14M7 19h10" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
                  <circle cx="19" cy="9" r="2.5" fill="white" fillOpacity="0.9"/>
                </svg>
                <span className="text-sm font-semibold text-[hsl(var(--sidebar-foreground))] tracking-tight">
                  AW<span className="text-[hsl(var(--sidebar-primary))]">.</span>
                </span>
              </div>
            )}
            {collapsed && (
              <svg aria-label="Analyst Workspace" viewBox="0 0 28 28" width="24" height="24" fill="none">
                <rect width="28" height="28" rx="6" fill="hsl(221 83% 53%)"/>
                <path d="M7 9h8M7 14h14M7 19h10" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
                <circle cx="19" cy="9" r="2.5" fill="white" fillOpacity="0.9"/>
              </svg>
            )}
            {!collapsed && (
              <button
                onClick={() => setCollapsed(true)}
                className="text-[hsl(var(--sidebar-foreground))] opacity-50 hover:opacity-100 transition-opacity"
                aria-label="Свернуть меню"
              >
                <ChevronLeft size={16} />
              </button>
            )}
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
            {tools.map((group) => (
              <div key={group.group} className="mb-3">
                {!collapsed && (
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[hsl(var(--sidebar-foreground))] opacity-40 px-2 mb-1">
                    {group.group}
                  </p>
                )}
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  const link = (
                    <Link
                      key={item.path}
                      href={item.path}
                      className={cn(
                        'flex items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-all duration-150',
                        'text-[hsl(var(--sidebar-foreground))]',
                        active
                          ? 'bg-[hsl(var(--sidebar-primary))] text-white font-medium'
                          : 'hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-accent-foreground))]',
                        collapsed && 'justify-center px-2'
                      )}
                      data-testid={`nav-${item.path.replace('/', '')}`}
                    >
                      <Icon size={16} className="shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="flex-1 truncate">{item.label}</span>
                          {item.badge && (
                            <span className={cn(
                              'text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide',
                              item.badge === 'AI'
                                ? 'bg-purple-500/20 text-purple-300'
                                : 'bg-blue-500/20 text-blue-300'
                            )}>
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </Link>
                  );

                  return collapsed ? (
                    <Tooltip key={item.path}>
                      <TooltipTrigger asChild>{link}</TooltipTrigger>
                      <TooltipContent side="right" className="text-xs">{item.label}</TooltipContent>
                    </Tooltip>
                  ) : link;
                })}
              </div>
            ))}
          </nav>

          {/* Ollama status + model selector */}
          <OllamaStatus collapsed={collapsed} />

          {/* Footer controls */}
          <div className={cn(
            'flex items-center border-t border-sidebar-border p-2 gap-1 shrink-0',
            collapsed ? 'flex-col' : 'flex-row justify-between'
          )}>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md text-[hsl(var(--sidebar-foreground))] opacity-60 hover:opacity-100 hover:bg-[hsl(var(--sidebar-accent))] transition-all"
              aria-label="Переключить тему"
            >
              {dark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            {collapsed && (
              <button
                onClick={() => setCollapsed(false)}
                className="p-2 rounded-md text-[hsl(var(--sidebar-foreground))] opacity-60 hover:opacity-100 hover:bg-[hsl(var(--sidebar-accent))] transition-all"
                aria-label="Развернуть меню"
              >
                <ChevronRight size={15} />
              </button>
            )}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-hidden flex flex-col min-w-0">
          {children}
        </main>
      </div>
    </TooltipProvider>
  );
}
