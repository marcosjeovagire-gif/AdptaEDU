import { jsPDF } from 'jspdf';
import { RegistroAuditoria, EscolaConfig } from '../types';

/**
 * Utilitário de escape para campos CSV no padrão RFC 4180
 */
function escapeCSVField(value: unknown): string {
  if (value === null || value === undefined) return '""';
  const str = String(value);
  // Se contiver aspas, ponto-e-vírgula, vírgula ou quebra de linha, envolve em aspas e duplica aspas internas
  if (/[";,\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Exporta os registros de auditoria em formato CSV compatível com Excel, Google Planilhas e LibreOffice
 */
export function exportAuditoriaToCSV(
  auditoria: RegistroAuditoria[],
  escolaConfig?: Partial<EscolaConfig>,
  responsavelEmissao?: string
): void {
  const agora = new Date();
  const dataFormatada = agora.toLocaleString('pt-BR');
  const timestampArquivo = agora.toISOString().replace(/[:.]/g, '-').slice(0, 19);

  const nomeEscola = escolaConfig?.nome || 'Colégio Estadual Olynto Pereira de Castro';

  // Cabeçalho de Metadados do Arquivo
  const metaLines = [
    `# RELATÓRIO OFICIAL DE AUDITORIA E RASTREABILIDADE - ADAPTAEDU ESCOLAR`,
    `# Unidade Escolar: ${nomeEscola}`,
    `# Data de Emissão: ${dataFormatada}`,
    `# Emitido por: ${responsavelEmissao || 'Coordenação Pedagógica'}`,
    `# Total de Registros: ${auditoria.length}`,
    `# Finalidade: Controle e Conformidade Administrativa - LGPD / SEDUC-GO`,
    '',
  ];

  // Colunas do CSV (delimitador ponto-e-vírgula para padrão PT-BR)
  const headers = [
    'ID do Registro',
    'Data e Hora',
    'Usuário Responsável',
    'Usuário/Registro Alterado',
    'Resultado',
    'Perfis Anteriores',
    'Perfis Posteriores',
    'Situação Anterior',
    'Situação Posterior',
    'Detalhes da Operação'
  ];

  const rows = auditoria.map(reg => [
    escapeCSVField(reg.id),
    escapeCSVField(reg.dataHora),
    escapeCSVField(reg.usuarioResponsavel),
    escapeCSVField(reg.usuarioAlterado || 'N/A'),
    escapeCSVField(reg.resultado),
    escapeCSVField(reg.perfisAnteriores ? reg.perfisAnteriores.join(', ') : ''),
    escapeCSVField(reg.perfisPosteriores ? reg.perfisPosteriores.join(', ') : ''),
    escapeCSVField(reg.situacaoAnterior || ''),
    escapeCSVField(reg.situacaoPosterior || ''),
    escapeCSVField(reg.detalhes || '')
  ].join(';'));

  const csvContent = '\uFEFF' + metaLines.join('\r\n') + headers.map(h => `"${h}"`).join(';') + '\r\n' + rows.join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `auditoria_adaptaedu_${timestampArquivo}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exporta os registros de auditoria em documento formal PDF formatado no padrão A4
 */
export function exportAuditoriaToPDF(
  auditoria: RegistroAuditoria[],
  escolaConfig?: Partial<EscolaConfig>,
  responsavelEmissao?: string
): void {
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
  const timestampArquivo = agora.toISOString().replace(/[:.]/g, '-').slice(0, 19);

  let currentY = 16;

  // Função auxiliar para desenhar o cabeçalho oficial em cada página
  const drawPageHeader = (pageNum: number) => {
    // Faixa verde institucional SEDUC no topo
    doc.setFillColor(16, 120, 68); // Verde oficial
    doc.rect(0, 0, pageWidth, 4, 'F');

    // Título institucional
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text('GOVERNO DO ESTADO DE GOIÁS • SECRETARIA DE ESTADO DA EDUCAÇÃO', pageWidth / 2, 10, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`${nomeEscola.toUpperCase()} • SISTEMA ADAPTAEDU ESCOLAR`, pageWidth / 2, 14, { align: 'center' });

    // Linha divisória
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(marginLeft, 16, pageWidth - marginRight, 16);
  };

  // Função auxiliar para desenhar o rodapé oficial
  const drawPageFooter = (pageNum: number, totalPagesEstimate: number) => {
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(marginLeft, pageHeight - 12, pageWidth - marginRight, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `AdaptaEdu Escolar • Documento emitido para fins de registro formal e auditoria administrativa (LGPD) • Emissão: ${dataFormatada}`,
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

  // Início da Página 1
  drawPageHeader(1);
  currentY = 22;

  // Bloco de Identificação do Relatório
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(marginLeft, currentY, contentWidth, 24, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('RELATÓRIO OFICIAL DE AUDITORIA E RASTREABILIDADE', marginLeft + 4, currentY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Data de Emissão: ${dataFormatada} | Responsável: ${responsavelEmissao || 'Coordenação Pedagógica'}`, marginLeft + 4, currentY + 13);
  doc.text(`Total de registros auditados: ${auditoria.length} evento(s) catalogado(s)`, marginLeft + 4, currentY + 18);

  currentY += 28;

  // Cabeçalho da Lista de Registros
  doc.setFillColor(241, 245, 249);
  doc.rect(marginLeft, currentY, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text('DATA / HORA', marginLeft + 2, currentY + 5);
  doc.text('RESPONSÁVEL', marginLeft + 35, currentY + 5);
  doc.text('ALVO / REGISTRO', marginLeft + 75, currentY + 5);
  doc.text('RESULTADO', marginLeft + 118, currentY + 5);
  doc.text('DETALHES DA OPERAÇÃO', marginLeft + 142, currentY + 5);

  currentY += 7;

  if (auditoria.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Nenhum registro de auditoria arquivado no sistema.', marginLeft + 4, currentY + 10);
    currentY += 20;
  } else {
    let pageCount = 1;

    auditoria.forEach((reg, index) => {
      // Cálculo de linhas necessárias para os detalhes
      const detalhesLines = doc.splitTextToSize(reg.detalhes || 'Operação registrada no sistema.', contentWidth - 144);
      const rowHeight = Math.max(10, 5 + detalhesLines.length * 3.5);

      // Quebra de página se exceder o limite
      if (currentY + rowHeight > pageHeight - 25) {
        drawPageFooter(pageCount, 0);
        doc.addPage();
        pageCount++;
        drawPageHeader(pageCount);
        currentY = 22;

        // Repete o cabeçalho da tabela
        doc.setFillColor(241, 245, 249);
        doc.rect(marginLeft, currentY, contentWidth, 7, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(51, 65, 85);
        doc.text('DATA / HORA', marginLeft + 2, currentY + 5);
        doc.text('RESPONSÁVEL', marginLeft + 35, currentY + 5);
        doc.text('ALVO / REGISTRO', marginLeft + 75, currentY + 5);
        doc.text('RESULTADO', marginLeft + 118, currentY + 5);
        doc.text('DETALHES DA OPERAÇÃO', marginLeft + 142, currentY + 5);
        currentY += 7;
      }

      // Fundo alternado
      if (index % 2 === 0) {
        doc.setFillColor(255, 255, 255);
      } else {
        doc.setFillColor(248, 250, 252);
      }
      doc.rect(marginLeft, currentY, contentWidth, rowHeight, 'F');

      // Borda inferior discreta
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.15);
      doc.line(marginLeft, currentY + rowHeight, marginLeft + contentWidth, currentY + rowHeight);

      // Dados da linha
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      doc.text(reg.dataHora || '—', marginLeft + 2, currentY + 4.5);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      const responsavelTruncado = doc.splitTextToSize(reg.usuarioResponsavel || 'Sistema', 38);
      doc.text(responsavelTruncado[0] || 'Sistema', marginLeft + 35, currentY + 4.5);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      const alvoTruncado = doc.splitTextToSize(reg.usuarioAlterado || 'Geral', 40);
      doc.text(alvoTruncado[0] || 'Geral', marginLeft + 75, currentY + 4.5);

      // Badge de Resultado
      if (reg.resultado === 'Sucesso') {
        doc.setFillColor(220, 252, 231); // verde claro
        doc.roundedRect(marginLeft + 118, currentY + 1.5, 18, 4.5, 1, 1, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(22, 101, 52); // verde escuro
        doc.text('SUCESSO', marginLeft + 121, currentY + 4.7);
      } else {
        doc.setFillColor(254, 226, 226); // vermelho claro
        doc.roundedRect(marginLeft + 118, currentY + 1.5, 20, 4.5, 1, 1, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(153, 27, 27); // vermelho escuro
        doc.text('BLOQUEADO', marginLeft + 120, currentY + 4.7);
      }

      // Detalhes
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(51, 65, 85);
      doc.text(detalhesLines, marginLeft + 142, currentY + 4.5);

      currentY += rowHeight;
    });

    // Se houver espaço para assinatura final, desenha na página atual, senão cria uma nova
    if (currentY + 28 > pageHeight - 25) {
      drawPageFooter(pageCount, 0);
      doc.addPage();
      pageCount++;
      drawPageHeader(pageCount);
      currentY = 30;
    } else {
      currentY += 10;
    }

    // Bloco formal de assinatura / certificação
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.3);
    const signLineY = currentY + 12;
    doc.line(marginLeft + 30, signLineY, pageWidth - marginRight - 30, signLineY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text('COORDENAÇÃO PEDAGÓGICA / EQUIPE DIRETIVA', pageWidth / 2, signLineY + 4, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`${nomeEscola} • Registro Administrativo Formal`, pageWidth / 2, signLineY + 8, { align: 'center' });

    // Atualiza todos os rodapés com o número total correto de páginas
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      drawPageFooter(i, totalPages);
    }
  }

  // Baixa o arquivo PDF gerado
  doc.save(`auditoria_adaptaedu_${timestampArquivo}.pdf`);
}
