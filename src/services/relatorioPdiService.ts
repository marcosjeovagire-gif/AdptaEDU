import { jsPDF } from 'jspdf';
import { 
  Estudante, 
  PerfilPedagogico, 
  AtividadeAdaptada, 
  RegistroAcompanhamentoApoio, 
  EscolaConfig 
} from '../types';

export interface PdiPeriodoOptions {
  periodoId: 'todos' | '1T' | '2T' | '3T' | 'mes_atual' | '30dias';
  anoLetivo: number;
}

export interface PdiMetricasDesempenho {
  totalAtividades: number;
  totalQuestoes: number;
  disciplinasAtendidas: string[];
  atividadesAlinhadasPei: number;
  taxaAlinhamentoPei: number;
  atividadesRevisadas: number;
  taxaRevisao: number;

  // Métricas do Acompanhamento de Apoio
  totalRegistrosApoio: number;
  diasPresente: number;
  diasAusente: number;
  taxaPresenca: number;
  realizouAtividadeSim: number;
  realizouAtividadeParcial: number;
  realizouAtividadeNao: number;
  taxaSucessoAtividadesApoio: number;
  diasSemIrritabilidade: number;
  diasComIrritabilidade: number;
  taxaEstabilidadeComportamental: number;
  totalFotosDiarioBordo: number;
}

export interface PdiDadosRelatorio {
  estudante: Estudante;
  perfil?: PerfilPedagogico;
  periodoRotulo: string;
  anoLetivo: number;
  dataEmissao: string;
  metricas: PdiMetricasDesempenho;
  atividadesDoPeriodo: AtividadeAdaptada[];
  registrosApoioDoPeriodo: RegistroAcompanhamentoApoio[];
  parecerSinteticoPadrao: string;
  metasRecomendadas: string[];
  nivelProgressoGeral: 'Avanço Significativo' | 'Em Desenvolvimento' | 'Atenção Prioritária';
}

export const PERIODOS_PDI_INFO: Record<string, { nome: string; descricao: string }> = {
  'todos': { nome: 'Ano Completo (Consolidado)', descricao: 'Todo o histórico escolar registrado no sistema' },
  '1T': { nome: '1º Trimestre', descricao: 'Fevereiro a Maio' },
  '2T': { nome: '2º Trimestre', descricao: 'Junho a Agosto' },
  '3T': { nome: '3º Trimestre', descricao: 'Setembro a Dezembro' },
  'mes_atual': { nome: 'Mês Atual', descricao: 'Lançamentos do mês corrente' },
  '30dias': { nome: 'Últimos 30 Dias', descricao: 'Período recente dos últimos 30 dias corridos' },
};

/**
 * Filtra dados e consolida o relatório de desempenho do PDI para um estudante
 */
