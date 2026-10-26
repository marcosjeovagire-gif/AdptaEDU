import express, { Request, Response } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI } from '@google/genai';
import { google } from 'googleapis';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 3000);
const HOST = '0.0.0.0';
const IS_PROD = process.env.NODE_ENV === 'production';

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configuration
const apiKey = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

const genAI = apiKey ? new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
}) : null;

// ----------------------------------------------------------------------------
// ENDPOINTS DE SAÚDE
// ----------------------------------------------------------------------------

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    servico: 'AdaptaEdu Escolar',
    ambiente: process.env.NODE_ENV || 'development',
    geminiConfigured: Boolean(apiKey)
  });
});

// ----------------------------------------------------------------------------
// ENDPOINT: GERADOR DE ATIVIDADES ADAPTADAS (REQUISITO 3)
// ----------------------------------------------------------------------------

app.post('/api/ai/gerar-atividade', async (req: Request, res: Response) => {
  const { 
    studentId, 
    skillCode, 
    anoSerie, 
    componenteCurricular, 
    perfilDados, 
    registrosRecentes,
    matrixDados 
  } = req.body;

  if (!genAI) {
    return res.status(503).json({ 
      success: false, 
      error: 'Serviço de IA não configurado (GEMINI_API_KEY ausente).' 
    });
  }

  try {
    const prompt = `
    ATUE COMO ARQUITETO PEDAGÓGICO SENIOR ESPECIALISTA EM EDUCAÇÃO INCLUSIVA (SEDUC-GO).
    Sua missão é gerar uma Atividade Adaptada de alta precisão cruzando 3 fontes obrigatórias:

    1. MATRIZ CURRICULAR 2026 (HABILIDADE): 
    ${JSON.stringify(matrixDados || { skillCode, anoSerie, componenteCurricular })}

    2. PERFIL PEI (NECESSIDADES DO ESTUDANTE): 
    ${JSON.stringify(perfilDados || {})}

    3. DIÁRIO DE BORDO (CONDIÇÃO ATUAL DO ESTUDANTE): 
    ${JSON.stringify(registrosRecentes || [])}

    DIRETRIZES DE SAÍDA (PT-BR):
    - TEMA: Foco absoluto na Habilidade da Matriz SEDUC-GO 2026.
    - ADAPTAÇÃO: Simplifique a complexidade cognitiva mantendo o rigor curricular.
    - ACESSIBILIDADE VISUAL: Use linguagem clara, frases curtas e comandos diretos.
    - LETRA BASTÃO: O conteúdo deve estar preparado para renderização em Letra Bastão (uppercase, Lexend).
    - ILUSTRAÇÃO SVG: Gere códigos SVG vetoriais (viewBox="0 0 200 200") de alto contraste, sem cores gradientes, para auxílio cognitivo.

    ESQUEMA JSON DE RESPOSTA:
    {
      "atividade": "Conteúdo HTML limpo da atividade (usar apenas tags semânticas básicas)",
      "imagens": [
        {
          "descricao": "Título da Imagem",
          "svgCode": "Código SVG completo",
          "alt_text": "Descrição detalhada para acessibilidade (leitores de tela)"
        }
      ],
      "formatoLetra": "bastao",
      "recomendacoesApoio": ["Sugestão de mediação 1", "Sugestão de mediação 2"],
      "objetivoPedagogico": "Breve justificativa do alinhamento Matriz x PEI"
    }
    `;

    const response = await genAI.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction: 'Você é um Engenheiro Pedagógico Especialista em Educação Especial. Responda estritamente em JSON estruturado. Idioma: pt-BR.',
        responseMimeType: 'application/json'
      }
    });

    const text = response.text;
    if (!text) throw new Error('Falha na resposta da IA');
    
    const parsed = JSON.parse(text);
    return res.json({ success: true, ...parsed });
  } catch (error: any) {
    console.error('[Server] Erro na geração:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Falha na geração: ' + (error.message || 'Erro interno') 
    });
  }
});

// ----------------------------------------------------------------------------
// DRIVE API PROXY
// ----------------------------------------------------------------------------

app.post('/api/drive/save', async (req: Request, res: Response) => {
  const { accessToken, fileName, folderPath, fileContent, mimeType } = req.body;

  if (!accessToken) {
    return res.status(401).json({ success: false, error: 'Acesso negado.' });
  }

  try {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    const drive = google.drive({ version: 'v3', auth });

    const folders = folderPath.split('/').filter(Boolean);
    let parentId = 'root';

    for (const folderName of folders) {
      const searchRes = await drive.files.list({
        q: `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and '${parentId}' in parents and trashed = false`,
        fields: 'files(id)',
      });

      if (searchRes.data.files && searchRes.data.files.length > 0) {
        parentId = searchRes.data.files[0].id!;
      } else {
        const createRes = await drive.files.create({
          requestBody: {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parentId],
          },
          fields: 'id',
        });
        parentId = createRes.data.id!;
      }
    }

    const file = await drive.files.create({
      requestBody: { name: fileName, parents: [parentId] },
      media: {
        mimeType: mimeType || 'application/pdf',
        body: Buffer.from(fileContent, 'base64'),
      },
      fields: 'id, webViewLink',
    });

    return res.json({ success: true, fileId: file.data.id, webViewLink: file.data.webViewLink });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ----------------------------------------------------------------------------
// SERVIR ESTÁTICOS
// ----------------------------------------------------------------------------

const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

app.get('*', (req: Request, res: Response) => {
  if (req.path.startsWith('/api')) return res.status(404).end();
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`Servidor: http://${HOST}:${PORT}`);
});
