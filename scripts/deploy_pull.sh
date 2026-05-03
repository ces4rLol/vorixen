#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "== VORIXEN deploy pull =="

if ! command -v node >/dev/null 2>&1; then
  echo "Node no está instalado. Instala Node 24 antes de desplegar." >&2
  exit 1
fi

NODE_MAJOR="$(node -p "Number(process.versions.node.split('.')[0])")"
if [ "$NODE_MAJOR" -lt 24 ]; then
  echo "Node >=24 requerido. Versión actual: $(node --version)" >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm no está instalado o no está en PATH." >&2
  exit 1
fi

if ! command -v pm2 >/dev/null 2>&1; then
  echo "pm2 no está instalado. Ejecuta: npm install -g pm2" >&2
  exit 1
fi

if [ ! -f ".env" ]; then
  echo ".env no existe. Créalo con: nano .env. Usa DEPLOY_HOSTINGER.md como guía." >&2
  exit 1
fi

mkdir -p data logs

echo "== git pull =="
git pull --ff-only

echo "== install dependencies =="
if [ -f "package-lock.json" ]; then
  npm ci --omit=dev
else
  npm install --omit=dev
fi

echo "== production env check =="
node scripts/check_production_env.js

echo "== tests =="
npm test

echo "== self audit =="
npm run self-audit

echo "== pm2 reload =="
pm2 startOrReload ecosystem.config.cjs --env production
pm2 save

PORT="$(grep -E '^PORT=' .env | tail -n 1 | cut -d '=' -f 2- | tr -d '"' || true)"
PORT="${PORT:-3000}"

echo "== local healthcheck =="
if command -v curl >/dev/null 2>&1; then
  curl -fsS "http://127.0.0.1:${PORT}/health"
  echo
else
  echo "curl no está instalado; healthcheck omitido."
fi

echo "Deploy completo."
