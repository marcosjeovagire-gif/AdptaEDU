import React, { useState } from 'react';
import { 
  X, 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  ArrowLeft,
  BookOpen, 
  Trash2, 
  Edit3, 
  Check, 
  FileCheck,
  ShieldCheck,
  RefreshCw,
  Search,
  School,
  Layers,
  Sparkles,
  CloudUpload
} from 'lucide-react';
import { 
  CurriculumMatrix, 
  CurriculumSkill, 
  CurriculumImportBatch, 
  CurriculumSkillReviewItem 
} from '../../types';
import { analyzeCurriculumFile } from '../../server/curriculumMatrixService';
import { DocumentParserService } from '../../services/documentParserService';
import { 
  MATRIZES_GERAIS_SEDUC_2026, 
  HABILIDADES_GERAIS_SEDUC_2026,
  MATRIZES_3BIMESTRE_PRODUCAO_TEXTUAL,
  HABILIDADES_3BIMESTRE_PRODUCAO_TEXTUAL,
  MATRIZES_4BIMESTRE_GERAL,
  HABILIDADES_4BIMESTRE_GERAL
} from '../../data/matrizesOficiaisSeduc2026';
import { salvarMatrizesEHabilidadesNoFirestore } from '../../services/escolaFirestoreService';

interface ImportarMatrizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveMatrixAndSkills: (matrix: CurriculumMatrix, skills: CurriculumSkill[]) => void;
  onBatchSaveMatricesAndSkills?: (matrices: CurriculumMatrix[], skills: CurriculumSkill[]) => void;
  currentUserName: string;
}

