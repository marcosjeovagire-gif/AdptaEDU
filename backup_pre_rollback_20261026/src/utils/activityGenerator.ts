import { Estudante, PerfilPedagogico, RegistroAcompanhamentoApoio, AtividadeAdaptada, QuestaoAdaptada } from '../types';
import { AtividadeAdaptadaFull } from '../types/pedagogico';

/**
 * ORQUESTRADOR DE GERAÇÃO PEDAGÓGICA (REQUISITO 3 & 4)
 * Consolida dados da Matriz, PEI e Apoio para alimentar a API inteligente.
 */

export interface ParametrosGeracaoAtividade {
  estudante: Estudante;
  perfilPedagogico: PerfilPedagogico;
  professorId: string;
  professorNome: string;
  disciplina: string;
  conteudo: string;
  habilidade: any;
  quantidadeQuestoes: number;
  tipoQuestoes: string;
  formatoLetra?: 'bastao' | 'cursiva';
  usarCaixaAlta?: boolean;
  registrosApoioConsultados?: RegistroAcompanhamentoApoio[];
  estiloDesenho?: 'colorido' | 'preto_e_branco_colorir';
}

export interface GerarAtividadeParams {
  estudante: Estudante;
  perfil: PerfilPedagogico;
  registrosRecentes: RegistroAcompanhamentoApoio[];
  skillCode: string;
  disciplina: string;
  matrixDados?: any;
  // Campos extras para compatibilidade
  perfilPedagogico?: PerfilPedagogico;
  professorId?: string;
  professorNome?: string;
  conteudo?: string;
  habilidade?: any;
  quantidadeQuestoes?: number;
  tipoQuestoes?: string;
}

export async function gerarAtividadeAutonoma(params: GerarAtividadeParams): Promise<AtividadeAdaptadaFull> {
  const { estudante, perfil, registrosRecentes, skillCode, disciplina, matrixDados } = params;

  const diagnstico = `${estudante.laudo || ''} ${perfil?.barreirasPedagogicas || ''}`.toLowerCase();
  const temDificuldadeApoio = registrosRecentes.some(r => 
    r.nivelAutonomia?.includes('Mediação') || r.conseguiuRealizarAtividade === 'Não'
  );

  const precisaBastao = 
    diagnstico.includes('tea') || 
    diagnstico.includes('intelectual') || 
    diagnstico.includes('dislexia') ||
    temDificuldadeApoio;

  const focoInclusivo = `Estudante com ${estudante.laudo}. Necessidades: ${precisaBastao ? 'Letra Bastão, ' : ''}${perfil?.estrategiasRecomendadas || ''}`;

  try {
    const response = await fetch('/api/ai/gerar-atividade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: estudante.id,
        skillCode,
        anoSerie: estudante.anoSerie,
        componenteCurricular: disciplina,
        focoInclusivo,
        perfilDados: perfil,
        registrosRecentes: registrosRecentes.slice(0, 5), 
        matrixDados
      })
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Erro na geração AI');

    return {
      id: `ativ-auto-${Date.now()}`,
      estudanteId: estudante.id,
      estudanteNome: estudante.nome,
      turma: estudante.turma,
      professorId: params.professorId || 'current-user',
      professorNome: params.professorNome || 'Professor',
      disciplina,
      conteudo: matrixDados?.knowledgeObject || params.conteudo || 'Conteúdo Adaptado',
      habilidadeCodigo: skillCode || params.habilidade?.codigo,
      habilidadeDescricao: matrixDados?.skillDescription || params.habilidade?.descricao || '',
      quantidadeQuestoes: params.quantidadeQuestoes || 3,
      tipoQuestoes: params.tipoQuestoes || 'adaptada',
      formatoLetra: precisaoLetra(data.formatoLetra, precisaBastao),
      usarCaixaAlta: data.formatoLetra === 'bastao' || precisaBastao,
      questoes: [], 
      dataCriacao: new Date().toLocaleDateString('pt-BR'),
      status: 'Gerada',
      alinhadaAoPei: true,
      imagensPedagogicas: data.imagens,
      recomendacoesApoioAI: data.recomendacoesApoio,
      observacaoProfessor: data.atividade 
    };
  } catch (error: any) {
    console.error('[ActivityGenerator] Falha:', error);
    return gerarAtividadeEstruturada(params) as any;
  }
}

