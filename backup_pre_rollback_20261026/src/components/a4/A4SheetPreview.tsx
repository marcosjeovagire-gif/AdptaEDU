import React from 'react';
import { ImageIcon, Printer, Download, Sparkles, Info } from 'lucide-react';
import { AtividadeAdaptadaFull } from '../../types/pedagogico';
import { EscolaConfig } from '../../types';

/**
 * VISUALIZADOR DE FOLHA A4 (REQUISITO 4)
 * Renderiza conteúdo pedagógico com tipografia Lexend e imagens SVG.
 */

interface A4SheetPreviewProps {
  atividade: AtividadeAdaptadaFull;
  escolaConfig: EscolaConfig;
  onExportPdf?: () => void;
  onEditQuestao?: (questaoAtualizada: any) => void;
}

export const A4SheetPreview: React.FC<A4SheetPreviewProps> = ({ atividade, escolaConfig, onExportPdf }) => {
  const isBastao = atividade.formatoLetra === 'bastao' || atividade.usarCaixaAlta;

  return (
    <div className="flex flex-col items-center bg-slate-100 p-4 min-h-screen">
      
      {/* Barra de Ações (Oculta na Impressão) */}
      <div className="no-print w-full max-w-[210mm] mb-4 flex justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 text-emerald-800 font-bold">
          <Sparkles className="h-5 w-5" />
          <span>Atividade Gerada via IA (Multimodal)</span>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={onExportPdf}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-700 text-white rounded-lg font-bold hover:bg-emerald-800 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Exportar PDF</span>
          </button>
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-bold hover:bg-slate-200 transition-colors"
          >
            <Printer className="h-4 w-4" />
            <span>Imprimir</span>
          </button>
        </div>
      </div>

      {/* Painel de Recomendações (Apenas p/ Professor) */}
      {atividade.recomendacoesApoioAI && atividade.recomendacoesApoioAI.length > 0 && (
        <div className="no-print w-full max-w-[210mm] mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3">
          <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed">
            <strong className="block uppercase mb-1">Recomendações de Mediação:</strong>
            <ul className="list-disc list-inside space-y-1">
              {atividade.recomendacoesApoioAI.map((rec, i) => <li key={i}>{rec}</li>)}
            </ul>
          </div>
        </div>
      )}

      {/* FOLHA A4 FÍSICA */}
      <div 
        id="folha-a4-impressao"
        className={`bg-white shadow-2xl mx-auto border border-slate-300 transition-all ${
          isBastao ? 'font-lexend' : 'font-sans'
        }`}
        style={{
          width: '210mm',
          minHeight: '297mm',
          padding: '15mm',
          boxSizing: 'border-box'
        }}
      >
        {/* Cabeçalho Institucional */}
        <div className="border-b-2 border-slate-800 pb-4 mb-6 flex items-start gap-4">
          <div className="flex-1">
            <h1 className="text-sm font-black uppercase text-slate-900 tracking-tighter leading-none">
              {escolaConfig.nome}
            </h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">
              Secretaria de Estado da Educação • SEDUC-GO
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3 text-[11px] text-slate-800 font-bold uppercase">
              <div className="border-b border-dotted border-slate-400">Aluno: {atividade.estudanteNome}</div>
              <div className="border-b border-dotted border-slate-400">Turma: {atividade.turma}</div>
              <div className="border-b border-dotted border-slate-400">Disciplina: {atividade.disciplina}</div>
              <div className="border-b border-dotted border-slate-400">Data: {atividade.dataCriacao}</div>
            </div>
          </div>
          <div className="w-20 h-20 border-2 border-slate-800 flex items-center justify-center text-[10px] font-black text-slate-400">
            VISTO / NOTA
          </div>
        </div>

        {/* Título e Habilidade */}
        <div className="mb-6">
          <div className="inline-block bg-slate-100 px-3 py-1 rounded text-[10px] font-black text-slate-700 mb-2 border border-slate-200 uppercase">
            Habilidade: {atividade.habilidadeCodigo}
          </div>
          <h2 className={`text-xl font-black text-slate-900 ${isBastao ? 'uppercase tracking-wider' : ''}`}>
            {atividade.conteudo}
          </h2>
        </div>

        {/* Conteúdo da Atividade */}
        <div 
          className={`leading-relaxed whitespace-pre-wrap ${
            isBastao ? 'text-lg uppercase tracking-widest font-bold' : 'text-base'
          }`}
        >
          {atividade.observacaoProfessor}
        </div>

        {/* Imagens Multimodais */}
        {atividade.imagensPedagogicas && atividade.imagensPedagogicas.length > 0 && (
          <div className="mt-8 grid grid-cols-1 gap-6">
            {atividade.imagensPedagogicas.map((img, i) => (
              <div key={i} className="flex flex-col items-center gap-2 break-inside-avoid">
                <div 
                  className="w-full max-w-[400px] border border-slate-200 rounded-lg p-4 bg-slate-50"
                  dangerouslySetInnerHTML={{ __html: img.svgCode || '' }}
                />
                <p className="text-[10px] text-slate-500 italic font-bold uppercase tracking-widest text-center">
                  Ilustração: {img.descricao} ({img.alt_text})
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Rodapé da Folha */}
        <div className="mt-auto pt-12 border-t border-slate-200 flex justify-between text-[9px] text-slate-400 font-bold uppercase">
          <span>AdaptaEdu Escolar • SEDUC-GO 2026</span>
          <span>Página 1</span>
        </div>
      </div>

      {/* Info Card de Acessibilidade (Requisito 4) */}
      {isBastao && (
        <div className="no-print mt-6 w-full max-w-[210mm] p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-emerald-600" />
          <span className="text-sm font-bold text-emerald-900 leading-tight">
            Recomendações do Apoio aplicadas: Tipografia Lexend em Caixa Alta, redução de distratores e adaptação cognitiva baseada no PEI.
          </span>
        </div>
      )}
    </div>
  );
};
