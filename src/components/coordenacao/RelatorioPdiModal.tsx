import React, { useState, useMemo } from 'react';
import { 
  X, 
  FileText, 
  Download, 
  Printer, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  Users, 
  GraduationCap, 
  BookOpen, 
  Folder, 
  UploadCloud, 
  ExternalLink, 
  Calendar, 
  Edit3, 
  Sparkles, 
  Award, 
  HeartHandshake, 
  Camera, 
  Check, 
  ChevronRight,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { 
  Estudante, 
  PerfilPedagogico, 
  AtividadeAdaptada, 
  RegistroAcompanhamentoApoio, 
  EscolaConfig 
} from '../../types';
import { 
  PdiPeriodoOptions,
  PERIODOS_PDI_INFO,
  consolidarRelatorioPdiEstudante,
  exportarRelatorioPdiPDF,
  gerarRelatorioPdiPdfBlob
} from '../../services/relatorioPdiService';
import { 
  uploadPdfBlob, 
  isGoogleDriveConnected, 
  UploadResult 
} from '../../services/googleDriveService';

interface RelatorioPdiModalProps {
  isOpen: boolean;
  onClose: () => void;
  estudantes: Estudante[];
  perfisPedagogicos: PerfilPedagogico[];
  atividades: AtividadeAdaptada[];
  registrosApoio?: RegistroAcompanhamentoApoio[];
  escolaConfig?: Partial<EscolaConfig>;
  currentUserName?: string;
  estudanteInicialId?: string;
}

export const RelatorioPdiModal: React.FC<RelatorioPdiModalProps> = ({
  isOpen,
  onClose,
  estudantes,
  perfisPedagogicos,
  atividades,
  registrosApoio = [],
  escolaConfig,
  currentUserName,
  estudanteInicialId
}) => {
  // Estado de seleção do estudante e filtros
  const [estudanteSelecionadoId, setEstudanteSelecionadoId] = useState<string>(() => {
    if (estudanteInicialId) return estudanteInicialId;
    return estudantes[0]?.id || '';
  });

  const [buscaAluno, setBuscaAluno] = useState<string>('');
  const [filtroTurma, setFiltroTurma] = useState<string>('todas');
  const [periodoId, setPeriodoId] = useState<PdiPeriodoOptions['periodoId']>('todos');
  const [anoLetivo, setAnoLetivo] = useState<number>(new Date().getFullYear());

  // Parecer personalizado editável pelo coordenador
  const [parecerEditavel, setParecerEditavel] = useState<string>('');
  const [editandoParecer, setEditandoParecer] = useState<boolean>(false);

  // Estados de exportação
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isSavingToDrive, setIsSavingToDrive] = useState(false);
  const [driveResult, setDriveResult] = useState<UploadResult | null>(null);
  const [driveError, setDriveError] = useState<string | null>(null);

  // Sincroniza se vier estudanteInicialId
  React.useEffect(() => {
    if (estudanteInicialId) {
      setEstudanteSelecionadoId(estudanteInicialId);
    }
  }, [estudanteInicialId]);

  // Lista única de turmas
  const turmasDisponiveis = useMemo(() => {
    const set = new Set<string>();
    estudantes.forEach(e => {
      if (e.turma) set.add(e.turma);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }));
  }, [estudantes]);

  // Estudantes filtrados para o seletor
  const estudantesFiltrados = useMemo(() => {
    return estudantes.filter(e => {
      if (filtroTurma !== 'todas' && e.turma !== filtroTurma) return false;
      if (buscaAluno.trim()) {
        const termo = buscaAluno.toLowerCase();
        const matchNome = e.nome.toLowerCase().includes(termo);
        const matchMat = e.matricula.toLowerCase().includes(termo);
        const matchLaudo = e.laudo?.toLowerCase().includes(termo);
        if (!matchNome && !matchMat && !matchLaudo) return false;
      }
      return true;
    });
  }, [estudantes, filtroTurma, buscaAluno]);

  // Estudante atualmente ativo
  const estudanteAtual = useMemo(() => {
    return estudantes.find(e => e.id === estudanteSelecionadoId) || estudantes[0];
  }, [estudantes, estudanteSelecionadoId]);

  // Perfil pedagógico do estudante atual
  const perfilAtual = useMemo(() => {
    if (!estudanteAtual) return undefined;
    return perfisPedagogicos.find(p => p.estudanteId === estudanteAtual.id || p.estudanteNome === estudanteAtual.nome);
  }, [perfisPedagogicos, estudanteAtual]);

  // Dados consolidados do PDI
  const dadosPdi = useMemo(() => {
    if (!estudanteAtual) return null;
    return consolidarRelatorioPdiEstudante(
      estudanteAtual,
      atividades,
      registrosApoio,
      perfilAtual,
      { periodoId, anoLetivo }
    );
  }, [estudanteAtual, atividades, registrosApoio, perfilAtual, periodoId, anoLetivo]);

  // Inicializa o parecer quando muda o estudante ou período
  React.useEffect(() => {
    if (dadosPdi) {
      setParecerEditavel(dadosPdi.parecerSinteticoPadrao);
      setEditandoParecer(false);
      setDriveResult(null);
      setDriveError(null);
    }
  }, [estudanteAtual?.id, periodoId]);

  if (!isOpen || !estudanteAtual || !dadosPdi) return null;

  // Handler: Exportar PDF Local
  const handleExportarPdf = async () => {
    try {
      setIsExportingPdf(true);
      exportarRelatorioPdiPDF(
        dadosPdi,
        escolaConfig,
        currentUserName || 'Coordenação Pedagógica',
        parecerEditavel
      );
    } catch (e: any) {
      console.error('Erro ao exportar PDF do PDI:', e);
      alert('Erro ao gerar PDF do PDI. Verifique os dados e tente novamente.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Handler: Salvar no Google Drive
  const handleSalvarNoGoogleDrive = async () => {
    if (!isGoogleDriveConnected()) {
      alert('Conecte sua conta do Google Drive no painel da coordenação antes de enviar.');
      return;
    }

    try {
      setIsSavingToDrive(true);
      setDriveResult(null);
      setDriveError(null);

      const blob = gerarRelatorioPdiPdfBlob(
        dadosPdi,
        escolaConfig,
        currentUserName || 'Coordenação Pedagógica',
        parecerEditavel
      );

      const nomeAlunoSanitizado = dadosPdi.estudante.nome.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `PDI_Relatorio_${nomeAlunoSanitizado}_${dadosPdi.anoLetivo}.pdf`;
      const serieAluno = dadosPdi.estudante.anoSerie || dadosPdi.estudante.turma || 'Geral';

      const res = await uploadPdfBlob(blob, {
        fileName,
        serie: serieAluno,
        studentName: dadosPdi.estudante.nome,
        studentMatricula: dadosPdi.estudante.matricula,
        tipoDocumento: 'relatorio_apoio'
      });

      if (res.success) {
        setDriveResult(res);
      } else {
        setDriveError(res.error || 'Falha ao salvar no Google Drive.');
      }
    } catch (e: any) {
      setDriveError(e.message || 'Erro inesperado ao salvar no Google Drive.');
    } finally {
      setIsSavingToDrive(false);
    }
  };

  const metricas = dadosPdi.metricas;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto animate-fadeIn">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[94vh] overflow-hidden text-slate-800">
        
        {/* CABEÇALHO DO MODAL */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-gradient-to-r from-teal-900 via-emerald-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-teal-500/20 border border-teal-400/40 text-teal-300 flex items-center justify-center shrink-0">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                  <span>Plano de Desenvolvimento Individual (PDI)</span>
                </h2>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-400/20 text-teal-300 border border-teal-400/40">
                  Relatório de Desempenho & Evolução
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Consolidação oficial do progresso baseado no cruzamento de atividades adaptadas e diário de bordo do apoio.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* BARRA DE FILTROS E SELEÇÃO DE ESTUDANTE */}
        <div className="p-3 sm:p-4 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
          
          {/* Seletor de Estudante */}
          <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="h-4 w-4 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Buscar por nome, matrícula ou diagnóstico..."
                value={buscaAluno}
                onChange={(e) => setBuscaAluno(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <select
              value={filtroTurma}
              onChange={(e) => setFiltroTurma(e.target.value)}
              className="bg-white border border-slate-300 px-3 py-2 rounded-xl text-xs font-bold text-slate-700"
            >
              <option value="todas">Todas as Turmas ({turmasDisponiveis.length})</option>
              {turmasDisponiveis.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            <select
              value={estudanteSelecionadoId}
              onChange={(e) => setEstudanteSelecionadoId(e.target.value)}
              className="bg-white border border-teal-500 text-teal-900 font-extrabold px-3 py-2 rounded-xl text-xs shadow-2xs max-w-xs truncate"
            >
              {estudantesFiltrados.map(e => (
                <option key={e.id} value={e.id}>
                  {e.nome} ({e.turma || 'Sem turma'})
                </option>
              ))}
            </select>
          </div>

          {/* Seletor de Período e Ano */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-white border border-slate-300 px-2 py-1 rounded-xl">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={periodoId}
                onChange={(e) => setPeriodoId(e.target.value as any)}
                className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
              >
                {Object.entries(PERIODOS_PDI_INFO).map(([k, v]) => (
                  <option key={k} value={k}>{v.nome}</option>
                ))}
              </select>
            </div>

            <select
              value={anoLetivo}
              onChange={(e) => setAnoLetivo(Number(e.target.value))}
              className="bg-white border border-slate-300 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-700"
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
              <option value={2024}>2024</option>
            </select>
          </div>
        </div>

        {/* CORPO DO RELATÓRIO PDI COM SCROLL */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          
          {/* CARD DE IDENTIFICAÇÃO DO ESTUDANTE */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="h-14 w-14 rounded-2xl bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center font-black text-xl overflow-hidden shrink-0 shadow-2xs">
                {estudanteAtual.fotoUrl ? (
                  <img src={estudanteAtual.fotoUrl} alt={estudanteAtual.nome} className="h-full w-full object-cover" />
                ) : (
                  <span>{estudanteAtual.nome.charAt(0)}</span>
                )}
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                    {estudanteAtual.nome}
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                    Matrícula: {estudanteAtual.matricula}
                  </span>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                    dadosPdi.nivelProgressoGeral === 'Avanço Significativo'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : dadosPdi.nivelProgressoGeral === 'Em Desenvolvimento'
                      ? 'bg-blue-100 text-blue-800 border-blue-300'
                      : 'bg-rose-100 text-rose-800 border-rose-300'
                  }`}>
                    {dadosPdi.nivelProgressoGeral}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                  <span>Turma: <strong className="text-slate-800">{estudanteAtual.turma}</strong></span>
                  <span>•</span>
                  <span>Turno: <strong className="text-slate-800">{estudanteAtual.turno || 'Matutino'}</strong></span>
                  <span>•</span>
                  <span>Diagnóstico/CID: <strong className="text-slate-800">{estudanteAtual.laudo || 'Em investigação'}</strong></span>
                  <span>•</span>
                  <span>PAE: <strong className="text-slate-800">{estudanteAtual.paeResponsavelNome || 'Não informado'}</strong></span>
                </div>
              </div>
            </div>

            <div className="shrink-0 text-right sm:border-l sm:border-slate-200 sm:pl-4">
              <span className="text-[10px] text-slate-400 block font-bold uppercase">Período de Referência</span>
              <strong className="text-xs font-black text-teal-800 block">{dadosPdi.periodoRotulo}</strong>
              <span className="text-[11px] text-slate-500 font-mono">Ano Letivo {dadosPdi.anoLetivo}</span>
            </div>
          </div>

          {/* QUADRO DE INDICADORES DE DESEMPENHO (KPIS) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            
            {/* KPI 1: Atividades Adaptadas */}
            <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[10px] font-bold uppercase">Atividades Adaptadas</span>
                <BookOpen className="h-4 w-4 text-teal-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {metricas.totalAtividades}
              </div>
              <span className="text-[11px] font-semibold text-teal-700">
                {metricas.disciplinasAtendidas.length} disciplina(s)
              </span>
            </div>

            {/* KPI 2: Taxa de Resolução no Apoio */}
            <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[10px] font-bold uppercase">Resolução no Apoio</span>
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-emerald-700 mt-1">
                {metricas.taxaSucessoAtividadesApoio}%
              </div>
              <span className="text-[11px] text-slate-500">
                {metricas.realizouAtividadeSim} autônomas / {metricas.realizouAtividadeParcial} mediadas
              </span>
            </div>

            {/* KPI 3: Assiduidade no Acompanhamento */}
            <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[10px] font-bold uppercase">Assiduidade no Apoio</span>
                <HeartHandshake className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-2xl font-black text-blue-700 mt-1">
                {metricas.taxaPresenca}%
              </div>
              <span className="text-[11px] text-slate-500">
                {metricas.diasPresente} de {metricas.totalRegistrosApoio} atendimentos
              </span>
            </div>

            {/* KPI 4: Estabilidade Emocional */}
            <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[10px] font-bold uppercase">Estabilidade Comportamental</span>
                <CheckCircle2 className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-black text-indigo-700 mt-1">
                {metricas.taxaEstabilidadeComportamental}%
              </div>
              <span className="text-[11px] text-slate-500">
                {metricas.totalFotosDiarioBordo} diários com foto
              </span>
            </div>
          </div>

          {/* SEÇÃO DE DETALHAMENTO CURRICULAR DAS ATIVIDADES */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <BookOpen className="h-4 w-4 text-teal-700" />
                <span>Atividades Adaptadas no Período ({dadosPdi.atividadesDoPeriodo.length})</span>
              </h4>
              <span className="text-[11px] text-slate-500 font-medium">
                {metricas.atividadesAlinhadasPei} ({metricas.taxaAlinhamentoPei}%) alinhadas aos objetivos do PEI
              </span>
            </div>

            {dadosPdi.atividadesDoPeriodo.length === 0 ? (
              <div className="p-6 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
                Nenhuma atividade adaptada foi cadastrada para este estudante no período selecionado.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Disciplina</th>
                      <th className="p-2.5">Conteúdo / Habilidade</th>
                      <th className="p-2.5">Data</th>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5">Professor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {dadosPdi.atividadesDoPeriodo.map(a => (
                      <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-2.5 font-bold text-slate-900">{a.disciplina}</td>
                        <td className="p-2.5 max-w-xs truncate text-slate-600" title={a.conteudo}>
                          {a.conteudo || a.habilidadeDescricao}
                        </td>
                        <td className="p-2.5 text-slate-500 font-mono text-[11px]">
                          {a.dataCriacao ? new Date(a.dataCriacao).toLocaleDateString('pt-BR') : '-'}
                        </td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            a.alinhadaAoPei 
                              ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {a.alinhadaAoPei ? 'Alinhada PEI' : a.status}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-500">{a.professorNome}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SEÇÃO DO PARECER CONCLUSIVO DO PDI (COM EDIÇÃO DIRETA) */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Edit3 className="h-4 w-4 text-teal-700" />
                  <span>Parecer Conclusivo de Evolução Pedagógica (PDI)</span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  Texto descritivo consolidado que constará no documento PDF oficial para arquivo e entrega à família.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setParecerEditavel(dadosPdi.parecerSinteticoPadrao)}
                  className="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                  title="Restaurar parecer original calculado pelo sistema"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Restaurar Padrão</span>
                </button>
              </div>
            </div>

            <textarea
              value={parecerEditavel}
              onChange={(e) => setParecerEditavel(e.target.value)}
              rows={4}
              className="w-full p-3 border border-slate-300 rounded-xl text-xs text-slate-800 leading-relaxed focus:ring-2 focus:ring-teal-500 focus:outline-none"
              placeholder="Digite observações pedagógicas complementares para o parecer do PDI..."
            />

            {/* Metas recomendadas */}
            <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-200/60 text-xs space-y-1.5">
              <span className="font-bold text-teal-900 block flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-teal-700" />
                <span>Recomendações e Próximos Passos Sugeridos para o PDI:</span>
              </span>
              <ul className="list-disc list-inside space-y-1 text-slate-700 text-[11px]">
                {dadosPdi.metasRecomendadas.map((meta, idx) => (
                  <li key={idx}>{meta}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* FEEDBACK DE UPLOAD NO DRIVE */}
          {driveResult && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                <span>
                  Relatório do PDI enviado com sucesso para a pasta <strong>{driveResult.folderName}</strong> no Google Drive!
                </span>
              </div>
              {driveResult.webViewLink && (
                <a
                  href={driveResult.webViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold underline inline-flex items-center gap-1 text-emerald-800 hover:text-emerald-950"
                >
                  <span>Abrir no Drive</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}

          {driveError && (
            <div className="p-3 bg-rose-50 border border-rose-300 text-rose-900 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-700" />
              <span>{driveError}</span>
            </div>
          )}

        </div>

        {/* RODAPÉ COM BOTÕES DE EXPORTAÇÃO */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Padrão A4 Oficial SEDUC-GO</span>
            <span>•</span>
            <span>Campos para assinaturas institucionais incluídos</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSalvarNoGoogleDrive}
              disabled={isSavingToDrive}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
              title="Salvar cópia do PDF diretamente na pasta do estudante no Google Drive"
            >
              <UploadCloud className="h-4 w-4 text-teal-700" />
              <span>{isSavingToDrive ? 'Enviando...' : 'Salvar no Drive'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportarPdf}
              disabled={isExportingPdf}
              className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              <span>{isExportingPdf ? 'Gerando PDF...' : 'Exportar PDF do PDI'}</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