export const gerarAtividadeInteligente = async (params: any) => {
  return gerarAtividadeAutonoma({
    ...params,
    perfil: params.perfilPedagogico,
    registrosRecentes: params.registrosApoioConsultados || [],
    skillCode: params.habilidade?.codigo || params.habilidade?.skillCode,
    matrixDados: params.habilidade
  });
};

export function gerarAtividadeEstruturada(params: any): AtividadeAdaptada {
  const { estudante, conteudo, habilidade, quantidadeQuestoes } = params;
  const usarBastao = params.formatoLetra === 'bastao' || (estudante.laudo?.toLowerCase().includes('tea'));
  const formatar = (t: string) => usarBastao ? t.toUpperCase() : t;

  const questoes: QuestaoAdaptada[] = [];
  for (let i = 1; i <= (quantidadeQuestoes || 3); i++) {
    questoes.push({
      id: `q-local-${i}-${Date.now()}`,
      numero: i,
      tipo: 'multipla_escolha',
      enunciado: formatar(`QUESTÃO ${i}: SOBRE ${conteudo || params.disciplina}, MARQUE A OPÇÃO QUE EXPLICA ${habilidade?.descricao || ''}:`),
      alternativas: [
        formatar('A) RESPOSTA CORRETA E OBJETIVA'),
        formatar('B) RESPOSTA PARA ANÁLISE'),
        formatar('C) RESPOSTA COMPLEMENTAR')
      ]
    });
  }

  return {
    id: `ativ-local-${Date.now()}`,
    estudanteId: estudante.id,
    estudanteNome: estudante.nome,
    turma: estudante.turma,
    professorId: params.professorId || 'prof-id',
    professorNome: params.professorNome || 'Professor',
    disciplina: params.disciplina,
    conteudo: params.conteudo || params.disciplina,
    habilidadeCodigo: habilidade?.codigo || habilidade?.skillCode,
    habilidadeDescricao: habilidade?.descricao || habilidade?.skillDescription,
    quantidadeQuestoes: quantidadeQuestoes || 3,
    tipoQuestoes: 'multipla_escolha',
    formatoLetra: usarBastao ? 'bastao' : 'cursiva',
    usarCaixaAlta: usarBastao,
    questoes,
    dataCriacao: new Date().toLocaleDateString('pt-BR'),
    status: 'Gerada',
    alinhadaAoPei: true
  };
}

export function validarRequisitosAtividade(params: any): { valido: boolean; erros: string[] } {
  const erros: string[] = [];
  if (!params.estudante) erros.push('Estudante não informado');
  if (!params.conteudo && !params.disciplina) erros.push('Conteúdo não informado');
  if (!params.habilidade && !params.skillCode) erros.push('Habilidade não informada');
  
  return {
    valido: erros.length === 0,
    erros
  };
}

export function gerarSvgPedagogico(tema: string, estilo?: string): string {
  const corFundo = estilo === 'colorido' ? '#f0f9ff' : '#f1f5f9';
  const corTexto = estilo === 'colorido' ? '#0369a1' : '#0f172a';
  
  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
    <rect x="50" y="50" width="100" height="100" fill="${corFundo}" stroke="${corTexto}" stroke-width="4"/>
    <text x="100" y="110" font-family="Lexend" font-size="12" text-anchor="middle" fill="${corTexto}">${tema.toUpperCase()}</text>
  </svg>`;
}

function precisaoLetra(aiSuggestion: string, localNeed: boolean): 'bastao' | 'cursiva' {
  if (localNeed || aiSuggestion === 'bastao') return 'bastao';
  return 'cursiva';
}

export const ESTILOS_BASTAO = {
  fontFamily: "'Lexend', sans-serif",
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  fontSize: '1.125rem',
  lineHeight: '1.625',
  padding: '1.5rem',
  border: '1px solid #e2e8f0',
  borderRadius: '0.5rem',
  backgroundColor: '#fff'
};
