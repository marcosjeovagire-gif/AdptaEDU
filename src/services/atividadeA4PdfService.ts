import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';
import { AtividadeAdaptada, EscolaConfig } from '../types';
import { getLogoEscolaBase64 } from '../assets/branding/logoEscolaBase64';

/**
 * Desenha um QR Code vetorial nítido diretamente no documento jsPDF
 */
export function desenharQrCodeVetorialNoDoc(
  doc: jsPDF,
  texto: string,
  x: number,
  y: number,
  tamanhoMm: number
) {
  try {
    const qr = QRCode.create(texto, { errorCorrectionLevel: 'M' });
    const numCells = qr.modules.size;
    const cellSize = tamanhoMm / numCells;

    // Fundo branco
    doc.setFillColor(255, 255, 255);
    doc.rect(x, y, tamanhoMm, tamanhoMm, 'F');

    // Módulos escuros
    doc.setFillColor(15, 23, 42);
    for (let r = 0; r < numCells; r++) {
      for (let c = 0; c < numCells; c++) {
        if (qr.modules.get(r, c)) {
          doc.rect(x + c * cellSize, y + r * cellSize, cellSize, cellSize, 'F');
        }
      }
    }
  } catch (err) {
    console.warn('[PDF Engine] Erro ao desenhar QR Code vetorial no jsPDF:', err);
  }
}

/**
 * Sanitiza strings para formação de nomes de arquivo seguros
 */
export function sanitizarNomeArquivo(str?: string): string {
  if (!str) return 'Geral';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .trim();
}

/**
 * Gera o nome padrão do arquivo PDF da atividade adaptada
 */
export function gerarNomeArquivoAtividadePdf(atividade: AtividadeAdaptada): string {
  const turma = sanitizarNomeArquivo(atividade.turma) || 'Turma';
  const aluno = sanitizarNomeArquivo(atividade.estudanteNome) || 'Estudante';
  const disciplina = sanitizarNomeArquivo(atividade.disciplina) || 'Geral';
  return `Atividade_Adaptada_${turma}_${aluno}_${disciplina}.pdf`;
}

/**
 * Renderiza uma atividade adaptada dentro do documento jsPDF fornecido.
 * Otimiza a diagramação para folha A4 com logo pequeno, proporcional e alinhado à esquerda.
 */
