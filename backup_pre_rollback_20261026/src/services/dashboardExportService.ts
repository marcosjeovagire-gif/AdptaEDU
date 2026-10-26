import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * MOTOR DE EXPORTAÇÃO PDF (REQUISITO 4)
 */

export * from './dashboardPdfService';

export async function exportarAtividadeA4(elementId: string, fileName: string): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) return;

  try {
    await document.fonts.ready;
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 1024
    });

    const imgData = canvas.toDataURL('image/jpeg', 1.0);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
    pdf.save(fileName);
  } catch (error) {
    console.error('[PDF Export] Falha:', error);
  }
}

export const pdfEngine = {
  exportarAtividadeA4
};
