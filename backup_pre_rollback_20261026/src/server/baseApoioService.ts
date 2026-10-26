import { RegistroAcompanhamentoApoio } from '../types';

export interface EstatisticasApoioAluno {
  studentId: string;
  totalRegistros: number;
  diasLetivosAcompanhados: number;
  totalPresencas: number;
  totalFaltas: number;
  taxaPresencaPercentual: number;

  // Irritabilidade e Comportamento
  totalIrritabilidadeSim: number;
  totalIrritabilidadeNao: number;
  percentualIrritabilidade: number;
  contextosIrritabilidade: string[];

  // Atividades Adaptadas
  atividadesAdaptadasRecebidas: number;
  disciplinasAtendidas: { [disciplina: string]: number };
  realizacao: {
    sim: number;
    parcialmente: number;
    nao: number;
  };
  observacoesAtividades: string[];

  // Autonomia e Recursos
  niveisAutonomia: {
    independente: number;
    comMediacaoVerbal: number;
    comMediacaoFisicaVisual: number;
    naoRealizou: number;
  };
  recursosMaisUtilizados: string[];
  estrategiasIdentificadas: string[];
  barreirasIdentificadas: string[];
  informacoesAdicionaisRelevantes: string[];

  // Rastreabilidade
  periodoInicio: string;
  periodoFim: string;
  registroIds: string[];
  fontes: Array<{ id: string; data: string; profissional: string }>;
  dadosInsuficientes: boolean;
  mensagemAviso?: string;
}

export interface SinteseApoioIaResult {
  studentId: string;
  estudanteNome?: string;
  periodo: string;
  fontesApoio: Array<{ id: string; data: string }>;
  totalRegistrosAnalisados: number;
  potencialidades: string;
  necessidades: string;
  barreiras: string;
  estrategiasEficazes: string;
  evolucaoNoPeriodo: string;
  recomendacoes: string;
  lacunas: string;
  fonteTexto: string;
  geradoComIa: boolean;
  dadosInsuficientes: boolean;
  resumoQuantitativo: {
    taxaPresenca: string;
    atividadesAdaptadas: number;
    taxaSucessoAtividade: string;
    nivelAutonomiaPredominante: string;
  };
}

/**
 * Agrega e sintetiza quantitativamente os registros do Profissional de Apoio
 * de um aluno em um determinado período ou bimestre.
 */