export function renderizarAtividadeNoDoc(
  doc: jsPDF,
  atividade: AtividadeAdaptada,
  escolaConfig?: Partial<EscolaConfig>,
  configurarCabecalhoInicio = true
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 10; // Margem estrita de 10mm (SEDUC-GO / A4SheetPreview)
  const marginTop = 10; // Margem superior estrita de 10mm
  const marginBottom = 10; // Margem inferior estrita de 10mm
  const contentWidth = pageWidth - marginX * 2; // 190mm de largura útil
  let currentY = marginTop;

  const renderMiniCabecalho = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `${escolaConfig?.nome || 'Colégio Estadual Olynto Pereira de Castro'} • Atividade Adaptada (${atividade.turma} - ${atividade.disciplina})`,
      marginX,
      currentY + 3.5
    );
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(marginX, currentY + 5.5, pageWidth - marginX, currentY + 5.5);
    currentY += 9;
  };

  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - marginBottom - 4) {
      doc.addPage();
      currentY = marginTop;
      renderMiniCabecalho();
    }
  };

  // 1. CABEÇALHO OFICIAL INSTITUCIONAL OTIMIZADO
  // Caixa única elegante: Logo pequeno no canto esquerdo, dados escolares ao lado, metadados na base
  const headerBoxHeight = 26;
  doc.setDrawColor(51, 65, 85);
  doc.setLineWidth(0.35);
  doc.rect(marginX, currentY, contentWidth, headerBoxHeight);

  // Logo Oficial no Canto Esquerdo (Pequeno e Proporcional)
  const logoBase64 = getLogoEscolaBase64();
  const logoWidth = 30;
  const logoHeight = 9.5;
  let textStartX = marginX + 3;

  if (logoBase64 && logoBase64.startsWith('data:image')) {
    try {
      doc.addImage(logoBase64, 'PNG', marginX + 2, currentY + 1.5, logoWidth, logoHeight, undefined, 'FAST');
      textStartX = marginX + logoWidth + 4;
    } catch {
      textStartX = marginX + 3;
    }
  }

  // Identificação Institucional da Escola ao lado do logo
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(
    (escolaConfig?.nome || 'COLÉGIO ESTADUAL OLYNTO PEREIRA DE CASTRO').toUpperCase(),
    textStartX,
    currentY + 4.5
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text(
    'Secretaria de Estado da Educação • SEDUC/GO',
    textStartX,
    currentY + 8
  );
  doc.text(
    `${escolaConfig?.municipio || 'Rio Verde - GO'} • Atividade Pedagógica Avaliativa Adaptada`,
    textStartX,
    currentY + 11.2
  );

  // Caixa de Visto/Nota no canto direito
  const vistoWidth = 16;
  const vistoX = pageWidth - marginX - vistoWidth - 2;
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.2);
  doc.rect(vistoX, currentY + 1.5, vistoWidth, 10);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Nota / Visto', vistoX + vistoWidth / 2, currentY + 4.8, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('______', vistoX + vistoWidth / 2, currentY + 9.5, { align: 'center' });

  // QR Code de Acesso Rápido à Versão Digital (Vinculado ao ID da Atividade)
  const qrSize = 9.5;
  const qrX = vistoX - qrSize - 3;
  const urlDigital = `https://adaptaedu.seduc.go.gov.br?view=atividade&id=${encodeURIComponent(atividade.id)}`;
  
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.2);
  doc.rect(qrX - 0.5, currentY + 1, qrSize + 1, qrSize + 2.5);
  desenharQrCodeVetorialNoDoc(doc, urlDigital, qrX, currentY + 1.3, qrSize);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.2);
  doc.setTextColor(71, 85, 105);
  doc.text('QR DIGITAL', qrX + qrSize / 2, currentY + qrSize + 3.1, { align: 'center' });

  // Divisória interna sutil
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);
  doc.line(marginX, currentY + 13, pageWidth - marginX, currentY + 13);

  // Metadados do Estudante, Turma, Professor, Disciplina, Conteúdo
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);

  // Linha 1 de metadados
  doc.text(`Estudante: ${atividade.estudanteNome}`, marginX + 3, currentY + 17.5);
  doc.text(`Turma: ${atividade.turma}`, marginX + 115, currentY + 17.5);

  // Linha 2 de metadados
  doc.text(`Componente: ${atividade.disciplina}`, marginX + 3, currentY + 21.5);
  doc.text(`Bimestre: ${atividade.bimestre || '1º Bimestre'}`, marginX + 75, currentY + 21.5);
  doc.text(`Data: ${atividade.dataCriacao}`, marginX + 115, currentY + 21.5);

  // Linha 3 de metadados
  doc.text(`Professor(a): ${atividade.professorNome}`, marginX + 3, currentY + 25.5);
  doc.text(`Conteúdo: ${atividade.conteudo}`, marginX + 75, currentY + 25.5);

  currentY += headerBoxHeight + 3.5;

  // 2. Objeto de Conhecimento e Faixa de Habilidade Curricular (Multi-linhas e sem cortes)
  const exibirHabilidade = atividade.exibirHabilidadeCabecalho !== 'nao_exibir';
  
  if (atividade.objetoConhecimento || exibirHabilidade) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);

    // Objeto de Conhecimento se informado
    if (atividade.objetoConhecimento) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(51, 65, 85);
      doc.text('Objeto de Conhecimento: ', marginX, currentY + 3.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      const objPrefixW = doc.getTextWidth('Objeto de Conhecimento: ');
      const objLinhas = doc.splitTextToSize(atividade.objetoConhecimento, contentWidth - objPrefixW);
      doc.text(objLinhas, marginX + objPrefixW, currentY + 3.5);
      currentY += objLinhas.length * 3.8 + 2;
    }

    if (exibirHabilidade) {
      const codigoTexto = `[${atividade.habilidadeCodigo}]`;
      const descTexto = atividade.exibirHabilidadeCabecalho === 'somente_codigo'
        ? codigoTexto
        : atividade.exibirHabilidadeCabecalho === 'somente_descricao'
        ? atividade.habilidadeDescricao
        : `${codigoTexto} – ${atividade.habilidadeDescricao}`;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      const habLabel = 'Habilidade da Matriz Curricular: ';
      const labelW = doc.getTextWidth(habLabel);
      
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      const habLinhas = doc.splitTextToSize(descTexto, contentWidth - 6);
      const habBoxH = Math.max(7, habLinhas.length * 3.8 + 4);

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.rect(marginX, currentY, contentWidth, habBoxH, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(habLabel, marginX + 3, currentY + 4.2);

      doc.setFont('helvetica', 'italic');
      doc.setTextColor(30, 41, 59);
      doc.text(habLinhas, marginX + 3, currentY + 4.2 + (habLinhas.length > 1 ? 3.5 : 0));

      currentY += habBoxH + 2.5;

      // Habilidades Complementares se existirem
      if (atividade.habilidadesComplementares && atividade.habilidadesComplementares.length > 0) {
        atividade.habilidadesComplementares.forEach((comp, compIdx) => {
          const compTexto = `${compIdx + 1}. [${comp.codigo}] – ${comp.descricao}`;
          const compLinhas = doc.splitTextToSize(compTexto, contentWidth - 8);
          const compBoxH = compLinhas.length * 3.6 + 3;

          doc.setFillColor(241, 245, 249);
          doc.rect(marginX + 2, currentY, contentWidth - 4, compBoxH, 'FD');
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6.5);
          doc.setTextColor(51, 65, 85);
          doc.text(compLinhas, marginX + 4, currentY + 3.2);
          currentY += compBoxH + 1.5;
        });
      }
    }
  }

  // 3. Badge de Alinhamento ao PEI
  if (atividade.alinhadaAoPei) {
    doc.setFillColor(236, 253, 245);
    doc.setDrawColor(16, 185, 129);
    doc.rect(marginX, currentY, contentWidth, 5.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(6, 95, 70);
    doc.text('✓ ATIVIDADE ADAPTADA EM CONFORMIDADE COM O PEI (PLANO DE ENSINO INDIVIDUALIZADO)', marginX + 3, currentY + 3.8);
    if (atividade.peiAlinhadoPor) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.text(`Validação: ${atividade.peiAlinhadoPor}`, pageWidth - marginX - 3, currentY + 3.8, { align: 'right' });
    }
    currentY += 8;
  }

  const ehBastao = 
    atividade.formatoLetra === 'bastao' ||
    atividade.usarCaixaAlta ||
    atividade.estiloTipograficoVisual === 'letra_bastao' ||
    atividade.estiloTipograficoVisual === 'letra_bastao_desenho_matriz' ||
    atividade.estiloTipograficoVisual === 'so_desenhos';

  if (atividade.estiloTipograficoVisual === 'so_desenhos') {
    doc.setFillColor(254, 243, 199);
    doc.setDrawColor(217, 119, 6);
    doc.rect(marginX, currentY, contentWidth, 5.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(146, 64, 14);
    doc.text('🎨 ATIVIDADE VISUAL BASEADA EXCLUSIVAMENTE EM DESENHOS PEDAGÓGICOS DA MATRIZ', marginX + 3, currentY + 3.8);
    currentY += 8;
  }

  // 4. Questões Adaptadas
  atividade.questoes.forEach((q, idx) => {
    checkPageBreak(25);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    const numTexto = `Questão ${q.numero || idx + 1}: `;
    doc.text(numTexto, marginX, currentY);

    doc.setFont('helvetica', 'normal');
    const numWidth = doc.getTextWidth(numTexto);
    const enunciadoOriginal = q.enunciado || '';
    const enunciadoTexto = ehBastao ? enunciadoOriginal.toUpperCase() : enunciadoOriginal;
    const enunciadoLinhas = doc.splitTextToSize(enunciadoTexto, contentWidth - numWidth);
    doc.text(enunciadoLinhas, marginX + numWidth, currentY);
    currentY += enunciadoLinhas.length * 4.2 + 2;

    // Alternativas
    if (q.alternativas && q.alternativas.length > 0) {
      q.alternativas.forEach((alt) => {
        checkPageBreak(7);
        doc.setDrawColor(71, 85, 105);
        doc.setLineWidth(0.2);
        doc.rect(marginX + 4, currentY - 2.5, 3.2, 3.2);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(30, 41, 59);
        const altTexto = ehBastao ? alt.toUpperCase() : alt;
        const altLinhas = doc.splitTextToSize(altTexto, contentWidth - 14);
        doc.text(altLinhas, marginX + 10, currentY);
        currentY += altLinhas.length * 3.8 + 1.8;
      });
      currentY += 1.5;
    }

    // Linhas pautadas para resposta discursiva
    if (q.linhasResposta && q.linhasResposta > 0) {
      for (let l = 0; l < q.linhasResposta; l++) {
        checkPageBreak(6);
        currentY += 5;
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.2);
        doc.line(marginX + 4, currentY, pageWidth - marginX - 4, currentY);
      }
      currentY += 2.5;
    }

    currentY += 3.5;
  });

  // 5. Campo de Assinatura do Professor
  checkPageBreak(22);
  currentY += 7;
  const assWidth = 55;
  const assX = (pageWidth - assWidth) / 2;
  doc.setDrawColor(71, 85, 105);
  doc.setLineWidth(0.25);
  doc.line(assX, currentY, assX + assWidth, currentY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text(atividade.professorNome, pageWidth / 2, currentY + 3.8, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Assinatura do(a) Professor(a)', pageWidth / 2, currentY + 7, { align: 'center' });

  return currentY;
}

/**
 * Gera o documento jsPDF programaticamente caso a captura do DOM via html2canvas falhe
 */
export function gerarAtividadePdfProgramatico(
  atividade: AtividadeAdaptada,
  escolaConfig?: Partial<EscolaConfig>
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 10; // Margens estritas de 10mm (190mm de largura útil)

  renderizarAtividadeNoDoc(doc, atividade, escolaConfig, true);

  // Rodapé Institucional
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      escolaConfig?.textoRodape || 'Documento escolar gerado para avaliação pedagógica individualizada adaptada.',
      marginX,
      pageHeight - 6
    );
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - marginX, pageHeight - 6, { align: 'right' });
  }

  return doc;
}

