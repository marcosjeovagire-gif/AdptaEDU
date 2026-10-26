import React, { useState, useMemo } from 'react';
import { 
  X, 
  FileText, 
  Download, 
  Printer, 
  Calendar, 
  Filter, 
  CheckCircle2, 
  Search, 
  Award, 
  Layers, 
  Users, 
  Sparkles,
  BookOpen,
  School,
  Folder,
  UploadCloud,
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import { 
  Estudante, 
  PerfilPedagogico, 
  AtividadeAdaptada, 
  RegistroAcompanhamentoApoio, 
  EscolaConfig 
} from '../../types';
import { 
  TrimestrePeriodo, 
  TRIMESTRES_INFO, 
  consolidarEvolucaoTrimestral, 
  exportarRelatorioTrimestralCSV, 
  exportarRelatorioTrimestralPDF,
  gerarRelatorioTrimestralPDFBlob
} from '../../services/relatorioEvolucaoTrimestralService';
import { 
  uploadPdfBlob, 
  isGoogleDriveConnected, 
  signInWithGoogleDrive, 
  UploadResult 
} from '../../services/googleDriveService';

interface RelatorioEvolucaoTrimestralModalProps {
  isOpen: boolean;
  onClose: () => void;
  estudantes: Estudante[];
  perfisPedagogicos: PerfilPedagogico[];
  atividades: AtividadeAdaptada[];
  registrosApoio?: RegistroAcompanhamentoApoio[];
  escolaConfig?: Partial<EscolaConfig>;
  currentUserName?: string;
}

export const RelatorioEvolucaoTrimestralModal: React.FC<RelatorioEvolucaoTrimestralModalProps> = ({
  isOpen,
  onClose,
  estudantes,
  perfisPedagogicos,
  atividades,
  registrosApoio = [],
  escolaConfig,
  currentUserName
}) => {
  const [trimestre, setTrimestre] = useState<TrimestrePeriodo>('1T');
  const [anoLetivo, setAnoLetivo] = useState<number>(new Date().getFullYear());
  const [filtroSerie, setFiltroSerie] = useState<string>('todas');
  const [filtroTurma, setFiltroTurma] = useState<string>('todas');
  const [buscaAluno, setBuscaAluno] = useState<string>('');
  const [filtroNivel, setFiltroNivel] = useState<'todos' | 'Avanço Significativo' | 'Em Desenvolvimento' | 'Atenção Prioritária'>('todos');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isSavingToDrive, setIsSavingToDrive] = useState(false);
  const [driveResult, setDriveResult] = useState<UploadResult | null>(null);
  const [driveError, setDriveError] = useState<string | null>(null);

  // Lista de séries e turmas disponíveis
  const seriesDisponiveis = useMemo(() => {
    const set = new Set<string>();
    estudantes.forEach(e => {
      if (e.anoSerie) set.add(e.anoSerie);
      else if (e.turma) {
        const match = e.turma.match(/^(\d+º\s*ano|\d+ª\s*série|\d+º|\d+ª)/i);
        if (match) set.add(match[1]);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }));
  }, [estudantes]);

  const turmasDisponiveis = useMemo(() => {
    const set = new Set<string>();
    estudantes.forEach(e => {
      if (e.turma) set.add(e.turma);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }));
  }, [estudantes]);

  // Consolidação dos dados
  const relatorio = useMemo(() => {
    return consolidarEvolucaoTrimestral(
      estudantes,
      perfisPedagogicos,
      atividades,
      registrosApoio,
      {
        trimestre,
        anoLetivo,
        turma: filtroTurma,
        serie: filtroSerie,
      }
    );
  }, [estudantes, perfisPedagogicos, atividades, registrosApoio, trimestre, anoLetivo, filtroTurma, filtroSerie]);

  // Filtros locais adicionais (busca de aluno e nível)
  const itensExibidos = useMemo(() => {
    return relatorio.itens.filter(item => {
      if (filtroNivel !== 'todos' && item.nivelEvolucao !== filtroNivel) return false;
      if (buscaAluno.trim()) {
        const termo = buscaAluno.toLowerCase();
        const nomeMatch = item.estudante.nome.toLowerCase().includes(termo);
        const matMatch = item.estudante.matricula.toLowerCase().includes(termo);
        const laudoMatch = (item.estudante.laudo || '').toLowerCase().includes(termo);
        return nomeMatch || matMatch || laudoMatch;
      }
      return true;
    });
  }, [relatorio.itens, buscaAluno, filtroNivel]);

  if (!isOpen) return null;

  const handleExportPdf = () => {
    try {
      setIsExportingPdf(true);
      exportarRelatorioTrimestralPDF(relatorio, escolaConfig, currentUserName);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleSalvarNoGoogleDrive = async () => {
    setIsSavingToDrive(true);
    setDriveError(null);
    setDriveResult(null);

    try {
      // 1. Gera o Blob binário oficial do PDF e o nome padrão do arquivo
      const { blob, fileName } = gerarRelatorioTrimestralPDFBlob(relatorio, escolaConfig, currentUserName);

      // 2. Determina a série para roteamento na pasta organizadora correspondente
      const serieAlvo = filtroSerie !== 'todas' 
        ? filtroSerie 
        : (relatorio.itens[0]?.estudante.anoSerie || relatorio.itens[0]?.estudante.turma || 'Geral');

      const alunoAlvo = relatorio.itens.length === 1 ? relatorio.itens[0].estudante : undefined;

      // 3. Executa o método refatorado que recebe o Blob e envia para a pasta da série
      const res = await uploadPdfBlob(blob, {
        fileName,
        serie: serieAlvo,
        studentName: alunoAlvo?.nome,
        studentMatricula: alunoAlvo?.matricula,
        tipoDocumento: 'relatorio_trimestral',
      });

      if (!res.success && res.error === 'NOT_AUTHENTICATED') {
        // Fluxo de conexão sob demanda
        const authData = await signInWithGoogleDrive();
        const retryRes = await uploadPdfBlob(blob, {
          fileName,
          serie: serieAlvo,
          studentName: alunoAlvo?.nome,
          studentMatricula: alunoAlvo?.matricula,
          tipoDocumento: 'relatorio_trimestral',
          token: authData.accessToken,
        });
        if (retryRes.success || retryRes.queued) {
          setDriveResult(retryRes);
        } else {
          setDriveError(retryRes.message || retryRes.error || 'Falha ao salvar no Google Drive.');
        }
      } else if (res.success || res.queued) {
        setDriveResult(res);
      } else {
        setDriveError(res.message || res.error || 'Falha ao salvar documento no Google Drive.');
      }
    } catch (err: any) {
      setDriveError(err.message || 'Erro durante a comunicação com o Google Drive.');
    } finally {
      setIsSavingToDrive(false);
    }
  };

  const handleExportCsv = () => {
    exportarRelatorioTrimestralCSV(relatorio, escolaConfig);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn">
        
        {/* CABEÇALHO DO MODAL */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shrink-0">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  Gestão Acadêmica & Inclusão
                </span>
                <span className="text-[10px] font-bold text-slate-300">
                  {escolaConfig?.nome || 'Colégio Estadual Olynto Pereira de Castro'}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight mt-0.5">
                Relatório Trimestral de Evolução dos Estudantes
              </h2>
              <p className="text-xs text-slate-300">
                Consolidação dos perfis pedagógicos ativos e histórico de atividades adaptadas.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* BARRA DE FILTROS & SELEÇÃO DE TRIMESTRE */}
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 space-y-3 shrink-0">
          
          {/* Seletor de Período Trimestral */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider mr-1 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-emerald-700" />
                <span>Trimestre:</span>
              </span>

              {(['1T', '2T', '3T', 'ANUAL'] as TrimestrePeriodo[]).map((tKey) => {
                const info = TRIMESTRES_INFO[tKey];
                const isSelected = trimestre === tKey;
                return (
                  <button
                    key={tKey}
                    type="button"
                    onClick={() => setTrimestre(tKey)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    <span>{info.nome}</span>
                    <span className={`text-[10px] font-normal ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
                      ({info.periodo})
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Ações de Exportação */}
            <div className="flex items-center gap-2 self-end md:self-auto">
              <button
                type="button"
                onClick={handleExportCsv}
                className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                title="Exportar planilha CSV formatada para Excel"
              >
                <Download className="h-3.5 w-3.5 text-slate-600" />
                <span>Exportar CSV</span>
              </button>

              <button
                type="button"
                onClick={handleExportPdf}
                disabled={isExportingPdf}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors disabled:opacity-50"
                title="Gerar e baixar PDF institucional em formato A4 oficial"
              >
                <Printer className="h-4 w-4" />
                <span>{isExportingPdf ? 'Gerando PDF...' : 'Gerar Relatório em PDF (A4)'}</span>
              </button>
            </div>
          </div>

          {/* Filtros de Série, Turma e Busca */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-1 text-xs">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por estudante ou laudo..."
                value={buscaAluno}
                onChange={(e) => setBuscaAluno(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 text-xs"
              />
            </div>

            <div>
              <select
                value={filtroSerie}
                onChange={(e) => setFiltroSerie(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700"
              >
                <option value="todas">Todas as Séries ({seriesDisponiveis.length})</option>
                {seriesDisponiveis.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={filtroTurma}
                onChange={(e) => setFiltroTurma(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700"
              >
                <option value="todas">Todas as Turmas ({turmasDisponiveis.length})</option>
                {turmasDisponiveis.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={filtroNivel}
                onChange={(e) => setFiltroNivel(e.target.value as any)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700"
              >
                <option value="todos">Todos os Níveis de Evolução</option>
                <option value="Avanço Significativo">Avanço Significativo</option>
                <option value="Em Desenvolvimento">Em Desenvolvimento</option>
                <option value="Atenção Prioritária">Atenção Prioritária</option>
              </select>
            </div>
          </div>
        </div>

        {/* CARDS DE MÉTRICAS GERAIS DO TRIMESTRE */}
        <div className="p-4 sm:p-5 bg-white border-b border-slate-100 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            
            <div className="p-3 rounded-2xl border border-slate-200 bg-slate-50/50">
              <span className="text-[10px] font-extrabold uppercase text-slate-500 block">Estudantes Avaliados</span>
              <span className="text-xl font-black text-slate-900">{relatorio.totalEstudantesAvaliados}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">no {relatorio.trimestreNome}</span>
            </div>

            <div className="p-3 rounded-2xl border border-indigo-200 bg-indigo-50/30">
              <span className="text-[10px] font-extrabold uppercase text-indigo-700 block">Perfis Ativos (Inclusão)</span>
              <span className="text-xl font-black text-indigo-800">{relatorio.totalComPerfilAtivo}</span>
              <span className="text-[10px] text-indigo-600 block mt-0.5">com adaptações aprovadas</span>
            </div>

            <div className="p-3 rounded-2xl border border-emerald-200 bg-emerald-50/30">
              <span className="text-[10px] font-extrabold uppercase text-emerald-700 block">Atividades Adaptadas</span>
              <span className="text-xl font-black text-emerald-800">{relatorio.totalAtividadesGeradas}</span>
              <span className="text-[10px] text-emerald-600 block mt-0.5">{relatorio.totalQuestoesAdaptadas} questões no período</span>
            </div>

            <div className="p-3 rounded-2xl border border-sky-200 bg-sky-50/30">
              <span className="text-[10px] font-extrabold uppercase text-sky-700 block">Alinhamento ao PEI</span>
              <span className="text-xl font-black text-sky-800">{relatorio.totalAlinhadasPei}</span>
              <span className="text-[10px] text-sky-600 block mt-0.5">{relatorio.taxaMediaPei}% do volume total</span>
            </div>

            <div className="p-3 rounded-2xl border border-amber-200 bg-amber-50/30 col-span-2 sm:col-span-1">
              <span className="text-[10px] font-extrabold uppercase text-amber-700 block">Em Destaque</span>
              <span className="text-xl font-black text-amber-800">
                {relatorio.itens.filter(i => i.nivelEvolucao === 'Avanço Significativo').length}
              </span>
              <span className="text-[10px] text-amber-600 block mt-0.5">com avanço significativo</span>
            </div>

          </div>
        </div>

        {/* CORPO / LISTAGEM CONSOLIDADA DE ESTUDANTES */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold">
              Exibindo <strong>{itensExibidos.length}</strong> de {relatorio.itens.length} estudantes consolidados
            </span>
            <span className="text-[11px]">
              Trimestre: <strong>{relatorio.trimestreNome}</strong> ({relatorio.periodoMeses})
            </span>
          </div>

          {itensExibidos.length === 0 ? (
            <div className="p-12 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <FileText className="h-8 w-8 text-slate-400 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700">Nenhum estudante encontrado</h4>
              <p className="text-xs text-slate-400">Tente ajustar os filtros de série, turma ou busca.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {itensExibidos.map((item, idx) => {
                const est = item.estudante;
                const p = item.perfil;

                return (
                  <div
                    key={est.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-emerald-300 transition-all shadow-2xs space-y-3"
                  >
                    {/* Topo do Card: Aluno, Série, Nível de Evolução */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="h-6 w-6 rounded-full bg-slate-100 text-slate-700 font-extrabold text-[11px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-extrabold text-slate-900">
                              {est.nome}
                            </h4>
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                              {est.turma || est.anoSerie || 'Sem Turma'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Matrícula: {est.matricula}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            PAE: <strong>{est.paeResponsavelNome || 'Profissional de Apoio'}</strong> • Turno: {est.turno || 'Matutino'}
                          </p>
                        </div>
                      </div>

                      {/* Badge do Nível de Evolução */}
                      <span className={`self-start sm:self-center px-3 py-1 rounded-full text-xs font-extrabold border shrink-0 ${
                        item.nivelEvolucao === 'Avanço Significativo'
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          : item.nivelEvolucao === 'Em Desenvolvimento'
                          ? 'bg-blue-100 text-blue-900 border-blue-300'
                          : 'bg-amber-100 text-amber-900 border-amber-300'
                      }`}>
                        {item.nivelEvolucao}
                      </span>
                    </div>

                    {/* Linha 2: Diagnóstico e Adaptações */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-50/70 p-3 rounded-xl">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">
                          Diagnóstico / Laudo (Inclusão):
                        </span>
                        <p className="text-slate-800 font-semibold">
                          {est.laudo || 'Em investigação / Sem laudo cadastrado'}
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">
                          Adaptações Pedagógicas Ativas:
                        </span>
                        <p className="text-slate-700">
                          {[
                            p?.necessidadeApoioVisual ? 'Apoio Visual' : null,
                            p?.necessidadeInstrucoesCurtas ? 'Instruções Curtas' : null,
                            p?.tempoAdicionalAutorizado ? `Tempo Extra (${p.tempoAdicionalAutorizado})` : null,
                            p?.quantidadeAlternativas ? `${p.quantidadeAlternativas} Alternativas` : null,
                          ].filter(Boolean).join(' • ') || 'Adaptação padrão da turma'}
                        </p>
                      </div>
                    </div>

                    {/* Linha 3: Métricas de Atividades no Trimestre */}
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                          {item.totalAtividades} atividades ({item.totalQuestoes} questões)
                        </span>

                        <span className="font-bold text-sky-800 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200">
                          {item.atividadesAlinhadasPei} alinhadas ao PEI ({item.percentualPei}%)
                        </span>

                        {item.disciplinasAtendidas.length > 0 && (
                          <span className="text-slate-600 text-[11px]">
                            Disciplinas: <strong>{item.disciplinasAtendidas.join(', ')}</strong>
                          </span>
                        )}
                      </div>

                      {item.totalAtendimentosApoio > 0 && (
                        <span className="text-[11px] text-slate-500 font-medium">
                          {item.totalAtendimentosApoio} atendimentos registrados pela PAE
                        </span>
                      )}
                    </div>

                    {/* Linha 4: Parecer Sintético */}
                    <div className="text-xs pt-1 border-t border-slate-100">
                      <span className="text-[10px] font-extrabold uppercase text-slate-400 block">
                        Parecer Sintético de Evolução:
                      </span>
                      <p className="text-slate-600 italic text-[11px] mt-0.5 leading-relaxed">
                        "{item.parecerEvolucao}"
                      </p>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ALERTA DE RESULTADO GOOGLE DRIVE */}
        {driveResult && (
          <div className={`mx-4 sm:mx-6 my-2 p-3 rounded-xl flex items-center justify-between text-xs animate-fadeIn ${
            driveResult.queued 
              ? 'bg-amber-50 border border-amber-300 text-amber-900' 
              : 'bg-emerald-50 border border-emerald-300 text-emerald-900'
          }`}>
            <div className="flex items-center gap-2">
              {driveResult.queued ? (
                <UploadCloud className="h-4 w-4 text-amber-600 shrink-0 animate-pulse" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              )}
              <div>
                <span className="font-bold">{driveResult.message}</span>
                {driveResult.folderName && (
                  <span className={`block text-[11px] ${driveResult.queued ? 'text-amber-700' : 'text-emerald-700'}`}>
                    Pasta Organizadora: <strong>{driveResult.folderName}</strong>
                    {driveResult.queued && ' • Retomada automática ativa assim que a rede for detectada'}
                  </span>
                )}
              </div>
            </div>
            {driveResult.webViewLink && (
              <a
                href={driveResult.webViewLink}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold flex items-center gap-1.5 transition-colors shrink-0 shadow-xs"
              >
                <span>Abrir no Google Drive</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        )}

        {driveError && (
          <div className="mx-4 sm:mx-6 my-2 p-3 bg-rose-50 border border-rose-300 rounded-xl flex items-center justify-between text-xs text-rose-900 animate-fadeIn">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span className="font-medium">{driveError}</span>
            </div>
            <button
              onClick={() => setDriveError(null)}
              className="text-xs text-rose-700 hover:underline font-bold"
            >
              Fechar
            </button>
          </div>
        )}

        {/* RODAPÉ DO MODAL */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shrink-0">
          <span className="text-slate-500">
            Relatório gerado em <strong>{relatorio.dataGeracao}</strong> para acompanhamento trimestral de inclusão.
          </span>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer transition-colors border border-slate-300"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={handleSalvarNoGoogleDrive}
              disabled={isSavingToDrive || isExportingPdf}
              className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl font-bold cursor-pointer transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              title="Envia automaticamente o PDF do relatório para a pasta da série correspondente no Google Drive usando os metadados da pasta"
            >
              <Folder className="h-4 w-4 text-emerald-600" />
              <span>{isSavingToDrive ? 'Enviando ao Drive...' : 'Salvar no Drive (Por Série)'}</span>
            </button>
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={isExportingPdf || isSavingToDrive}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold cursor-pointer transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              <Printer className="h-4 w-4" />
              <span>{isExportingPdf ? 'Processando PDF...' : 'Baixar PDF Oficial (A4)'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