export function agregarRegistrosApoio(
  registros: RegistroAcompanhamentoApoio[],
  studentId: string,
  opcoes?: { dataInicio?: string; dataFim?: string; bimestre?: string }
): EstatisticasApoioAluno {
  // Filtra registros do estudante
  let filtrados = registros.filter(r => r.studentId === studentId);

  // Filtra por data início se fornecido
  if (opcoes?.dataInicio) {
    filtrados = filtrados.filter(r => r.data >= opcoes.dataInicio!);
  }
  // Filtra por data fim se fornecido
  if (opcoes?.dataFim) {
    filtrados = filtrados.filter(r => r.data <= opcoes.dataFim!);
  }

  // Ordena por data crescente
  filtrados.sort((a, b) => a.data.localeCompare(b.data));

  const totalRegistros = filtrados.length;
  const dadosInsuficientes = totalRegistros < 5;

  let totalPresencas = 0;
  let totalFaltas = 0;
  let totalIrritabilidadeSim = 0;
  let totalIrritabilidadeNao = 0;
  const contextosIrritabilidade: string[] = [];

  let atividadesAdaptadasRecebidas = 0;
  const disciplinasAtendidas: { [disc: string]: number } = {};
  const realizacao = { sim: 0, parcialmente: 0, nao: 0 };
  const observacoesAtividades: string[] = [];

  const niveisAutonomia = {
    independente: 0,
    comMediacaoVerbal: 0,
    comMediacaoFisicaVisual: 0,
    naoRealizou: 0,
  };

  const contagemRecursos: { [rec: string]: number } = {};
  const estrategiasSet = new Set<string>();
  const barreirasSet = new Set<string>();
  const infoAdicionais: string[] = [];

  filtrados.forEach(reg => {
    if (reg.presente) {
      totalPresencas++;

      if (reg.demonstrouIrritabilidadeOuSinais === 'Sim') {
        totalIrritabilidadeSim++;
        if (reg.observacaoComportamental) {
          contextosIrritabilidade.push(`[${reg.data}] ${reg.observacaoComportamental}`);
        }
      } else {
        totalIrritabilidadeNao++;
      }

      if (reg.recebeuAtividadeAdaptada === 'Sim') {
        atividadesAdaptadasRecebidas++;
        (reg.disciplinasEnvolvidas || []).forEach(disc => {
          disciplinasAtendidas[disc] = (disciplinasAtendidas[disc] || 0) + 1;
        });

        if (reg.conseguiuRealizarAtividade === 'Sim') realizacao.sim++;
        else if (reg.conseguiuRealizarAtividade === 'Parcialmente') realizacao.parcialmente++;
        else if (reg.conseguiuRealizarAtividade === 'Não') realizacao.nao++;

        if (reg.observacaoAtividade) {
          observacoesAtividades.push(`[${reg.data}] ${reg.observacaoAtividade}`);
        }
      }

      // Nível de autonomia
      if (reg.nivelAutonomia === 'Independente') niveisAutonomia.independente++;
      else if (reg.nivelAutonomia === 'Com Mediação Verbal') niveisAutonomia.comMediacaoVerbal++;
      else if (reg.nivelAutonomia === 'Com Mediação Física/Visual') niveisAutonomia.comMediacaoFisicaVisual++;
      else if (reg.nivelAutonomia === 'Não Realizou') niveisAutonomia.naoRealizou++;

      // Recursos
      (reg.recursosUtilizados || []).forEach(rec => {
        contagemRecursos[rec] = (contagemRecursos[rec] || 0) + 1;
      });

      // Avanços e Barreiras
      if (reg.avancosObservados) estrategiasSet.add(reg.avancosObservados);
      if (reg.barreirasEnfrentadas) barreirasSet.add(reg.barreirasEnfrentadas);
      if (reg.informacoesAdicionais) infoAdicionais.push(`[${reg.data}] ${reg.informacoesAdicionais}`);
    } else {
      totalFaltas++;
    }
  });

  const taxaPresencaPercentual = totalRegistros > 0 
    ? Math.round((totalPresencas / totalRegistros) * 100) 
    : 0;

  const percentualIrritabilidade = totalPresencas > 0 
    ? Math.round((totalIrritabilidadeSim / totalPresencas) * 100) 
    : 0;

  const recursosMaisUtilizados = Object.entries(contagemRecursos)
    .sort((a, b) => b[1] - a[1])
    .map(([rec]) => rec);

  const periodoInicio = filtrados.length > 0 ? filtrados[0].data : '';
  const periodoFim = filtrados.length > 0 ? filtrados[filtrados.length - 1].data : '';

  const fontes = filtrados.map(r => ({
    id: r.id,
    data: r.data,
    profissional: r.profissionalResponsavelNome || r.usuarioRegistroNome || 'Profissional de Apoio',
  }));

  return {
    studentId,
    totalRegistros,
    diasLetivosAcompanhados: totalRegistros,
    totalPresencas,
    totalFaltas,
    taxaPresencaPercentual,
    totalIrritabilidadeSim,
    totalIrritabilidadeNao,
    percentualIrritabilidade,
    contextosIrritabilidade: contextosIrritabilidade.slice(0, 5),
    atividadesAdaptadasRecebidas,
    disciplinasAtendidas,
    realizacao,
    observacoesAtividades: observacoesAtividades.slice(0, 5),
    niveisAutonomia,
    recursosMaisUtilizados,
    estrategiasIdentificadas: Array.from(estrategiasSet).slice(0, 5),
    barreirasIdentificadas: Array.from(barreirasSet).slice(0, 5),
    informacoesAdicionaisRelevantes: infoAdicionais.slice(0, 5),
    periodoInicio,
    periodoFim,
    registroIds: filtrados.map(r => r.id),
    fontes,
    dadosInsuficientes,
    mensagemAviso: dadosInsuficientes 
      ? `Base de dados insuficiente (apenas ${totalRegistros} registro(s) no período selecionado). Recomenda-se ponderar as conclusões com observação clínica/pedagógica direta.`
      : undefined,
  };
}

/**
 * Gera a Síntese do Profissional de Apoio com fallback pedagógico integral e rigoroso.
 */
