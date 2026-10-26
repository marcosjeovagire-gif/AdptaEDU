/**
 * AdaptaEdu Escolar - Sistema de Atividades Pedagógicas Adaptadas (SEDUC-GO)
 * Módulo: adaptacaoService.ts
 * 
 * FASE 5 — ADAPTAÇÃO & INTEGRAÇÃO COM APOIO PEDAGÓGICO:
 * - Detecta necessidade de revisão a partir de relatos do diário do profissional de apoio
 * - Produz sugestão pedagógica explicável (motivo da barreira, alterações propostas, preservação da matriz)
 * - Preserva estritamente a habilidade e objeto de conhecimento da Matriz Curricular
 * - Mantém versionamento (v1, v2, v3...) — A ATIVIDADE ORIGINAL NUNCA É APAGADA
 * - Exige aprovação soberana do professor para efetivação de qualquer alteração
 */

import { AtividadeAdaptada, RegistroAcompanhamentoApoio, QuestaoAdaptada } from '../types';
import { gerarSvgPedagogico } from '../utils/activityGenerator';

export interface AnaliseRevisaoApoioResultado {
  necessitaRevisao: boolean;
  motivo?: string;
  registroVinculado?: RegistroAcompanhamentoApoio;
  sugestao?: {
    motivoDificuldade: string;
    alteracoesSugeridas: string;
    preservacaoHabilidade: string;
    dataSugestao: string;
    paeNome?: string;
    statusAprovacao: 'pendente' | 'aprovada' | 'recusada';
    justificativaPedagogica?: string;
    formatoRecomendado?: 'letra_bastao' | 'letra_bastao_desenho_matriz' | 'so_desenhos';
    reduzirAlternativas?: boolean;
  };
}

/**
 * 1. DETECTA NECESSIDADE DE REVISÃO E GERA SUGESTÃO EXPLICÁVEL
 * Analisa os registros de acompanhamento do Profissional de Apoio Escolar (PAE)
 * cruzando com a atividade adaptada aplicada ao estudante.
 */
