/**
 * AdaptaEdu Escolar - Sistema de Atividades Pedagógicas Adaptadas (SEDUC-GO)
 * Módulo: relatorioIntervencoesApoioPdfService.ts
 * 
 * Gera documento PDF em folha A4 com margens de 10mm contendo o histórico consolidado
 * de intervenções pedagógicas e atendimentos do Profissional de Apoio Escolar (PAE)
 * no ciclo letivo vigente, incluindo dados completos do estudante, tabela consolidada
 * e integração automática com o Google Drive institucional.
 */

import { jsPDF } from 'jspdf';
import { RegistroAcompanhamentoApoio, Estudante, EscolaConfig, AuthorizedUser } from '../types';
import { formatarDataPtBr, getNomeDiaSemana } from '../server/apoioService';
import { getLogoEscolaBase64 } from '../assets/branding/logoEscolaBase64';
import { uploadPdfBlob, isGoogleDriveConnected } from './googleDriveService';

export interface ParametrosExportacaoIntervencoesPdf {
  aluno: Estudante;
  registros: RegistroAcompanhamentoApoio[];
  escolaConfig?: Partial<EscolaConfig>;
  currentUser?: AuthorizedUser | null;
  profissionalSelecionado?: {
    id?: string;
    name?: string;
    email?: string;
  } | null;
  periodoRotulo?: string; // Ex: 'Ciclo Vigente 2026' ou '4º Bimestre'
}

export interface ResultadoExportacaoIntervencoesPdf {
  sucesso: boolean;
  nomeArquivo: string;
  totalRegistros: number;
  driveEnviado?: boolean;
  driveLink?: string;
  erro?: string;
}

/**
 * Sanitiza strings para formação de nomes de arquivo seguros
 */
function sanitizar(str?: string): string {
  if (!str) return 'Geral';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .trim();
}

/**
 * Gera e baixa o PDF oficial com margens de 10mm com o histórico de intervenções pedagógicas do estudante
 * realizadas pelo profissional de apoio selecionado no ciclo vigente, seguindo as diretrizes da A4SheetPreview.
 */