/**
 * Gera um documento PDF contínuo contendo múltiplas atividades adaptadas,
 * otimizado para impressão em lote na folha A4 com logo institucional padronizado e margens de 10mm.
 */
export function gerarMultiplasAtividadesPdfProgramatico(
  atividades: AtividadeAdaptada[],
  escolaConfig?: Partial<EscolaConfig>
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 10; // Margens estritas de 10mm

  atividades.forEach((ativ, idx) => {
    if (idx > 0) {
      doc.addPage();
    }
    renderizarAtividadeNoDoc(doc, ativ, escolaConfig, true);
  });

  // Numeração contínua de páginas ao longo de todo o documento
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      escolaConfig?.textoRodape || 'Documento escolar gerado para avaliação pedagógica individualizada adaptada.',
      marginX,
      pageHeight - 6
    );
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - marginX, pageHeight - 6, { align: 'right' });
  }

  return doc;
}

/**
 * Exporta a folha A4 da Atividade Adaptada para PDF.
 * Garante:
 * 1) Pré-carregamento fiel das fontes acessíveis 'Lexend' e 'Comic Neue' para dislexia;
 * 2) Margens estritas de 10mm no documento A4;
 * 3) Fatiamento inteligente de páginas evitando qualquer corte em tabelas, linhas ou caixas de questões;
 * 4) Fallback vetorial jsPDF imediato se html2canvas não estiver disponível.
 */
