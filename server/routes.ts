import type { Express } from 'express';
import type { Server } from 'http';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { writeFile, unlink, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { storage } from './storage.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ollama configuration
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5-coder:7b';

// PlantUML jar — expected in project root
const PLANTUML_JAR = path.resolve(__dirname, '..', 'plantuml.jar');

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
      options: { temperature: 0.3, num_predict: 4096 },
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

function saveHistory(tool: string, title: string, input: object, output: string) {
  try {
    storage.addHistory({ tool, title, input: JSON.stringify(input), output, createdAt: Date.now() });
  } catch (e) {
    console.error('History save error:', e);
  }
}

export function registerRoutes(httpServer: Server, app: Express) {

  // Serve swagger-editor-dist locally
  const swaggerEditorPath = path.resolve(__dirname, '../node_modules/swagger-editor-dist');
  app.use('/swagger-editor', express.static(swaggerEditorPath));

  // ── Ollama ──────────────────────────────────────────────────────────────

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

  // ── PlantUML ────────────────────────────────────────────────────────────

  // POST /api/plantuml/render — render PlantUML code via local jar → returns PNG
  app.post('/api/plantuml/render', async (req, res) => {
    const { code } = req.body as { code: string };
    if (!code?.trim()) return res.status(400).json({ error: 'code is required' });

    const id = randomUUID();
    const inputFile = path.join(tmpdir(), `plantuml-${id}.puml`);
    const outputFile = path.join(tmpdir(), `plantuml-${id}.png`);

    try {
      await writeFile(inputFile, code, 'utf-8');

      await new Promise<void>((resolve, reject) => {
        const proc = spawn('java', [
          '-jar', PLANTUML_JAR,
          '-tpng',
          '-o', tmpdir(),
          inputFile,
        ]);

        let stderr = '';
        proc.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });

        proc.on('close', (code) => {
          if (code !== 0) {
            reject(new Error(
              stderr.includes('java') && stderr.includes('not found')
                ? 'Java не найдена. Установите Java: https://adoptium.net'
                : stderr || `PlantUML завершился с кодом ${code}`
            ));
          } else {
            resolve();
          }
        });

        proc.on('error', (err: any) => {
          if (err.code === 'ENOENT') {
            reject(new Error('Java не найдена. Установите Java: https://adoptium.net'));
          } else {
            reject(new Error(`Ошибка запуска PlantUML: ${err.message}`));
          }
        });
      });

      // plantuml outputs file with same name but .png extension
      const pngFile = path.join(tmpdir(), `plantuml-${id}.png`);
      const png = await readFile(pngFile);
      res.set('Content-Type', 'image/png');
      res.send(png);

      // Cleanup
      unlink(inputFile).catch(() => {});
      unlink(outputFile).catch(() => {});
    } catch (e: any) {
      console.error('PlantUML render error:', e.message);
      unlink(inputFile).catch(() => {});
      res.status(500).json({ error: e.message });
    }
  });

  // GET /api/plantuml/check — проверить доступность Java и plantuml.jar
  app.get('/api/plantuml/check', async (_req, res) => {
    const checks = { java: false, jar: false, javaVersion: '' };

    // Check jar exists
    try {
      await readFile(PLANTUML_JAR);
      checks.jar = true;
    } catch {}

    // Check java
    await new Promise<void>((resolve) => {
      const proc = spawn('java', ['-version']);
      let ver = '';
      proc.stderr.on('data', (d: Buffer) => { ver += d.toString(); });
      proc.on('close', (code) => {
        if (code === 0 || ver.includes('version')) {
          checks.java = true;
          checks.javaVersion = ver.split('\n')[0] || 'ok';
        }
        resolve();
      });
      proc.on('error', () => resolve());
    });

    res.json(checks);
  });

  // POST /api/generate/plantuml — AI generates PlantUML code
  app.post('/api/generate/plantuml', async (req, res) => {
    try {
      const { prompt, existingCode = '', model } = req.body as {
        prompt: string;
        existingCode?: string;
        model?: string;
      };
      if (!prompt?.trim()) return res.status(400).json({ error: 'prompt is required' });

      const system = `Ты эксперт по диаграммам PlantUML. Генерируй корректный PlantUML код.

Правила:
- Возвращай ТОЛЬКО PlantUML код, обёрнутый в @startuml ... @enduml
- Без объяснений, без markdown-блоков вокруг кода
- Используй русские подписи/названия
- Поддерживай все типы: sequence, class, activity, component, usecase, state, ER
- Если есть существующий код — модифицируй его согласно запросу
- Добавляй skinparam для красивого вида:
  skinparam defaultFontName Arial
  skinparam backgroundColor #FAFAFA`;

      const userMsg = existingCode.trim()
        ? `Существующий код:\n${existingCode}\n\nЗапрос: ${prompt}`
        : `Создай диаграмму: ${prompt}`;

      const result = await askOllama(system, userMsg, model);
      saveHistory('plantuml', prompt.slice(0, 80), { prompt }, result);
      res.json({ result });
    } catch (e: any) {
      console.error('PlantUML gen error:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // ── SQL Generator ───────────────────────────────────────────────────────

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
      saveHistory('sql', description.slice(0, 80), { description, dialect }, result);
      res.json({ result });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── OpenAPI Generator ───────────────────────────────────────────────────

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
- Используй корректные HTTP методы и статус-коды
- Добавляй примеры (example) для схем
- Следуй REST-принципам именования`;

      const result = await askOllama(system, `Описание API: ${description}\nФормат вывода: ${format.toUpperCase()}`, model);
      saveHistory('openapi', description.slice(0, 80), { description, version, format }, result);
      res.json({ result });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── User Story ──────────────────────────────────────────────────────────

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
      saveHistory('user-story', description.slice(0, 80), { description, type, role }, result);
      res.json({ result });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Acceptance Criteria ─────────────────────────────────────────────────

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
Scenario: [название]
  Given [предусловие]
  When [действие]
  Then [результат]` : ''}
${format === 'checklist' || format === 'both' ? `Чеклист-формат:\n☐ [критерий]` : ''}

Покрывай: основной сценарий, негативные случаи, граничные условия, валидацию.`;

      const formatMap: Record<string, string> = {
        gherkin: 'Используй только Gherkin.',
        checklist: 'Используй только формат чеклиста со значком ☐.',
        both: 'Сначала Gherkin сценарии, затем чеклист.',
      };

      const result = await askOllama(
        system,
        `User Story: ${story}${context ? `\n\nКонтекст: ${context}` : ''}\n\n${formatMap[format] || formatMap.gherkin}`,
        model,
      );
      saveHistory('acceptance', story.slice(0, 80), { story, format, context }, result);
      res.json({ result });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── History API ─────────────────────────────────────────────────────────

  app.get('/api/history', (_req, res) => {
    try { res.json(storage.getHistory(200)); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete('/api/history/:id', (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: 'invalid id' });
      storage.deleteHistory(id);
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete('/api/history', (_req, res) => {
    try { storage.clearHistory(); res.json({ ok: true }); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', ollama: OLLAMA_URL, model: OLLAMA_MODEL });
  });
}
