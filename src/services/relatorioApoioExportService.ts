import { jsPDF } from 'jspdf';
import { RegistroAcompanhamentoApoio, Estudante, EscolaConfig, AuthorizedUser } from '../types';
import { formatarDataPtBr, getNomeDiaSemana } from '../server/apoioService';

export interface RelatorioApoioFilterOptions {
  ano?: number;
  mes?: number; // 0 a 11
  estudanteId?: string;
  turma?: string;
  tipo?: 'geral' | 'individual';
}

const MESES_NOMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

/**
 * Filtra os registros conforme os critérios de mês, ano, estudante e turma
 */
export function filtrarRegistrosParaRelatorio(
  registros: RegistroAcompanhamentoApoio[],
  estudantes: Estudante[],
  filtros: RelatorioApoioFilterOptions
): {
  registrosFiltrados: RegistroAcompanhamentoApoio[];
  estudanteAlvo?: Estudante;
  mesNome: string;
  ano: number;
} {
  const agora = new Date();
  const ano = filtros.ano !== undefined ? filtros.ano : agora.getFullYear();
  const mes = filtros.mes !== undefined ? filtros.mes : agora.getMonth();
  const mesNome = MESES_NOMES[mes] || 'Mês Atual';

  let estudanteAlvo: Estudante | undefined;
  if (filtros.estudanteId && filtros.estudanteId !== 'todos') {
    estudanteAlvo = estudantes.find(e => e.id === filtros.estudanteId);
  }

  const registrosFiltrados = registros.filter(r => {
    // Validação de data: YYYY-MM-DD
    if (r.data) {
      const parts = r.data.split('-');
      if (parts.length >= 2) {
        const rAno = parseInt(parts[0], 10);
        const rMes = parseInt(parts[1], 10) - 1; // 0-indexed
        if (filtros.ano !== undefined && rAno !== ano) return false;
        if (filtros.mes !== undefined && rMes !== mes) return false;
      }
    }

    if (filtros.estudanteId && filtros.estudanteId !== 'todos' && r.studentId !== filtros.estudanteId) {
      return false;
    }

    if (filtros.turma && filtros.turma !== 'todas') {
      const est = estudantes.find(e => e.id === r.studentId);
      if (est && est.turma !== filtros.turma) return false;
    }

    return true;
  }).sort((a, b) => a.data.localeCompare(b.data));

  return {
    registrosFiltrados,
    estudanteAlvo,
    mesNome,
    ano
  };
}

/**
 * Gera documento PDF oficial formatado em padrão A4 para entrega à Direção Escolar
 */
