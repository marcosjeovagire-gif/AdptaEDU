import { jsPDF } from 'jspdf';
import { 
  Estudante, 
  PerfilPedagogico, 
  AtividadeAdaptada, 
  RegistroAcompanhamentoApoio, 
  PeiDocumento,
  EscolaConfig 
} from '../types';
import { getLogoEscolaBase64 } from '../assets/branding/logoEscolaBase64';

export interface DadosRelatorioConsolidado {
  estudante: Estudante;
  perfil?: PerfilPedagogico;
  pei?: PeiDocumento;
  peis?: PeiDocumento[];
  atividades: AtividadeAdaptada[];
  registrosApoio: RegistroAcompanhamentoApoio[];
  escolaConfig?: Partial<EscolaConfig>;
  emitidoPor?: string;
  dataEmissao?: string;
  anoLetivo?: number | string;
  parecerDescritivoPersonalizado?: string;
}

/**
 * Sanitiza texto para nomes de arquivo seguros
 */
function sanitizarParaNomeArquivo(texto?: string): string {
  if (!texto) return 'Estudante';
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Constrói e formata o documento jsPDF para o Relatório Consolidado do Estudante
 * em conformidade rigorosa com as diretrizes da SEDUC-GO para Educação Especial e AEE.
 */
export function gerarRelatorioConsolidadoPdfDoc(dados: DadosRelatorioConsolidado): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2;
  let currentY = 14;

  const dataEmissao = dados.dataEmissao || new Date().toLocaleDateString('pt-BR');
  const anoLetivo = dados.anoLetivo || new Date().getFullYear();
  const escolaNome = dados.escolaConfig?.nome || 'COLÉGIO ESTADUAL OLYNTO PEREIRA DE CASTRO';
  const emitidoPor = dados.emitidoPor || 'Coordenação Pedagógica / Equipe de AEE';

  // Helper de Quebra de Página
  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - 16) {
      doc.addPage();
      currentY = 14;

      // Mini-Cabeçalho nas páginas seguintes
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `SEDUC-GO • ${escolaNome} • Relatório Consolidado de AEE • Aluno(a): ${dados.estudante.nome}`,
        marginX,
        currentY
      );
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.2);
      doc.line(marginX, currentY + 2, pageWidth - marginX, currentY + 2);
      currentY += 8;
    }
  };

  // =========================================================================
  // 1. CABEÇALHO OFICIAL INSTITUCIONAL SEDUC-GO
  // =========================================================================
  const logoBase64 = getLogoEscolaBase64();
  const logoW = 28;
  const logoH = 9.5;
  let headerTextX = marginX + 2;

  // Caixa elegante do cabeçalho
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.4);
  doc.setFillColor(248, 250, 252);
  doc.rect(marginX, currentY, contentWidth, 26, 'FD');

  if (logoBase64 && logoBase64.startsWith('data:image')) {
    try {
      doc.addImage(logoBase64, 'PNG', marginX + 3, currentY + 2.5, logoW, logoH);
      headerTextX = marginX + logoW + 5;
    } catch {
      headerTextX = marginX + 3;
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('GOVERNO DO ESTADO DE GOIÁS — SECRETARIA DE ESTADO DA EDUCAÇÃO (SEDUC-GO)', headerTextX, currentY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`${escolaNome} • Coordenação de Educação Especial e Inclusiva`, headerTextX, currentY + 10.5);
  doc.text(`CRE: Rio Verde • Ano Letivo: ${anoLetivo} • Emissão: ${dataEmissao}`, headerTextX, currentY + 15);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 118, 110);
  doc.text('DOCUMENTO OFICIAL DE HISTÓRICO PEDAGÓGICO E ACOMPANHAMENTO INDIVIDUALIZADO', headerTextX, currentY + 20);

  currentY += 29;

  // =========================================================================
  // TÍTULO DO RELATÓRIO
  // =========================================================================
  doc.setFillColor(15, 23, 42);
  doc.rect(marginX, currentY, contentWidth, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text(
    'RELATÓRIO CONSOLIDADO: HISTÓRICO PEDAGÓGICO E REGISTROS DE ACOMPANHAMENTO',
    pageWidth / 2,
    currentY + 5.2,
    { align: 'center' }
  );

  currentY += 11;

  // =========================================================================
  // 2. IDENTIFICAÇÃO DO ESTUDANTE
  // =========================================================================
  const cardIdHeight = 32;
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(255, 255, 255);
  doc.rect(marginX, currentY, contentWidth, cardIdHeight, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('DADOS DE IDENTIFICAÇÃO DO ESTUDANTE', marginX + 3, currentY + 4.5);

  doc.setDrawColor(226, 232, 240);
  doc.line(marginX + 3, currentY + 6, marginX + contentWidth - 3, currentY + 6);

  doc.setFontSize(7.5);
  // Linha 1
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Nome Completo:', marginX + 3, currentY + 11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(dados.estudante.nome, marginX + 27, currentY + 11);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Matrícula:', marginX + 115, currentY + 11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(dados.estudante.matricula || 'Em cadastramento', marginX + 130, currentY + 11);

  // Linha 2
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Turma / Série:', marginX + 3, currentY + 16.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(`${dados.estudante.turma} (${dados.estudante.anoSerie || 'Regular'})`, marginX + 25, currentY + 16.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Turno:', marginX + 80, currentY + 16.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(dados.estudante.turno || 'Matutino', marginX + 91, currentY + 16.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Situação:', marginX + 115, currentY + 16.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(5, 150, 105);
  doc.text(dados.estudante.situacao === 'ativo' ? 'MATRICULADO (ATIVO)' : 'INATIVO', marginX + 130, currentY + 16.5);

  // Linha 3: Diagnóstico / Laudo Médico / Necessidades Especiais
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Diagnóstico / Laudo:', marginX + 3, currentY + 22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 83, 9);
  const laudoTexto = dados.estudante.laudo || dados.pei?.diagnosis || dados.estudante.observacoesAcessibilidade || 'Necessidades Especiais em Avaliação Pedagógica de AEE';
  const splitLaudo = doc.splitTextToSize(laudoTexto, contentWidth - 36);
  doc.text(splitLaudo[0], marginX + 32, currentY + 22);

  // Linha 4: Responsáveis e Atendimento
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Acompanhamento:', marginX + 3, currentY + 27.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  const paeNome = dados.estudante.paeResponsavelNome || dados.pei?.supportTeacher || 'Profissional de Apoio Escolar (PAE / Cuidador)';
  doc.text(`PAE / Apoio: ${paeNome} • Atendimento Educacional Especializado (AEE) Ativo`, marginX + 30, currentY + 27.5);

  currentY += cardIdHeight + 5;

  // =========================================================================
  // 3. SÍNTESE DO PLANO DE ENSINO INDIVIDUALIZADO (PEI) E RECURSOS AUTORIZADOS
  // =========================================================================
  checkPageBreak(30);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 118, 110);
  doc.text('1. SÍNTESE DO PLANO DE ENSINO INDIVIDUALIZADO (PEI) E ACESSIBILIDADE', marginX, currentY);
  currentY += 4;

  const listaPeis = dados.peis && dados.peis.length > 0 ? dados.peis : (dados.pei ? [dados.pei] : []);
  const peiAtivo = listaPeis.length > 0;
  
  if (!peiAtivo) {
    const cardPeiH = 18;
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(248, 250, 252);
    doc.rect(marginX, currentY, contentWidth, cardPeiH, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(180, 83, 9);
    doc.text('Status: PEI EM FASE DE ELABORAÇÃO / DIAGNÓSTICO INICIAL (SIAP SEDUC-GO)', marginX + 3, currentY + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text('As diretrizes curriculares e adaptações avaliativas estão sendo articuladas entre o Professor de AEE e os Docentes Regentes.', marginX + 3, currentY + 11);
    currentY += cardPeiH + 5;
  } else {
    listaPeis.forEach((p, idx) => {
      checkPageBreak(32);
      const boxH = 28;
      doc.setDrawColor(203, 213, 225);
      doc.setFillColor(248, 250, 252);
      doc.rect(marginX, currentY, contentWidth, boxH, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 118, 110);
      const tituloPei = `PEI [${idx + 1}] — ${p.subject || 'Educação Especial'} (${p.period || 'Ano Letivo'}) • SEDUC-GO / SIAP`;
      doc.text(tituloPei, marginX + 3, currentY + 5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(71, 85, 105);
      doc.text(`Docente Regente: ${p.regentTeacher || 'Docente Responsável'} • PAE/Apoio: ${p.supportTeacher || 'Profissional de Apoio'}`, marginX + 3, currentY + 9.5);

      // Metas / Expectativas
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text('Objetivos & Expectativas:', marginX + 3, currentY + 14.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      const expTexto = p.etapa2?.expectativas || 'Flexibilização curricular por pareamento e suporte visual contínuo.';
      const splitExp = doc.splitTextToSize(expTexto, contentWidth - 38);
      doc.text(splitExp[0], marginX + 36, currentY + 14.5);

      // Metodologias & Recursos
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text('Metodologias & Recursos:', marginX + 3, currentY + 19.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      const metTexto = p.etapa2?.metodologias || 'Atividades em letra bastão, apoio imagético e fragmentação de enunciados.';
      const splitMet = doc.splitTextToSize(metTexto, contentWidth - 38);
      doc.text(splitMet[0], marginX + 36, currentY + 19.5);

      // Avaliação Adaptada
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text('Processo Avaliativo:', marginX + 3, currentY + 24.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      const avalTexto = p.etapa2?.avaliacao || 'Avaliação processual formativa com registro diário de mediação.';
      const splitAval = doc.splitTextToSize(avalTexto, contentWidth - 38);
      doc.text(splitAval[0], marginX + 36, currentY + 24.5);

      currentY += boxH + 4;
    });
  }

  // Recursos de Acessibilidade Recomendados (Letra Bastão, Apoio Visual, etc.)
  checkPageBreak(18);
  const recsBoxH = 16;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(255, 255, 255);
  doc.rect(marginX, currentY, contentWidth, recsBoxH, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text('RECURSOS DE ACESSIBILIDADE E DIRETRIZES METODOLÓGICAS OBRIGATÓRIAS:', marginX + 3, currentY + 4.5);

  const recs = [];
  const laudoLower = (laudoTexto || '').toLowerCase();
  const precisaBastao = laudoLower.includes('tea') || laudoLower.includes('intelect') || laudoLower.includes('motora') || laudoLower.includes('bastao');

  if (precisaBastao) {
    recs.push('• Letra Bastão (Caixa Alta): Indicada pelo laudo/PEI para assegurar decodificação sem sobrecarga.');
  }
  if (dados.perfil?.necessidadeApoioVisual || laudoLower.includes('tea') || laudoLower.includes('autis')) {
    recs.push('• Apoio Visual Obrigatório: Figuras e esquemas vetoriais da Matriz SEDUC-GO.');
  }
  if (dados.perfil?.necessidadeInstrucoesCurtas) {
    recs.push('• Comandos Fragmentados: Passo a passo objetivo e alternativas reduzidas.');
  }
  if (recs.length === 0) {
    recs.push('• Mediação direta pelo Profissional de Apoio Escolar e avaliação qualitativa processual.');
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  let recY = currentY + 8.5;
  recs.slice(0, 2).forEach(r => {
    doc.text(r, marginX + 3, recY);
    recY += 4;
  });

  currentY += recsBoxH + 6;

  // =========================================================================
  // 4. QUADRO DE INDICADORES QUANTITATIVOS (KPIS)
  // =========================================================================
  checkPageBreak(25);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 118, 110);
  doc.text('2. INDICADORES GLOBAIS DE PARTICIPAÇÃO E RENDIMENTO PEDAGÓGICO', marginX, currentY);
  currentY += 4;

  const totalAtividades = dados.atividades.length;
  const atividadesAlinhadas = dados.atividades.filter(a => a.alinhadaAoPei).length;
  const totalRegistrosApoio = dados.registrosApoio.length;
  const presencas = dados.registrosApoio.filter(r => r.presente).length;
  const taxaPresenca = totalRegistrosApoio > 0 ? Math.round((presencas / totalRegistrosApoio) * 100) : 100;
  
  const realizaramSim = dados.registrosApoio.filter(r => r.conseguiuRealizarAtividade === 'Sim').length;
  const realizaramParcial = dados.registrosApoio.filter(r => r.conseguiuRealizarAtividade === 'Parcialmente').length;
  const realizaramNao = dados.registrosApoio.filter(r => r.conseguiuRealizarAtividade === 'Não').length;
  
  const semIrritabilidade = dados.registrosApoio.filter(r => r.demonstrouIrritabilidadeOuSinais === 'Não').length;
  const taxaEstabilidade = totalRegistrosApoio > 0 ? Math.round((semIrritabilidade / totalRegistrosApoio) * 100) : 95;

  const boxW = (contentWidth - 9) / 4;
  const boxH = 20;

  // Box 1: Atividades Adaptadas
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.rect(marginX, currentY, boxW, boxH, 'FD');
  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('ATIVIDADES ADAPTADAS', marginX + 3, currentY + 4.5);
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(`${totalAtividades}`, marginX + 3, currentY + 12);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`${atividadesAlinhadas} alinhadas ao PEI`, marginX + 3, currentY + 17);

  // Box 2: Assiduidade no Acompanhamento
  const b2X = marginX + boxW + 3;
  doc.setFillColor(241, 245, 249);
  doc.rect(b2X, currentY, boxW, boxH, 'FD');
  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('ASSIDUIDADE NO APOIO', b2X + 3, currentY + 4.5);
  doc.setFontSize(13);
  doc.setTextColor(37, 99, 235);
  doc.text(`${taxaPresenca}%`, b2X + 3, currentY + 12);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`${presencas} de ${totalRegistrosApoio} atendimentos`, b2X + 3, currentY + 17);

  // Box 3: Resolução de Atividades
  const b3X = b2X + boxW + 3;
  doc.setFillColor(241, 245, 249);
  doc.rect(b3X, currentY, boxW, boxH, 'FD');
  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('EXECUÇÃO DE ATIVIDADES', b3X + 3, currentY + 4.5);
  doc.setFontSize(13);
  doc.setTextColor(5, 150, 105);
  const taxaSucesso = totalRegistrosApoio > 0 ? Math.round(((realizaramSim + realizaramParcial) / Math.max(presencas, 1)) * 100) : 85;
  doc.text(`${taxaSucesso}%`, b3X + 3, currentY + 12);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`${realizaramSim} autônomas • ${realizaramParcial} mediadas`, b3X + 3, currentY + 17);

  // Box 4: Estabilidade Emocional / Comportamento
  const b4X = b3X + boxW + 3;
  doc.setFillColor(241, 245, 249);
  doc.rect(b4X, currentY, boxW, boxH, 'FD');
  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('REGULAÇÃO EMOCIONAL', b4X + 3, currentY + 4.5);
  doc.setFontSize(13);
  doc.setTextColor(124, 58, 237);
  doc.text(`${taxaEstabilidade}%`, b4X + 3, currentY + 12);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Sem sinais de crise/estresse`, b4X + 3, currentY + 17);

  currentY += boxH + 7;

  // =========================================================================
  // 5. HISTÓRICO DE ATIVIDADES ADAPTADAS TRABALHADAS (ALINHADAS À MATRIZ SEDUC-GO)
  // =========================================================================
  checkPageBreak(35);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 118, 110);
  doc.text('3. HISTÓRICO DE ATIVIDADES ADAPTADAS (MATRIZ SEDUC-GO E TIPOGRAFIA)', marginX, currentY);
  currentY += 4;

  if (dados.atividades.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Nenhuma atividade adaptada registrada no sistema para este estudante até o momento.', marginX + 3, currentY + 4);
    currentY += 8;
  } else {
    // Cabeçalho da Tabela
    const thH = 6;
    doc.setFillColor(241, 245, 249);
    doc.rect(marginX, currentY, contentWidth, thH, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(51, 65, 85);
    doc.text('DATA', marginX + 2, currentY + 4.2);
    doc.text('DISCIPLINA', marginX + 22, currentY + 4.2);
    doc.text('CONTEÚDO & HABILIDADE SEDUC-GO', marginX + 56, currentY + 4.2);
    doc.text('FORMATO / LETRA', marginX + 130, currentY + 4.2);
    doc.text('ALINHAMENTO', marginX + 162, currentY + 4.2);

    currentY += thH;

    // Linhas de Atividades
    dados.atividades.slice(0, 10).forEach((ativ) => {
      checkPageBreak(8);
      doc.setDrawColor(241, 245, 249);
      doc.line(marginX, currentY + 7, marginX + contentWidth, currentY + 7);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(15, 23, 42);

      const dataAtiv = ativ.dataCriacao || '-';
      doc.text(dataAtiv, marginX + 2, currentY + 4.8);

      doc.setFont('helvetica', 'bold');
      doc.text(doc.splitTextToSize(ativ.disciplina || 'Geral', 32)[0], marginX + 22, currentY + 4.8);

      doc.setFont('helvetica', 'normal');
      const habCod = ativ.habilidadeCodigo ? `[${ativ.habilidadeCodigo}] ` : '';
      const conteudoTxt = `${habCod}${ativ.conteudo || ativ.habilidadeDescricao || 'Atividade adaptada'}`;
      doc.text(doc.splitTextToSize(conteudoTxt, 72)[0], marginX + 56, currentY + 4.8);

      let formatoTxt = 'Bastão';
      if (ativ.estiloTipograficoVisual === 'letra_bastao_desenho_matriz' || ativ.tipoAtividade === 'desenhos') {
        formatoTxt = 'Bastão + Desenho';
      } else if (ativ.estiloTipograficoVisual === 'letra_cursiva' || ativ.tipoAtividade === 'cursiva') {
        formatoTxt = 'Cursiva Pautada';
      } else if (ativ.estiloTipograficoVisual === 'letra_bastao_e_cursiva') {
        formatoTxt = 'Bastão + Cursiva';
      }
      doc.text(formatoTxt, marginX + 130, currentY + 4.8);

      const statusPei = ativ.alinhadaAoPei ? 'Alinhada PEI' : 'Em revisão';
      doc.setFont('helvetica', ativ.alinhadaAoPei ? 'bold' : 'normal');
      doc.setTextColor(ativ.alinhadaAoPei ? 5 : 100, ativ.alinhadaAoPei ? 150 : 116, ativ.alinhadaAoPei ? 105 : 139);
      doc.text(statusPei, marginX + 162, currentY + 4.8);

      currentY += 7.2;
    });

    if (dados.atividades.length > 10) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`... e mais ${dados.atividades.length - 10} atividade(s) adaptada(s) registradas no arquivo completo.`, marginX + 2, currentY + 4);
      currentY += 6;
    }
  }

  currentY += 5;

  // =========================================================================
  // 6. HISTÓRICO DE ACOMPANHAMENTO DO PROFISSIONAL DE APOIO (DIÁRIO DE BORDO)
  // =========================================================================
  checkPageBreak(40);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 118, 110);
  doc.text('4. REGISTROS DIÁRIOS DO PROFISSIONAL DE APOIO ESCOLAR (DIÁRIO DE BORDO)', marginX, currentY);
  currentY += 4;

  if (dados.registrosApoio.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Nenhum registro diário de acompanhamento do apoio lançado para este estudante.', marginX + 3, currentY + 4);
    currentY += 8;
  } else {
    // Tabela detalhada dos diários de bordo
    const thH = 6;
    doc.setFillColor(241, 245, 249);
    doc.rect(marginX, currentY, contentWidth, thH, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(51, 65, 85);
    doc.text('DATA', marginX + 2, currentY + 4.2);
    doc.text('PROFISSIONAL DE APOIO', marginX + 22, currentY + 4.2);
    doc.text('PRESENÇA', marginX + 68, currentY + 4.2);
    doc.text('REALIZOU ATIVIDADE?', marginX + 90, currentY + 4.2);
    doc.text('OBSERVAÇÕES / MEDIAÇÃO / EVOLUÇÃO', marginX + 128, currentY + 4.2);

    currentY += thH;

    dados.registrosApoio.slice(0, 12).forEach((reg) => {
      checkPageBreak(9);
      doc.setDrawColor(241, 245, 249);
      doc.line(marginX, currentY + 8, marginX + contentWidth, currentY + 8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(15, 23, 42);

      const dataFmt = reg.data ? new Date(reg.data).toLocaleDateString('pt-BR') : '-';
      doc.text(dataFmt, marginX + 2, currentY + 5);

      const profNome = doc.splitTextToSize(reg.profissionalResponsavelNome || 'PAE', 44)[0];
      doc.text(profNome, marginX + 22, currentY + 5);

      const presTxt = reg.presente ? 'Presente' : 'Ausente';
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(reg.presente ? 5 : 225, reg.presente ? 150 : 29, reg.presente ? 105 : 72);
      doc.text(presTxt, marginX + 68, currentY + 5);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      const resAtiv = reg.conseguiuRealizarAtividade || (reg.presente ? 'Sim' : '-');
      doc.text(resAtiv, marginX + 90, currentY + 5);

      // Observação da atividade ou comportamental
      const obsTexto = reg.observacaoAtividade || reg.observacaoComportamental || reg.avancosObservados || 'Atendimento realizado conforme orientações do PEI.';
      const obsLinhas = doc.splitTextToSize(obsTexto, 52);
      doc.text(obsLinhas[0], marginX + 128, currentY + 5);

      currentY += 8.2;
    });

    if (dados.registrosApoio.length > 12) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`... e mais ${dados.registrosApoio.length - 12} diário(s) de bordo arquivado(s) no sistema.`, marginX + 2, currentY + 4);
      currentY += 6;
    }
  }

  currentY += 5;

  // =========================================================================
  // 7. PARECER DESCRITIVO PEDAGÓGICO E EVOLUÇÃO (DIRETRIZES SEDUC-GO)
  // =========================================================================
  checkPageBreak(35);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 118, 110);
  doc.text('5. PARECER DESCRITIVO E EVOLUÇÃO DO ESTUDANTE (DIRETRIZES DA SEDUC-GO)', marginX, currentY);
  currentY += 4;

  const cardParecerH = 32;
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(255, 255, 255);
  doc.rect(marginX, currentY, contentWidth, cardParecerH, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(30, 41, 59);

  const parecerPadrao = dados.parecerDescritivoPersonalizado || (
    `O(A) estudante ${dados.estudante.nome} demonstra participação ativa nas aulas com apoio pedagógico individualizado e mediação direta do Profissional de Apoio Escolar (PAE). ` +
    `No período analisado, foram trabalhadas ${totalAtividades} atividades adaptadas alinhadas à Matriz Curricular de Habilidades Essenciais da SEDUC-GO e ao PEI, ` +
    `garantindo acessibilidade curricular sem redução das expectativas de aprendizagem. ` +
    `Observa-se resposta positiva ao uso de recursos visuais e enunciados estruturados em letra bastão/orientação temática, com estabilidade comportamental mantida em ${taxaEstabilidade}% dos atendimentos. ` +
    `Recomenda-se a continuidade das adequações propostas, reforçando o pareamento concreto e a mediação pontual para consolidação das habilidades bimestrais.`
  );

  const parecerLinhas = doc.splitTextToSize(parecerPadrao, contentWidth - 8);
  doc.text(parecerLinhas, marginX + 4, currentY + 6);

  currentY += cardParecerH + 8;

  // =========================================================================
  // 8. BLOCO OFICIAL DE ASSINATURAS E HOMOLOGAÇÃO INSTITUCIONAL
  // =========================================================================
  checkPageBreak(32);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 118, 110);
  doc.text('6. HOMOLOGAÇÃO E ASSINATURAS DA EQUIPE RESPONSÁVEL', marginX, currentY);
  currentY += 5;

  const colW = (contentWidth - 9) / 4;
  const linhaAssY = currentY + 12;

  // Linhas de assinatura
  for (let c = 0; c < 4; c++) {
    const xPos = marginX + c * (colW + 3);
    doc.setDrawColor(71, 85, 105);
    doc.setLineWidth(0.25);
    doc.line(xPos, linhaAssY, xPos + colW, linhaAssY);
  }

  doc.setFontSize(6.8);
  doc.setTextColor(30, 41, 59);

  // 1. Professor Regente
  doc.setFont('helvetica', 'bold');
  doc.text('Professor(a) Regente', marginX + colW / 2, linhaAssY + 3.8, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text('Docente da Matriz Curricular', marginX + colW / 2, linhaAssY + 6.8, { align: 'center' });

  // 2. Professor AEE
  const x2 = marginX + colW + 3;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(30, 41, 59);
  doc.text('Professor(a) de AEE', x2 + colW / 2, linhaAssY + 3.8, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text('Sala de Recursos Multifuncionais', x2 + colW / 2, linhaAssY + 6.8, { align: 'center' });

  // 3. Profissional de Apoio
  const x3 = x2 + colW + 3;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(30, 41, 59);
  doc.text('Profissional de Apoio', x3 + colW / 2, linhaAssY + 3.8, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text('PAE / Mediação Escolar', x3 + colW / 2, linhaAssY + 6.8, { align: 'center' });

  // 4. Coordenação / Direção
  const x4 = x3 + colW + 3;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(30, 41, 59);
  doc.text('Coordenação Pedagógica', x4 + colW / 2, linhaAssY + 3.8, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text(escolaNome, x4 + colW / 2, linhaAssY + 6.8, { align: 'center' });

  // =========================================================================
  // 9. RODAPÉ INSTITUCIONAL COM NUMERAÇÃO DE PÁGINAS
  // =========================================================================
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `SEDUC-GO • Relatório Pedagógico Consolidado emitido em ${dataEmissao} por ${emitidoPor} • Uso Restrito Escolar`,
      marginX,
      pageHeight - 8
    );
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - marginX, pageHeight - 8, { align: 'right' });
  }

  return doc;
}

/**
 * Dispara o download direto do Relatório Consolidado em PDF de um estudante específico
 */
export function baixarRelatorioConsolidadoEstudantePdf(
  estudante: Estudante,
  atividades: AtividadeAdaptada[],
  registrosApoio: RegistroAcompanhamentoApoio[],
  peiOuPeis?: PeiDocumento | PeiDocumento[],
  perfil?: PerfilPedagogico,
  escolaConfig?: Partial<EscolaConfig>,
  emitidoPor?: string,
  parecerDescritivoPersonalizado?: string
): { doc: jsPDF; fileName: string } {
  // Filtra atividades e registros específicos do estudante
  const ativsEstudante = atividades.filter(a => a.estudanteId === estudante.id || a.estudanteNome === estudante.nome);
  const regsEstudante = registrosApoio.filter(r => r.studentId === estudante.id || r.nomeEstudante === estudante.nome);

  const peisLista = Array.isArray(peiOuPeis) 
    ? peiOuPeis 
    : (peiOuPeis ? [peiOuPeis] : []);
  const peiPrincipal = peisLista[0];

  const doc = gerarRelatorioConsolidadoPdfDoc({
    estudante,
    perfil,
    pei: peiPrincipal,
    peis: peisLista,
    atividades: ativsEstudante,
    registrosApoio: regsEstudante,
    escolaConfig,
    emitidoPor: emitidoPor || 'Coordenação de Educação Especial',
    dataEmissao: new Date().toLocaleDateString('pt-BR'),
    anoLetivo: new Date().getFullYear(),
    parecerDescritivoPersonalizado
  });

  const nomeAlunoSanitizado = sanitizarParaNomeArquivo(estudante.nome);
  const dataHojeStr = new Date().toISOString().slice(0, 10);
  const fileName = `Relatorio_Consolidado_SEDUC_${nomeAlunoSanitizado}_${dataHojeStr}.pdf`;

  doc.save(fileName);

  return { doc, fileName };
}

/**
 * Gera o Blob do relatório consolidado (para integração com Google Drive / Cloud)
 */
export function gerarRelatorioConsolidadoBlob(
  estudante: Estudante,
  atividades: AtividadeAdaptada[],
  registrosApoio: RegistroAcompanhamentoApoio[],
  peiOuPeis?: PeiDocumento | PeiDocumento[],
  perfil?: PerfilPedagogico,
  escolaConfig?: Partial<EscolaConfig>,
  emitidoPor?: string
): { blob: Blob; fileName: string } {
  const ativsEstudante = atividades.filter(a => a.estudanteId === estudante.id || a.estudanteNome === estudante.nome);
  const regsEstudante = registrosApoio.filter(r => r.studentId === estudante.id || r.nomeEstudante === estudante.nome);

  const peisLista = Array.isArray(peiOuPeis) 
    ? peiOuPeis 
    : (peiOuPeis ? [peiOuPeis] : []);
  const peiPrincipal = peisLista[0];

  const doc = gerarRelatorioConsolidadoPdfDoc({
    estudante,
    perfil,
    pei: peiPrincipal,
    peis: peisLista,
    atividades: ativsEstudante,
    registrosApoio: regsEstudante,
    escolaConfig,
    emitidoPor: emitidoPor || 'Coordenação de Educação Especial',
    dataEmissao: new Date().toLocaleDateString('pt-BR'),
    anoLetivo: new Date().getFullYear()
  });

  const blob = doc.output('blob');
  const nomeAlunoSanitizado = sanitizarParaNomeArquivo(estudante.nome);
  const fileName = `Relatorio_Consolidado_SEDUC_${nomeAlunoSanitizado}_${new Date().getFullYear()}.pdf`;

  return { blob, fileName };
}
