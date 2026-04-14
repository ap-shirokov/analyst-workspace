# Analyst Workspace

Инструментарий для системного и бизнес-аналитика с локальным AI через Ollama.

## Требования

- Node.js 18+
- [Ollama](https://ollama.com) — запущенная локально

## Быстрый старт

```bash
# 1. Установить зависимости
npm install

# 2. Запустить (Ollama должна быть запущена)
npm run dev
```

Приложение: http://localhost:3000

## Ollama — настройка модели

По умолчанию используется модель `llama3`. Можно переопределить:

```bash
# Через переменную окружения
OLLAMA_MODEL=qwen2.5:7b npm run dev

# Или создать .env файл
echo "OLLAMA_MODEL=qwen2.5:7b" > .env
echo "OLLAMA_URL=http://localhost:11434" >> .env
```

Модель также можно выбрать прямо в UI — в нижней части сайдбара отображается список всех установленных моделей.

### Рекомендуемые модели для аналитических задач

| Модель             | Размер | Качество      |
|--------------------|--------|---------------|
| `llama3`           | 4.7GB  | Хорошее       |
| `qwen2.5:7b`       | 4.4GB  | Отличное      |
| `mistral`          | 4.1GB  | Хорошее       |
| `deepseek-r1:7b`   | 4.7GB  | Отличное      |
| `codellama`        | 3.8GB  | SQL/code      |

```bash
# Установить модель
ollama pull qwen2.5:7b
```

## Переменные окружения (.env)

| Переменная     | По умолчанию              | Описание                  |
|----------------|---------------------------|---------------------------|
| `OLLAMA_URL`   | `http://localhost:11434`  | Адрес Ollama сервера      |
| `OLLAMA_MODEL` | `llama3`                  | Модель по умолчанию       |
| `PORT`         | `3000`                    | Порт приложения           |

## Инструменты

| Инструмент            | Тип     | Описание                                         |
|-----------------------|---------|--------------------------------------------------|
| Swagger Editor        | Embed   | Встройка editor.swagger.io                       |
| JSON Formatter        | Утилита | Форматирование, минификация, валидация JSON      |
| UUID Generator        | Утилита | v4/v1, batch до 100 штук                         |
| Diff Checker          | Утилита | Строки / слова / символы, unified diff           |
| SQL Generator         | AI      | PostgreSQL, MySQL, SQLite, MSSQL, Oracle, CH     |
| OpenAPI Generator     | AI      | OAS 3.0 / 3.1, YAML или JSON                    |
| User Story / Use Case | AI      | Story, Use Case или оба формата                  |
| Acceptance Criteria   | AI      | Gherkin (Given/When/Then) и/или чеклист          |

## Сборка для продакшена

```bash
npm run build
NODE_ENV=production node dist/index.cjs
```