export function consolidarRelatorioPdiEstudante(
  estudante: Estudante,
  atividades: AtividadeAdaptada[],
  registrosApoio: RegistroAcompanhamentoApoio[],
  perfil?: PerfilPedagogico,
  options: PdiPeriodoOptions = { periodoId: 'todos', anoLetivo: new Date().getFullYear() }
): PdiDadosRelatorio {
  const agora = new Date();
  const anoAtual = options.anoLetivo || agora.getFullYear();
  const infoPeriodo = PERIODOS_PDI_INFO[options.periodoId] || PERIODOS_PDI_INFO['todos'];

  // Função de filtro de data
  const dataPertenceAoPeriodo = (dataStr?: string): boolean => {
    if (!dataStr) return true;
    try {
      const d = new Date(dataStr);
      if (isNaN(d.getTime())) return true;
      if (options.periodoId === 'todos') {
        return d.getFullYear() === anoAtual || isNaN(d.getFullYear());
      }
      if (options.periodoId === '30dias') {
        const diffMs = agora.getTime() - d.getTime();
        return diffMs >= 0 && diffMs <= 30 * 24 * 3600 * 1000;
      }
      if (options.periodoId === 'mes_atual') {
        return d.getFullYear() === agora.getFullYear() && d.getMonth() === agora.getMonth();
      }
      const mes = d.getMonth(); // 0 a 11
      if (options.periodoId === '1T') return mes >= 1 && mes <= 4;
      if (options.periodoId === '2T') return mes >= 5 && mes <= 7;
      if (options.periodoId === '3T') return mes >= 8 && mes <= 11;
      return true;
    } catch {
      return true;
    }
  };

  // 1. Atividades do estudante filtradas pelo período
  const atividadesEstudante = atividades.filter(a => {
    if (a.estudanteId !== estudante.id && a.estudanteNome !== estudante.nome) return false;
    return dataPertenceAoPeriodo(a.dataCriacao);
  });

  // 2. Registros de apoio do estudante filtrados pelo período
  const registrosEstudante = registrosApoio.filter(r => {
    if (r.studentId !== estudante.id && r.nomeEstudante !== estudante.nome) return false;
    return dataPertenceAoPeriodo(r.data);
  });

  // 3. Cálculo das métricas de Atividades
  const totalAtividades = atividadesEstudante.length;
  const totalQuestoes = atividadesEstudante.reduce((acc, a) => acc + (a.questoes?.length || 3), 0);
  const disciplinasSet = new Set<string>();
  let alinhadasPei = 0;
  let revisadas = 0;

  atividadesEstudante.forEach(a => {
    if (a.disciplina) disciplinasSet.add(a.disciplina);
    if (a.alinhadaAoPei) alinhadasPei++;
    if (a.status === 'Revisada') revisadas++;
  });

  const disciplinasAtendidas = Array.from(disciplinasSet);
  const taxaAlinhamentoPei = totalAtividades > 0 ? Math.round((alinhadasPei / totalAtividades) * 100) : 0;
  const taxaRevisao = totalAtividades > 0 ? Math.round((revisadas / totalAtividades) * 100) : 0;

  // 4. Cálculo das métricas de Apoio Escolar
  let diasPresente = 0;
  let diasAusente = 0;
  let realizouSim = 0;
  let realizouParcial = 0;
  let realizouNao = 0;
  let semIrritabilidade = 0;
  let comIrritabilidade = 0;
  let fotosCount = 0;

  registrosEstudante.forEach(r => {
    if (r.presente) diasPresente++;
    else diasAusente++;

    if (r.conseguiuRealizarAtividade === 'Sim') realizouSim++;
    else if (r.conseguiuRealizarAtividade === 'Parcialmente') realizouParcial++;
    else if (r.conseguiuRealizarAtividade === 'Não') realizouNao++;

    if (r.demonstrouIrritabilidadeOuSinais === 'Sim') comIrritabilidade++;
    else if (r.demonstrouIrritabilidadeOuSinais === 'Não') semIrritabilidade++;

    if (r.fotoDiarioBordoUrl) fotosCount++;
  });

  const totalDias = diasPresente + diasAusente;
  const taxaPresenca = totalDias > 0 ? Math.round((diasPresente / totalDias) * 100) : 100;
  const totalComAtividadeApoio = realizouSim + realizouParcial + realizouNao;
  const taxaSucessoAtividadesApoio = totalComAtividadeApoio > 0 
    ? Math.round(((realizouSim + realizouParcial * 0.5) / totalComAtividadeApoio) * 100) 
    : 0;
  const totalAvaliacoesComportamento = semIrritabilidade + comIrritabilidade;
  const taxaEstabilidadeComportamental = totalAvaliacoesComportamento > 0 
    ? Math.round((semIrritabilidade / totalAvaliacoesComportamento) * 100) 
    : 100;

  // 5. Determinação do nível de progresso geral
  let nivelProgressoGeral: 'Avanço Significativo' | 'Em Desenvolvimento' | 'Atenção Prioritária' = 'Em Desenvolvimento';
  if (totalAtividades >= 3 && taxaSucessoAtividadesApoio >= 70 && taxaPresenca >= 80) {
    nivelProgressoGeral = 'Avanço Significativo';
  } else if (totalAtividades === 0 || taxaPresenca < 60 || taxaSucessoAtividadesApoio < 40) {
    nivelProgressoGeral = 'Atenção Prioritária';
  }

  // 6. Síntese Descritiva Pedagógica Padrão do PDI
  let parecer = '';
  if (nivelProgressoGeral === 'Avanço Significativo') {
    parecer = `O estudante demonstrou excelente resposta às adaptações curriculares propostas no PDI durante o período (${infoPeriodo.nome}). Com ${totalAtividades} atividades adaptadas distribuídas em ${disciplinasAtendidas.length} disciplina(s) e taxa de sucesso de ${taxaSucessoAtividadesApoio}% no acompanhamento diário com o apoio escolar, evidencia avanços consistentes na autonomia de resolução e consolidação das habilidades planejadas. O suporte de mediação e os recursos de acessibilidade têm promovido inclusão ativa e engajamento contínuo nas rotinas escolares.`;
  } else if (nivelProgressoGeral === 'Em Desenvolvimento') {
    parecer = `O estudante apresenta participação positiva nas atividades adaptadas do PDI no período (${infoPeriodo.nome}). Foram registradas ${totalAtividades} atividade(s) adaptada(s) e acompanhamento em ${diasPresente} dia(s) letivo(s) com a equipe de apoio escolar. A mediação individualizada continua essencial para garantir a compreensão dos enunciados e a conclusão das propostas pedagógicas. Recomenda-se a continuidade do reforço visual, enunciados diretos e intervalos monitorados para manutenção do foco.`;
  } else {
    parecer = `Identificada necessidade de intensificação nas estratégias de apoio e mediação pedagógica do PDI no período (${infoPeriodo.nome}). Recomenda-se alinhamento imediato entre coordenação, professores regentes e profissional de apoio para adequar o nível de complexidade das propostas pedagógicas, diversificar recursos multissensoriais e monitorar a assiduidade e bem-estar socioemocional do estudante.`;
  }

  const metas: string[] = [
    'Expandir o repertório de atividades adaptadas em disciplinas que ainda não foram contempladas.',
    'Consolidar a autonomia na realização de enunciados diretos com apoio de recursos visuais.',
    'Garantir registro diário contínuo no Diário de Bordo pelo profissional de apoio escolar.',
    'Aprofundar a validação pedagógica das habilidades trabalhadas junto à coordenação e docentes regentes.'
  ];

  return {
    estudante,
    perfil,
    periodoRotulo: `${infoPeriodo.nome} (${infoPeriodo.descricao})`,
    anoLetivo: anoAtual,
    dataEmissao: new Date().toLocaleDateString('pt-BR'),
    metricas: {
      totalAtividades,
      totalQuestoes,
      disciplinasAtendidas,
      atividadesAlinhadasPei: alinhadasPei,
      taxaAlinhamentoPei,
      atividadesRevisadas: revisadas,
      taxaRevisao,
      totalRegistrosApoio: registrosEstudante.length,
      diasPresente,
      diasAusente,
      taxaPresenca,
      realizouAtividadeSim: realizouSim,
      realizouAtividadeParcial: realizouParcial,
      realizouAtividadeNao: realizouNao,
      taxaSucessoAtividadesApoio,
      diasSemIrritabilidade: semIrritabilidade,
      diasComIrritabilidade: comIrritabilidade,
      taxaEstabilidadeComportamental,
      totalFotosDiarioBordo: fotosCount
    },
    atividadesDoPeriodo: atividadesEstudante,
    registrosApoioDoPeriodo: registrosEstudante,
    parecerSinteticoPadrao: parecer,
    metasRecomendadas: metas,
    nivelProgressoGeral
  };
}

