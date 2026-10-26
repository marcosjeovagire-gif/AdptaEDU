import { jsPDF } from 'jspdf';
import { 
  Estudante, 
  PerfilPedagogico, 
  AtividadeAdaptada, 
  RegistroAcompanhamentoApoio, 
  EscolaConfig 
} from '../types';

export type TrimestrePeriodo = '1T' | '2T' | '3T' | 'ANUAL';

export interface RelatorioTrimestralOptions {
  trimestre: TrimestrePeriodo;
  anoLetivo: number;
  turma?: string;
  serie?: string;
  estudanteId?: string;
}

export interface EstudanteEvolucaoItem {
  estudante: Estudante;
  perfil?: PerfilPedagogico;
  atividadesTrimestre: AtividadeAdaptada[];
  totalAtividades: number;
  totalQuestoes: number;
  disciplinasAtendidas: string[];
  taxaRevisao: number;
  atividadesAlinhadasPei: number;
  percentualPei: number;
  totalAtendimentosApoio: number;
  parecerEvolucao: string;
  nivelEvolucao: 'Avanço Significativo' | 'Em Desenvolvimento' | 'Atenção Prioritária';
}

export interface RelatorioTrimestralConsolidado {
  trimestre: TrimestrePeriodo;
  trimestreNome: string;
  periodoMeses: string;
  anoLetivo: number;
  dataGeracao: string;
  totalEstudantesAvaliados: number;
  totalComPerfilAtivo: number;
  totalAtividadesGeradas: number;
  totalQuestoesAdaptadas: number;
  totalAlinhadasPei: number;
  taxaMediaPei: number;
  itens: EstudanteEvolucaoItem[];
}

