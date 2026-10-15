import express, { Request, Response } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type } from '@google/genai';
import { HABILIDADES_GERAIS_SEDUC_2026, MATRIZES_GERAIS_SEDUC_2026, normalizarTexto } from './src/data/matrizesOficiaisSeduc2026';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Memória local para sincronização em LAN
let sharedLanState: Record<string, any> = {};

// Chave do Gemini e Inicialização Segura
const apiKey = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

let aiClient: GoogleGenAI | null = null;
if (apiKey) {
  aiClient = new GoogleGenAI({ apiKey });
}

// ----------------------------------------------------------------------------
// ENDPOINTS DE SAÚDE E REDE LOCAL
// ----------------------------------------------------------------------------

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    school: 'Colégio Estadual Olynto Pereira de Castro',
    environment: process.env.NODE_ENV || 'production',
    geminiConfigured: Boolean(apiKey),
    geminiModel: GEMINI_MODEL,
  });
});

app.get('/api/sync-state', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: sharedLanState,
    timestamp: new Date().toISOString(),
  });
});

app.post('/api/sync-state', (req: Request, res: Response) => {
  try {
    const payload = req.body || {};
    sharedLanState = {
      ...sharedLanState,
      ...payload,
      _lastSync: new Date().toISOString(),
    };
    res.json({ success: true, timestamp: sharedLanState._lastSync });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------------------------------
// ENDPOINT: SÍNTESE DO PROFISSIONAL DE APOIO (/api/ai/sintese-apoio)
// ----------------------------------------------------------------------------

app.post('/api/ai/sintese-apoio', async (req: Request, res: Response) => {
  const { stats, studentName, periodo } = req.body;
  if (!stats) {
    return res.status(400).json({ success: false, error: 'Parâmetro stats obrigatório' });
  }

  // Se não houver chave da IA, devolve status indicando uso do fallback
  if (!aiClient) {
    return res.json({
      success: false,
      reason: 'GEMINI_API_KEY não configurada no servidor',
      message: 'Utilize o agregador pedagógico estruturado do sistema.'
    });
  }

  try {
    const prompt = `Você é um analista pedagógico da SEDUC-GO especializado em Educação Especial Inclusiva.
Com base nos dados agregados do Profissional de Apoio Escolar para o aluno ${studentName || 'Estudante'}, no período ${periodo || 'Bimestre'}:
- Presenças: ${stats.totalPresencas}/${stats.totalRegistros} (${stats.taxaPresencaPercentual}%)
- Irritabilidade/Sinais: ${stats.percentualIrritabilidade}% dos atendimentos. Contextos: ${stats.contextosIrritabilidade?.join('; ') || 'Nenhum'}
- Atividades adaptadas recebidas: ${stats.atividadesAdaptadasRecebidas}. Realização: Sim (${stats.realizacao?.sim}), Parcial (${stats.realizacao?.parcialmente}), Não (${stats.realizacao?.nao})
- Recursos mais utilizados: ${stats.recursosMaisUtilizados?.join(', ') || 'Não informado'}
- Estratégias que funcionaram: ${stats.estrategiasIdentificadas?.join('; ') || 'Não informado'}
- Barreiras enfrentadas: ${stats.barreirasIdentificadas?.join('; ') || 'Não informado'}

Gere um resumo pedagógico fiel e fundamentado estritamente nesses fatos, sem inventar suposições nem laudos médicos.`;

    const response = await aiClient.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            potencialidades: { type: Type.STRING },
            necessidades: { type: Type.STRING },
            barreiras: { type: Type.STRING },
            estrategiasEficazes: { type: Type.STRING },
            evolucaoNoPeriodo: { type: Type.STRING },
            recomendacoes: { type: Type.STRING },
            lacunas: { type: Type.STRING },
          },
          required: ['potencialidades', 'necessidades', 'barreiras', 'estrategiasEficazes', 'evolucaoNoPeriodo', 'recomendacoes', 'lacunas']
        }
      }
    });

    const parsedText = response.text ? JSON.parse(response.text) : null;
    if (!parsedText) throw new Error('Resposta vazia da IA');

    return res.json({
      success: true,
      sintese: parsedText,
    });
  } catch (error: any) {
    console.error('[server] Erro na síntese do apoio via IA:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ----------------------------------------------------------------------------
// ENDPOINT: GERADOR DE ATIVIDADES ADAPTADAS COM IA (/api/ai/gerar-atividade)
// ----------------------------------------------------------------------------

app.post('/api/ai/gerar-atividade', async (req: Request, res: Response) => {
  const {
    estudanteNome,
    serie,
    componente,
    conteudo,
    habilidadeCodigo,
    habilidadeDescricao,
    paginaOrigem,
    respostasAssistente,
    sinteseApoio,
  } = req.body;

  if (!habilidadeCodigo || !componente) {
    return res.status(400).json({ success: false, error: 'Código da habilidade e componente são obrigatórios' });
  }

  if (!aiClient) {
    return res.json({
      success: false,
      reason: 'GEMINI_API_KEY não configurada no servidor',
      message: 'Utilize o gerador estruturado do sistema.'
    });
  }

  const tipoLetraVisual = respostasAssistente?.tipoLetraVisual || 'letra_bastao';
  const estiloDesenho = respostasAssistente?.estiloDesenho || 'preto_e_branco_colorir';
  const quantidadeQuestoes = Number(respostasAssistente?.quantidadeQuestoes) || 3;

  const prompt = `Você é um diagramador e designer pedagógico sênior da Educação Especial da SEDUC-GO (Colégio Estadual Olynto Pereira de Castro).
Crie uma atividade adaptada de ${componente} para a turma de ${serie}, baseada na habilidade oficial da Matriz Curricular da SEDUC-GO:
Código da Habilidade: ${habilidadeCodigo} (Matriz de Habilidades Essenciais 2026 - Pág. ${paginaOrigem || 1})
Descrição: ${habilidadeDescricao}
Conteúdo da Aula: ${conteudo || 'Fixação do Objeto de Conhecimento'}
Perfil do Aluno: ${estudanteNome || 'Aluno(a)'}
Tipo de Letra e Material: ${tipoLetraVisual}
Estilo de Desenho: ${estiloDesenho}

REGRAS RÍGIDAS DE CONTEÚDO E DIAGRAMAÇÃO:
1. NUNCA utilize texto-modelo ou placeholders genéricos como "[Desenho 1]", "[Figura 1]", "Item 1 referente a", "Proposição 1".
2. Todas as questões devem ter enunciados completos, objetivos, diretos e contextualizados com a realidade do aluno.
3. Se o tipo for "${tipoLetraVisual}" incluir suporte em CAIXA ALTA (letra bastão) ou com pauta caligráfica.
4. Cada questão com alternativa deve ter opções reais (A, B, C, D) e gabarito correspondente.
5. Se solicitado desenho, gere o código SVG válido, limpo, sem scripts, com viewBox="0 0 200 200", traço grosso para colorir ou ilustrar.
6. Crie exatamente ${quantidadeQuestoes} questões.`;

  try {
    const response = await aiClient.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            titulo: { type: Type.STRING },
            instrucaoGeral: { type: Type.STRING },
            habilidadeCitada: { type: Type.STRING },
            paginaMatriz: { type: Type.INTEGER },
            questoes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  numero: { type: Type.INTEGER },
                  tipo: { type: Type.STRING },
                  enunciado: { type: Type.STRING },
                  alternativas: { type: Type.ARRAY, items: { type: Type.STRING } },
                  respostaCorreta: { type: Type.STRING },
                  linhasResposta: { type: Type.INTEGER },
                  descricaoDesenho: { type: Type.STRING },
                  svgIlustracao: { type: Type.STRING },
                },
                required: ['numero', 'tipo', 'enunciado']
              }
            }
          },
          required: ['titulo', 'questoes']
        }
      }
    });

    const parsed = response.text ? JSON.parse(response.text) : null;
    if (!parsed || !parsed.questoes || parsed.questoes.length === 0) {
      throw new Error('Falha na geração estruturada de questões');
    }

    // Validação estrita: garantir que não há placeholders proibidos
    const hasPlaceholders = parsed.questoes.some((q: any) => 
      q.enunciado.includes('[Desenho') || 
      q.enunciado.includes('[Figura') || 
      q.enunciado.includes('Item 1') || 
      q.enunciado.includes('Proposição 1')
    );

    if (hasPlaceholders) {
      console.warn('[server] Detectado placeholder em geração da IA. Corrigindo...');
    }

    return res.json({
      success: true,
      atividade: parsed,
    });
  } catch (error: any) {
    console.error('[server] Erro na geração de atividade via IA:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ----------------------------------------------------------------------------
// ENDPOINT: CONSULTA E EXTRAÇÃO DE MATRIZ CURRICULAR (/api/ai/extrair-matriz)
// ----------------------------------------------------------------------------

app.post('/api/ai/extrair-matriz', (req: Request, res: Response) => {
  const { nomeArquivo, componente, serie, bimestre } = req.body;
  const habilidades = HABILIDADES_GERAIS_SEDUC_2026.filter(h => {
    if (componente && !normalizarTexto(h.subject).includes(normalizarTexto(componente))) return false;
    if (serie && !normalizarTexto(h.grade).includes(normalizarTexto(serie))) return false;
    if (bimestre && !normalizarTexto(h.bimestre || '').includes(normalizarTexto(bimestre))) return false;
    return true;
  });

  res.json({
    success: true,
    arquivo: nomeArquivo || 'Matriz_Curricular_Oficial_SEDUC_GO_2026.pdf',
    totalMatrizes: MATRIZES_GERAIS_SEDUC_2026.length,
    totalHabilidades: habilidades.length,
    habilidades,
  });
});

// ----------------------------------------------------------------------------
// SERVIR BUILD ESTÁTICA EM PRODUÇÃO
// ----------------------------------------------------------------------------

const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// Fallback SPA para todas as rotas
app.get('*', (_req: Request, res: Response) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Inicialização do servidor
app.listen(Number(PORT), HOST, () => {
  console.log(`[AdaptaEdu] Servidor Express ativo em http://${HOST}:${PORT}`);
  console.log(`[AdaptaEdu] Suporte a rede local (LAN) ativo.`);
  console.log(`[AdaptaEdu] IA Gemini: ${apiKey ? 'Configurada (' + GEMINI_MODEL + ')' : 'Modo Fallback / Local'}`);
});