/**
 * Constrói o documento jsPDF para o Relatório Oficial de Desempenho do PDI
 */
export function criarRelatorioPdiPdfDoc(
  dados: PdiDadosRelatorio,
  escolaConfig?: Partial<EscolaConfig>,
  coordenadorNome?: string,
  parecerPersonalizado?: string
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;
  let currentY = 14;

  const nomeEscola = (escolaConfig?.nome || 'COLÉGIO ESTADUAL OLYNTO PEREIRA DE CASTRO').toUpperCase();
  const municipio = escolaConfig?.municipio || 'Rio Verde - GO';

  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - 18) {
      doc.addPage();
      currentY = 14;
      renderHeaderCompact();
    }
  };

  const renderHeaderCompact = () => {
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(marginX, currentY, pageWidth - marginX, currentY);
    currentY += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(`PDI - RELATÓRIO DE DESEMPENHO | ${dados.estudante.nome.toUpperCase()} (${dados.estudante.turma || ''})`, marginX, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${dados.periodoRotulo} - ${dados.anoLetivo}`, pageWidth - marginX, currentY, { align: 'right' });
    currentY += 5;
    doc.setDrawColor(226, 232, 240);
    doc.line(marginX, currentY, pageWidth - marginX, currentY);
    currentY += 6;
  };

  // =========================================================================
  // CABEÇALHO OFICIAL PRINCIPAL
  // =========================================================================
  doc.setDrawColor(15, 118, 110); // Teal/Emerald
  doc.setFillColor(240, 253, 250); // Mint
  doc.rect(marginX, currentY, pageWidth - marginX * 2, 28, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 118, 110);
  doc.text('GOVERNO DO ESTADO DE GOIÁS — SECRETARIA DE ESTADO DA EDUCAÇÃO', marginX + 4, currentY + 6);

  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(nomeEscola, marginX + 4, currentY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`${municipio} | Módulo de Educação Especial e Inclusão Escolar`, marginX + 4, currentY + 17);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 118, 110);
  doc.text('PLANO DE DESENVOLVIMENTO INDIVIDUAL (PDI) — RELATÓRIO DE DESEMPENHO', marginX + 4, currentY + 23);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Emissão: ${dados.dataEmissao}`, pageWidth - marginX - 4, currentY + 23, { align: 'right' });

  currentY += 33;

  // =========================================================================
  // QUADRO 1: DADOS DE IDENTIFICAÇÃO DO ESTUDANTE
  // =========================================================================
  const cardHeight = 28;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.rect(marginX, currentY, pageWidth - marginX * 2, cardHeight, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);

  const col1X = marginX + 4;
  const col2X = marginX + 70;
  const col3X = marginX + 130;

  // Linha 1
  doc.text('Estudante:', col1X, currentY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(dados.estudante.nome.toUpperCase(), col1X + 18, currentY + 6);

  doc.setFont('helvetica', 'bold');
  doc.text('Matrícula:', col2X, currentY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(dados.estudante.matricula || 'N/A', col2X + 16, currentY + 6);

  doc.setFont('helvetica', 'bold');
  doc.text('Turma/Série:', col3X, currentY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(`${dados.estudante.turma || ''} - ${dados.estudante.turno || 'Matutino'}`, col3X + 20, currentY + 6);

  // Linha 2
  doc.setFont('helvetica', 'bold');
  doc.text('Diagnóstico/Laudo:', col1X, currentY + 13);
  doc.setFont('helvetica', 'normal');
  const laudoTexto = dados.estudante.laudo || 'Em investigação / Acompanhamento especializado';
  doc.text(doc.splitTextToSize(laudoTexto, 50)[0], col1X + 30, currentY + 13);

  doc.setFont('helvetica', 'bold');
  doc.text('Profissional Apoio (PAE):', col2X, currentY + 13);
  doc.setFont('helvetica', 'normal');
  doc.text(dados.estudante.paeResponsavelNome || 'PAE Institucional', col2X + 36, currentY + 13);

  doc.setFont('helvetica', 'bold');
  doc.text('Período Avaliado:', col3X, currentY + 13);
  doc.setFont('helvetica', 'normal');
  doc.text(`${dados.periodoRotulo}`, col3X + 26, currentY + 13);

  // Linha 3
  doc.setFont('helvetica', 'bold');
  doc.text('Responsáveis:', col1X, currentY + 20);
  doc.setFont('helvetica', 'normal');
  doc.text(dados.estudante.responsaveis || 'Não informado', col1X + 23, currentY + 20);

  doc.setFont('helvetica', 'bold');
  doc.text('Status PEI/PDI:', col2X, currentY + 20);
  doc.setFont('helvetica', 'normal');
  doc.text(dados.perfil ? 'Perfil Pedagógico Aprovado' : 'Pendente de Validação', col2X + 24, currentY + 20);

  doc.setFont('helvetica', 'bold');
  doc.text('Nível de Progresso:', col3X, currentY + 20);
  
  if (dados.nivelProgressoGeral === 'Avanço Significativo') {
    doc.setTextColor(5, 150, 105);
  } else if (dados.nivelProgressoGeral === 'Em Desenvolvimento') {
    doc.setTextColor(37, 99, 235);
  } else {
    doc.setTextColor(225, 29, 72);
  }
  doc.text(dados.nivelProgressoGeral, col3X + 28, currentY + 20);
  doc.setTextColor(15, 23, 42);

  currentY += cardHeight + 6;

  // =========================================================================
  // QUADRO 2: INDICADORES QUANTITATIVOS DE DESEMPENHO (4 CAIXAS DE KPIs)
  // =========================================================================
  checkPageBreak(30);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 118, 110);
  doc.text('1. INDICADORES SINTÉTICOS DE EXECUÇÃO E RENDIMENTO', marginX, currentY);
  currentY += 4;

  const boxWidth = (pageWidth - marginX * 2 - 9) / 4;
  const boxHeight = 22;

  // Box 1: Atividades Adaptadas
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.rect(marginX, currentY, boxWidth, boxHeight, 'FD');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('ATIVIDADES ADAPTADAS', marginX + 3, currentY + 5);
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(`${dados.metricas.totalAtividades}`, marginX + 3, currentY + 13);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`${dados.metricas.totalQuestoes} questões adaptadas`, marginX + 3, currentY + 18);

  // Box 2: Disciplinas Contempladas
  const box2X = marginX + boxWidth + 3;
  doc.setFillColor(241, 245, 249);
  doc.rect(box2X, currentY, boxWidth, boxHeight, 'FD');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('COBERTURA CURRICULAR', box2X + 3, currentY + 5);
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(`${dados.metricas.disciplinasAtendidas.length}`, box2X + 3, currentY + 13);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`${dados.metricas.taxaAlinhamentoPei}% alinhadas ao PEI`, box2X + 3, currentY + 18);

  // Box 3: Resolução no Apoio Escolar
  const box3X = box2X + boxWidth + 3;
  doc.setFillColor(241, 245, 249);
  doc.rect(box3X, currentY, boxWidth, boxHeight, 'FD');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('RESOLUÇÃO NO APOIO', box3X + 3, currentY + 5);
  doc.setFontSize(14);
  doc.setTextColor(5, 150, 105);
  doc.text(`${dados.metricas.taxaSucessoAtividadesApoio}%`, box3X + 3, currentY + 13);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`${dados.metricas.realizouAtividadeSim} autônomas / ${dados.metricas.realizouAtividadeParcial} mediadas`, box3X + 3, currentY + 18);

  // Box 4: Assiduidade no Acompanhamento
  const box4X = box3X + boxWidth + 3;
  doc.setFillColor(241, 245, 249);
  doc.rect(box4X, currentY, boxWidth, boxHeight, 'FD');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('ASSIDUIDADE NO APOIO', box4X + 3, currentY + 5);
  doc.setFontSize(14);
  doc.setTextColor(37, 99, 235);
  doc.text(`${dados.metricas.taxaPresenca}%`, box4X + 3, currentY + 13);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`${dados.metricas.diasPresente} de ${dados.metricas.totalRegistrosApoio} atendimentos`, box4X + 3, currentY + 18);

  currentY += boxHeight + 8;

  // =========================================================================
  // SEÇÃO 2: DETALHAMENTO CURRICULAR DAS ATIVIDADES ADAPTADAS
  // =========================================================================
  checkPageBreak(35);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 118, 110);
  doc.text('2. ACOMPANHAMENTO DAS ATIVIDADES ADAPTADAS POR DISCIPLINA', marginX, currentY);
  currentY += 4;

  if (dados.atividadesDoPeriodo.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Nenhuma atividade adaptada registrada no período para este estudante.', marginX + 3, currentY + 4);
    currentY += 8;
  } else {
    // Tabela resumida de atividades
    const tableWidth = pageWidth - marginX * 2;
    doc.setFillColor(226, 232, 240);
    doc.rect(marginX, currentY, tableWidth, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text('Disciplina', marginX + 2, currentY + 4.2);
    doc.text('Conteúdo / Habilidade Trabalhada', marginX + 36, currentY + 4.2);
    doc.text('Data', marginX + 115, currentY + 4.2);
    doc.text('Status / PEI', marginX + 140, currentY + 4.2);
    doc.text('Professor', marginX + 162, currentY + 4.2);

    currentY += 6;

    const ativsParaExibir = dados.atividadesDoPeriodo.slice(0, 6);
    ativsParaExibir.forEach((ativ, idx) => {
      checkPageBreak(8);
      const bg = idx % 2 === 0 ? 255 : 248;
      doc.setFillColor(bg, bg, bg);
      doc.rect(marginX, currentY, tableWidth, 6.5, 'F');
      doc.setDrawColor(241, 245, 249);
      doc.line(marginX, currentY + 6.5, marginX + tableWidth, currentY + 6.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(15, 23, 42);
      doc.text(ativ.disciplina || 'Geral', marginX + 2, currentY + 4.5);

      doc.setFont('helvetica', 'normal');
      const conteudoTxt = ativ.conteudo || ativ.habilidadeDescricao || 'Atividade de fixação e apoio inclusivo';
      doc.text(doc.splitTextToSize(conteudoTxt, 75)[0], marginX + 36, currentY + 4.5);

      const dataFmt = ativ.dataCriacao ? new Date(ativ.dataCriacao).toLocaleDateString('pt-BR') : '-';
      doc.text(dataFmt, marginX + 115, currentY + 4.5);

      const statusPei = ativ.alinhadaAoPei ? 'Alinhada PEI' : (ativ.status || 'Gerada');
      doc.text(statusPei, marginX + 140, currentY + 4.5);

      const profTxt = doc.splitTextToSize(ativ.professorNome || 'Docente', 20)[0];
      doc.text(profTxt, marginX + 162, currentY + 4.5);

      currentY += 6.5;
    });

    if (dados.atividadesDoPeriodo.length > 6) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(`... e mais ${dados.atividadesDoPeriodo.length - 6} atividade(s) adaptada(s) registradas no arquivo completo do estudante.`, marginX + 2, currentY + 4);
      currentY += 6;
    }
  }

  currentY += 4;

  // =========================================================================
  // SEÇÃO 3: REGISTROS DIÁRIOS DO PROFISSIONAL DE APOIO (DIÁRIO DE BORDO)
  // =========================================================================
  checkPageBreak(30);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 118, 110);
  doc.text('3. DESEMPENHO NO ACOMPANHAMENTO DIÁRIO (DIÁRIO DE BORDO / PAE)', marginX, currentY);
  currentY += 4;

  const cardApoioH = 24;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.rect(marginX, currentY, pageWidth - marginX * 2, cardApoioH, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('Resumo das Observações Comportamentais e Mediações Realizadas:', marginX + 3, currentY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);

  const obsApoioTexto = dados.registrosApoioDoPeriodo.length > 0
    ? `Foram registrados ${dados.metricas.totalRegistrosApoio} atendimento(s) no período com ${dados.metricas.diasPresente} dia(s) de presença. Índice de estabilidade emocional em ${dados.metricas.taxaEstabilidadeComportamental}%. O estudante realizou atividades com auxílio mediado em ${dados.metricas.realizouAtividadeParcial} ocasião(ões) e autônoma em ${dados.metricas.realizouAtividadeSim} ocasião(ões). Comprovação fotográfica presente em ${dados.metricas.totalFotosDiarioBordo} diários anexados.`
    : 'Sem registros de atendimento do profissional de apoio lançados no período selecionado.';

  const splitApoio = doc.splitTextToSize(obsApoioTexto, pageWidth - marginX * 2 - 8);
  doc.text(splitApoio, marginX + 3, currentY + 11);

  currentY += cardApoioH + 6;

  // =========================================================================
  // SEÇÃO 4: RECURSOS DE ACESSIBILIDADE E ADAPTAÇÕES UTILIZADAS
  // =========================================================================
  checkPageBreak(25);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 118, 110);
  doc.text('4. ESTRATÉGIAS PEDAGÓGICAS E RECURSOS DE ACESSIBILIDADE DO PDI', marginX, currentY);
  currentY += 4;

  const p = dados.perfil;
  const recursos = [
    p?.necessidadeApoioVisual ? '• Recursos visuais e pictogramas de apoio' : null,
    p?.necessidadeInstrucoesCurtas ? '• Instruções curtas, sequenciadas e diretas' : null,
    p?.tempoAdicionalAutorizado ? `• Tempo adicional autorizado (${p.tempoAdicionalAutorizado})` : null,
    p?.quantidadeAlternativas ? `• Formato simplificado com ${p.quantidadeAlternativas} alternativas por questão` : null,
    p?.recursosAcessibilidade ? `• Outros recursos: ${p.recursosAcessibilidade}` : null,
  ].filter(Boolean);

  if (recursos.length === 0) {
    recursos.push('• Adaptação curricular individualizada de enunciado e mediação direta pelo PAE.');
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);

  recursos.forEach(rec => {
    if (rec) {
      doc.text(rec, marginX + 3, currentY + 4);
      currentY += 5;
    }
  });

  currentY += 3;

  // =========================================================================
  // SEÇÃO 5: PARECER DESCRITIVO DE EVOLUÇÃO E METAS
  // =========================================================================
  checkPageBreak(40);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 118, 110);
  doc.text('5. PARECER CONCLUSIVO DE EVOLUÇÃO PEDAGÓGICA DO PDI', marginX, currentY);
  currentY += 4;

  const textoParecerFinal = (parecerPersonalizado && parecerPersonalizado.trim()) 
    ? parecerPersonalizado 
    : dados.parecerSinteticoPadrao;

  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(255, 255, 255);
  const linhasParecer = doc.splitTextToSize(textoParecerFinal, pageWidth - marginX * 2 - 8);
  const parecerBoxH = Math.max(22, linhasParecer.length * 4.2 + 8);

  doc.rect(marginX, currentY, pageWidth - marginX * 2, parecerBoxH, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(linhasParecer, marginX + 4, currentY + 6);

  currentY += parecerBoxH + 6;

  // =========================================================================
  // SEÇÃO 6: CAMPO DE VALIDAÇÃO E ASSINATURAS INSTITUCIONAIS
  // =========================================================================
  checkPageBreak(38);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 118, 110);
  doc.text('6. VALIDAÇÃO INSTITUCIONAL E ASSINATURAS', marginX, currentY);
  currentY += 12;

  const assWidth = (pageWidth - marginX * 2 - 12) / 3;

  // Assinatura 1: Coordenação
  const ass1X = marginX;
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.4);
  doc.line(ass1X, currentY, ass1X + assWidth, currentY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text(coordenadorNome || 'Coordenação Pedagógica', ass1X + assWidth / 2, currentY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Coordenação Pedagógica / Gestão', ass1X + assWidth / 2, currentY + 7.5, { align: 'center' });

  // Assinatura 2: Profissional de Apoio
  const ass2X = ass1X + assWidth + 6;
  doc.line(ass2X, currentY, ass2X + assWidth, currentY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text(dados.estudante.paeResponsavelNome || 'Profissional de Apoio Escolar', ass2X + assWidth / 2, currentY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Apoio Escolar / PAE', ass2X + assWidth / 2, currentY + 7.5, { align: 'center' });

  // Assinatura 3: Pais / Responsáveis
  const ass3X = ass2X + assWidth + 6;
  doc.line(ass3X, currentY, ass3X + assWidth, currentY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text(doc.splitTextToSize(dados.estudante.responsaveis || 'Responsável Legal', assWidth)[0], ass3X + assWidth / 2, currentY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Pai / Mãe / Responsável Legal', ass3X + assWidth / 2, currentY + 7.5, { align: 'center' });

  // =========================================================================
  // NUMERAÇÃO DE PÁGINAS E RODAPÉ EM TODAS AS PÁGINAS
  // =========================================================================
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `PDI Escolar — Sistema AdaptaEdu • ${nomeEscola} • Página ${i} de ${totalPages}`,
      marginX,
      pageHeight - 8
    );
    doc.text(
      `Autenticação: ${dados.estudante.matricula || 'PDI'}-${Date.now().toString(36).toUpperCase()}`,
      pageWidth - marginX,
      pageHeight - 8,
      { align: 'right' }
    );
  }

  return doc;
}

/**
 * Gera e dispara o download do arquivo PDF do PDI
 */
export function exportarRelatorioPdiPDF(
  dados: PdiDadosRelatorio,
  escolaConfig?: Partial<EscolaConfig>,
  coordenadorNome?: string,
  parecerPersonalizado?: string
) {
  const doc = criarRelatorioPdiPdfDoc(dados, escolaConfig, coordenadorNome, parecerPersonalizado);
  const nomeAlunoSanitizado = dados.estudante.nome.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `PDI_Relatorio_Desempenho_${nomeAlunoSanitizado}_${dados.anoLetivo}.pdf`;
  doc.save(filename);
}

/**
 * Retorna o Blob do PDF do PDI para salvar no Google Drive ou pré-visualizar
 */
export function gerarRelatorioPdiPdfBlob(
  dados: PdiDadosRelatorio,
  escolaConfig?: Partial<EscolaConfig>,
  coordenadorNome?: string,
  parecerPersonalizado?: string
): Blob {
  const doc = criarRelatorioPdiPdfDoc(dados, escolaConfig, coordenadorNome, parecerPersonalizado);
  return doc.output('blob');
}