export const TRIMESTRES_INFO: Record<TrimestrePeriodo, { nome: string; periodo: string; meses: number[] }> = {
  '1T': { nome: '1º Trimestre', periodo: 'Fevereiro a Maio', meses: [1, 2, 3, 4] },
  '2T': { nome: '2º Trimestre', periodo: 'Junho a Agosto', meses: [5, 6, 7] },
  '3T': { nome: '3º Trimestre', periodo: 'Setembro a Dezembro', meses: [8, 9, 10, 11] },
  'ANUAL': { nome: 'Consolidado Anual', periodo: 'Ano Letivo Completo (Fev - Dez)', meses: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
};

/**
 * Filtra e consolida os dados dos estudantes para o Relatório Trimestral
 */
export function consolidarEvolucaoTrimestral(
  estudantes: Estudante[],
  perfisPedagogicos: PerfilPedagogico[],
  atividades: AtividadeAdaptada[],
  registrosApoio: RegistroAcompanhamentoApoio[] = [],
  options: RelatorioTrimestralOptions
): RelatorioTrimestralConsolidado {
  const { trimestre, anoLetivo, turma, serie, estudanteId } = options;
  const infoTrimestre = TRIMESTRES_INFO[trimestre];

  // 1. Filtragem dos estudantes alvo
  const estudantesAlvo = estudantes.filter(est => {
    if (estudanteId && estudanteId !== 'todos' && est.id !== estudanteId) return false;
    if (turma && turma !== 'todas' && est.turma !== turma) return false;
    if (serie && serie !== 'todas') {
      const matchSerie = est.anoSerie === serie || (est.turma && est.turma.toLowerCase().includes(serie.toLowerCase()));
      if (!matchSerie) return false;
    }
    return true;
  });

  const mapaPerfis = new Map<string, PerfilPedagogico>();
  perfisPedagogicos.forEach(p => {
    if (p.estudanteId) mapaPerfis.set(p.estudanteId, p);
  });

  // 2. Filtra atividades do trimestre
  const isAtividadeDoTrimestre = (ativ: AtividadeAdaptada) => {
    if (!ativ.dataCriacao) return true; // fallback
    try {
      const d = new Date(ativ.dataCriacao);
      if (isNaN(d.getTime())) return true;
      const ano = d.getFullYear();
      const mes = d.getMonth();
      if (ano !== anoLetivo && !isNaN(ano)) return false;
      return infoTrimestre.meses.includes(mes);
    } catch {
      return true;
    }
  };

  const isRegistroDoTrimestre = (reg: RegistroAcompanhamentoApoio) => {
    if (!reg.data) return true;
    try {
      const parts = reg.data.split('-');
      if (parts.length >= 2) {
        const ano = parseInt(parts[0], 10);
        const mes = parseInt(parts[1], 10) - 1;
        if (ano !== anoLetivo && !isNaN(ano)) return false;
        return infoTrimestre.meses.includes(mes);
      }
      return true;
    } catch {
      return true;
    }
  };

  const itens: EstudanteEvolucaoItem[] = estudantesAlvo.map(est => {
    const perfil = mapaPerfis.get(est.id);
    const atividadesDoEstudante = atividades.filter(a => a.estudanteId === est.id && isAtividadeDoTrimestre(a));
    const registrosDoEstudante = registrosApoio.filter(r => r.studentId === est.id && isRegistroDoTrimestre(r));

    const totalAtividades = atividadesDoEstudante.length;
    const totalQuestoes = atividadesDoEstudante.reduce((acc, a) => acc + (a.quantidadeQuestoes || a.questoes?.length || 0), 0);
    const disciplinasSet = new Set(atividadesDoEstudante.map(a => a.disciplina).filter(Boolean));
    const revisadas = atividadesDoEstudante.filter(a => a.status === 'Revisada').length;
    const taxaRevisao = totalAtividades > 0 ? Math.round((revisadas / totalAtividades) * 100) : 0;
    const atividadesAlinhadasPei = atividadesDoEstudante.filter(a => a.alinhadaAoPei).length;
    const percentualPei = totalAtividades > 0 ? Math.round((atividadesAlinhadasPei / totalAtividades) * 100) : 0;

    // Determina o Parecer e o Nível de Evolução
    let nivelEvolucao: 'Avanço Significativo' | 'Em Desenvolvimento' | 'Atenção Prioritária' = 'Em Desenvolvimento';
    let parecerEvolucao = '';

    if (totalAtividades >= 4 && percentualPei >= 75) {
      nivelEvolucao = 'Avanço Significativo';
      parecerEvolucao = `O estudante apresentou excelente engajamento nas atividades adaptadas com alto alinhamento ao PEI (${atividadesAlinhadasPei} atividades). Demonstrando autonomia crescente e consolidação das habilidades curriculares priorizadas para o período.`;
    } else if (totalAtividades > 0) {
      nivelEvolucao = 'Em Desenvolvimento';
      parecerEvolucao = `Participou ativamente de ${totalAtividades} atividades adaptadas nas disciplinas de ${Array.from(disciplinasSet).join(', ') || 'diversas áreas'}. As adaptações com ${perfil?.necessidadeApoioVisual ? 'apoio visual e ' : ''}instruções orientadas favoreceram a compreensão dos conteúdos.`;
    } else {
      nivelEvolucao = 'Atenção Prioritária';
      parecerEvolucao = `Sem atividades adaptadas registradas no período para este componente. Recomenda-se alinhamento imediato entre o Professor Regente e a Coordenação/PAE para garantia dos suportes pedagógicos individualizados do PEI.`;
    }

    return {
      estudante: est,
      perfil,
      atividadesTrimestre: atividadesDoEstudante,
      totalAtividades,
      totalQuestoes,
      disciplinasAtendidas: Array.from(disciplinasSet),
      taxaRevisao,
      atividadesAlinhadasPei,
      percentualPei,
      totalAtendimentosApoio: registrosDoEstudante.length,
      parecerEvolucao,
      nivelEvolucao,
    };
  });

  const totalEstudantesAvaliados = itens.length;
  const totalComPerfilAtivo = itens.filter(i => Boolean(i.perfil)).length;
  const totalAtividadesGeradas = itens.reduce((acc, i) => acc + i.totalAtividades, 0);
  const totalQuestoesAdaptadas = itens.reduce((acc, i) => acc + i.totalQuestoes, 0);
  const totalAlinhadasPei = itens.reduce((acc, i) => acc + i.atividadesAlinhadasPei, 0);
  const taxaMediaPei = totalAtividadesGeradas > 0 ? Math.round((totalAlinhadasPei / totalAtividadesGeradas) * 100) : 0;

  return {
    trimestre,
    trimestreNome: infoTrimestre.nome,
    periodoMeses: infoTrimestre.periodo,
    anoLetivo,
    dataGeracao: new Date().toLocaleDateString('pt-BR'),
    totalEstudantesAvaliados,
    totalComPerfilAtivo,
    totalAtividadesGeradas,
    totalQuestoesAdaptadas,
    totalAlinhadasPei,
    taxaMediaPei,
    itens,
  };
}

/**
 * Exporta os dados consolidados do relatório trimestral em CSV
 */
export function exportarRelatorioTrimestralCSV(
  relatorio: RelatorioTrimestralConsolidado,
  escolaConfig?: Partial<EscolaConfig>
) {
  const nomeEscola = escolaConfig?.nome || 'Colegio Estadual Olynto Pereira de Castro';
  
  const cabecalho = [
    'Estudante',
    'Matrícula',
    'Série/Ano',
    'Turma',
    'Turno',
    'PAE Responsável',
    'Laudo/Diagnóstico',
    'Perfil Pedagógico Ativo',
    'Adaptações Necessárias',
    'Trimestre',
    'Total Atividades Adaptadas',
    'Disciplinas Atendidas',
    'Atividades Alinhadas ao PEI',
    '% Alinhamento PEI',
    'Atividades Revisadas',
    'Atendimentos do Apoio',
    'Nível de Evolução',
    'Parecer Sintético de Evolução'
  ];

  const linhas = relatorio.itens.map(item => {
    const e = item.estudante;
    const p = item.perfil;
    const adaptacoes = [
      p?.necessidadeApoioVisual ? 'Apoio Visual' : null,
      p?.necessidadeInstrucoesCurtas ? 'Instruções Curtas' : null,
      p?.tempoAdicionalAutorizado ? `Tempo Extra (${p.tempoAdicionalAutorizado})` : null,
      p?.quantidadeAlternativas ? `${p.quantidadeAlternativas} Alternativas` : null,
    ].filter(Boolean).join(' + ') || 'Adaptação padrão';

    return [
      `"${e.nome.replace(/"/g, '""')}"`,
      `"${e.matricula}"`,
      `"${e.anoSerie || ''}"`,
      `"${e.turma || ''}"`,
      `"${e.turno || ''}"`,
      `"${(e.paeResponsavelNome || 'Não informado').replace(/"/g, '""')}"`,
      `"${(e.laudo || 'Em investigação / Sem laudo').replace(/"/g, '""')}"`,
      `"${p ? 'Sim (Aprovado)' : 'Pendente'}"`,
      `"${adaptacoes.replace(/"/g, '""')}"`,
      `"${relatorio.trimestreNome} (${relatorio.periodoMeses})"`,
      item.totalAtividades,
      `"${item.disciplinasAtendidas.join(', ') || 'Nenhuma'}"`,
      item.atividadesAlinhadasPei,
      `${item.percentualPei}%`,
      `${item.taxaRevisao}%`,
      item.totalAtendimentosApoio,
      `"${item.nivelEvolucao}"`,
      `"${item.parecerEvolucao.replace(/"/g, '""')}"`
    ].join(';');
  });

  const conteudoCsv = '\uFEFF' + [
    `"Relatório Trimestral de Evolução dos Estudantes - ${nomeEscola}"`,
    `"Trimestre: ${relatorio.trimestreNome} (${relatorio.periodoMeses}) - Ano Letivo ${relatorio.anoLetivo}"`,
    `"Data de Emissão: ${relatorio.dataGeracao} - Total de Estudantes Avaliados: ${relatorio.totalEstudantesAvaliados}"`,
    '',
    cabecalho.join(';'),
    ...linhas
  ].join('\r\n');

  const blob = new Blob([conteudoCsv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Relatorio_Evolucao_Trimestral_${relatorio.trimestre}_${relatorio.anoLetivo}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Constrói o documento jsPDF do Relatório Trimestral Oficial (padrão A4)
 */
export function criarRelatorioTrimestralPDFDoc(
  relatorio: RelatorioTrimestralConsolidado,
  escolaConfig?: Partial<EscolaConfig>,
  coordenadorNome?: string
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;
  let currentY = 16;

  const nomeEscola = (escolaConfig?.nome || 'COLÉGIO ESTADUAL OLYNTO PEREIRA DE CASTRO').toUpperCase();
  const municipio = escolaConfig?.municipio || 'Rio Verde - GO';

  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - 20) {
      doc.addPage();
      currentY = 16;
      renderHeaderCompact();
    }
  };

  const renderHeader = () => {
    // Moldura do cabeçalho institucional
    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(0.4);
    doc.rect(marginX, currentY, pageWidth - marginX * 2, 28);

    doc.setFillColor(248, 250, 252);
    doc.rect(marginX + 0.2, currentY + 0.2, pageWidth - marginX * 2 - 0.4, 7, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('GOVERNO DO ESTADO DE GOIÁS • SECRETARIA DE ESTADO DA EDUCAÇÃO', pageWidth / 2, currentY + 5, { align: 'center' });

    doc.setFontSize(10.5);
    doc.setTextColor(5, 150, 105); // emerald
    doc.text(nomeEscola, pageWidth / 2, currentY + 12, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`${municipio} • Coordenação Pedagógica de Apoio à Inclusão Escolar`, pageWidth / 2, currentY + 17, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(`RELATÓRIO TRIMESTRAL DE EVOLUÇÃO DOS ESTUDANTES COM ADAPTAÇÃO PEDAGÓGICA`, pageWidth / 2, currentY + 23, { align: 'center' });

    currentY += 32;
  };

  const renderHeaderCompact = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`${nomeEscola} • Relatório Trimestral de Evolução (${relatorio.trimestreNome} / ${relatorio.anoLetivo})`, marginX, currentY);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(marginX, currentY + 2, pageWidth - marginX, currentY + 2);
    currentY += 8;
  };

  renderHeader();

  // Box com Indicadores Gerais do Trimestre
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.rect(marginX, currentY, pageWidth - marginX * 2, 22, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`Período de Referência: ${relatorio.trimestreNome} (${relatorio.periodoMeses}) - Ano Letivo ${relatorio.anoLetivo}`, marginX + 3, currentY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Estudantes Avaliados: ${relatorio.totalEstudantesAvaliados}  |  Com Perfil Ativo: ${relatorio.totalComPerfilAtivo}  |  Total Atividades: ${relatorio.totalAtividadesGeradas}  |  Alinhadas ao PEI: ${relatorio.totalAlinhadasPei} (${relatorio.taxaMediaPei}%)`, marginX + 3, currentY + 10);
  doc.text(`Emissão Oficial: ${relatorio.dataGeracao}  |  Responsável: ${coordenadorNome || 'Coordenação Pedagógica'}`, marginX + 3, currentY + 15);

  currentY += 27;

  // Renderização de cada estudante
  relatorio.itens.forEach((item, index) => {
    checkPageBreak(50);

    const est = item.estudante;
    const p = item.perfil;

    // Card do estudante
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(255, 255, 255);
    doc.rect(marginX, currentY, pageWidth - marginX * 2, 44, 'FD');

    // Barra lateral com cor do status
    if (item.nivelEvolucao === 'Avanço Significativo') {
      doc.setFillColor(5, 150, 105); // emerald
    } else if (item.nivelEvolucao === 'Em Desenvolvimento') {
      doc.setFillColor(37, 99, 235); // blue
    } else {
      doc.setFillColor(217, 119, 6); // amber
    }
    doc.rect(marginX, currentY, 2.5, 44, 'F');

    // Linha 1: Nome, Matrícula, Turma e Nível
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(`${index + 1}. ${est.nome.toUpperCase()}`, marginX + 5, currentY + 5.5);

    doc.setFontSize(8);
    doc.setTextColor(79, 70, 229);
    doc.text(`[${item.nivelEvolucao}]`, pageWidth - marginX - 4, currentY + 5.5, { align: 'right' });

    // Linha 2: Turma, Matrícula, Turno, PAE
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Matrícula: ${est.matricula}   •   Turma/Série: ${est.turma || est.anoSerie || 'N/I'}   •   Turno: ${est.turno || 'Matutino'}   •   PAE: ${est.paeResponsavelNome || 'Profissional de Apoio'}`, marginX + 5, currentY + 10.5);

    // Linha 3: Diagnóstico / Laudo e Recursos Pedagógicos
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text(`Diagnóstico/Laudo: `, marginX + 5, currentY + 15.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    const laudoTexto = doc.splitTextToSize(est.laudo || 'Em investigação pedagógica / Sem laudo registrado', pageWidth - marginX * 2 - 35);
    doc.text(laudoTexto[0] || '', marginX + 32, currentY + 15.5);

    // Linha 4: Adaptações Ativas do Perfil
    const adaptacoes = [
      p?.necessidadeApoioVisual ? 'Apoio Visual' : null,
      p?.necessidadeInstrucoesCurtas ? 'Instruções Curtas' : null,
      p?.tempoAdicionalAutorizado ? 'Tempo Extra' : null,
      p?.quantidadeAlternativas ? `${p.quantidadeAlternativas} Alternativas` : null,
    ].filter(Boolean).join(' • ') || 'Adaptação padrão da turma';

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text(`Adaptações Ativas: `, marginX + 5, currentY + 20.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    doc.text(adaptacoes, marginX + 32, currentY + 20.5);

    // Linha 5: Atividades Adaptadas e Métricas do Trimestre
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(5, 150, 105);
    doc.text(`Atividades no Trimestre: ${item.totalAtividades} (${item.totalQuestoes} questões)`, marginX + 5, currentY + 25.5);
    doc.setTextColor(37, 99, 235);
    doc.text(`Alinhadas ao PEI: ${item.atividadesAlinhadasPei} (${item.percentualPei}%)`, marginX + 70, currentY + 25.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Disciplinas: ${item.disciplinasAtendidas.slice(0, 3).join(', ') || 'Geral'}`, marginX + 125, currentY + 25.5);

    // Linha 6: Parecer Sintético do Trimestre
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`Parecer de Evolução: `, marginX + 5, currentY + 31);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.2);
    doc.setTextColor(71, 85, 105);
    const parecerLinhas = doc.splitTextToSize(item.parecerEvolucao, pageWidth - marginX * 2 - 10);
    doc.text(parecerLinhas.slice(0, 2), marginX + 5, currentY + 35);

    currentY += 48;
  });

  // Espaço para Assinaturas Oficiais
  checkPageBreak(35);
  currentY += 8;

  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);

  const colWidth = (pageWidth - marginX * 2 - 10) / 3;

  // Assinatura 1
  doc.line(marginX, currentY + 12, marginX + colWidth, currentY + 12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(30, 41, 59);
  doc.text('Coordenação Pedagógica', marginX + colWidth / 2, currentY + 16, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(coordenadorNome || 'Assinatura e Carimbo', marginX + colWidth / 2, currentY + 20, { align: 'center' });

  // Assinatura 2
  doc.line(marginX + colWidth + 5, currentY + 12, marginX + colWidth * 2 + 5, currentY + 12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('Profissional de Apoio (PAE)', marginX + colWidth * 1.5 + 5, currentY + 16, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Acompanhamento da Inclusão', marginX + colWidth * 1.5 + 5, currentY + 20, { align: 'center' });

  // Assinatura 3
  doc.line(marginX + colWidth * 2 + 10, currentY + 12, pageWidth - marginX, currentY + 12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('Professor(a) Regente', marginX + colWidth * 2.5 + 10, currentY + 16, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Validação Pedagógica', marginX + colWidth * 2.5 + 10, currentY + 20, { align: 'center' });

  // Rodapé da página
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Documento oficial gerado pelo Sistema de Gestão e Adaptação Curricular • Página ${i} de ${totalPages}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: 'center' }
    );
  }

  return doc;
}

/**
 * Gera o Blob do PDF do Relatório Trimestral para envio ao Google Drive ou download
 */
export function gerarRelatorioTrimestralPDFBlob(
  relatorio: RelatorioTrimestralConsolidado,
  escolaConfig?: Partial<EscolaConfig>,
  coordenadorNome?: string
): { blob: Blob; fileName: string; doc: jsPDF } {
  const doc = criarRelatorioTrimestralPDFDoc(relatorio, escolaConfig, coordenadorNome);
  const fileName = `Relatorio_Evolucao_Trimestral_${relatorio.trimestre}_${relatorio.anoLetivo}.pdf`;
  const blob = doc.output('blob');
  return { blob, fileName, doc };
}

/**
 * Exporta o Relatório Trimestral Oficial em PDF (download direto no navegador)
 */
export function exportarRelatorioTrimestralPDF(
  relatorio: RelatorioTrimestralConsolidado,
  escolaConfig?: Partial<EscolaConfig>,
  coordenadorNome?: string
): void {
  const { doc, fileName } = gerarRelatorioTrimestralPDFBlob(relatorio, escolaConfig, coordenadorNome);
  doc.save(fileName);
}
