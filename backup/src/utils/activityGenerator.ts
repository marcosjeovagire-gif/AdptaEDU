import { 
  Estudante, 
  PerfilPedagogico, 
  HabilidadeAprovada, 
  AtividadeAdaptada, 
  QuestaoAdaptada,
  RegistroAcompanhamentoApoio
} from '../types';
import { AtividadeAdaptadaFull, ImagemPedagogica, AtividadeEstruturadaAI } from '../types/pedagogico';

export interface ParametrosGeracaoAtividade {
  estudante: Estudante;
  perfilPedagogico: PerfilPedagogico;
  professorId: string;
  professorNome: string;
  disciplina: string;
  conteudo: string;
  habilidade: HabilidadeAprovada | any;
  quantidadeQuestoes: number;
  tipoQuestoes: string;
  formatoLetra?: 'bastao' | 'cursiva';
  usarCaixaAlta?: boolean;
  registrosApoioConsultados?: RegistroAcompanhamentoApoio[];
  estiloDesenho?: 'colorido' | 'preto_e_branco_colorir';
}

/**
 * GERAÇÃO INTELIGENTE (REQUISITO 2 & 4)
 */
export async function gerarAtividadeInteligente(params: ParametrosGeracaoAtividade): Promise<AtividadeAdaptadaFull> {
  const { estudante, perfilPedagogico, registrosApoioConsultados } = params;
  
  const focoInclusivo = `${estudante.laudo || ''} ${perfilPedagogico?.barreirasPedagogicas || ''} ${estudante.observacoesAcessibilidade || ''}`;
  
  try {
    const response = await fetch('/api/ai/gerar-atividade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tema: params.conteudo,
        ano: params.estudante.anoSerie,
        focoInclusivo,
        estudanteId: estudante.id,
        matrizDados: params.habilidade,
        perfilDados: perfilPedagogico,
        registrosRecentes: registrosApoioConsultados
      })
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Erro na API');

    const activityAI = data as AtividadeEstruturadaAI;

    // Constrói atividade final
    return {
      id: `ativ-ai-${Date.now()}`,
      estudanteId: estudante.id,
      estudanteNome: estudante.nome,
      turma: estudante.turma,
      professorId: params.professorId,
      professorNome: params.professorNome,
      disciplina: params.disciplina,
      conteudo: params.conteudo,
      habilidadeCodigo: params.habilidade.codigo,
      habilidadeDescricao: params.habilidade.descricao,
      quantidadeQuestoes: params.quantidadeQuestoes,
      tipoQuestoes: params.tipoQuestoes,
      formatoLetra: activityAI.formatoLetra || 'padrao',
      usarCaixaAlta: activityAI.formatoLetra === 'bastao',
      questoes: [], // Será preenchido pelo parser do texto se necessário, mas aqui assumimos que AI retorna texto pronto
      dataCriacao: new Date().toLocaleDateString('pt-BR'),
      status: 'Gerada',
      alinhadaAoPei: true,
      imagensPedagogicas: activityAI.imagens,
      recomendacoesApoioAI: activityAI.recomendacoesApoio,
      observacaoProfessor: activityAI.atividade // Guardamos o texto completo aqui para o A4
    };

  } catch (error) {
    console.error('[Generator] Fallback para local:', error);
    return gerarAtividadeEstruturada(params);
  }
}

/**
 * ESTILOS BASTÃO (REQUISITO 3)
 */
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

export function gerarAtividadeEstruturada(params: ParametrosGeracaoAtividade): AtividadeAdaptada {
  const { estudante, conteudo, habilidade, quantidadeQuestoes } = params;
  
  const usarBastao = params.formatoLetra === 'bastao' || (estudante.laudo?.toLowerCase().includes('tea'));
  const formatar = (t: string) => usarBastao ? t.toUpperCase() : t;

  const questoes: QuestaoAdaptada[] = [];
  for (let i = 1; i <= (quantidadeQuestoes || 3); i++) {
    questoes.push({
      id: `q-local-${i}-${Date.now()}`,
      numero: i,
      tipo: 'multipla_escolha',
      enunciado: formatar(`QUESTÃO ${i}: SOBRE ${conteudo}, MARQUE A OPÇÃO QUE EXPLICA ${habilidade.descricao}:`),
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
    professorId: params.professorId,
    professorNome: params.professorNome,
    disciplina: params.disciplina,
    conteudo: params.conteudo,
    habilidadeCodigo: habilidade.codigo,
    habilidadeDescricao: habilidade.descricao,
    quantidadeQuestoes,
    tipoQuestoes: 'multipla_escolha',
    formatoLetra: usarBastao ? 'bastao' : 'cursiva',
    usarCaixaAlta: usarBastao,
    questoes,
    dataCriacao: new Date().toLocaleDateString('pt-BR'),
    status: 'Gerada',
    alinhadaAoPei: true
  };
}

export function gerarSvgPedagogico(tema: string, estilo?: string): string {
  // Simplificado para garantir retorno de SVG válido
  const corFundo = estilo === 'colorido' ? '#f0f9ff' : '#f1f5f9';
  const corTexto = estilo === 'colorido' ? '#0369a1' : '#0f172a';
  
  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
    <rect x="50" y="50" width="100" height="100" fill="${corFundo}" stroke="${corTexto}" stroke-width="4"/>
    <text x="100" y="110" font-family="Lexend" font-size="12" text-anchor="middle" fill="${corTexto}">${tema.toUpperCase()}</text>
  </svg>`;
}

export function validarRequisitosAtividade(params: any): { valido: boolean; erros: string[] } {
  const erros: string[] = [];
  if (!params.estudante) erros.push('Estudante não informado');
  if (!params.conteudo) erros.push('Conteúdo não informado');
  if (!params.habilidade) erros.push('Habilidade não informada');
  
  return {
    valido: erros.length === 0,
    erros
  };
}