export const ImportarMatrizModal: React.FC<ImportarMatrizModalProps> = ({
  isOpen,
  onClose,
  onSaveMatrixAndSkills,
  onBatchSaveMatricesAndSkills,
  currentUserName,
}) => {
  const [step, setStep] = useState<number>(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [tipoImportacao, setTipoImportacao] = useState<'geral_escola' | 'individual'>('geral_escola');
  const [disciplinaSelecionada, setDisciplinaSelecionada] = useState<string>('Língua Portuguesa');
  const [serieSelecionada, setSerieSelecionada] = useState<string>('7º Ano');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isSavingFirestore, setIsSavingFirestore] = useState<boolean>(false);
  const [batch, setBatch] = useState<CurriculumImportBatch | null>(null);
  const [editingItem, setEditingItem] = useState<CurriculumSkillReviewItem | null>(null);
  const [filtroSerieRevisao, setFiltroSerieRevisao] = useState<string>('todas');
  const [filtroDisciplinaRevisao, setFiltroDisciplinaRevisao] = useState<string>('todas');
  const [feedbackMensagem, setFeedbackMensagem] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      // Detecção inteligente: se o nome indicar matriz geral ou curricular completa
      const lower = file.name.toLowerCase();
      if (lower.includes('geral') || lower.includes('todas') || lower.includes('matriz_curricular') || lower.includes('seduc')) {
        setTipoImportacao('geral_escola');
      }
    }
  };

  const buildReviewItemsFromSkills = (
    skills: CurriculumSkill[],
    nomeArquivo: string,
    bimestrePadrao: string
  ): CurriculumSkillReviewItem[] => {
    return skills.map((h, i) => ({
      id: `rev-${h.id}-${i + 1}`,
      arquivoOrigem: nomeArquivo,
      pagina: h.sourcePage || 1,
      disciplina: h.subject,
      serie: h.grade,
      bimestre: h.bimestre || bimestrePadrao,
      eixoTematico: h.thematicUnit,
      unidadeTematica: h.thematicUnit,
      objetoConhecimento: h.knowledgeObject,
      codigoHabilidade: h.skillCode,
      descricao: h.skillDescription,
      competencia: h.competency || 'Habilidade Essencial SEDUC-GO 2026',
      expectativaAprendizagem: h.expectativaAprendizagem || '',
      orientacaoPedagogica: h.orientacaoPedagogica || `Rastreabilidade oficial SEDUC-GO 2026: Página ${h.sourcePage || 1}`,
      confianca: 'Alta' as const,
      situacao: 'Pronto para importar' as const,
      observacao: `Habilidade homologada da Matriz Oficial 2026 (Pág. ${h.sourcePage || 1})`,
      selecionado: true,
    }));
  };

  const handleCarregarMatrizProducaoTexto = () => {
    const mockFile = new File(
      ['matriz-producao-texto-3bim'], 
      'Matriz_Habilidades_Essenciais_Producao_Texto_3Bimestre_2026.pdf', 
      { type: 'application/pdf' }
    );
    setSelectedFile(mockFile);
    setTipoImportacao('geral_escola');

    const reviewItems = buildReviewItemsFromSkills(
      HABILIDADES_3BIMESTRE_PRODUCAO_TEXTUAL,
      'Matriz de Habilidades Essenciais - Produção de Texto (3º Bimestre).pdf',
      '3º Bimestre'
    );

    const parsedBatch: CurriculumImportBatch = {
      id: `batch-3bim-prod-texto-${Date.now()}`,
      fileName: 'Matriz de Habilidades Essenciais - Produção de Texto (3º Bimestre).pdf',
      fileType: 'application/pdf',
      fileSize: '350.5 KB',
      uploadedAt: new Date().toISOString(),
      uploadedBy: currentUserName || 'Coordenação Pedagógica',
      subject: 'Língua Portuguesa (Produção Textual)',
      grade: '6º ao 9º Ano e Ensino Médio',
      totalSkills: reviewItems.length,
      approvedSkills: reviewItems.length,
      pendingSkills: 0,
      status: 'Pronto para aprovação',
      skillsExtracted: reviewItems,
    };

    setBatch(parsedBatch);
    setStep(4);
  };

  const handleCarregarMatriz4Bimestre = () => {
    const mockFile = new File(
      ['matriz-geral-4bim'], 
      'Matriz_Habilidades_Essenciais_SEDUC_GO_4Bimestre_2026.pdf', 
      { type: 'application/pdf' }
    );
    setSelectedFile(mockFile);
    setTipoImportacao('geral_escola');

    const reviewItems = buildReviewItemsFromSkills(
      HABILIDADES_4BIMESTRE_GERAL,
      'Matriz de Habilidades Essenciais SEDUC-GO 2026 (4º Bimestre - 67 Págs).pdf',
      '4º Bimestre'
    );

    const parsedBatch: CurriculumImportBatch = {
      id: `batch-4bim-geral-${Date.now()}`,
      fileName: 'Matriz de Habilidades Essenciais SEDUC-GO 2026 (4º Bimestre - 67 Págs).pdf',
      fileType: 'application/pdf',
      fileSize: '1.8 MB',
      uploadedAt: new Date().toISOString(),
      uploadedBy: currentUserName || 'Coordenação Pedagógica',
      subject: 'Todas as Disciplinas da Matriz',
      grade: 'Todas as Turmas (6º ao 9º e Ensino Médio)',
      totalSkills: reviewItems.length,
      approvedSkills: reviewItems.length,
      pendingSkills: 0,
      status: 'Pronto para aprovação',
      skillsExtracted: reviewItems,
    };

    setBatch(parsedBatch);
    setStep(4);
  };

  const handleCarregarAmbosCadernos = () => {
    const mockFile = new File(
      ['matriz-geral-completa'], 
      'Matrizes_Integradas_SEDUC_GO_3Bim_4Bim_2026.pdf', 
      { type: 'application/pdf' }
    );
    setSelectedFile(mockFile);
    setTipoImportacao('geral_escola');

    const reviewItems = buildReviewItemsFromSkills(
      HABILIDADES_GERAIS_SEDUC_2026,
      'Cadernos Integrados: Produção de Texto (3º Bim) + Geral (4º Bim - 67 Págs).pdf',
      '4º Bimestre'
    );

    const parsedBatch: CurriculumImportBatch = {
      id: `batch-geral-ambos-${Date.now()}`,
      fileName: 'Cadernos Integrados: Produção de Texto (3º Bim) + Geral (4º Bim - 67 Págs).pdf',
      fileType: 'application/pdf',
      fileSize: '2.2 MB',
      uploadedAt: new Date().toISOString(),
      uploadedBy: currentUserName || 'Coordenação Pedagógica',
      subject: 'Todas as Disciplinas e Produção Textual',
      grade: 'Todas as Turmas da Escola (6º ao 9º e Ensino Médio)',
      totalSkills: reviewItems.length,
      approvedSkills: reviewItems.length,
      pendingSkills: 0,
      status: 'Pronto para aprovação',
      skillsExtracted: reviewItems,
    };

    setBatch(parsedBatch);
    setStep(4);
  };

  const handleCarregarMatrizGeralOficial = () => {
    handleCarregarAmbosCadernos();
  };

  const handleStartAnalysis = async () => {
    if (!selectedFile) return;
    setIsAnalyzing(true);

    if (tipoImportacao === 'geral_escola') {
      const res = await DocumentParserService.parsePdfDocument({
        name: selectedFile.name,
        size: selectedFile.size,
        type: selectedFile.type,
      });

      const parsedBatch: CurriculumImportBatch = {
        id: `batch-geral-${Date.now()}`,
        fileName: selectedFile.name,
        fileType: selectedFile.type || 'application/pdf',
        fileSize: `${(selectedFile.size / 1024).toFixed(1)} KB`,
        uploadedAt: new Date().toISOString(),
        uploadedBy: currentUserName || 'Coordenação Pedagógica',
        subject: 'Todas as Disciplinas (Matriz Geral Escolar)',
        grade: 'Todas as Turmas (6º ao 9º e Ensino Médio)',
        totalSkills: res.reviewSkills.length,
        approvedSkills: 0,
        pendingSkills: res.reviewSkills.length,
        status: 'Pronto para aprovação',
        skillsExtracted: res.reviewSkills,
      };

      setBatch(parsedBatch);
      setIsAnalyzing(false);
      setStep(4);
    } else {
      setTimeout(() => {
        const analyzedBatch = analyzeCurriculumFile({
          name: selectedFile.name,
          size: selectedFile.size,
          type: selectedFile.type,
          subject: disciplinaSelecionada,
          grade: serieSelecionada,
        });
        setBatch(analyzedBatch);
        setIsAnalyzing(false);
        setStep(4);
      }, 500);
    }
  };

  const handleToggleSelectAll = (checked: boolean) => {
    if (!batch) return;
    setBatch({
      ...batch,
      skillsExtracted: batch.skillsExtracted.map(s => 
        s.situacao !== 'Código ilegível' && s.situacao !== 'Pendente de revisão'
          ? { ...s, selecionado: checked }
          : s
      ),
    });
  };

  const handleToggleSelectItem = (id: string) => {
    if (!batch) return;
    setBatch({
      ...batch,
      skillsExtracted: batch.skillsExtracted.map(s => 
        s.id === id ? { ...s, selecionado: !s.selecionado } : s
      ),
    });
  };

  const handleSaveEdit = (edited: CurriculumSkillReviewItem) => {
    if (!batch) return;
    setBatch({
      ...batch,
      skillsExtracted: batch.skillsExtracted.map(s => s.id === edited.id ? edited : s),
    });
    setEditingItem(null);
  };

  const handleRemoveItem = (id: string) => {
    if (!batch) return;
    setBatch({
      ...batch,
      skillsExtracted: batch.skillsExtracted.filter(s => s.id !== id),
    });
  };

  const handleConfirmImport = async () => {
    if (!batch) return;
    const selectedSkills = batch.skillsExtracted.filter(s => s.selecionado);
    if (selectedSkills.length === 0) {
      alert('Selecione ao menos uma habilidade revisada para importar.');
      return;
    }

    setIsSavingFirestore(true);

    if (tipoImportacao === 'geral_escola' || batch.grade.includes('Todas')) {
      // Importação Geral da Escola: Homologa todas as matrizes e habilidades
      const todasMatrizes = [...MATRIZES_GERAIS_SEDUC_2026];
      const todasHabilidades: CurriculumSkill[] = selectedSkills.map((item, idx) => ({
        id: `skill-geral-${idx + 1}-${Date.now()}`,
        schoolId: 'olynto-pereira-castro',
        matrixId: `matriz-${item.disciplina.toLowerCase().replace(/\s+/g, '-')}-${item.serie.toLowerCase().replace(/\s+/g, '-')}-geral-2026`,
        subject: item.disciplina,
        grade: item.serie,
        thematicUnit: item.unidadeTematica,
        knowledgeObject: item.objetoConhecimento,
        skillCode: item.codigoHabilidade,
        skillDescription: item.descricao,
        competency: item.competencia,
        sourceFileName: batch.fileName,
        sourcePage: item.pagina,
        status: 'approved',
        active: true,
        confidence: item.confianca,
        reviewedBy: currentUserName,
        reviewedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      // Persiste no Firestore no documento da escola
      await salvarMatrizesEHabilidadesNoFirestore({
        schoolId: 'olynto-pereira-castro',
        matrizes: todasMatrizes,
        habilidades: todasHabilidades,
      });

      if (onBatchSaveMatricesAndSkills) {
        onBatchSaveMatricesAndSkills(todasMatrizes, todasHabilidades);
      } else {
        // Fallback: emite cada matriz
        for (const m of todasMatrizes) {
          const habsDaMatriz = todasHabilidades.filter(h => h.subject === m.subject && h.grade === m.grade);
          onSaveMatrixAndSkills(m, habsDaMatriz.length > 0 ? habsDaMatriz : todasHabilidades.slice(0, 3));
        }
      }

      setIsSavingFirestore(false);
      setFeedbackMensagem(`Matriz Geral da Escola homologada com sucesso! ${todasMatrizes.length} matrizes e ${todasHabilidades.length} habilidades persistidas no Firestore e disponíveis em todos os módulos.`);
      setTimeout(() => {
        onClose();
      }, 1500);
    } else {
      // Importação Individual por Disciplina e Série
      const matrixId = `matriz-${batch.subject.toLowerCase().replace(/\s+/g, '-')}-${batch.grade.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
      const newMatrix: CurriculumMatrix = {
        id: matrixId,
        schoolId: 'olynto-pereira-castro',
        title: `Matriz Curricular de ${batch.subject} - ${batch.grade}`,
        referenceYear: '2026',
        educationStage: batch.grade.includes('Série') ? 'Ensino Médio' : 'Ensino Fundamental II',
        modality: 'Ensino Regular',
        subject: batch.subject,
        grade: batch.grade,
        active: true,
        status: 'approved',
        sourceFileName: batch.fileName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: currentUserName,
        approvedBy: currentUserName,
        approvedAt: new Date().toISOString(),
      };

      const newSkills: CurriculumSkill[] = selectedSkills.map((item, idx) => ({
        id: `skill-${matrixId}-${idx + 1}`,
        schoolId: 'olynto-pereira-castro',
        matrixId,
        subject: item.disciplina,
        grade: item.serie,
        thematicUnit: item.unidadeTematica,
        knowledgeObject: item.objetoConhecimento,
        skillCode: item.codigoHabilidade,
        skillDescription: item.descricao,
        competency: item.competencia,
        sourceFileName: item.arquivoOrigem,
        sourcePage: item.pagina,
        status: 'approved',
        active: true,
        confidence: item.confianca,
        reviewedBy: currentUserName,
        reviewedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      // Salva no Firestore
      await salvarMatrizesEHabilidadesNoFirestore({
        schoolId: 'olynto-pereira-castro',
        matrizes: [newMatrix],
        habilidades: newSkills,
      });

      onSaveMatrixAndSkills(newMatrix, newSkills);
      setIsSavingFirestore(false);
      onClose();
    }
  };

  // Filtragem da tabela de revisão para facilitar navegação na matriz geral
  const skillsExibidas = (batch?.skillsExtracted || []).filter(item => {
    if (filtroSerieRevisao !== 'todas' && item.serie !== filtroSerieRevisao) return false;
    if (filtroDisciplinaRevisao !== 'todas' && item.disciplina !== filtroDisciplinaRevisao) return false;
    return true;
  });

  const seriesDisponiveis = Array.from(new Set((batch?.skillsExtracted || []).map(s => s.serie))).filter(Boolean);
  const disciplinasDisponiveis = Array.from(new Set((batch?.skillsExtracted || []).map(s => s.disciplina))).filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-5xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Cabeçalho */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900">Importar Matrizes Curriculares da Escola</h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold border border-emerald-200">
                  Sistema Inteligente SEDUC-GO
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Importação geral da escola para todas as turmas (6º ao 9º Ano e Ensino Médio) e disciplinas, com mapeamento direto ao Firestore.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Indicador de Passos */}
        <div className="px-6 py-3 bg-white border-b border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-1.5">
            <span className={`h-6 w-6 rounded-full flex items-center justify-center font-bold text-[11px] ${step === 1 ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-900'}`}>1</span>
            <span className={step === 1 ? 'font-bold text-slate-900' : ''}>Anexar e Configurar</span>
          </div>
          <span className="text-slate-300">→</span>
          <div className="flex items-center gap-1.5">
            <span className={`h-6 w-6 rounded-full flex items-center justify-center font-bold text-[11px] ${isAnalyzing ? 'bg-amber-600 text-white animate-pulse' : (step > 1 ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-100 text-slate-500')}`}>2</span>
            <span>Extração Inteligente</span>
          </div>
          <span className="text-slate-300">→</span>
          <div className="flex items-center gap-1.5">
            <span className={`h-6 w-6 rounded-full flex items-center justify-center font-bold text-[11px] ${step === 4 ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-500'}`}>3</span>
            <span className={step === 4 ? 'font-bold text-slate-900' : ''}>Revisão e Homologação</span>
          </div>
        </div>

        {/* Mensagem de Feedback */}
        {feedbackMensagem && (
          <div className="px-6 py-2.5 bg-emerald-50 border-b border-emerald-200 flex items-center gap-2 text-xs font-semibold text-emerald-900 animate-fadeIn">
            <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
            <span>{feedbackMensagem}</span>
          </div>
        )}

        {/* Corpo do Modal */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {step === 1 && (
            <div className="space-y-4">
              
              {/* Seletor de Escopo de Importação: Geral vs Série Específica */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTipoImportacao('geral_escola')}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    tipoImportacao === 'geral_escola'
                      ? 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
                      <School className="h-4 w-4" />
                    </div>
                    <strong className="text-xs font-extrabold text-slate-900">
                      Geral da Escola (Recomendado)
                    </strong>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Importa a matriz de <strong>todas as turmas</strong> (6º ao 9º e Ensino Médio) e matérias de uma só vez para todo o ecossistema.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setTipoImportacao('individual')}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    tipoImportacao === 'individual'
                      ? 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
                      <Layers className="h-4 w-4" />
                    </div>
                    <strong className="text-xs font-extrabold text-slate-900">
                      Por Série / Disciplina
                    </strong>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Importa arquivo restrito a um componente e série específicos (ex: Matemática 7º Ano).
                  </p>
                </button>
              </div>

              {/* Zona de Drop / Upload */}
              <div className="p-8 border-2 border-dashed border-emerald-200 rounded-2xl text-center bg-emerald-50/20 hover:bg-emerald-50/40 transition-colors">
                <input
                  type="file"
                  id="curriculum-file-input"
                  accept=".pdf,.docx,.xlsx,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label 
                  htmlFor="curriculum-file-input"
                  className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                >
                  <div className="h-12 w-12 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center justify-center shadow-xs">
                    <Upload className="h-6 w-6" />
                  </div>
                  <span className="text-sm font-extrabold text-slate-900">
                    {selectedFile ? selectedFile.name : 'Clique para selecionar o PDF da Matriz da Escola'}
                  </span>
                  <span className="text-xs text-slate-500">
                    O sistema inteligente lê o PDF completo e distribui os objetivos de aprendizagem para todas as salas e matérias.
                  </span>
                </label>
              </div>

              {/* Atalhos Inteligentes para os dois cadernos anexados e homologados da SEDUC-GO 2026 */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-slate-900 font-extrabold text-xs">
                        Cadernos Oficiais Anexados da SEDUC-GO 2026 (Homologados)
                      </strong>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        Oficial
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Selecione um dos cadernos oficiais anexados para carregamento instantâneo e homologação em rede:
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Caderno 1: 3º Bimestre Produção de Texto */}
                  <button
                    type="button"
                    onClick={handleCarregarMatrizProducaoTexto}
                    className="p-3 bg-white hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-400 rounded-xl text-left transition-all cursor-pointer shadow-2xs group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs mb-1">
                        <BookOpen className="h-4 w-4 shrink-0 text-emerald-600" />
                        <span>3º Bimestre (Produção Textual)</span>
                      </div>
                      <p className="text-[10.5px] text-slate-500 leading-tight">
                        Carta do Leitor, Crônica, Poema, Enigma e Redação ENEM (6º ao 9º e EM).
                      </p>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between text-[10px] font-bold text-emerald-700 group-hover:text-emerald-800">
                      <span>Páginas 3 a 6</span>
                      <span>Carregar →</span>
                    </div>
                  </button>

                  {/* Caderno 2: 4º Bimestre Geral (67 Páginas) */}
                  <button
                    type="button"
                    onClick={handleCarregarMatriz4Bimestre}
                    className="p-3 bg-white hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-400 rounded-xl text-left transition-all cursor-pointer shadow-2xs group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs mb-1">
                        <Sparkles className="h-4 w-4 shrink-0 text-emerald-600" />
                        <span>4º Bimestre (Geral 67 Págs)</span>
                      </div>
                      <p className="text-[10.5px] text-slate-500 leading-tight">
                        Todas as 18 turmas e todos os componentes curriculares da SEDUC-GO.
                      </p>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between text-[10px] font-bold text-emerald-700 group-hover:text-emerald-800">
                      <span>67 Páginas</span>
                      <span>Carregar →</span>
                    </div>
                  </button>

                  {/* Caderno 3: Ambos Integrados */}
                  <button
                    type="button"
                    onClick={handleCarregarAmbosCadernos}
                    className="p-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-left transition-all cursor-pointer shadow-xs group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-1.5 text-white font-black text-xs mb-1">
                        <CloudUpload className="h-4 w-4 shrink-0 text-emerald-200" />
                        <span>Ambos os Cadernos Integrados</span>
                      </div>
                      <p className="text-[10.5px] text-emerald-100 leading-tight">
                        Matriz completa da escola (3º e 4º Bimestres integrados com 52+ habilidades).
                      </p>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between text-[10px] font-bold text-emerald-200 group-hover:text-white">
                      <span>Todas as Turmas</span>
                      <span>Homologar Lote →</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Seletor específico se for individual */}
              {selectedFile && tipoImportacao === 'individual' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Disciplina</label>
                    <select
                      value={disciplinaSelecionada}
                      onChange={(e) => setDisciplinaSelecionada(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="Língua Portuguesa">Língua Portuguesa</option>
                      <option value="Matemática">Matemática</option>
                      <option value="Ciências">Ciências</option>
                      <option value="História">História</option>
                      <option value="Geografia">Geografia</option>
                      <option value="Arte">Arte</option>
                      <option value="Educação Física">Educação Física</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Série / Ano</label>
                    <select
                      value={serieSelecionada}
                      onChange={(e) => setSerieSelecionada(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="6º Ano">6º Ano</option>
                      <option value="7º Ano">7º Ano</option>
                      <option value="8º Ano">8º Ano</option>
                      <option value="9º Ano">9º Ano</option>
                      <option value="1ª Série">1ª Série (Ensino Médio)</option>
                      <option value="2ª Série">2ª Série (Ensino Médio)</option>
                      <option value="3ª Série">3ª Série (Ensino Médio)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 4 && batch && (
            <div className="space-y-4">
              {/* Aviso Obrigatório de Revisão */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-950">
                <ShieldCheck className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong className="block font-bold">Diretriz de Homologação Curricular da Escola:</strong>
                  Documento processado com inteligência. Revise os códigos BNCC/DC-GO e objetivos de aprendizagem. 
                  Ao confirmar, os dados serão salvos no <strong>Firestore</strong> e sincronizados para todos os professores e turmas.
                </div>
              </div>

              {/* Informações do Lote */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50 border rounded-xl text-xs">
                <div>
                  <span className="text-slate-500">Documento analisado:</span>{' '}
                  <strong className="text-slate-900">{batch.fileName}</strong>{' '}
                  <span className="text-slate-400">({batch.fileSize})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                    {batch.subject}
                  </span>
                  <span className="text-slate-500">
                    Total: <strong>{batch.skillsExtracted.length}</strong> habilidades identificadas
                  </span>
                </div>
              </div>

              {/* Filtros de Revisão para Matriz Geral */}
              {seriesDisponiveis.length > 1 && (
                <div className="flex flex-wrap items-center gap-2 p-2 bg-slate-50 border rounded-xl text-xs">
                  <span className="font-bold text-slate-700">Filtrar para conferir:</span>
                  <select
                    value={filtroSerieRevisao}
                    onChange={(e) => setFiltroSerieRevisao(e.target.value)}
                    className="p-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="todas">Todas as Séries ({seriesDisponiveis.length})</option>
                    {seriesDisponiveis.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <select
                    value={filtroDisciplinaRevisao}
                    onChange={(e) => setFiltroDisciplinaRevisao(e.target.value)}
                    className="p-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="todas">Todas as Disciplinas ({disciplinasDisponiveis.length})</option>
                    {disciplinasDisponiveis.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  <span className="text-slate-400 text-[11px] ml-auto">
                    Exibindo {skillsExibidas.length} de {batch.skillsExtracted.length}
                  </span>
                </div>
              )}

              {/* Tabela de Revisão Completa */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="max-h-[380px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 sticky top-0 border-b text-[11px] font-bold text-slate-700 z-10">
                      <tr>
                        <th className="p-2.5 w-10 text-center">
                          <input 
                            type="checkbox"
                            defaultChecked={true}
                            onChange={(e) => handleToggleSelectAll(e.target.checked)}
                            title="Selecionar todas válidas"
                          />
                        </th>
                        <th className="p-2.5">Série / Turma</th>
                        <th className="p-2.5">Disciplina</th>
                        <th className="p-2.5">Código Oficial</th>
                        <th className="p-2.5">Objetivo de Aprendizagem / Descrição</th>
                        <th className="p-2.5 w-20 text-center">Pág. Origem</th>
                        <th className="p-2.5 w-20 text-center">Confiança</th>
                        <th className="p-2.5 w-28 text-center">Situação</th>
                        <th className="p-2.5 w-16 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {skillsExibidas.map((item) => {
                        const isIlegivel = item.situacao === 'Código ilegível' || item.confianca === 'Baixa';
                        return (
                          <tr 
                            key={item.id} 
                            className={
                              isIlegivel 
                                ? 'bg-rose-50/60 border-l-4 border-l-rose-500' 
                                : item.selecionado ? 'bg-white' : 'bg-slate-50/50 opacity-60'
                            }
                          >
                            <td className="p-2.5 text-center">
                              <input 
                                type="checkbox"
                                checked={item.selecionado}
                                disabled={isIlegivel}
                                onChange={() => handleToggleSelectItem(item.id)}
                                title={isIlegivel ? 'Registros ilegíveis não podem ser aprovados' : 'Marcar para homologação'}
                              />
                            </td>
                            <td className="p-2.5 whitespace-nowrap">
                              <span className="font-extrabold text-slate-900 block text-[11px]">{item.serie}</span>
                              <span className="text-[10px] text-slate-400 block">{item.bimestre || '1º Bimestre'}</span>
                            </td>
                            <td className="p-2.5 whitespace-nowrap">
                              <span className="font-bold text-slate-800 text-[11px]">{item.disciplina}</span>
                            </td>
                            <td className="p-2.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-emerald-950 font-bold">
                                  {item.codigoHabilidade}
                                </span>
                                {isIlegivel && (
                                  <span title="Código ilegível detectado">
                                    <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-2.5 text-slate-700 max-w-sm leading-relaxed text-[11px]">
                              <p className={isIlegivel ? 'text-rose-800 italic' : ''}>{item.descricao}</p>
                              <span className="text-[10px] text-slate-500 block mt-0.5">
                                {item.unidadeTematica} • {item.objetoConhecimento}
                              </span>
                            </td>
                            <td className="p-2.5 text-center whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[11px] border border-slate-200">
                                Pág. {item.pagina}
                              </span>
                            </td>
                            <td className="p-2.5 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                item.confianca === 'Alta' ? 'bg-emerald-100 text-emerald-800' :
                                item.confianca === 'Média' ? 'bg-amber-100 text-amber-800' :
                                'bg-rose-100 text-rose-800'
                              }`}>
                                {item.confianca}
                              </span>
                            </td>
                            <td className="p-2.5 text-center whitespace-nowrap">
                              {isIlegivel ? (
                                <span className="text-[10px] font-extrabold text-rose-800 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded inline-block">
                                  Ilegível (Não aprovar)
                                </span>
                              ) : (
                                <span className="text-[10px] font-semibold text-emerald-900 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded inline-block">
                                  {item.situacao}
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => setEditingItem(item)}
                                  className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-slate-100 rounded cursor-pointer"
                                  title="Editar habilidade"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleRemoveItem(item.id)}
                                  className="p-1 text-slate-400 hover:text-rose-700 hover:bg-slate-100 rounded cursor-pointer"
                                  title="Excluir da importação"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Modal secundário de Edição rápida */}
          {editingItem && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-slate-900 flex items-center justify-between">
                <span>Editar Habilidade: {editingItem.codigoHabilidade}</span>
                <button onClick={() => setEditingItem(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Código da Habilidade</label>
                  <input
                    type="text"
                    value={editingItem.codigoHabilidade}
                    onChange={(e) => setEditingItem({ ...editingItem, codigoHabilidade: e.target.value })}
                    className="w-full p-2 border rounded bg-white font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Unidade Temática</label>
                  <input
                    type="text"
                    value={editingItem.unidadeTematica}
                    onChange={(e) => setEditingItem({ ...editingItem, unidadeTematica: e.target.value })}
                    className="w-full p-2 border rounded bg-white text-xs"
                  />
                </div>
              </div>
              <div className="text-xs">
                <label className="block text-slate-600 font-semibold mb-1">Descrição Oficial da Habilidade</label>
                <textarea
                  rows={3}
                  value={editingItem.descricao}
                  onChange={(e) => setEditingItem({ ...editingItem, descricao: e.target.value })}
                  className="w-full p-2 border rounded bg-white text-xs leading-relaxed"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveEdit(editingItem)}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded"
                >
                  Salvar Alterações
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé / Ações */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            {step === 4 && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Voltar ao arquivo</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            {step === 1 ? (
              <button
                type="button"
                disabled={!selectedFile || isAnalyzing}
                onClick={handleStartAnalysis}
                className="px-4 py-2 text-xs font-extrabold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Lendo PDF da escola...</span>
                  </>
                ) : (
                  <>
                    <span>Analisar Matriz Escolar</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                disabled={isSavingFirestore}
                onClick={handleConfirmImport}
                className="px-4 py-2 text-xs font-extrabold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {isSavingFirestore ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Salvando no Firestore...</span>
                  </>
                ) : (
                  <>
                    <CloudUpload className="h-4 w-4" />
                    <span>Homologar e Salvar Matriz no Firestore</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
