import type { Express } from 'express';
import type { Server } from 'http';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ollama configuration — override via .env
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5-coder:7b';

async function askOllama(systemPrompt: string, userPrompt: string, model?: string): Promise<string> {
  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model || OLLAMA_MODEL,
      stream: false,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      options: {
        temperature: 0.3,
        num_predict: 4096,
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Ollama error ${response.status}: ${text}`);
  }

  const data = await response.json() as any;
  const content = data?.message?.content;
  if (!content) throw new Error('Ollama вернул пустой ответ');
  return content;
}

export function registerRoutes(httpServer: Server, app: Express) {

  // Serve swagger-editor-dist as local static (no external CDN needed)
  const swaggerEditorPath = path.resolve(__dirname, '../node_modules/swagger-editor-dist');
  app.use('/swagger-editor', express.static(swaggerEditorPath));

  // GET /api/ollama/models — список доступных моделей
  app.get('/api/ollama/models', async (_req, res) => {
    try {
      const resp = await fetch(`${OLLAMA_URL}/api/tags`);
      if (!resp.ok) throw new Error(`Ollama недоступна (${resp.status})`);
      const data = await resp.json() as any;
      const models = (data.models || []).map((m: any) => m.name);
      res.json({ models, current: OLLAMA_MODEL, url: OLLAMA_URL });
    } catch (e: any) {
      res.status(503).json({ error: e.message });
    }
  });

  // POST /api/generate/sql
  app.post('/api/generate/sql', async (req, res) => {
    try {
      const { description, dialect = 'PostgreSQL', model } = req.body as {
        description: string;
        dialect?: string;
        model?: string;
      };
      if (!description?.trim()) return res.status(400).json({ error: 'description is required' });

      const system = `Ты эксперт по базам данных и SQL. Генерируй корректные, оптимизированные SQL-запросы для диалекта ${dialect}.
Правила:
- Возвращай ТОЛЬКО SQL-код с краткими комментариями на русском языке через --
- Используй синтаксис, специфичный для ${dialect}
- Ключевые слова SQL пиши ЗАГЛАВНЫМИ буквами
- Форматируй с отступами для читаемости
- После SQL добавь короткое объяснение логики (2-4 строки)`;

      const result = await askOllama(system, `Задача: ${description}`, model);
      res.json({ result });
    } catch (e: any) {
      console.error('SQL gen error:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // POST /api/generate/openapi
  app.post('/api/generate/openapi', async (req, res) => {
    try {
      const { description, version = '3.0', format = 'yaml', model } = req.body as {
        description: string;
        version?: string;
        format?: string;
        model?: string;
      };
      if (!description?.trim()) return res.status(400).json({ error: 'description is required' });

      const oasVersion = version === '3.1' ? '3.1.0' : '3.0.3';
      const system = `Ты эксперт по OpenAPI спецификациям. Генерируй полные OpenAPI ${oasVersion} спецификации в формате ${format.toUpperCase()}.
Правила:
- Возвращай ТОЛЬКО спецификацию, без лишнего текста до или после
- Включай: info, servers, paths (все CRUD операции), components/schemas
- Описания на русском языке
- Используй корректные HTTP методы (GET, POST, PUT, PATCH, DELETE) и статус-коды
- Добавляй примеры (example) для схем
- Следуй REST-принципам именования`;

      const result = await askOllama(system, `Описание API: ${description}\nФормат вывода: ${format.toUpperCase()}`, model);
      res.json({ result });
    } catch (e: any) {
      console.error('OpenAPI gen error:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // POST /api/generate/user-story
  app.post('/api/generate/user-story', async (req, res) => {
    try {
      const { description, type = 'both', role = 'Пользователь', model } = req.body as {
        description: string;
        type?: string;
        role?: string;
        model?: string;
      };
      if (!description?.trim()) return res.status(400).json({ error: 'description is required' });

      const system = `Ты опытный бизнес-аналитик. Создавай чёткие артефакты требований на русском языке.

Формат User Story:
**User Story**
Как [роль], я хочу [действие], чтобы [ценность].

**Описание:** [2-3 предложения контекста]

Формат Use Case:
**Use Case: [название]**
Актор: [роль]
Предусловие: [что должно быть]
Основной поток:
  1. [шаг]
  2. [шаг]
Альтернативные потоки:
  - [исключение/ошибка]
Постусловие: [результат]`;

      const typeMap: Record<string, string> = {
        story: 'Создай только User Story.',
        usecase: 'Создай только Use Case.',
        both: 'Создай User Story, затем Use Case.',
      };

      const result = await askOllama(
        system,
        `Роль актора: ${role}\nОписание: ${description}\n${typeMap[type] || typeMap.both}`,
        model,
      );
      res.json({ result });
    } catch (e: any) {
      console.error('User story gen error:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // POST /api/generate/acceptance
  app.post('/api/generate/acceptance', async (req, res) => {
    try {
      const { story, format = 'gherkin', context = '', model } = req.body as {
        story: string;
        format?: string;
        context?: string;
        model?: string;
      };
      if (!story?.trim()) return res.status(400).json({ error: 'story is required' });

      const system = `Ты опытный QA-инженер и аналитик. Создавай исчерпывающие, тестируемые критерии приёмки на русском языке.

${format === 'gherkin' || format === 'both' ? `Gherkin-формат:
Scenario: [название сценария]
  Given [предусловие]
  When [действие]
  Then [результат]
  And [дополнение при необходимости]` : ''}

${format === 'checklist' || format === 'both' ? `Чеклист-формат:
☐ [критерий — конкретный и тестируемый]` : ''}

Покрывай: основной сценарий, негативные случаи, граничные условия, валидацию.`;

      const formatMap: Record<string, string> = {
        gherkin: 'Используй только Gherkin (Scenario/Given/When/Then).',
        checklist: 'Используй только формат чеклиста со значком ☐.',
        both: 'Сначала Gherkin сценарии, затем чеклист.',
      };

      const prompt = `User Story: ${story}${context ? `\n\nКонтекст/ограничения: ${context}` : ''}\n\n${formatMap[format] || formatMap.gherkin}`;
      const result = await askOllama(system, prompt, model);
      res.json({ result });
    } catch (e: any) {
      console.error('AC gen error:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', ollama: OLLAMA_URL, model: OLLAMA_MODEL });
  });
}
