import express, { Request, Response } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type } from '@google/genai';
import { HABILIDADES_GERAIS_SEDUC_2026, MATRIZES_GERAIS_SEDUC_2026, normalizarTexto } from './src/data/matrizesOficiaisSeduc2026';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 3000);
const HOST = '0.0.0.0';
const IS_PROD = process.env.NODE_ENV === 'production';

// Configuração de CORS condicional
if (!IS_PROD) {
  const cors = (await import('cors')).default;
  app.use(cors());
}

app.use(express.json({ limit: '35mb' }));
app.use(express.urlencoded({ extended: true, limit: '35mb' }));

// Memória local para sincronização em LAN (Legado/Fallback)
let sharedLanState: Record<string, any> = {};

// Configuração do Cliente Gemini - Prioriza gemini-2.0-flash-exp para multimodalidade
const apiKey = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp';

let aiClient: GoogleGenAI | null = null;
if (apiKey) {
  aiClient = new GoogleGenAI({ 
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
  });
}

// ----------------------------------------------------------------------------
// ENDPOINTS DE SAÚDE
// ----------------------------------------------------------------------------

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    school: 'Colégio Estadual Olynto Pereira de Castro',
    environment: process.env.NODE_ENV || 'production',
    geminiConfigured: Boolean(apiKey),
    geminiModel: GEMINI_MODEL,
    renderDeploy: true
  });
});

// ----------------------------------------------------------------------------
// ENDPOINT: GERADOR DE ATIVIDADES ADAPTADAS (REQUISITO 2)
// ----------------------------------------------------------------------------

app.post('/api/ai/gerar-atividade', async (req: Request, res: Response) => {
  const { tema, ano, focoInclusivo, estudanteId, matrizDados, perfilDados, registrosRecentes } = req.body;

  // Modo Demo / Fallback sem API Key
  if (!aiClient) {
    return res.json({
      success: true,
      atividade: `ATIVIDADE ADAPTADA (MODO DEMO)\n\nTema: ${tema}\nAno: ${ano}\nFoco: ${focoInclusivo}\n\n[CONTEÚDO ESTRUTURADO DE EXEMPLO]`,
      imagens: [
        {
          descricao: "Ilustração Pedagógica",
          alt_text: `Desenho representando ${tema}`,
          tipo: "diagrama",
          svgCode: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="180" height="180" fill="none" stroke="black" stroke-width="2"/><text x="100" y="100" text-anchor="middle" font-family="Lexend" font-size="12">ILUSTRAÇÃO: ${tema}</text></svg>`
        }
      ],
      formatoLetra: (focoInclusivo?.toLowerCase().includes('tea') || focoInclusivo?.toLowerCase().includes('bastao')) ? 'bastao' : 'padrao',
      recomendacoesApoio: ["Redução de distratores", "Pausas estruturadas"]
    });
  }

  try {
    const prompt = `Você é um Engenheiro Pedagógico Sênior da SEDUC-GO especializado em Educação Inclusiva (Colégio Olynto Pereira de Castro).
Crie uma atividade adaptada de ALTA QUALIDADE baseada na Matriz SEDUC-GO 2026.

FÓRMULA DE GERAÇÃO:
[Habilidade da Matriz: ${JSON.stringify(matrizDados || { tema, ano })}] + 
[Perfil PEI do Estudante: ${JSON.stringify(perfilDados || { focoInclusivo })}] + 
[Restrições do Diário de Apoio: ${JSON.stringify(registrosRecentes || [])}] 
= Atividade Adaptada Personalizada.

DIRETRIZES TÉCNICAS:
1. Alinhamento: Use rigorosamente os objetivos da Matriz SEDUC-GO.
2. Acessibilidade: Linguagem clara, direta, sem metáforas complexas.
3. Formato BASTÃO: Se 'formatoLetra' for 'bastao', o texto em 'atividade' DEVE ESTAR EM CAIXA ALTA (UPPERCASE).
4. Ilustrações: Gere código SVG válido para o campo 'svgCode'. O SVG deve ter viewBox="0 0 200 200", traços pretos (para colorir) ou cores contrastantes, e ser pedagógico.
5. Calibragem: Ajuste a extensão e o número de questões conforme o "tempo de foco" e "cansaço" relatados nos registros de apoio.

RETORNE RIGOROSAMENTE O JSON ABAIXO (SEM MARKDOWN):
{
  "atividade": "Texto integral da atividade (se for bastao, use CAIXA ALTA)",
  "imagens": [
    {
      "descricao": "Título da imagem",
      "svgCode": "Código <svg>...</svg> completo",
      "alt_text": "Texto acessível para leitores de tela",
      "tipo": "diagrama" | "pictograma" | "organizador_visual"
    }
  ],
  "formatoLetra": "bastao" | "cursiva",
  "recomendacoesApoio": ["lista de ajustes de mediação baseados no histórico"]
}`;

    const result = await aiClient.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.3
      }
    });

    const parsed = JSON.parse(result.text || '{}');
    return res.json({ success: true, ...parsed });

  } catch (error: any) {
    console.error('[server] Erro AI:', error);
    return res.status(500).json({ success: false, error: 'Falha na geração pedagógica inteligente' });
  }
});

// Sincronização LAN (Legado)
app.get('/api/sync-state', (_req: Request, res: Response) => {
  res.json({ success: true, data: sharedLanState });
});

app.post('/api/sync-state', (req: Request, res: Response) => {
  const payload = req.body || {};
  sharedLanState = { ...sharedLanState, ...payload, _lastSync: new Date().toISOString() };
  res.json({ success: true, timestamp: sharedLanState._lastSync });
});

// ----------------------------------------------------------------------------
// SERVIR BUILD ESTÁTICA E SPA FALLBACK (REQUISITO 1)
// ----------------------------------------------------------------------------

const distPath = path.join(__dirname, 'dist');

// Serve arquivos estáticos com cache agressivo em produção
app.use(express.static(distPath, {
  maxAge: '1d',
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
  }
}));

// Fallback SPA para todas as rotas não-API
app.get('*', (req: Request, res: Response) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Endpoint não encontrado' });
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

// Inicialização
app.listen(PORT, HOST, () => {
  console.log(`[AdaptaEdu] Servidor Ativo: http://${HOST}:${PORT}`);
  console.log(`[AdaptaEdu] Ambiente: ${IS_PROD ? 'PRODUÇÃO' : 'DESENVOLVIMENTO'}`);
  console.log(`[AdaptaEdu] Gemini: ${apiKey ? 'ON (' + GEMINI_MODEL + ')' : 'DEMO MODE'}`);
});
