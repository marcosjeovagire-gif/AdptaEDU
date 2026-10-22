#!/usr/bin/env bash
# ==============================================================================
# AdaptaEdu Escolar - Script de Backup Completo e Estruturado (Etapa 13)
# ==============================================================================
set -euo pipefail

BACKUP_ROOT="./backup"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
MANIFEST_FILE="${BACKUP_ROOT}/manifest_${TIMESTAMP}.txt"

echo "[$(date +'%Y-%m-%dT%H:%M:%S%z')] [INFO] Iniciando rotina de Backup Completo..."

# Criar estrutura de diretórios
mkdir -p "${BACKUP_ROOT}/frontend" \
         "${BACKUP_ROOT}/backend" \
         "${BACKUP_ROOT}/firebase" \
         "${BACKUP_ROOT}/firestore" \
         "${BACKUP_ROOT}/storage" \
         "${BACKUP_ROOT}/config"

echo "=== MANIFESTO DE BACKUP ADAPTAEDU - ${TIMESTAMP} ===" > "${MANIFEST_FILE}"

backup_file() {
  local src="$1"
  local dest_dir="$2"
  if [ -f "$src" ]; then
    cp "$src" "$dest_dir/"
    local sha
    sha=$(sha256sum "$src" | awk '{print $1}')
    echo "[OK] ${src} -> ${dest_dir}/ (SHA256: ${sha})" | tee -a "${MANIFEST_FILE}"
  else
    echo "[AVISO] Arquivo de origem não encontrado: ${src}" | tee -a "${MANIFEST_FILE}"
  fi
}

echo "[INFO] Copiando arquivos do Firestore e Firebase..."
backup_file "./firestore.rules" "${BACKUP_ROOT}/firestore"
backup_file "./firestore.indexes.json" "${BACKUP_ROOT}/firestore"
backup_file "./firebase.json" "${BACKUP_ROOT}/firebase"
backup_file "./firebase-blueprint.json" "${BACKUP_ROOT}/firebase"
backup_file "./firebase-applet-config.json" "${BACKUP_ROOT}/firebase"

echo "[INFO] Copiando arquivos do Firebase Storage..."
backup_file "./storage.rules" "${BACKUP_ROOT}/storage"

echo "[INFO] Copiando arquivos do Frontend..."
backup_file "./vite.config.ts" "${BACKUP_ROOT}/frontend"
backup_file "./index.html" "${BACKUP_ROOT}/frontend"

echo "[INFO] Copiando arquivos do Backend..."
backup_file "./server.ts" "${BACKUP_ROOT}/backend"

echo "[INFO] Copiando configurações globais..."
backup_file "./package.json" "${BACKUP_ROOT}/config"
backup_file "./tsconfig.json" "${BACKUP_ROOT}/config"
backup_file "./metadata.json" "${BACKUP_ROOT}/config"
if [ -f "./.env.example" ]; then
  backup_file "./.env.example" "${BACKUP_ROOT}/config"
fi

echo "[$(date +'%Y-%m-%dT%H:%M:%S%z')] [INFO] Backup concluído com sucesso!"
echo "[INFO] Manifesto gravado em: ${MANIFEST_FILE}"