export async function exportarAtividadeParaPdf(
  atividade: AtividadeAdaptada,
  escolaConfig?: Partial<EscolaConfig>,
  elementoDomId: string = 'folha-a4-impressao'
): Promise<{ doc: jsPDF; fileName: string; blob: Blob }> {
  const fileName = gerarNomeArquivoAtividadePdf(atividade);
  const element = typeof document !== 'undefined' ? document.getElementById(elementoDomId) : null;

  if (element && typeof window !== 'undefined') {
    try {
      // 1. Pré-carregamento e prontidão das fontes para alunos com dislexia
      if ('fonts' in document) {
        try {
          await document.fonts.ready;
          await Promise.allSettled([
            document.fonts.load('400 14px Lexend'),
            document.fonts.load('600 14px Lexend'),
            document.fonts.load('700 14px Lexend'),
            document.fonts.load('400 14px "Comic Neue"'),
            document.fonts.load('700 14px "Comic Neue"'),
          ]);
        } catch (fontErr) {
          console.warn('[PDF Engine] Aviso ao pré-carregar fontes acessíveis:', fontErr);
        }
      }

      // 2. Renderiza a folha A4 com html2canvas em alta densidade (escala 2x / 300 DPI)
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1024,
      });

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidthMm = 210;
      const pageHeightMm = 297;
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;

      // Altura correspondente a uma página A4 na escala do canvas em pixels
      const pageHeightPx = (canvasWidth * pageHeightMm) / pageWidthMm;

      // 3. Detecção de blocos indivisíveis para evitar cortes em tabelas e questões
      const elementRect = element.getBoundingClientRect();
      const avoidElements = Array.from(
        element.querySelectorAll(
          'table, tr, tbody, thead, .questao-container, .bloco-questao, .tabela-adaptada, .break-inside-avoid, .cabecalho-a4, .assinatura-box, .pauta-caligrafica'
        )
      );

      const scaleRatio = canvasWidth / (element.offsetWidth || 1);
      const safeBlocks = avoidElements
        .map((el) => {
          const r = el.getBoundingClientRect();
          return {
            top: (r.top - elementRect.top) * scaleRatio,
            bottom: (r.bottom - elementRect.top) * scaleRatio,
            height: r.height * scaleRatio,
          };
        })
        .filter((b) => b.height > 8 && b.height < pageHeightPx);

      let currentSliceTop = 0;
      let pageIndex = 0;

      while (currentSliceTop < canvasHeight) {
        if (pageIndex > 0) {
          doc.addPage();
        }

        let idealSliceBottom = currentSliceTop + pageHeightPx;

        // Se a fatia ultrapassar o final do canvas, ajusta para o fim
        if (idealSliceBottom >= canvasHeight) {
          idealSliceBottom = canvasHeight;
        } else {
          // Verifica se o ponto de corte intercepta o meio de uma tabela ou questão
          const intersectingBlock = safeBlocks.find(
            (b) =>
              b.top < idealSliceBottom &&
              b.bottom > idealSliceBottom &&
              b.top > currentSliceTop + 60
          );

          if (intersectingBlock) {
            // Ajusta o corte para logo acima da tabela ou questão, mantendo respiro de 4px para preservar bordas
            idealSliceBottom = Math.max(currentSliceTop + 60, intersectingBlock.top - 4);
          }
        }

        const sliceHeightPx = Math.max(1, idealSliceBottom - currentSliceTop);
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvasWidth;
        sliceCanvas.height = sliceHeightPx;
        const sliceCtx = sliceCanvas.getContext('2d');

        if (sliceCtx) {
          sliceCtx.fillStyle = '#ffffff';
          sliceCtx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
          sliceCtx.drawImage(
            canvas,
            0,
            currentSliceTop,
            canvasWidth,
            sliceHeightPx,
            0,
            0,
            canvasWidth,
            sliceHeightPx
          );

          const imgData = sliceCanvas.toDataURL('image/jpeg', 0.98);
          const sliceHeightMm = (sliceHeightPx * pageWidthMm) / canvasWidth;
          doc.addImage(imgData, 'JPEG', 0, 0, pageWidthMm, sliceHeightMm, undefined, 'FAST');
        }

        currentSliceTop = idealSliceBottom;
        pageIndex++;
      }

      const blob = doc.output('blob');
      return { doc, fileName, blob };
    } catch (err) {
      console.warn('[PDF Export] html2canvas falhou ou elemento indisponível. Usando gerador vetorial jsPDF:', err);
    }
  }

  // 4. Fallback de alta precisão via jsPDF nativo com margens estritas de 10mm
  const docFallback = gerarAtividadePdfProgramatico(atividade, escolaConfig);
  const blobFallback = docFallback.output('blob');
  return { doc: docFallback, fileName, blob: blobFallback };
}

