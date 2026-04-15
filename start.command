#!/bin/bash
# ============================================================
#  Analyst Workspace — macOS launch script
#  Двойной клик по файлу запускает всё необходимое.
# ============================================================

# Переходим в папку, где лежит скрипт (даже при двойном клике)
cd "$(dirname "$0")"

# ---------- цвета ----------
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

header() { echo -e "\n${CYAN}${BOLD}▶ $1${RESET}"; }
ok()     { echo -e "  ${GREEN}✓ $1${RESET}"; }
warn()   { echo -e "  ${YELLOW}⚠ $1${RESET}"; }
err()    { echo -e "  ${RED}✗ $1${RESET}"; }

echo -e "${BOLD}"
echo "╔══════════════════════════════════════╗"
echo "║      Analyst Workspace  v2.0         ║"
echo "╚══════════════════════════════════════╝"
echo -e "${RESET}"

# ── 1. Node.js ─────────────────────────────────────────────
header "Проверка Node.js"
if ! command -v node &>/dev/null; then
  err "Node.js не найден."
  echo ""
  echo "  Установите Node.js (рекомендуется v18+):"
  echo "  https://nodejs.org  или  brew install node"
  echo ""
  read -n1 -r -p "  Нажмите любую клавишу для выхода..."
  exit 1
fi
NODE_VER=$(node -v)
ok "Node.js $NODE_VER"

# ── 2. npm ─────────────────────────────────────────────────
header "Проверка npm"
if ! command -v npm &>/dev/null; then
  err "npm не найден (должен идти вместе с Node.js)."
  exit 1
fi
ok "npm $(npm -v)"

# ── 3. node_modules ────────────────────────────────────────
header "Зависимости"
if [ ! -d "node_modules" ]; then
  warn "node_modules не найден — устанавливаем зависимости..."
  npm install
  if [ $? -ne 0 ]; then
    err "npm install завершился с ошибкой."
    exit 1
  fi
  ok "Зависимости установлены"
else
  ok "node_modules уже есть"
fi

# ── 4. Ollama ──────────────────────────────────────────────
header "Ollama"
if ! command -v ollama &>/dev/null; then
  warn "Ollama не найдена в PATH."
  echo "  Скачайте на https://ollama.com или установите:"
  echo "  brew install ollama"
  echo ""
  echo "  Приложение запустится, но AI-генерация работать не будет"
  echo "  до тех пор, пока Ollama не запущена."
else
  # Проверяем, запущен ли сервер Ollama
  if curl -s --max-time 2 http://localhost:11434/api/tags &>/dev/null; then
    ok "Ollama уже запущена"
  else
    warn "Запускаем Ollama в фоне..."
    ollama serve &>/dev/null &
    OLLAMA_PID=$!
    # Ждём старта
    for i in $(seq 1 10); do
      sleep 1
      if curl -s --max-time 1 http://localhost:11434/api/tags &>/dev/null; then
        ok "Ollama запущена (PID $OLLAMA_PID)"
        break
      fi
      if [ $i -eq 10 ]; then
        warn "Ollama не ответила за 10 секунд — продолжаем без неё"
      fi
    done
  fi

  # Проверяем модель
  MODEL="qwen2.5-coder:7b"
  if ollama list 2>/dev/null | grep -q "$MODEL"; then
    ok "Модель $MODEL найдена"
  else
    warn "Модель $MODEL не найдена."
    echo "  Запустите: ollama pull $MODEL"
  fi
fi

# ── 5. Запуск приложения ───────────────────────────────────
header "Запуск Analyst Workspace на http://localhost:3000"
echo ""

# Функция открытия браузера после старта сервера
open_browser() {
  sleep 4
  open "http://localhost:3000" 2>/dev/null || true
}
open_browser &

# Запускаем dev-сервер (блокирующий вызов)
npm run dev

# Если сервер упал — держим окно открытым
EXIT_CODE=$?
echo ""
if [ $EXIT_CODE -ne 0 ]; then
  err "Сервер завершился с кодом $EXIT_CODE"
fi
echo -e "${YELLOW}Нажмите любую клавишу для выхода...${RESET}"
read -n1 -r
