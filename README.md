# AdaptaEdu Escolar
### Colégio Estadual Olynto Pereira de Castro — SEDUC/GO (CRE Rio Verde)

Sistema de gestão pedagógica inclusiva, geração de Atividades Adaptadas em folha A4 com tipografia pedagógica (Letra Bastão, Ilustrações da Matriz e Pauta Cursiva Pontilhada), Diário de Bordo do Profissional de Apoio, PEI Oficial (SIAP / Anexo 9) e sincronização multi-dispositivo em tempo real com Cloud Firestore e Offline-First (IndexedDB).

---

## 1. Passo a Passo de Configuração no Google Cloud / Firebase

Para colocar o sistema em pleno funcionamento na rede escolar e na nuvem pública:

### Passo 1: Autenticação Google e Domínios Autorizados
1. Acesse o **Console do Firebase** ([console.firebase.google.com](https://console.firebase.google.com)) no projeto `gen-lang-client-0965320684`.
2. Vá em **Authentication** > guia **Sign-in method**.
3. Ative o provedor **Google** (com e-mail de suporte da escola/coordenação).
4. Na guia **Settings** > **Authorized domains**, adicione:
   - `ais-dev-dhwgsxzsrob7nkmenivoxz-633902362611.us-east1.run.app`
   - `ais-pre-dhwgsxzsrob7nkmenivoxz-633902362611.us-east1.run.app`
   - O domínio personalizado ou do Cloud Run gerado após o Deploy.

### Passo 2: Google Drive API e Tela de Consentimento OAuth
1. Acesse o **Google Cloud Console** ([console.cloud.google.com](https://console.cloud.google.com)).
2. Em **APIs e Serviços** > **Biblioteca**, pesquise por **Google Drive API** e clique em **Ativar**.
3. Em **Tela de consentimento OAuth**:
   - Se a escola possuir Google Workspace institucional da SEDUC-GO, selecione tipo **Interno** (Internal). Todos os e-mails `@educa.go.gov.br` terão acesso imediato sem necessidade de aprovação externa.
   - Se for Externo em modo de teste, cadastre os e-mails dos professores e coordenadores em **Usuários de teste**.
4. O escopo utilizado pelo sistema é o seguro e canônico `https://www.googleapis.com/auth/drive.file`.

### Passo 3: Cadastrar a Chave do Gemini nos Secrets
1. No menu superior ou painel lateral do **Google AI Studio**, abra **Secrets**.
2. Adicione a chave com o nome exato: `GEMINI_API_KEY`.
3. O servidor Express utiliza o modelo `gemini-3.8-flash` para processar a síntese do apoio e as atividades estruturadas.

### Passo 4: Publicação Oficial (Deploy no Cloud Run)
1. No canto superior direito do Google AI Studio, clique no botão **Deploy**.
2. Selecione a opção **Cloud Run** com porta 3000.
3. O build roda `npm run build` gerando os pacotes otimizados em `dist/` e iniciando o servidor `server.js` na porta 3000 em `0.0.0.0`.

---

## 2. Incorporação Integral das Matrizes Curriculares SEDUC-GO 2026

O sistema incorpora integralmente os dois cadernos curriculares oficiais enviados:

1. **Matriz de Habilidades Essenciais 2026 — 3º Bimestre: Produção Textual**:
   - 6º Ano: Gênero Carta de Leitor (`EF69LP06-A`, `EF35LP03`) — Pág. 3
   - 7º Ano: Gênero Crônica Argumentativa (`EF69LP07-A`, `EF06LP12`) — Pág. 3
   - 8º Ano: Gênero Poema (`EF69LP02-C`, `EF67LP31-A`) — Pág. 4
   - 9º Ano: Gênero Narrativa de Enigma (`EF89LP35-A`, `EF67LP28-A`) — Pág. 4
   - 1ª à 3ª Séries do Ensino Médio: Redação Dissertativo-Argumentativa do ENEM (Competências I, II, III, IV e V) — Págs. 5 e 6

2. **Matriz de Habilidades Essenciais 2026 — 4º Bimestre (67 Páginas)**:
   - Todas as 18 turmas / séries (6º ao 9º Ano do Fundamental II e 1ª à 3ª Série do Ensino Médio).
   - Todos os componentes curriculares: Ciências da Natureza, Geografia, História, Arte (Visuais, Dança, Música, Teatro), Educação Física, Língua Inglesa, Língua Portuguesa, Matemática, Filosofia, Sociologia, Biologia, Física e Química.
   - Consulta estruturada via `consultarMatriz()` com rastreabilidade da página de origem no PDF.

---

## 3. Comandos de Manutenção

- **Desenvolvimento local**: `npm run dev` (inicia Vite com middleware de rede em `http://0.0.0.0:3000`).
- **Verificação de tipos**: `npm run lint` (`tsc --noEmit`).
- **Compilação**: `npm run build`.
- **Suíte de Testes offline**: `npm test` (executa os 10 conjuntos de testes em < 30s sem depender de rede externa).
