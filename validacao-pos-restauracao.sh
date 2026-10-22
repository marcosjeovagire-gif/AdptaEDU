#!/usr/bin/env bash
# ==============================================================================
# AdaptaEdu Escolar - Script de Validação Pós-Restauração (Etapa 13/14)
# ==============================================================================
set -euo pipefail

echo "[$(date +'%Y-%m-%dT%H:%M:%S%z')] [INFO] Iniciando validação pós-restauração..."

echo "==> 1. Verificando presença dos arquivos críticos..."
CRITICAL_FILES=(
  "package.json"
  "tsconfig.json"
  "vite.config.ts"
  "server.ts"
  "index.html"
  "firestore.rules"
  "storage.rules"
  "firebase.json"
  "firestore.indexes.json"
  "firebase-blueprint.json"
  "firebase-applet-config.json"
)

for file in "${CRITICAL_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "  [OK] $file presente ($(wc -c < "$file") bytes)"
  else
    echo "  [FALHA] Arquivo crítico ausente: $file" >&2
    exit 1
  fi
done

echo "==> 2. Executando checagem de tipos TypeScript (tsc --noEmit)..."
npm run lint

echo "==> 3. Executando bateria de testes automatizados da aplicação..."
npm test

echo "==> 4. Validando compilação do bundle (vite build)..."
npm run build

echo "[$(date +'%Y-%m-%dT%H:%M:%S%z')] [SUCESSO] Sistema 100% validado e operacional após restauração!"