export async function exportarHistoricoIntervencoesApoioPDF(
  params: ParametrosExportacaoIntervencoesPdf
): Promise<ResultadoExportacaoIntervencoesPdf> {
  const { 
    aluno, 
    registros, 
    escolaConfig, 
    currentUser, 
    profissionalSelecionado,
    periodoRotulo = 'Ciclo Letivo Vigente (2026)' 
  } = params;

  // Identificação do profissional responsável
  const profAlvoId = profissionalSelecionado?.id || currentUser?.id;
  const profAlvoNome = profissionalSelecionado?.name || currentUser?.name || aluno.paeResponsavelNome || 'Profissional de Apoio Escolar (PAE)';
  const profAlvoEmail = profissionalSelecionado?.email || currentUser?.email || aluno.paeResponsavelEmail || 'apoio@educa.go.gov.br';

  // Filtra registros do aluno no ciclo vigente
  let registrosAluno = registros.filter(
    r => r.studentId === aluno.id || r.nomeEstudante?.toLowerCase() === aluno.nome?.toLowerCase()
  );

  // Se houver profissional alvo especificado, filtra as intervenções realizadas por ele
  if (profAlvoId || profAlvoEmail || profAlvoNome) {
    const registrosFiltradosProf = registrosAluno.filter(r => {
      const matchId = profAlvoId && (r.profissionalResponsavelId === profAlvoId || (r as any).usuarioRegistroId === profAlvoId);
      const matchEmail = profAlvoEmail && (
        r.profissionalResponsavelEmail?.toLowerCase() === profAlvoEmail.toLowerCase() ||
        r.usuarioRegistroEmail?.toLowerCase() === profAlvoEmail.toLowerCase()
      );
      const matchNome = profAlvoNome && (
        r.profissionalResponsavelNome?.toLowerCase() === profAlvoNome.toLowerCase() ||
        r.usuarioRegistroNome?.toLowerCase() === profAlvoNome.toLowerCase()
      );
      return matchId || matchEmail || matchNome;
    });

    if (registrosFiltradosProf.length > 0) {
      registrosAluno = registrosFiltradosProf;
    }
  }

  // Ordena em sequência cronológica crescente
  registrosAluno.sort((a, b) => a.data.localeCompare(b.data));

  // Configuração A4 com margens estritas de 10mm (Normas A4SheetPreview)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 10; // 10mm margem lateral
  const marginTop = 10; // 10mm margem superior
  const marginBottom = 10; // 10mm margem inferior
  const contentWidth = pageWidth - marginX * 2; // 190mm de largura útil

  const nomeEscola = (escolaConfig?.nome || 'COLÉGIO ESTADUAL OLYNTO PEREIRA DE CASTRO').toUpperCase();
  const municipio = escolaConfig?.municipio || 'Rio Verde - GO';
  const agora = new Date();
  const dataEmissao = agora.toLocaleString('pt-BR');
  const nomeProfissional = profAlvoNome;
  const emailProfissional = profAlvoEmail;

  // Métricas do ciclo
  const totalRegistros = registrosAluno.length;
  const totalPresencas = registrosAluno.filter(r => r.presente).length;
  const totalFaltas = registrosAluno.filter(r => !r.presente).length;
  const totalAtividadesAdaptadas = registrosAluno.filter(r => r.recebeuAtividadeAdaptada === 'Sim').length;
  const totalSinaisComportamentais = registrosAluno.filter(r => r.demonstrouIrritabilidadeOuSinais === 'Sim').length;
  const taxaPresenca = totalRegistros > 0 ? Math.round((totalPresencas / totalRegistros) * 100) : 0;

  // Autonomia predominante
  const autonomiasCount: Record<string, number> = {};
  registrosAluno.forEach(r => {
    if (r.nivelAutonomia) {
      autonomiasCount[r.nivelAutonomia] = (autonomiasCount[r.nivelAutonomia] || 0) + 1;
    }
  });
  const autonomiaPredominante = Object.entries(autonomiasCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Mediação Verbal e Visual';

  // Cabeçalho de página repetível
  const drawPageHeader = (pagNum: number) => {
    // Faixa verde institucional SEDUC no topo
    doc.setFillColor(16, 120, 68);
    doc.rect(0, 0, pageWidth, 3.5, 'F');

    if (pagNum > 1) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(30, 41, 59);
      doc.text(
        `${nomeEscola} • HISTÓRICO DE INTERVENÇÕES DO APOIO • ${aluno.nome.toUpperCase()} (${aluno.turma})`,
        marginX,
        7.5
      );
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`Página ${pagNum}`, pageWidth - marginX, 7.5, { align: 'right' });
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.2);
      doc.line(marginX, 9, pageWidth - marginX, 9);
    }
  };

  // Rodapé repetível com controle de total de páginas
  const drawPageFooter = (pagNum: number, totalPags?: number) => {
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(marginX, pageHeight - marginBottom - 4, pageWidth - marginX, pageHeight - marginBottom - 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `AdaptaEdu Escolar • Relatório Consolidado de Intervenções Pedagógicas do Apoio • SEDUC-GO • Emissão: ${dataEmissao}`,
      marginX,
      pageHeight - marginBottom
    );
    const pagRotulo = totalPags ? `Página ${pagNum} de ${totalPags}` : `Página ${pagNum}`;
    doc.text(
      pagRotulo,
      pageWidth - marginX,
      pageHeight - marginBottom,
      { align: 'right' }
    );
  };

  let currentPage = 1;
  drawPageHeader(currentPage);

  let currentY = marginTop + 4;
  let isInTable = false;

  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - marginBottom - 12) {
      doc.addPage();
      currentPage++;
      drawPageHeader(currentPage);
      currentY = marginTop + 4;
      if (isInTable) {
        drawTableHeader(currentY);
        currentY += 6.5;
      }
    }
  };

  // 1. CABEÇALHO INSTITUCIONAL OFICIAL (Página 1)
  const headerHeight = 24;
  doc.setDrawColor(51, 65, 85);
  doc.setLineWidth(0.35);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(marginX, currentY, contentWidth, headerHeight, 1.5, 1.5, 'FD');

  // Logo da Escola no canto esquerdo
  const logoBase64 = getLogoEscolaBase64();
  const logoWidth = 32;
  const logoHeight = 10;
  let textStartX = marginX + 3;

  if (logoBase64 && logoBase64.startsWith('data:image')) {
    try {
      doc.addImage(logoBase64, 'PNG', marginX + 2.5, currentY + 2, logoWidth, logoHeight, undefined, 'FAST');
      textStartX = marginX + logoWidth + 4;
    } catch {
      textStartX = marginX + 3;
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(nomeEscola, textStartX, currentY + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('GOVERNO DO ESTADO DE GOIÁS • SECRETARIA DE ESTADO DA EDUCAÇÃO (SEDUC/GO)', textStartX, currentY + 8);
  doc.text(`${municipio} • Coordenação de Educação Especial e Inclusão Escolar`, textStartX, currentY + 11.2);

  // Linha divisória sutil
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.25);
  doc.line(marginX, currentY + 13.5, pageWidth - marginX, currentY + 13.5);

  // Título do documento
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(16, 120, 68);
  doc.text('HISTÓRICO CONSOLIDADO DE INTERVENÇÕES PEDAGÓGICAS E REGISTROS DO APOIO', marginX + 3, currentY + 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Período: ${periodoRotulo}   •   Emissão: ${dataEmissao}`, marginX + 3, currentY + 21.8);

  currentY += headerHeight + 3;

  // 2. FICHA DE DADOS COMPLETOS DO ALUNO E LAUDO
  const alunoBoxH = 24;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(marginX, currentY, contentWidth, alunoBoxH, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);

  // Linha 1: Nome, Turma, Matrícula
  doc.text(`Estudante: ${aluno.nome.toUpperCase()}`, marginX + 3, currentY + 4.5);
  doc.text(`Turma: ${aluno.turma} (${aluno.anoSerie || 'Série Regular'})`, marginX + 110, currentY + 4.5);
  doc.text(`Matrícula: ${aluno.matricula || '---'}`, marginX + 155, currentY + 4.5);

  // Linha 2: Diagnóstico e Laudo Clínico
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);
  const laudoTexto = aluno.laudo || aluno.observacoesAcessibilidade || 'AEE / Necessidades Educacionais Especiais';
  const laudoLinhas = doc.splitTextToSize(`Diagnóstico / Laudo Clínico: ${laudoTexto}`, contentWidth - 6);
  doc.text(laudoLinhas[0], marginX + 3, currentY + 9);

  // Linha 3: Profissional de Apoio e E-mail
  doc.text(`Profissional de Apoio (PAE): ${nomeProfissional} (${emailProfissional})`, marginX + 3, currentY + 13.5);
  doc.text(`Turno: ${aluno.turno || 'Matutino'}`, marginX + 155, currentY + 13.5);

  // Linha 4: Status do PEI
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 120, 68);
  doc.text(`✓ Plano de Ensino Individualizado (PEI): Ativo e em acompanhamento contínuo`, marginX + 3, currentY + 18);
  if (aluno.statusLaudo) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Status Laudo: ${aluno.statusLaudo.toUpperCase()}`, marginX + 155, currentY + 18);
  }

  currentY += alunoBoxH + 3;

  // 3. QUADRO DE INDICADORES RESUMO (KPIs do Ciclo)
  const kpiBoxH = 14;
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginX, currentY, contentWidth, kpiBoxH, 1.5, 1.5, 'FD');

  const colKpiW = contentWidth / 5;
  const kpiItems = [
    { label: 'DIAS ATENDIDOS', val: `${totalRegistros}` },
    { label: 'PRESENÇAS', val: `${totalPresencas} (${taxaPresenca}%)` },
    { label: 'FALTAS', val: `${totalFaltas}` },
    { label: 'ATIVIDADES ADAPTADAS', val: `${totalAtividadesAdaptadas}` },
    { label: 'AUTONOMIA PREDOMINANTE', val: autonomiaPredominante.slice(0, 18) },
  ];

  kpiItems.forEach((kpi, idx) => {
    const xPos = marginX + idx * colKpiW;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, xPos + colKpiW / 2, currentY + 4.5, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(kpi.val, xPos + colKpiW / 2, currentY + 10.5, { align: 'center' });

    if (idx > 0) {
      doc.setDrawColor(226, 232, 240);
      doc.line(xPos, currentY + 2, xPos, currentY + kpiBoxH - 2);
    }
  });

  currentY += kpiBoxH + 4;

  // 4. TABELA CONSOLIDADA DE INTERVENÇÕES PEDAGÓGICAS (Margens 10mm)
  // Larguras das colunas somam exatamente 190mm (contentWidth)
  const colDataW = 20;        // 20mm: Data e Dia
  const colFreqW = 16;        // 16mm: Frequência
  const colAtividadeW = 34;   // 34mm: Atividade Adaptada & Disciplina
  const colAutonomiaW = 36;   // 36mm: Autonomia & Barreiras
  const colIntervencaoW = 84; // 84mm: Intervenção Pedagógica & Mediação do Apoio
  // Total = 20 + 16 + 34 + 36 + 84 = 190mm

  const drawTableHeader = (y: number) => {
    doc.setFillColor(30, 41, 59);
    doc.rect(marginX, y, contentWidth, 6, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(255, 255, 255);

    let curX = marginX + 2;
    doc.text('DATA / DIA', curX, y + 4.2);
    curX += colDataW;

    doc.text('FREQ.', curX, y + 4.2);
    curX += colFreqW;

    doc.text('ATIVIDADE & DISCIPLINA', curX, y + 4.2);
    curX += colAtividadeW;

    doc.text('AUTONOMIA & BARREIRAS', curX, y + 4.2);
    curX += colAutonomiaW;

    doc.text('INTERVENÇÃO PEDAGÓGICA & MEDIAÇÃO DO APOIO', curX, y + 4.2);
  };

  drawTableHeader(currentY);
  currentY += 6;
  isInTable = true;

  if (registrosAluno.length === 0) {
    checkPageBreak(12);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Nenhum registro de acompanhamento lançado para este estudante no ciclo vigente.', marginX + contentWidth / 2, currentY + 6, { align: 'center' });
    currentY += 12;
  } else {
    registrosAluno.forEach((reg, rIdx) => {
      // Prepara textos de cada coluna
      const dataStr = `${formatarDataPtBr(reg.data)}\n${(reg.diaSemana || getNomeDiaSemana(reg.data)).slice(0, 3)}.`;
      const freqStr = reg.presente ? 'PRESENTE' : 'AUSENTE';

      let ativStr = reg.recebeuAtividadeAdaptada === 'Sim' ? '✓ Adaptada' : 'Não aplicada';
      if (reg.disciplinasEnvolvidas && reg.disciplinasEnvolvidas.length > 0) {
        ativStr += `\n(${reg.disciplinasEnvolvidas.slice(0, 2).join(', ')})`;
      }
      if (reg.conseguiuRealizarAtividade) {
        ativStr += `\nRealiz: ${reg.conseguiuRealizarAtividade}`;
      }

      let autoStr = reg.nivelAutonomia || (reg.presente ? 'Com Mediação' : '---');
      if (reg.barreirasEnfrentadas) {
        autoStr += `\nBarreira: ${reg.barreirasEnfrentadas}`;
      }

      let intervencaoStr = reg.observacaoAtividade || reg.observacaoComportamental || reg.informacoesAdicionais || 'Acompanhamento de rotina realizado em sala de aula.';
      if (reg.recursosUtilizados && reg.recursosUtilizados.length > 0) {
        intervencaoStr += ` [Recursos: ${reg.recursosUtilizados.join(', ')}]`;
      }
      if (reg.demonstrouIrritabilidadeOuSinais === 'Sim') {
        intervencaoStr += ` [Sinais Comportamentais: ${reg.observacaoComportamental || 'Observados'}]`;
      }

      // Calcula altura necessária para a linha sem cortes
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      const intervencaoLines = doc.splitTextToSize(intervencaoStr, colIntervencaoW - 4);
      const autoLines = doc.splitTextToSize(autoStr, colAutonomiaW - 4);
      const ativLines = doc.splitTextToSize(ativStr, colAtividadeW - 4);

      const maxLines = Math.max(intervencaoLines.length, autoLines.length, ativLines.length, 2);
      const rowHeight = Math.max(9, maxLines * 3.4 + 3);

      checkPageBreak(rowHeight + 2);

      // Fundo zebrado
      if (rIdx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(marginX, currentY, contentWidth, rowHeight, 'F');
      }

      // Borda da linha
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.line(marginX, currentY + rowHeight, marginX + contentWidth, currentY + rowHeight);

      // Coluna 1: Data / Dia
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(30, 41, 59);
      doc.text(formatarDataPtBr(reg.data), marginX + 2, currentY + 3.8);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(100, 116, 139);
      doc.text(reg.diaSemana || getNomeDiaSemana(reg.data), marginX + 2, currentY + 7.2);

      // Coluna 2: Frequência
      let curX = marginX + colDataW;
      if (reg.presente) {
        doc.setFillColor(220, 252, 231);
        doc.roundedRect(curX + 1, currentY + 1.8, 14, 4.5, 1, 1, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.8);
        doc.setTextColor(22, 101, 52);
        doc.text('PRESENTE', curX + 8, currentY + 4.9, { align: 'center' });
      } else {
        doc.setFillColor(254, 226, 226);
        doc.roundedRect(curX + 1, currentY + 1.8, 14, 4.5, 1, 1, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.8);
        doc.setTextColor(153, 27, 27);
        doc.text('AUSENTE', curX + 8, currentY + 4.9, { align: 'center' });
      }

      // Coluna 3: Atividade Adaptada & Disciplina
      curX += colFreqW;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.2);
      doc.setTextColor(30, 41, 59);
      doc.text(ativLines, curX + 2, currentY + 3.8);

      // Coluna 4: Autonomia & Barreiras
      curX += colAtividadeW;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.2);
      doc.setTextColor(71, 85, 105);
      doc.text(autoLines, curX + 2, currentY + 3.8);

      // Coluna 5: Intervenção Pedagógica & Mediação do Apoio
      curX += colAutonomiaW;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.2);
      doc.setTextColor(15, 23, 42);
      doc.text(intervencaoLines, curX + 2, currentY + 3.8);

      currentY += rowHeight;
    });
  }

  isInTable = false;

  // 5. BLOCO DE ASSINATURAS INSTITUCIONAIS
  checkPageBreak(30);
  currentY += 8;

  const colSignW = (contentWidth - 10) / 3;

  // Assinatura 1: PAE
  let signX = marginX;
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.25);
  doc.line(signX + 4, currentY, signX + colSignW - 4, currentY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(30, 41, 59);
  doc.text(nomeProfissional, signX + colSignW / 2, currentY + 3.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text('Profissional de Apoio Escolar (PAE)', signX + colSignW / 2, currentY + 6.5, { align: 'center' });

  // Assinatura 2: Professor Regente
  signX += colSignW + 5;
  doc.line(signX + 4, currentY, signX + colSignW - 4, currentY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(30, 41, 59);
  doc.text('Professor(a) Regente', signX + colSignW / 2, currentY + 3.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text('Docência e Validação Curricular', signX + colSignW / 2, currentY + 6.5, { align: 'center' });

  // Assinatura 3: Coordenação Pedagógica
  signX += colSignW + 5;
  doc.line(signX + 4, currentY, signX + colSignW - 4, currentY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(30, 41, 59);
  doc.text('Coordenação Pedagógica / AEE', signX + colSignW / 2, currentY + 3.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text('Direção Escolar SEDUC-GO', signX + colSignW / 2, currentY + 6.5, { align: 'center' });

  // Finaliza cabeçalhos e rodapés de todas as páginas com numeração total
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawPageFooter(i, totalPages);
  }

  // Nome oficial sanitizado do arquivo
  const nomeAlunoSanit = sanitizar(aluno.nome);
  const turmaSanit = sanitizar(aluno.turma);
  const nomeArquivo = `RELATORIO_INTERVENCOES_APOIO_${turmaSanit}_${nomeAlunoSanit}_2026.pdf`;

  // Salva no navegador local
  doc.save(nomeArquivo);

  // Se Google Drive estiver conectado, envia cópia automática para a pasta da série
  let driveEnviado = false;
  let driveLink: string | undefined;

  if (isGoogleDriveConnected()) {
    try {
      const pdfBlob = doc.output('blob');
      const uploadRes = await uploadPdfBlob(pdfBlob, {
        fileName: nomeArquivo,
        serie: aluno.turma || aluno.anoSerie || 'Geral',
        studentName: aluno.nome,
        studentMatricula: aluno.matricula,
        tipoDocumento: 'relatorio_apoio',
      });
      if (uploadRes.success) {
        driveEnviado = true;
        driveLink = uploadRes.webViewLink;
      }
    } catch (driveErr) {
      console.warn('[PDF Intervenções] Aviso ao enviar cópia para o Google Drive:', driveErr);
    }
  }

  return {
    sucesso: true,
    nomeArquivo,
    totalRegistros,
    driveEnviado,
    driveLink,
  };
}