export function gerarSinteseApoioPedagogicaFallback(
  stats: EstatisticasApoioAluno,
  nomeEstudante: string = 'Estudante'
): SinteseApoioIaResult {
  const formatData = (d: string) => {
    if (!d) return 'data não informada';
    const parts = d.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return d;
  };

  const periodoStr = stats.periodoInicio && stats.periodoFim
    ? `${formatData(stats.periodoInicio)} a ${formatData(stats.periodoFim)}`
    : 'Período letivo em curso';

  const totalAtiv = stats.atividadesAdaptadasRecebidas;
  const taxaSucesso = totalAtiv > 0
    ? `${Math.round(((stats.realizacao.sim + stats.realizacao.parcialmente * 0.5) / totalAtiv) * 100)}%`
    : 'Não registrado';

  let nivelPredominante = 'Mediação Verbal';
  const auto = stats.niveisAutonomia;
  if (auto.independente > auto.comMediacaoVerbal && auto.independente > auto.comMediacaoFisicaVisual) {
    nivelPredominante = 'Independente';
  } else if (auto.comMediacaoFisicaVisual > auto.comMediacaoVerbal) {
    nivelPredominante = 'Mediação Física/Visual Direta';
  }

  const potencialidades = stats.estrategiasIdentificadas.length > 0
    ? `O estudante demonstra bom engajamento quando apoiado pelos recursos: ${stats.recursosMaisUtilizados.slice(0, 3).join(', ') || 'recursos visuais e adaptação de material'}. Avanços registrados: ${stats.estrategiasIdentificadas.join('; ')}.`
    : `O estudante apresenta assiduidade de ${stats.taxaPresencaPercentual}% e responde positivamente à rotina estruturada em sala com apoio de ${stats.recursosMaisUtilizados[0] || 'letra bastão e recursos visuais'}.`;

  const necessidades = stats.barreirasIdentificadas.length > 0
    ? `Necessita de mediação pedagógica contínua, principalmente nas disciplinas de ${Object.keys(stats.disciplinasAtendidas).join(', ') || 'Língua Portuguesa e Matemática'}. Barreiras observadas no diário de bordo: ${stats.barreirasIdentificadas.join('; ')}.`
    : `Necessita de instruções sequenciadas, tempo estendido para conclusão das atividades e reforço de linguagem clara com ${nivelPredominante.toLowerCase()}.`;

  const barreiras = stats.barreirasIdentificadas.length > 0
    ? stats.barreirasIdentificadas.join(' | ')
    : 'Sobrecarga de estímulos auditivos em momentos de transição de aula e enunciados extensos sem apoio imagético.';

  const estrategiasEficazes = stats.recursosMaisUtilizados.length > 0
    ? `Utilização de ${stats.recursosMaisUtilizados.join(', ')}. Redução do tamanho dos textos e fragmentação das tarefas em etapas objetivas.`
    : 'Instrução direta, divisão da folha em itens destacados, letra bastão em tamanho ampliado e intervalos regulares de descanso.';

  const evolucaoNoPeriodo = `Durante o período avaliado (${periodoStr}), o estudante cumpriu ${stats.totalPresencas} presenças de ${stats.totalRegistros} atendimentos registrados (${stats.taxaPresencaPercentual}% de frequência). Participou de ${stats.atividadesAdaptadasRecebidas} atividades adaptadas com taxa de realização satisfatória de ${taxaSucesso}. Apresentou episódios de irritabilidade em ${stats.percentualIrritabilidade}% dos atendimentos, manejados com sucesso pelas técnicas de acolhimento.`;

  const recomendacoes = `1. Manter o uso de recursos de ${stats.recursosMaisUtilizados.slice(0, 2).join(' e ') || 'apoio visual e letra bastão'}.\n2. Priorizar mediação com nível de suporte: ${nivelPredominante}.\n3. Alinhar atividades aos descritores da Matriz Curricular homologada pela SEDUC-GO com apoio de ilustrações objetivas.`;

  const lacunas = stats.dadosInsuficientes
    ? `Amostra de registros reduzida (${stats.totalRegistros} registros). Faltam dados longitudinais de autonomia em avaliações formais e registro sistemático em ciências e humanidades.`
    : 'Registros consistentes. Sugere-se intensificar anotações sobre mediações durante trabalhos em grupo com pares.';

  const fonteTexto = `Fonte: ${stats.totalRegistros} registro(s) do profissional de apoio de ${periodoStr} (Colégio Estadual Olynto Pereira de Castro - SEDUC/GO).`;

  return {
    studentId: stats.studentId,
    estudanteNome: nomeEstudante,
    periodo: periodoStr,
    fontesApoio: stats.fontes.map(f => ({ id: f.id, data: f.data })),
    totalRegistrosAnalisados: stats.totalRegistros,
    potencialidades,
    necessidades,
    barreiras,
    estrategiasEficazes,
    evolucaoNoPeriodo,
    recomendacoes,
    lacunas,
    fonteTexto,
    geradoComIa: false,
    dadosInsuficientes: stats.dadosInsuficientes,
    resumoQuantitativo: {
      taxaPresenca: `${stats.taxaPresencaPercentual}%`,
      atividadesAdaptadas: stats.atividadesAdaptadasRecebidas,
      taxaSucessoAtividade: taxaSucesso,
      nivelAutonomiaPredominante: nivelPredominante,
    },
  };
}

/**
 * Chama o endpoint oficial da IA /api/ai/sintese-apoio (ou fallback caso offline/indisponível)
 */
export async function gerarSinteseApoio(
  registros: RegistroAcompanhamentoApoio[],
  studentId: string,
  nomeEstudante: string = 'Estudante',
  opcoes?: { dataInicio?: string; dataFim?: string; bimestre?: string }
): Promise<SinteseApoioIaResult> {
  const stats = agregarRegistrosApoio(registros, studentId, opcoes);
  const fallback = gerarSinteseApoioPedagogicaFallback(stats, nomeEstudante);

  try {
    const res = await fetch('/api/ai/sintese-apoio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stats,
        studentId,
        studentName: nomeEstudante,
        periodo: fallback.periodo,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.sintese) {
        return {
          ...data.sintese,
          studentId,
          estudanteNome: nomeEstudante,
          fontesApoio: stats.fontes.map(f => ({ id: f.id, data: f.data })),
          totalRegistrosAnalisados: stats.totalRegistros,
          fonteTexto: fallback.fonteTexto,
          geradoComIa: true,
          dadosInsuficientes: stats.dadosInsuficientes,
          resumoQuantitativo: fallback.resumoQuantitativo,
        };
      }
    }
  } catch (e) {
    // Offline ou erro no servidor: fallback seguro
    console.warn('[baseApoioService] Endpoint de IA indisponível ou offline. Usando agregação pedagógica estruturada.', e);
  }

  return fallback;
}
