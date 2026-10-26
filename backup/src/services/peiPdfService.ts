import { jsPDF } from 'jspdf';
import { PeiDocumento, EscolaConfig } from '../types';
import { getLogoEscolaBase64 } from '../assets/branding/logoEscolaBase64';

export function sanitizarNomeArquivoPei(pei: PeiDocumento): string {
  const nomeLimpo = (pei.studentName || 'Estudante')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  const periodoLimpo = (pei.period || '1_Bimestre')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  return `PEI_SEDUC_GO_${nomeLimpo}_${periodoLimpo}.pdf`;
}

/**
 * Gera documento jsPDF oficial rigorosamente fiel ao "PEI - Modelo .docx" (Anexo 9 SEDUC-GO)
 * Preserva: estrutura, tabelas, células, títulos, subtítulos, hierarquia visual,
 * logotipo pequeno e proporcional no canto superior esquerdo e margens de 10mm.
 */
export function gerarPeiPdfDocumento(
  pei: PeiDocumento,
  escolaConfig?: Partial<EscolaConfig>
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210 mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297 mm
  const marginX = 10; // Margem padrão SEDUC-GO de 10mm
  const contentWidth = pageWidth - marginX * 2; // 190 mm
  let currentY = 10;

  const checkPageBreak = (neededHeight: number): boolean => {
    if (currentY + neededHeight > pageHeight - 12) {
      doc.addPage();
      currentY = 10;
      renderMiniHeader();
      return true;
    }
    return false;
  };

  const renderMiniHeader = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    doc.text(
      `${escolaConfig?.nome || 'COLÉGIO ESTADUAL OLYNTO PEREIRA DE CASTRO'} • PEI - SEDUC/GO (${pei.studentName} - ${pei.grade || ''})`,
      marginX,
      currentY
    );
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
    doc.line(marginX, currentY + 1.5, pageWidth - marginX, currentY + 1.5);
    currentY += 5;
  };

  // Helper para desenhar células de tabela com bordas pretas sólidas
  const drawCell = (
    x: number,
    y: number,
    w: number,
    h: number,
    text: string | string[],
    options: {
      bold?: boolean;
      fontSize?: number;
      fillColor?: [number, number, number] | null;
      align?: 'left' | 'center' | 'right';
      textColor?: [number, number, number];
      paddingX?: number;
      paddingY?: number;
    } = {}
  ) => {
    const {
      bold = false,
      fontSize = 6.8,
      fillColor = null,
      align = 'left',
      textColor = [0, 0, 0],
      paddingX = 1.5,
      paddingY = 2.8,
    } = options;

    if (fillColor) {
      doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
      doc.rect(x, y, w, h, 'F');
    }

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
    doc.rect(x, y, w, h, 'S');

    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(fontSize);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);

    if (Array.isArray(text)) {
      let lineY = y + paddingY;
      const lineHeight = fontSize * 0.35 + 0.6;
      text.forEach((l) => {
        if (align === 'center') {
          doc.text(l, x + w / 2, lineY, { align: 'center' });
        } else if (align === 'right') {
          doc.text(l, x + w - paddingX, lineY, { align: 'right' });
        } else {
          doc.text(l, x + paddingX, lineY);
        }
        lineY += lineHeight;
      });
    } else {
      if (align === 'center') {
        doc.text(text, x + w / 2, y + paddingY, { align: 'center' });
      } else if (align === 'right') {
        doc.text(text, x + w - paddingX, y + paddingY, { align: 'right' });
      } else {
        doc.text(text, x + paddingX, y + paddingY);
      }
    }
  };

  // =========================================================================
  // CABEÇALHO OFICIAL INSTITUCIONAL (MODELO DOCX / SEDUC-GO)
  // =========================================================================
  const headerBoxHeight = 22;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.25);
  doc.rect(marginX, currentY, contentWidth, headerBoxHeight);

  // Logo da Escola no Canto Superior Esquerdo (Pequeno, Proporcional, Max-Height: 40px)
  const logoBase64 = getLogoEscolaBase64();
  const logoWidth = 24;
  const logoHeight = 8.5;

  if (logoBase64 && logoBase64.startsWith('data:image')) {
    try {
      doc.addImage(logoBase64, 'PNG', marginX + 2, currentY + 2, logoWidth, logoHeight, undefined, 'FAST');
    } catch {
      // continua sem interromper
    }
  }

  // Títulos Oficiais do Governo de Goiás e SEDUC-GO
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text('GOVERNO DO ESTADO DE GOIÁS', pageWidth / 2, currentY + 4, { align: 'center' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('SECRETARIA DE ESTADO DA EDUCAÇÃO', pageWidth / 2, currentY + 7.5, { align: 'center' });
  doc.text('SUPERINTENDÊNCIA DE MODALIDADES E TEMÁTICAS ESPECIAIS', pageWidth / 2, currentY + 10.8, { align: 'center' });
  doc.text('GERÊNCIA DE EDUCAÇÃO ESPECIAL', pageWidth / 2, currentY + 14, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('PLANO EDUCACIONAL INDIVIDUALIZADO - PEI', pageWidth / 2, currentY + 18.5, { align: 'center' });

  currentY += headerBoxHeight;

  // =========================================================================
  // TABELA DE IDENTIFICAÇÃO DO ESTUDANTE (MODELO DOCX)
  // =========================================================================
  // Linha 1: CRE e Município
  const hLinha1 = 5.2;
  const colCreW = 120;
  const colMunW = contentWidth - colCreW; // 70 mm
  drawCell(marginX, currentY, colCreW, hLinha1, [
    `CRE: Coordenação Regional de Educação de ${pei.identification.cre || 'Rio Verde'}`
  ], { bold: false, fontSize: 6.8 });
  drawCell(marginX + colCreW, currentY, colMunW, hLinha1, [
    `Município: ${pei.identification.municipio || 'Rio Verde - GO'}`
  ], { bold: false, fontSize: 6.8 });
  currentY += hLinha1;

  // Linha 2: Unidade Escolar
  const hLinha2 = 5.2;
  drawCell(marginX, currentY, contentWidth, hLinha2, [
    `Unidade Escolar: ${pei.identification.unidadeEscolar || escolaConfig?.nome || 'Colégio Estadual Olynto Pereira de Castro'}`
  ], { bold: false, fontSize: 6.8 });
  currentY += hLinha2;

  // Linha 3: Estudante, Ano/Série, Turma/Turno
  const hLinha3 = 5.2;
  const colEstW = 110;
  const colAnoW = 40;
  const colTurmaW = contentWidth - colEstW - colAnoW; // 40 mm
  drawCell(marginX, currentY, colEstW, hLinha3, [
    `Estudante: ${pei.studentName || ''}`
  ], { bold: true, fontSize: 6.8 });
  drawCell(marginX + colEstW, currentY, colAnoW, hLinha3, [
    `Ano/série: ${pei.grade || pei.identification.grade || ''}`
  ], { bold: false, fontSize: 6.8 });
  drawCell(marginX + colEstW + colAnoW, currentY, colTurmaW, hLinha3, [
    `Turma/turno: ${pei.classRoom || pei.identification.classRoom || ''} / ${pei.identification.turno || 'Matutino'}`
  ], { bold: false, fontSize: 6.8 });
  currentY += hLinha3;

  // Linha 4: Professores Regentes e Profissional Apoio Escolar
  const hLinha4 = 5.2;
  const colProfW = 110;
  const colApoioW = contentWidth - colProfW; // 80 mm
  drawCell(marginX, currentY, colProfW, hLinha4, [
    `Professores Regentes: ${pei.regentTeacher || pei.identification.professoresRegentes || 'Não informado'}`
  ], { bold: false, fontSize: 6.8 });
  drawCell(marginX + colProfW, currentY, colApoioW, hLinha4, [
    `Profissional Apoio Escolar: ${pei.supportTeacher || pei.identification.profissionalApoio || 'Não informado'}`
  ], { bold: false, fontSize: 6.8 });
  currentY += hLinha4;

  // Linha 5: Período e Condição/Diagnóstico
  const hLinha5 = 5.2;
  const colPerW = 60;
  const colDiagW = contentWidth - colPerW; // 130 mm
  drawCell(marginX, currentY, colPerW, hLinha5, [
    `Período: ${pei.period || '1º Bimestre'}`
  ], { bold: false, fontSize: 6.8 });
  drawCell(marginX + colPerW, currentY, colDiagW, hLinha5, [
    `Condição/Diagnóstico (Laudo): ${pei.diagnosis || pei.identification.diagnosis || 'TEA'}`
  ], { bold: false, fontSize: 6.8 });
  currentY += hLinha5 + 2;

  // =========================================================================
  // SEÇÃO: POTENCIALIDADES DO ESTUDANTE (MODELO DOCX)
  // =========================================================================
  checkPageBreak(15);
  // Cabeçalho da Seção
  drawCell(marginX, currentY, contentWidth, 5.5, 'POTENCIALIDADES DO ESTUDANTE', {
    bold: true,
    fontSize: 7.5,
    align: 'center',
    fillColor: [240, 240, 240],
  });
  currentY += 5.5;

  // Sub-bloco 1: Aspectos cognitivo/psíquico
  drawCell(marginX, currentY, contentWidth, 5, 'Aspectos cognitivo/psíquico:', {
    bold: true,
    fontSize: 7,
    fillColor: [248, 248, 248],
  });
  currentY += 5;

  const potCognitivo = pei.potencialidades?.cognitivoPsiquico;
  const camposPotCognitivo = [
    { label: 'Percepção:', valor: potCognitivo?.percepcao },
    { label: 'Atenção/concentração:', valor: potCognitivo?.atencaoConcentracao },
    { label: 'Linguagem/comunicação:', valor: potCognitivo?.linguagemComunicacao },
    { label: 'Memória/abstração/generalização:', valor: potCognitivo?.memoriaAbstracaoGeneralizacao },
    { label: 'Criatividade:', valor: potCognitivo?.criatividade },
    { label: 'Aspectos psicomotores:', valor: potCognitivo?.aspectosPsicomotores },
    { label: 'Raciocínio lógico:', valor: potCognitivo?.raciocinioLogico },
  ];

  // Se não houver campos granulares mas houver etapa1 consolidada
  const temCamposGranularesPotCognitivo = camposPotCognitivo.some(c => Boolean(c.valor));
  if (!temCamposGranularesPotCognitivo && pei.etapa1?.habilidadesCognitivas) {
    const linhas = doc.splitTextToSize(pei.etapa1.habilidadesCognitivas, contentWidth - 4);
    const h = Math.max(7, linhas.length * 3.2 + 3);
    checkPageBreak(h);
    drawCell(marginX, currentY, contentWidth, h, linhas, { fontSize: 6.5 });
    currentY += h;
  } else {
    for (const campo of camposPotCognitivo) {
      const texto = `${campo.label} ${campo.valor || 'Sem observações registradas.'}`;
      const linhas = doc.splitTextToSize(texto, contentWidth - 4);
      const h = Math.max(5, linhas.length * 3.1 + 2.4);
      checkPageBreak(h);
      drawCell(marginX, currentY, contentWidth, h, linhas, { fontSize: 6.5 });
      currentY += h;
    }
  }

  // Sub-bloco 2: Habilidades do comportamento adaptativo
  checkPageBreak(12);
  drawCell(marginX, currentY, contentWidth, 5, 'Habilidades do comportamento adaptativo:', {
    bold: true,
    fontSize: 7,
    fillColor: [248, 248, 248],
  });
  currentY += 5;

  const potAdaptativo = pei.potencialidades?.comportamentoAdaptativo;
  const camposPotAdaptativo = [
    { label: 'Autocuidado:', valor: potAdaptativo?.autocuidado },
    { label: 'Autonomia/independência:', valor: potAdaptativo?.autonomiaIndependencia },
    { label: 'Habilidades sociais:', valor: potAdaptativo?.habilidadesSociais },
  ];

  const temCamposGranularesPotAdaptativo = camposPotAdaptativo.some(c => Boolean(c.valor));
  if (!temCamposGranularesPotAdaptativo && pei.etapa1?.habilidadesAdaptativas) {
    const linhas = doc.splitTextToSize(pei.etapa1.habilidadesAdaptativas, contentWidth - 4);
    const h = Math.max(7, linhas.length * 3.2 + 3);
    checkPageBreak(h);
    drawCell(marginX, currentY, contentWidth, h, linhas, { fontSize: 6.5 });
    currentY += h;
  } else {
    for (const campo of camposPotAdaptativo) {
      const texto = `${campo.label} ${campo.valor || 'Sem observações registradas.'}`;
      const linhas = doc.splitTextToSize(texto, contentWidth - 4);
      const h = Math.max(5, linhas.length * 3.1 + 2.4);
      checkPageBreak(h);
      drawCell(marginX, currentY, contentWidth, h, linhas, { fontSize: 6.5 });
      currentY += h;
    }
  }

  currentY += 2;

  // =========================================================================
  // SEÇÃO: NECESSIDADES/DIFICULDADES DO ESTUDANTE (MODELO DOCX)
  // =========================================================================
  checkPageBreak(15);
  drawCell(marginX, currentY, contentWidth, 5.5, 'NECESSIDADES/DIFICULDADES DO ESTUDANTE', {
    bold: true,
    fontSize: 7.5,
    align: 'center',
    fillColor: [240, 240, 240],
  });
  currentY += 5.5;

  // Sub-bloco 1: Aspectos cognitivo/psíquico
  drawCell(marginX, currentY, contentWidth, 5, 'Aspectos cognitivo/psíquico:', {
    bold: true,
    fontSize: 7,
    fillColor: [248, 248, 248],
  });
  currentY += 5;

  const necCognitivo = pei.necessidadesDificuldades?.cognitivoPsiquico;
  const camposNecCognitivo = [
    { label: 'Percepção:', valor: necCognitivo?.percepcao },
    { label: 'Atenção/concentração:', valor: necCognitivo?.atencaoConcentracao },
    { label: 'Linguagem/comunicação:', valor: necCognitivo?.linguagemComunicacao },
    { label: 'Memória/abstração/generalização:', valor: necCognitivo?.memoriaAbstracaoGeneralizacao },
    { label: 'Criatividade:', valor: necCognitivo?.criatividade },
    { label: 'Aspectos psicomotores:', valor: necCognitivo?.aspectosPsicomotores },
    { label: 'Raciocínio lógico:', valor: necCognitivo?.raciocinioLogico },
  ];

  const temCamposGranularesNecCognitivo = camposNecCognitivo.some(c => Boolean(c.valor));
  if (!temCamposGranularesNecCognitivo && pei.etapa1?.dificuldadesCognitivas) {
    const linhas = doc.splitTextToSize(pei.etapa1.dificuldadesCognitivas, contentWidth - 4);
    const h = Math.max(7, linhas.length * 3.2 + 3);
    checkPageBreak(h);
    drawCell(marginX, currentY, contentWidth, h, linhas, { fontSize: 6.5 });
    currentY += h;
  } else {
    for (const campo of camposNecCognitivo) {
      const texto = `${campo.label} ${campo.valor || 'Sem observações registradas.'}`;
      const linhas = doc.splitTextToSize(texto, contentWidth - 4);
      const h = Math.max(5, linhas.length * 3.1 + 2.4);
      checkPageBreak(h);
      drawCell(marginX, currentY, contentWidth, h, linhas, { fontSize: 6.5 });
      currentY += h;
    }
  }

  // Sub-bloco 2: Habilidades do comportamento adaptativo
  checkPageBreak(12);
  drawCell(marginX, currentY, contentWidth, 5, 'Habilidades do comportamento adaptativo:', {
    bold: true,
    fontSize: 7,
    fillColor: [248, 248, 248],
  });
  currentY += 5;

  const necAdaptativo = pei.necessidadesDificuldades?.comportamentoAdaptativo;
  const camposNecAdaptativo = [
    { label: 'Autocuidado:', valor: necAdaptativo?.autocuidado },
    { label: 'Autonomia/independência:', valor: necAdaptativo?.autonomiaIndependencia },
    { label: 'Habilidades sociais:', valor: necAdaptativo?.habilidadesSociais },
  ];

  const temCamposGranularesNecAdaptativo = camposNecAdaptativo.some(c => Boolean(c.valor));
  if (!temCamposGranularesNecAdaptativo && pei.etapa1?.dificuldadesAdaptativas) {
    const linhas = doc.splitTextToSize(pei.etapa1.dificuldadesAdaptativas, contentWidth - 4);
    const h = Math.max(7, linhas.length * 3.2 + 3);
    checkPageBreak(h);
    drawCell(marginX, currentY, contentWidth, h, linhas, { fontSize: 6.5 });
    currentY += h;
  } else {
    for (const campo of camposNecAdaptativo) {
      const texto = `${campo.label} ${campo.valor || 'Sem observações registradas.'}`;
      const linhas = doc.splitTextToSize(texto, contentWidth - 4);
      const h = Math.max(5, linhas.length * 3.1 + 2.4);
      checkPageBreak(h);
      drawCell(marginX, currentY, contentWidth, h, linhas, { fontSize: 6.5 });
      currentY += h;
    }
  }

  currentY += 2;

  // =========================================================================
  // SEÇÃO: ÁREA ACADÊMICA (TABELA DE 6 COLUNAS OFICIAL DA SEDUC-GO)
  // =========================================================================
  checkPageBreak(25);
  drawCell(marginX, currentY, contentWidth, 5.5, 'ÁREA ACADÊMICA', {
    bold: true,
    fontSize: 7.5,
    align: 'center',
    fillColor: [240, 240, 240],
  });
  currentY += 5.5;

  // Larguras das 6 colunas oficiais
  // Total: 28 + 38 + 34 + 38 + 34 + 18 = 190 mm (= contentWidth)
  const colW1 = 28; // Componente Curricular
  const colW2 = 38; // Expectativas de aprendizagem para o estudante
  const colW3 = 34; // Conteúdo/s proposto/s
  const colW4 = 38; // Estratégias/metodologias
  const colW5 = 34; // Procedimentos e instrumentos de avaliação
  const colW6 = 18; // Professor

  // Cabeçalho da Tabela
  const hHeaderTab = 8.5;
  drawCell(marginX, currentY, colW1, hHeaderTab, 'Componente\nCurricular', {
    bold: true,
    fontSize: 6.2,
    align: 'center',
    fillColor: [245, 245, 245],
  });
  drawCell(marginX + colW1, currentY, colW2, hHeaderTab, 'Expectativas de\naprendizagem', {
    bold: true,
    fontSize: 6.2,
    align: 'center',
    fillColor: [245, 245, 245],
  });
  drawCell(marginX + colW1 + colW2, currentY, colW3, hHeaderTab, 'Conteúdo/s\nproposto/s', {
    bold: true,
    fontSize: 6.2,
    align: 'center',
    fillColor: [245, 245, 245],
  });
  drawCell(marginX + colW1 + colW2 + colW3, currentY, colW4, hHeaderTab, 'Estratégias/\nmetodologias', {
    bold: true,
    fontSize: 6.2,
    align: 'center',
    fillColor: [245, 245, 245],
  });
  drawCell(marginX + colW1 + colW2 + colW3 + colW4, currentY, colW5, hHeaderTab, 'Procedimentos e\ninstrumentos de aval.', {
    bold: true,
    fontSize: 6,
    align: 'center',
    fillColor: [245, 245, 245],
  });
  drawCell(marginX + colW1 + colW2 + colW3 + colW4 + colW5, currentY, colW6, hHeaderTab, 'Professor', {
    bold: true,
    fontSize: 6.2,
    align: 'center',
    fillColor: [245, 245, 245],
  });
  currentY += hHeaderTab;

  // Itens da Área Acadêmica
  const listaItens = (pei.areaAcademica && pei.areaAcademica.length > 0)
    ? pei.areaAcademica
    : [
        {
          id: 'item-1',
          componenteCurricular: pei.subject || 'Língua Portuguesa',
          expectativas: pei.etapa2?.expectativas || 'Expectativas pedagógicas adaptadas.',
          conteudos: pei.etapa2?.conteudos || 'Conteúdos essenciais flexibilizados.',
          metodologias: pei.etapa2?.metodologias || 'Metodologias e recursos acessíveis.',
          avaliacao: pei.etapa2?.avaliacao || 'Avaliação processual contínua.',
          professor: pei.regentTeacher || 'Prof. Regente',
        },
      ];

  for (const item of listaItens) {
    const l1 = doc.splitTextToSize(item.componenteCurricular || '', colW1 - 2.5);
    const l2 = doc.splitTextToSize(item.expectativas || '', colW2 - 2.5);
    const l3 = doc.splitTextToSize(item.conteudos || '', colW3 - 2.5);
    const l4 = doc.splitTextToSize(item.metodologias || '', colW4 - 2.5);
    const l5 = doc.splitTextToSize(item.avaliacao || '', colW5 - 2.5);
    const l6 = doc.splitTextToSize(item.professor || pei.regentTeacher || '', colW6 - 2);

    const maxLines = Math.max(l1.length, l2.length, l3.length, l4.length, l5.length, l6.length, 1);
    const rowHeight = Math.max(7, maxLines * 3.1 + 3);

    checkPageBreak(rowHeight);

    let xCol = marginX;
    drawCell(xCol, currentY, colW1, rowHeight, l1, { bold: true, fontSize: 6.2 });
    xCol += colW1;
    drawCell(xCol, currentY, colW2, rowHeight, l2, { fontSize: 6 });
    xCol += colW2;
    drawCell(xCol, currentY, colW3, rowHeight, l3, { fontSize: 6 });
    xCol += colW3;
    drawCell(xCol, currentY, colW4, rowHeight, l4, { fontSize: 6 });
    xCol += colW4;
    drawCell(xCol, currentY, colW5, rowHeight, l5, { fontSize: 6 });
    xCol += colW5;
    drawCell(xCol, currentY, colW6, rowHeight, l6, { fontSize: 5.8, align: 'center' });

    currentY += rowHeight;
  }

  currentY += 3;

  // =========================================================================
  // SEÇÃO: ASSINATURAS (MODELO DOCX)
  // =========================================================================
  checkPageBreak(40);
  drawCell(marginX, currentY, contentWidth, 5.5, 'ASSINATURAS', {
    bold: true,
    fontSize: 7.5,
    align: 'center',
    fillColor: [240, 240, 240],
  });
  currentY += 5.5;

  const assinaturas = pei.assinaturasOficiais || {
    professorAee: 'Professor(a) de AEE',
    coordenacaoPedagogica: pei.coordinatorName || 'Coordenação Pedagógica',
    profissionalApoio: pei.supportTeacher || 'Profissional de Apoio Escolar (colaborador)',
    professoresRegentes: pei.regentTeacher || 'Professores Regentes',
    gestor: pei.principalName || 'Gestor Escolar',
    local: 'Rio Verde - GO',
    data: '',
  };

  const listaCargos = [
    { label: 'Professor(a) de AEE:', valor: assinaturas.professorAee },
    { label: 'Coordenação Pedagógica:', valor: assinaturas.coordenacaoPedagogica },
    { label: 'Profissional de Apoio Escolar (colaborador):', valor: assinaturas.profissionalApoio },
    { label: 'Professores Regentes:', valor: assinaturas.professoresRegentes },
    { label: 'Gestor:', valor: assinaturas.gestor },
  ];

  for (const cargo of listaCargos) {
    const hLinha = 6.8;
    checkPageBreak(hLinha);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
    doc.rect(marginX, currentY, contentWidth, hLinha, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(0, 0, 0);
    doc.text(cargo.label, marginX + 2, currentY + 4.5);

    // Linha de assinatura
    const startXAssinatura = marginX + 68;
    const endXAssinatura = pageWidth - marginX - 4;
    doc.setDrawColor(60, 60, 60);
    doc.setLineWidth(0.2);
    doc.line(startXAssinatura, currentY + 5.2, endXAssinatura, currentY + 5.2);

    if (cargo.valor && !cargo.valor.includes('(')) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.8);
      doc.setTextColor(100, 100, 100);
      doc.text(cargo.valor, (startXAssinatura + endXAssinatura) / 2, currentY + 4.2, { align: 'center' });
    }

    currentY += hLinha;
  }

  // Linha de Local e Data
  const hLocalData = 6.8;
  checkPageBreak(hLocalData);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  doc.rect(marginX, currentY, contentWidth, hLocalData, 'S');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(0, 0, 0);

  const textoData = assinaturas.data
    ? `${assinaturas.local || 'Rio Verde - GO'}, ${assinaturas.data}.`
    : `${assinaturas.local || 'Rio Verde - GO'}, _____ de _________________ de 20____.`;

  doc.text(textoData, marginX + 2, currentY + 4.5);
  currentY += hLocalData;

  // =========================================================================
  // RODAPÉ INSTITUCIONAL UNIFICADO EM TODAS AS PÁGINAS
  // =========================================================================
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(120, 120, 120);
    doc.text(
      'Documento Oficial • SEDUC-GO • Colégio Estadual Olynto Pereira de Castro • Gerência de Educação Especial',
      marginX,
      pageHeight - 6
    );
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - marginX, pageHeight - 6, { align: 'right' });
  }

  return doc;
}

/**
 * Dispara o download local imediato do documento PEI (SEDUC-GO) formatado em PDF A4
 */
export async function baixarPeiComoPdf(
  pei: PeiDocumento,
  escolaConfig?: Partial<EscolaConfig>
): Promise<{ fileName: string; blob: Blob }> {
  const doc = gerarPeiPdfDocumento(pei, escolaConfig);
  const fileName = sanitizarNomeArquivoPei(pei);
  const blob = doc.output('blob');
  doc.save(fileName);
  return { fileName, blob };
}