export function detectarNecessidadeRevisaoApoio(
  atividade: AtividadeAdaptada,
  registrosApoio: RegistroAcompanhamentoApoio[]
): AnaliseRevisaoApoioResultado {
  if (!registrosApoio || registrosApoio.length === 0) {
    return { necessitaRevisao: false };
  }

  // 1. Busca por vínculo direto de atividadeAplicadaId
  let registroEncontrado = registrosApoio.find(r => r.atividadeAplicadaId === atividade.id);

  // 2. Se não houver vínculo direto por ID, busca pelo mesmo estudante e mesma disciplina ou data
  if (!registroEncontrado) {
    const regsAluno = registrosApoio
      .filter(r => r.studentId === atividade.estudanteId || r.nomeEstudante === atividade.estudanteNome)
      .sort((a, b) => new Date(b.data || 0).getTime() - new Date(a.data || 0).getTime());

    if (regsAluno.length > 0) {
      // Prioriza registro da mesma disciplina ou o mais recente
      const mesmoComponente = regsAluno.find(r => 
        r.disciplinasEnvolvidas && r.disciplinasEnvolvidas.some(d => 
          d.toLowerCase() === atividade.disciplina.toLowerCase()
        )
      );
      registroEncontrado = mesmoComponente || regsAluno[0];
    }
  }

  if (!registroEncontrado) {
    return { necessitaRevisao: false };
  }

  // 3. Analisa evidências de dificuldade registradas pelo profissional de apoio
  const textoDificuldades = `${registroEncontrado.observacaoAtividade || ''} ${registroEncontrado.observacaoComportamental || ''} ${registroEncontrado.barreirasEnfrentadas || ''}`.toLowerCase();
  
  const naoConseguiu = registroEncontrado.conseguiuRealizarAtividade === 'Não';
  const realizouParcial = registroEncontrado.conseguiuRealizarAtividade === 'Parcialmente';
  const mencionouBarreiras = 
    textoDificuldades.includes('não fez') ||
    textoDificuldades.includes('não deu conta') ||
    textoDificuldades.includes('dificuldade') ||
    textoDificuldades.includes('recusa') ||
    textoDificuldades.includes('sobrecarga') ||
    textoDificuldades.includes('fadiga') ||
    textoDificuldades.includes('frustra') ||
    textoDificuldades.includes('muito texto') ||
    textoDificuldades.includes('não compreendeu') ||
    textoDificuldades.includes('desistiu');

  const precisaAjuste = naoConseguiu || realizouParcial || mencionouBarreiras;

  if (!precisaAjuste) {
    return { necessitaRevisao: false, registroVinculado: registroEncontrado };
  }

  // 4. Monta justificativa explicável da barreira pedagógica observada
  let motivoDificuldade = '';
  if (naoConseguiu) {
    motivoDificuldade = `O Profissional de Apoio registrou que o estudante NÃO conseguiu realizar a atividade no formato atual. Observações do diário: "${registroEncontrado.observacaoAtividade || registroEncontrado.barreirasEnfrentadas || 'Dificuldade de compreensão ou execução.'}".`;
  } else if (realizouParcial) {
    motivoDificuldade = `O Profissional de Apoio registrou que o estudante realizou apenas PARCIALMENTE a atividade devido a barreiras pedagógicas: "${registroEncontrado.observacaoAtividade || registroEncontrado.barreirasEnfrentadas || 'Sobrecarga de estímulos ou esforço motor excessivo.'}".`;
  } else {
    motivoDificuldade = `O Diário do Apoio apontou dificuldades específicas durante a aplicação: "${registroEncontrado.observacaoAtividade || registroEncontrado.barreirasEnfrentadas || 'Barreira na leitura ou interpretação textual.'}".`;
  }

  // 5. Determina a sugestão coerente de adaptação
  const ehCursivaAtual = atividade.formatoLetra === 'cursiva' || atividade.tipoAtividade === 'cursiva';
  const jaTemDesenho = atividade.estiloTipograficoVisual === 'letra_bastao_desenho_matriz' || atividade.estiloTipograficoVisual === 'so_desenhos';
  
  let alteracoesSugeridas = '';
  let formatoRecomendado: 'letra_bastao' | 'letra_bastao_desenho_matriz' | 'so_desenhos' = 'letra_bastao_desenho_matriz';
  let reduzirAlternativas = true;

  if (ehCursivaAtual) {
    alteracoesSugeridas = '1. Substituir letra cursiva por LETRA BASTÃO (Caixa Alta) para reduzir barreira motora e decodificação gráfica.\n2. Adicionar Ilustração Temática da Matriz para apoio visual concreto.\n3. Reduzir alternativas distratoras (máximo 2 diretas).';
    formatoRecomendado = 'letra_bastao_desenho_matriz';
  } else if (!jaTemDesenho) {
    alteracoesSugeridas = '1. Inserir Ilustrações Temáticas Vetoriais da Matriz em cada questão para ancoragem visual de significado.\n2. Simplificar os enunciados para comandos diretos passo a passo.\n3. Calibrar para 2 alternativas diretas sem ambiguidade.';
    formatoRecomendado = 'letra_bastao_desenho_matriz';
  } else {
    alteracoesSugeridas = '1. Fragmentar enunciados em comandos ultracurtos.\n2. Aumentar contraste e espaço para colorir/associação.\n3. Estruturar atividade com pareamento de imagem e conceito da matriz.';
    formatoRecomendado = 'so_desenhos';
  }

  // 6. Confirmação expressa de preservação da habilidade
  const preservacaoHabilidade = `A habilidade essencial [${atividade.habilidadeCodigo}] ("${atividade.habilidadeDescricao}") e o objeto de conhecimento ("${atividade.objetoConhecimento || atividade.conteudo}") são 100% PRESERVADOS da Matriz Curricular da SEDUC-GO, sem redução do objetivo de aprendizagem.`;

  const justificativaPedagogica = `Adaptação sugerida com fundamento no Desenho Universal para a Aprendizagem (DUA) e Diretrizes da Educação Especial da SEDUC-GO. A adequação de formato acessível permite ao estudante demonstrar o conhecimento da habilidade sem ser impedido por barreiras motoras ou de leitura.`;

  return {
    necessitaRevisao: true,
    motivo: `Necessidade de revisão detectada no Diário do Apoio (${new Date(registroEncontrado.data).toLocaleDateString('pt-BR')})`,
    registroVinculado: registroEncontrado,
    sugestao: {
      motivoDificuldade,
      alteracoesSugeridas,
      preservacaoHabilidade,
      dataSugestao: new Date().toLocaleDateString('pt-BR'),
      paeNome: registroEncontrado.profissionalResponsavelNome || registroEncontrado.usuarioRegistroNome,
      statusAprovacao: 'pendente',
      justificativaPedagogica,
      formatoRecomendado,
      reduzirAlternativas,
    }
  };
}

