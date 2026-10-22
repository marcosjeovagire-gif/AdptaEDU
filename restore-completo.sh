#!/usr/bin/env bash
# ==============================================================================
# AdaptaEdu Escolar - Script de Restauração Completa e Rollback (Etapa 13/14)
# ==============================================================================
set -euo pipefail

BACKUP_ROOT="./backup"

echo "[$(date +'%Y-%m-%dT%H:%M:%S%z')] [INFO] Iniciando restauração do sistema a partir de ${BACKUP_ROOT}..."

if [ ! -d "${BACKUP_ROOT}" ]; then
  echo "[ERRO] Diretório de backup ${BACKUP_ROOT} não encontrado! Operação abortada." >&2
  exit 1
fi

restore_file() {
  local backup_file="$1"
  local dest_path="$2"
  if [ -f "$backup_file" ]; then
    cp "$backup_file" "$dest_path"
    local sha
    sha=$(sha256sum "$dest_path" | awk '{print $1}')
    echo "[RESTAURADO] ${dest_path} (SHA256: ${sha})"
  else
    echo "[AVISO] Arquivo no backup não encontrado: ${backup_file}"
  fi
}

echo "[INFO] Restaurando Firestore e Firebase..."
restore_file "${BACKUP_ROOT}/firestore/firestore.rules" "./firestore.rules"
restore_file "${BACKUP_ROOT}/firestore/firestore.indexes.json" "./firestore.indexes.json"
restore_file "${BACKUP_ROOT}/firebase/firebase.json" "./firebase.json"
restore_file "${BACKUP_ROOT}/firebase/firebase-blueprint.json" "./firebase-blueprint.json"
restore_file "${BACKUP_ROOT}/firebase/firebase-applet-config.json" "./firebase-applet-config.json"

echo "[INFO] Restaurando Storage..."
restore_file "${BACKUP_ROOT}/storage/storage.rules" "./storage.rules"

echo "[INFO] Restaurando Frontend..."
restore_file "${BACKUP_ROOT}/frontend/vite.config.ts" "./vite.config.ts"
restore_file "${BACKUP_ROOT}/frontend/index.html" "./index.html"

echo "[INFO] Restaurando Backend..."
restore_file "${BACKUP_ROOT}/backend/server.ts" "./server.ts"

echo "[INFO] Restaurando Configurações Globais..."
restore_file "${BACKUP_ROOT}/config/package.json" "./package.json"
restore_file "${BACKUP_ROOT}/config/tsconfig.json" "./tsconfig.json"
restore_file "${BACKUP_ROOT}/config/metadata.json" "./metadata.json"
if [ -f "${BACKUP_ROOT}/config/.env.example" ]; then
  restore_file "${BACKUP_ROOT}/config/.env.example" "./.env.example"
fi

echo "[$(date +'%Y-%m-%dT%H:%M:%S%z')] [INFO] Restauração física de arquivos concluída com sucesso!"
echo "[INFO] Execute ./validacao-pos-restauracao.sh para verificar integridade da aplicação."