export function exportRelatorioApoioPDF(
  registros: RegistroAcompanhamentoApoio[],
  estudantes: Estudante[],
  escolaConfig: Partial<EscolaConfig> | undefined,
  currentUser: AuthorizedUser | null,
  filtros: RelatorioApoioFilterOptions
): void {
  const { registrosFiltrados, estudanteAlvo, mesNome, ano } = filtrarRegistrosParaRelatorio(
    registros,
    estudantes,
    filtros
  );

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 14;
  const marginRight = 14;
  const contentWidth = pageWidth - marginLeft - marginRight;

  const nomeEscola = escolaConfig?.nome || 'Colégio Estadual Olynto Pereira de Castro';
  const agora = new Date();
  const dataFormatada = agora.toLocaleString('pt-BR');
  const nomeProfissional = currentUser?.name || 'Profissional de Apoio Escolar';
  const emailProfissional = currentUser?.email || 'apoio@educa.go.gov.br';

  // Métricas do período
  const totalRegistros = registrosFiltrados.length;
  const totalPresente = registrosFiltrados.filter(r => r.presente).length;
  const totalAusente = registrosFiltrados.filter(r => !r.presente).length;
  const totalAtividadesAdaptadas = registrosFiltrados.filter(r => r.recebeuAtividadeAdaptada === 'Sim').length;
  const totalIrritabilidade = registrosFiltrados.filter(r => r.demonstrouIrritabilidadeOuSinais === 'Sim').length;
  const taxaFrequencia = totalRegistros > 0 ? Math.round((totalPresente / totalRegistros) * 100) : 0;

  // Header repetido por página
  const drawPageHeader = (pageNum: number) => {
    // Faixa verde institucional SEDUC no topo
    doc.setFillColor(16, 120, 68); // Verde oficial SEDUC Goiás
    doc.rect(0, 0, pageWidth, 4, 'F');

    // Título institucional
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text('GOVERNO DO ESTADO DE GOIÁS • SECRETARIA DE ESTADO DA EDUCAÇÃO', pageWidth / 2, 10, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`${nomeEscola.toUpperCase()} • EDUCAÇÃO ESPECIAL E APOIO ESCOLAR`, pageWidth / 2, 14, { align: 'center' });

    // Linha divisória
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(marginLeft, 16, pageWidth - marginRight, 16);
  };

  // Rodapé repetido por página
  const drawPageFooter = (pageNum: number) => {
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(marginLeft, pageHeight - 12, pageWidth - marginRight, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `AdaptaEdu Escolar • Relatório Oficial de Acompanhamento do Profissional de Apoio Escolar • Emissão: ${dataFormatada}`,
      marginLeft,
      pageHeight - 8
    );
    doc.text(
      `Página ${pageNum}`,
      pageWidth - marginRight,
      pageHeight - 8,
      { align: 'right' }
    );
  };

  let pageNum = 1;
  drawPageHeader(pageNum);
  let currentY = 21;

  // 1. Bloco de Identificação do Relatório
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(marginLeft, currentY, contentWidth, 24, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(
    estudanteAlvo 
      ? 'RELATÓRIO INDIVIDUAL DE ACOMPANHAMENTO DO PROFISSIONAL DE APOIO'
      : 'RELATÓRIO MENSAL GERAL DE ACOMPANHAMENTO DO APOIO ESCOLAR',
    marginLeft + 4,
    currentY + 6.5
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(`Mês de Referência: ${mesNome.toUpperCase()} / ${ano}   •   Emissão: ${dataFormatada}`, marginLeft + 4, currentY + 12.5);
  doc.text(`Profissional Responsável: ${nomeProfissional} (${emailProfissional})`, marginLeft + 4, currentY + 17.5);

  if (estudanteAlvo) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 120, 68);
    doc.text(
      `Estudante: ${estudanteAlvo.nome.toUpperCase()}   •   Turma: ${estudanteAlvo.turma} (${estudanteAlvo.anoSerie})   •   Matrícula: ${estudanteAlvo.matricula}`,
      marginLeft + 4,
      currentY + 22.5
    );
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(
      `Abrangência: Estudantes com Atendimento Educacional Especializado (AEE) e Apoio na Escola`,
      marginLeft + 4,
      currentY + 22.5
    );
  }

  currentY += 28;

  // 2. Quadro de Indicadores e Estatísticas (Resumo Executivo para a Direção)
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginLeft, currentY, contentWidth, 16, 1.5, 1.5, 'FD');

  const colW = contentWidth / 5;
  const kpiData = [
    { label: 'DIAS REGISTRADOS', val: `${totalRegistros}` },
    { label: 'PRESENÇAS', val: `${totalPresente} (${taxaFrequencia}%)` },
    { label: 'AUSÊNCIAS / FALTAS', val: `${totalAusente}` },
    { label: 'ATIVIDADES ADAPTADAS', val: `${totalAtividadesAdaptadas}` },
    { label: 'SINAIS COMPORTAMENTAIS', val: `${totalIrritabilidade}` }
  ];

  kpiData.forEach((kpi, idx) => {
    const xPos = marginLeft + (idx * colW);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, xPos + (colW / 2), currentY + 5.5, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(kpi.val, xPos + (colW / 2), currentY + 12, { align: 'center' });

    if (idx > 0) {
      doc.setDrawColor(226, 232, 240);
      doc.line(xPos, currentY + 2, xPos, currentY + 14);
    }
  });

  currentY += 20;

  // 3. Cabeçalho da Tabela de Registros Diários
  const colData = 22;
  const colAluno = estudanteAlvo ? 0 : 42;
  const colPresenca = 18;
  const colAtividade = 36;
  const colObs = contentWidth - colData - colAluno - colPresenca - colAtividade;

  const drawTableHeader = (y: number) => {
    doc.setFillColor(30, 41, 59); // Slate-800
    doc.rect(marginLeft, y, contentWidth, 6.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);

    let curX = marginLeft + 2;
    doc.text('DATA / DIA', curX, y + 4.5);
    curX += colData;

    if (!estudanteAlvo) {
      doc.text('ESTUDANTE / TURMA', curX, y + 4.5);
      curX += colAluno;
    }

    doc.text('FREQUÊNCIA', curX, y + 4.5);
    curX += colPresenca;

    doc.text('ATIVIDADE / DISCIPLINAS', curX, y + 4.5);
    curX += colAtividade;

    doc.text('OBSERVAÇÕES & SINAIS COMPORTAMENTAIS', curX, y + 4.5);
  };

  drawTableHeader(currentY);
  currentY += 6.5;

  // 4. Linhas dos Registros Diários
  if (registrosFiltrados.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Nenhum registro diário lançado para o período selecionado.', marginLeft + 4, currentY + 10);
    currentY += 20;
  } else {
    registrosFiltrados.forEach((reg, index) => {
      const est = estudantes.find(e => e.id === reg.studentId);
      const estNome = est ? est.nome : (reg.studentId || 'Estudante');
      const estTurma = est ? est.turma : '';

      // Textos das colunas
      const textoData = `${formatarDataPtBr(reg.data)}\n(${reg.diaSemana || getNomeDiaSemana(reg.data)})`;
      const textoPresenca = reg.presente ? 'PRESENTE' : 'AUSENTE';

      let textoAtividade = '-';
      if (reg.presente) {
        const adapt = reg.recebeuAtividadeAdaptada === 'Sim' ? 'Adaptada: SIM' : 'Adaptada: NÃO';
        const disc = reg.disciplinasEnvolvidas && reg.disciplinasEnvolvidas.length > 0 
          ? reg.disciplinasEnvolvidas.join(', ') 
          : 'Geral';
        textoAtividade = `${adapt}\n${disc}`;
      }

      let textoObs = '';
      if (!reg.presente) {
        textoObs = 'Aluno ausente da unidade escolar nesta data.';
      } else {
        const irrit = reg.demonstrouIrritabilidadeOuSinais === 'Sim'
          ? `[SINAIS]: ${reg.observacaoComportamental || 'Comportamento atípico'}`
          : 'Comportamento calmo e participativo.';
        const compl = reg.observacaoAtividade ? ` | ${reg.observacaoAtividade}` : '';
        const info = reg.informacoesAdicionais ? ` | ${reg.informacoesAdicionais}` : '';
        textoObs = `${irrit}${compl}${info}`;
      }

      // Calcula altura necessária
      const obsLines = doc.splitTextToSize(textoObs, colObs - 4);
      const rowHeight = Math.max(10, (obsLines.length * 3.5) + 4);

      // Quebra de página se exceder o limite
      if (currentY + rowHeight > pageHeight - 35) {
        drawPageFooter(pageNum);
        doc.addPage();
        pageNum++;
        drawPageHeader(pageNum);
        currentY = 22;
        drawTableHeader(currentY);
        currentY += 6.5;
      }

      // Zebra striping
      if (index % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(marginLeft, currentY, contentWidth, rowHeight, 'F');
      }

      // Linha divisória inferior
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.15);
      doc.line(marginLeft, currentY + rowHeight, marginLeft + contentWidth, currentY + rowHeight);

      // Renderiza células
      let curX = marginLeft + 2;

      // Coluna Data
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(15, 23, 42);
      doc.text(textoData, curX, currentY + 4);
      curX += colData;

      // Coluna Estudante (se geral)
      if (!estudanteAlvo) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.8);
        doc.text(doc.splitTextToSize(`${estNome}\nTurma: ${estTurma}`, colAluno - 3), curX, currentY + 4);
        curX += colAluno;
      }

      // Coluna Presença
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      if (reg.presente) {
        doc.setTextColor(16, 120, 68); // Verde
      } else {
        doc.setTextColor(185, 28, 28); // Vermelho
      }
      doc.text(textoPresenca, curX, currentY + 4);
      curX += colPresenca;

      // Coluna Atividade
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(51, 65, 85);
      doc.text(doc.splitTextToSize(textoAtividade, colAtividade - 3), curX, currentY + 4);
      curX += colAtividade;

      // Coluna Observações
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(71, 85, 105);
      doc.text(obsLines, curX, currentY + 4);

      currentY += rowHeight;
    });
  }

  // 5. Termo de Entrega e Assinaturas (Conformidade com a Direção)
  const signatureHeight = 32;
  if (currentY + signatureHeight > pageHeight - 16) {
    drawPageFooter(pageNum);
    doc.addPage();
    pageNum++;
    drawPageHeader(pageNum);
    currentY = 25;
  } else {
    currentY += 8;
  }

  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(marginLeft, currentY, contentWidth, signatureHeight, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text('TERMO DE CIÊNCIA E HOMOLOGAÇÃO ADMINISTRATIVA', marginLeft + 4, currentY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Atestamos que os registros acima refletem o acompanhamento pedagógico diário executado no mês de referência.',
    marginLeft + 4,
    currentY + 9.5
  );

  const sigY = currentY + 23;
  const sigColW = (contentWidth - 16) / 2;

  // Linha Assinatura Profissional
  doc.setDrawColor(148, 163, 184);
  doc.line(marginLeft + 8, sigY, marginLeft + 8 + sigColW, sigY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(30, 41, 59);
  doc.text(nomeProfissional, marginLeft + 8 + (sigColW / 2), sigY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(100, 116, 139);
  doc.text('Profissional de Apoio Escolar / Intérprete', marginLeft + 8 + (sigColW / 2), sigY + 7, { align: 'center' });

  // Linha Assinatura Direção / Coordenação
  const sig2X = marginLeft + 8 + sigColW + 8;
  doc.line(sig2X, sigY, sig2X + sigColW, sigY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(30, 41, 59);
  doc.text('Coordenação Pedagógica / Direção Escolar', sig2X + (sigColW / 2), sigY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(100, 116, 139);
  doc.text(`${nomeEscola} • Visto e Homologado`, sig2X + (sigColW / 2), sigY + 7, { align: 'center' });

  drawPageFooter(pageNum);

  // Download do arquivo
  const nomeAlunoSanitizado = estudanteAlvo 
    ? estudanteAlvo.nome.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 20)
    : 'geral';
  const nomeArquivo = `relatorio_apoio_${nomeAlunoSanitizado}_${mesNome.toLowerCase()}_${ano}.pdf`;
  doc.save(nomeArquivo);
}

/**
 * Utilitário de escape para campos CSV no padrão RFC 4180
 */
function escapeCSVField(value: unknown): string {
  if (value === null || value === undefined) return '""';
  const str = String(value);
  if (/[";,\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Exporta a listagem de registros em formato CSV
 */
export function exportRelatorioApoioCSV(
  registros: RegistroAcompanhamentoApoio[],
  estudantes: Estudante[],
  escolaConfig: Partial<EscolaConfig> | undefined,
  currentUser: AuthorizedUser | null,
  filtros: RelatorioApoioFilterOptions
): void {
  const { registrosFiltrados, estudanteAlvo, mesNome, ano } = filtrarRegistrosParaRelatorio(
    registros,
    estudantes,
    filtros
  );

  const agora = new Date();
  const dataFormatada = agora.toLocaleString('pt-BR');
  const nomeEscola = escolaConfig?.nome || 'Colégio Estadual Olynto Pereira de Castro';
  const nomeProfissional = currentUser?.name || 'Profissional de Apoio Escolar';

  const metaLines = [
    `# RELATÓRIO MENSAL DE ACOMPANHAMENTO DO PROFISSIONAL DE APOIO`,
    `# Unidade Escolar: ${nomeEscola}`,
    `# Mês de Referência: ${mesNome} / ${ano}`,
    `# Profissional Responsável: ${nomeProfissional}`,
    estudanteAlvo ? `# Estudante: ${estudanteAlvo.nome} (${estudanteAlvo.turma})` : `# Abrangência: Todos os Estudantes`,
    `# Data de Emissão: ${dataFormatada}`,
    `# Total de Registros: ${registrosFiltrados.length}`,
    '',
  ];

  const headers = [
    'Data',
    'Dia da Semana',
    'Matrícula',
    'Nome do Estudante',
    'Turma',
    'Frequência',
    'Atividade Adaptada',
    'Disciplinas',
    'Conseguiu Realizar',
    'Demonstrou Irritabilidade',
    'Observação Comportamental',
    'Observação Atividade',
    'Informações Adicionais',
    'Horário de Registro',
    'Profissional de Apoio'
  ];

  const rows = registrosFiltrados.map(r => {
    const est = estudantes.find(e => e.id === r.studentId);
    return [
      escapeCSVField(formatarDataPtBr(r.data)),
      escapeCSVField(r.diaSemana || getNomeDiaSemana(r.data)),
      escapeCSVField(est?.matricula || ''),
      escapeCSVField(est?.nome || r.studentId),
      escapeCSVField(est?.turma || ''),
      escapeCSVField(r.presente ? 'Presente' : 'Ausente'),
      escapeCSVField(r.recebeuAtividadeAdaptada),
      escapeCSVField(r.disciplinasEnvolvidas ? r.disciplinasEnvolvidas.join(', ') : ''),
      escapeCSVField(r.conseguiuRealizarAtividade || ''),
      escapeCSVField(r.demonstrouIrritabilidadeOuSinais),
      escapeCSVField(r.observacaoComportamental || ''),
      escapeCSVField(r.observacaoAtividade || ''),
      escapeCSVField(r.informacoesAdicionais || ''),
      escapeCSVField(r.horario),
      escapeCSVField(r.profissionalResponsavelNome || r.usuarioRegistroNome || '')
    ].join(';');
  });

  const csvContent = '\uFEFF' + metaLines.join('\r\n') + headers.map(h => `"${h}"`).join(';') + '\r\n' + rows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const nomeAlunoSanitizado = estudanteAlvo 
    ? estudanteAlvo.nome.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 20)
    : 'geral';
  link.setAttribute('download', `relatorio_apoio_${nomeAlunoSanitizado}_${mesNome.toLowerCase()}_${ano}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