/**
 * 2. CRIAÇÃO DE NOVA VERSÃO ADAPTADA (PRESERVAÇÃO DA ATIVIDADE ANTERIOR)
 * Gera uma nova versão (ex: v2) aprovada pelo professor.
 * A ATIVIDADE ORIGINAL NUNCA É APAGADA!
 */
export function gerarNovaVersaoAdaptada(
  atividadeOriginal: AtividadeAdaptada,
  opcoesAprovacao: {
    professorNome: string;
    formatoLetra?: 'bastao' | 'cursiva';
    usarCaixaAlta?: boolean;
    estiloTipograficoVisual?: 'letra_bastao' | 'letra_bastao_desenho_matriz' | 'so_desenhos' | 'letra_cursiva';
    estiloDesenho?: 'colorido' | 'preto_e_branco_colorir';
    reduzirAlternativas?: boolean;
    justificativaProfessor?: string;
  }
): AtividadeAdaptada {
  const versaoAtual = atividadeOriginal.versao || 1;
  const novaVersao = versaoAtual + 1;
  const agoraIso = new Date().toISOString();
  const agoraFormatada = new Date().toLocaleDateString('pt-BR');

  // Mantém a raiz original
  const raizOriginalId = atividadeOriginal.atividadeOriginalId || atividadeOriginal.id;

  // Estilo tipográfico aprovado (padrão letra bastão com desenho da matriz)
  const estiloFinal = opcoesAprovacao.estiloTipograficoVisual || 'letra_bastao_desenho_matriz';
  const formatoLetraFinal = opcoesAprovacao.formatoLetra || 'bastao';
  const usarCaixaAltaFinal = opcoesAprovacao.usarCaixaAlta !== false;
  const estiloDesenhoFinal = opcoesAprovacao.estiloDesenho || 'preto_e_branco_colorir';

  // Habilidade é RIGOROSAMENTE preservada
  const codHabilidade = atividadeOriginal.habilidadeCodigo;
  const descHabilidade = atividadeOriginal.habilidadeDescricao;
  const objConhecimento = atividadeOriginal.objetoConhecimento || atividadeOriginal.conteudo;

  // Adaptação das questões para o novo formato aprovado
  const novasQuestoes: QuestaoAdaptada[] = atividadeOriginal.questoes.map((q, idx) => {
    let enunciadoAdaptado = q.enunciado;
    
    // Converte para CAIXA ALTA se Bastão aprovado
    if (usarCaixaAltaFinal) {
      enunciadoAdaptado = enunciadoAdaptado.toUpperCase();
    }

    // Se o estilo incluir desenho e a questão não possuir, gera SVG temático da Matriz
    let ilustracao = q.ilustracaoSvgOuUrl;
    let descDesenho = q.descricaoDesenhoMatriz;
    if (estiloFinal === 'letra_bastao_desenho_matriz' || estiloFinal === 'so_desenhos') {
      if (!ilustracao) {
        ilustracao = gerarSvgPedagogico(`${atividadeOriginal.conteudo} ${objConhecimento} ${idx + 1}`, estiloDesenhoFinal);
        descDesenho = `Apoio visual temático da Matriz: ${objConhecimento}.`;
      }
    }

    // Calibragem das alternativas se solicitado
    let alternativasAdaptadas = q.alternativas;
    if (alternativasAdaptadas && alternativasAdaptadas.length > 0) {
      if (opcoesAprovacao.reduzirAlternativas && alternativasAdaptadas.length > 2) {
        // Reduz para 2 alternativas diretas sem ambiguidade
        alternativasAdaptadas = alternativasAdaptadas.slice(0, 2);
      }
      if (usarCaixaAltaFinal) {
        alternativasAdaptadas = alternativasAdaptadas.map(alt => alt.toUpperCase());
      }
    }

    return {
      ...q,
      id: `q-v${novaVersao}-${idx + 1}-${Date.now()}`,
      enunciado: enunciadoAdaptado,
      alternativas: alternativasAdaptadas,
      ilustracaoSvgOuUrl: ilustracao,
      descricaoDesenhoMatriz: descDesenho,
      estiloDesenho: estiloDesenhoFinal,
    };
  });

  // Atualiza histórico de versões preservando todo o ciclo
  const historicoAnterior = atividadeOriginal.historicoVersoes || [
    {
      versao: versaoAtual,
      data: atividadeOriginal.dataCriacao,
      alteracoes: 'Versão inicial gerada com base na Matriz Curricular.',
      autor: atividadeOriginal.professorNome,
      motivo: 'Planejamento de aula regular adaptada.',
    }
  ];

  const novoHistorico = [
    ...historicoAnterior,
    {
      versao: novaVersao,
      data: agoraFormatada,
      alteracoes: `Adaptação aprovada pelo(a) professor(a): ${opcoesAprovacao.justificativaProfessor || 'Formato acessível em Letra Bastão com ilustrações da matriz após observação do apoio.'}`,
      autor: opcoesAprovacao.professorNome,
      motivo: atividadeOriginal.sugestaoAdaptacaoExplicavel?.motivoDificuldade || 'Adequação pedagógica solicitada pelo profissional de apoio.',
    }
  ];

  const novaAtividadeId = `ativ-v${novaVersao}-${Date.now()}`;

  return {
    ...atividadeOriginal,
    id: novaAtividadeId,
    versao: novaVersao,
    versaoAnteriorId: atividadeOriginal.id,
    atividadeOriginalId: raizOriginalId,
    historicoVersoes: novoHistorico,
    
    // Status e dados da nova versão
    status: 'Revisada',
    dataCriacao: agoraFormatada,
    dataAtualizacao: agoraIso,
    professorNome: opcoesAprovacao.professorNome,
    
    // Formato tipográfico e visual aprovado
    formatoLetra: formatoLetraFinal,
    usarCaixaAlta: usarCaixaAltaFinal,
    estiloTipograficoVisual: estiloFinal,
    estiloDesenho: estiloDesenhoFinal,
    tipoAtividade: estiloFinal === 'so_desenhos' ? 'desenhos' : 'multipla_escolha',
    
    // Preservação rigorosa da matriz
    habilidadeCodigo: codHabilidade,
    habilidadeDescricao: descHabilidade,
    objetoConhecimento: objConhecimento,
    matrizId: atividadeOriginal.matrizId,
    matrizNome: atividadeOriginal.matrizNome,
    versaoMatriz: atividadeOriginal.versaoMatriz,

    // Questões adaptadas
    questoes: novasQuestoes,

    // Informações da sugestão atualizadas como aprovadas
    necessitaRevisaoApoio: false, // Pendência de revisão resolvida
    sugestaoAdaptacaoExplicavel: atividadeOriginal.sugestaoAdaptacaoExplicavel ? {
      ...atividadeOriginal.sugestaoAdaptacaoExplicavel,
      statusAprovacao: 'aprovada',
    } : undefined,

    // Informações pedagógicas de transparência
    informacoesAdaptacao: {
      habilidadeMatrizUtilizada: `${codHabilidade} - ${descHabilidade}`,
      dadosPeiConsiderados: `Adaptação refinada conforme metas do PEI de ${atividadeOriginal.estudanteNome}.`,
      registrosApoioConsiderados: `Versão ${novaVersao} adaptada após feedback do Diário de Bordo do Apoio: "${atividadeOriginal.sugestaoAdaptacaoExplicavel?.motivoDificuldade || 'Superação de barreiras de acesso.'}".`,
      estrategiasPedagogicasSugeridas: `Letra Bastão Caixa Alta, ilustrações temáticas da matriz e comandos diretos passo a passo.`,
      justificativaAdaptacao: `Garantia de acessibilidade pedagógica plena sem rebaixamento curricular (Diretrizes SEDUC-GO).`,
    },

    syncStatus: 'pending_sync',
    lastModifiedLocally: agoraIso,
  };
}

/**
 * 3. RECUSA OU MANUTENÇÃO DA VERSÃO ATUAL PELO PROFESSOR
 * Registra a decisão soberana do professor de manter a versão atual sem alterações.
 */
export function recusarSugestaoApoio(
  atividade: AtividadeAdaptada,
  motivoProfessor: string
): AtividadeAdaptada {
  return {
    ...atividade,
    necessitaRevisaoApoio: false,
    sugestaoAdaptacaoExplicavel: atividade.sugestaoAdaptacaoExplicavel ? {
      ...atividade.sugestaoAdaptacaoExplicavel,
      statusAprovacao: 'recusada',
      justificativaPedagogica: `Decisão do(a) Professor(a): ${motivoProfessor || 'Versão atual mantida conforme avaliação docente.'}`
    } : undefined,
    dataAtualizacao: new Date().toISOString(),
    lastModifiedLocally: new Date().toISOString(),
  };
}