/**
 * Dispara o download local imediato do arquivo PDF da folha A4 no navegador do usuário
 */
export async function baixarAtividadeComoPdf(
  atividade: AtividadeAdaptada,
  escolaConfig?: Partial<EscolaConfig>,
  elementoDomId: string = 'folha-a4-impressao'
): Promise<{ fileName: string; blob: Blob }> {
  const { doc, fileName, blob } = await exportarAtividadeParaPdf(atividade, escolaConfig, elementoDomId);
  doc.save(fileName);
  return { fileName, blob };
}

/**
 * Exporta múltiplas atividades adaptadas em um único arquivo PDF contínuo formatado em A4
 */
export async function exportarMultiplasAtividadesPdf(
  atividades: AtividadeAdaptada[],
  escolaConfig?: Partial<EscolaConfig>
): Promise<{ doc: jsPDF; fileName: string; blob: Blob }> {
  const doc = gerarMultiplasAtividadesPdfProgramatico(atividades, escolaConfig);
  const dataHoje = new Date().toISOString().split('T')[0];
  const fileName = `Coletanea_Atividades_Adaptadas_${atividades.length}_itens_${dataHoje}.pdf`;
  const blob = doc.output('blob');
  return { doc, fileName, blob };
}

/**
 * Baixa diretamente o arquivo PDF contínuo com múltiplas atividades adaptadas
 */
export async function baixarMultiplasAtividadesComoPdf(
  atividades: AtividadeAdaptada[],
  escolaConfig?: Partial<EscolaConfig>
): Promise<{ fileName: string; blob: Blob }> {
  const { doc, fileName, blob } = await exportarMultiplasAtividadesPdf(atividades, escolaConfig);
  doc.save(fileName);
  return { fileName, blob };
}

