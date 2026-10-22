# Changelog de Correções e Auditoria - AdaptaEdu Escolar

## [Versão 1.1.0] - 2026-10-22

### 1. Correções Críticas do Servidor de Desenvolvimento e WebSocket
- **Problema**: O processo de desenvolvimento falhou no pre-warming (`Pre-warming failed: dev server process died`) e gerava avisos de conexão WebSocket em `localhost:3000` a partir do Cloud Run (`https://ais-dev-*.us-east1.run.app`).
- **Causa Raiz 1**: A biblioteca `vite-plugin-compression` estava importada e invocada em `vite.config.ts`, porém ausente em `package.json`, provocando falha fatal imediata `Cannot find package 'vite-plugin-compression'`.
- **Causa Raiz 2**: A configuração `server.hmr` no `vite.config.ts` tentava instanciar um WebSocket client para `localhost:3000`, incompatível com a execução remota conteinerizada do Cloud Run sob iFrame.
- **Solução Implementada**:
  - Instalado o pacote `vite-plugin-compression` nas `devDependencies`.
  - Configurado `server.hmr: false`, `server.allowedHosts: true` e `preview.allowedHosts: true` no `vite.config.ts`, atendendo estritamente à diretriz de ambiente "HMR: Disabled. Ignore WebSocket errors".
  - O dev server agora inicia de maneira instantânea e estável na porta 3000 (`0.0.0.0`).

### 2. Otimização de Chunks e Performance de Build
- **Problema**: Bundle único com advertência `Some chunks are larger than 500 kB after minification` (3.735 kB).
- **Solução Implementada**:
  - Configuração granular de `rollupOptions.output.manualChunks` e `rolldownOptions.output.codeSplitting.groups`.
  - Chunks isolados criados para:
    - `vendor-firebase` (Firebase Core, Firestore, Auth)
    - `vendor-pdf` (jsPDF, html2canvas)
    - `vendor-dashboard` (Recharts, d3)
    - `vendor-icons` (lucide-react)
    - `vendor-motion` (motion)
    - `vendor-genai` (@google/genai)
    - `chunk-editor-a4` (Componentes da prancha A4)
    - `chunk-dashboard` (Dashboards da coordenação)
    - `chunk-relatorios-pei` (Módulos PEI e relatórios)
    - `chunk-administracao-master` e `chunk-administracao-coordenacao`
  - Compressão Gzip integrada via `vite-plugin-compression` para arquivos acima de 10KB.

### 3. Diagnóstico e Resiliência do Firebase & Firestore
- **Problema**: `FirebaseError: Missing or insufficient permissions` em operações de sincronização em tempo real quando sem credencial autenticada no Firebase Auth.
- **Causa Raiz**: O Firestore Security Rules exige `isAuthenticated()` (`request.auth != null`). Quando o aplicativo iniciava listeners antes do Firebase Auth resolver o usuário ou durante testes CLI não autenticados, o Firestore rejeitava a conexão.
- **Solução Implementada**:
  - O `escolaFirestoreService.ts` foi estruturado para vincular os listeners `onSnapshot` exclusivamente após `onAuthStateChanged(user)` confirmar usuário ativo, pausando com fallback offline amigável quando desconectado.
  - Implementado o padronizado `handleFirestoreError` com payload estruturado conforme o skill `firebase-integration-rpc`.
  - Criado o arquivo `firebase.json` integrando formalmente `firestore.rules`, `firestore.indexes.json` e `storage.rules`.
  - Criados índices compostos em `firestore.indexes.json` para ordenações de atividades, registros de apoio e logs de auditoria.

### 4. Sistema Corporativo de Logging
- **Implementado**: `src/services/logger.ts` com níveis `DEBUG`, `INFO`, `WARN`, `ERROR`.
- Suporte a múltiplos ambientes (`development`, `staging`, `production`).
- Mascaramento e sanitização rigorosa de dados sensíveis (PII, tokens JWT, senhas e chaves de API).
- Buffer circular em memória com exportação JSON para auditoria técnica.
- Método de diagnóstico automatizado `firebasePermissionError()` para apontar a regra exata e sugestão de ação corretiva.

### 5. Backup Estruturado e Automação de Contingência (Etapas 13 e 14)
- Criada a árvore `/backup/` com separações por camada: `frontend/`, `backend/`, `firebase/`, `firestore/`, `storage/`, `config/`.
- Desenvolvidos os scripts com permissão de execução:
  - `backup-completo.sh`: Gera snapshots com manifesto e hashes SHA256.
  - `restore-completo.sh`: Restaura as configurações do sistema de forma atômica e validada.
  - `validacao-pos-restauracao.sh`: Executa checagem de tipos, testes automatizados e compilação de produção.
