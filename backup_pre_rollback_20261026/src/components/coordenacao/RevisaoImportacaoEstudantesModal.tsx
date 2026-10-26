import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  FileCheck, 
  Loader2, 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Edit2, 
  Check, 
  Filter, 
  Search, 
  ShieldCheck, 
  ShieldAlert, 
  FileText,
  School,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { 
  RegistroImportacaoEstudante, 
  Estudante, 
  UserRole, 
  AuthorizedUser,
  StatusIndicadorAnalise 
} from '../../types';
import { 
  previewStudentImportFromTextOrFile, 
  confirmStudentImport,
  DOCUMENTO_ESTUDANTES_PADRAO 
} from '../../server/studentService';

interface RevisaoImportacaoEstudantesModalProps {
  onClose: () => void;
  onImportacaoSucesso: (novosEstudantes: Estudante[]) => void;
  existingStudents: Estudante[];
  professoresDisponiveis: AuthorizedUser[];
  currentUserRoles: UserRole[];
  currentUserName: string;
}

export const RevisaoImportacaoEstudantesModal: React.FC<RevisaoImportacaoEstudantesModalProps> = ({
  onClose,
  onImportacaoSucesso,
  existingStudents,
  professoresDisponiveis,
  currentUserRoles,
  currentUserName,
}) => {
  // Estados de navegação e análise
  const [etapa, setEtapa] = useState<'upload' | 'revisao' | 'sucesso'>('upload');
  const [statusIndicador, setStatusIndicador] = useState<StatusIndicadorAnalise>('aguardando_arquivo');
  const [mensagemIndicador, setMensagemIndicador] = useState<string>('Aguardando seleção do arquivo PDF com a relação de estudantes.');
  const [isProcessando, setIsProcessando] = useState<boolean>(false);

  // Dados analisados
  const [nomeArquivo, setNomeArquivo] = useState<string>('');
  const [registros, setRegistros] = useState<RegistroImportacaoEstudante[]>([]);
  const [filtroSituacao, setFiltroSituacao] = useState<string>('todos');
  const [buscaTexto, setBuscaTexto] = useState<string>('');

  // Edição inline de linha
  const [linhaEmEdicao, setLinhaEmEdicao] = useState<RegistroImportacaoEstudante | null>(null);

  // Resultado da confirmação
  const [resumoFinal, setResumoFinal] = useState<{ total: number; vinculados: number } | null>(null);
  const [erroOperacao, setErroOperacao] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Processar arquivo institucional padrão (PDF oficial simulado da escola)
  const handleCarregarRelaçãoPadrao = () => {
    setIsProcessando(true);
    setStatusIndicador('analise_em_andamento');
    setMensagemIndicador('Análise em andamento: Lendo estrutura do documento institucional...');

    setTimeout(() => {
      const res = previewStudentImportFromTextOrFile({
        nomeArquivo: DOCUMENTO_ESTUDANTES_PADRAO.nomeArquivo,
        usarRosterPadrao: true,
        existingStudents,
        currentUserRoles,
      });

      setIsProcessando(false);
      if (res.success && res.data) {
        setNomeArquivo(DOCUMENTO_ESTUDANTES_PADRAO.nomeArquivo);
        setRegistros(res.data.registros);
        setStatusIndicador(res.data.indicadores.statusGeral);
        setMensagemIndicador(res.data.indicadores.mensagem);
        setEtapa('revisao');
      } else {
        setStatusIndicador('erro_analise');
        setMensagemIndicador(res.message || 'Erro durante a análise do arquivo.');
        setErroOperacao(res.message);
      }
    }, 600);
  };

  // 2. Processar arquivo enviado pelo usuário (PDF / TXT / CSV)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setNomeArquivo(file.name);
    setIsProcessando(true);
    setStatusIndicador('analise_em_andamento');
    setMensagemIndicador('Análise em andamento: Extraindo e sanitizando dados do arquivo...');

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string || '';
      
      const res = previewStudentImportFromTextOrFile({
        nomeArquivo: file.name,
        conteudoTexto: text,
        usarRosterPadrao: false,
        existingStudents,
        currentUserRoles,
      });

      setIsProcessando(false);
      if (res.success && res.data) {
        setRegistros(res.data.registros);
        setStatusIndicador(res.data.indicadores.statusGeral);
        setMensagemIndicador(res.data.indicadores.mensagem);
        setEtapa('revisao');
      } else {
        setStatusIndicador('erro_analise');
        setMensagemIndicador(res.message || 'Falha ao analisar arquivo selecionado.');
        setErroOperacao(res.message);
      }
    };

    reader.onerror = () => {
      setIsProcessando(false);
      setStatusIndicador('erro_analise');
      setMensagemIndicador('Erro de leitura: Não foi possível ler o arquivo selecionado.');
      setErroOperacao('Erro ao ler arquivo.');
    };

    reader.readAsText(file);
  };

  // Alternar seleção de linha
  const handleToggleSelecionado = (id: string) => {
    setRegistros(prev => prev.map(r => r.id === id ? { ...r, selecionado: !r.selecionado } : r));
  };

  // Selecionar todos os válidos
  const handleSelecionarTodosValidos = () => {
    setRegistros(prev => prev.map(r => ({
      ...r,
      selecionado: r.situacao === 'Pronto para cadastrar',
    })));
  };

  // Desmarcar todos
  const handleDesmarcarTodos = () => {
    setRegistros(prev => prev.map(r => ({ ...r, selecionado: false })));
  };

  // Salvar edição de linha
  const handleSalvarEdicaoLinha = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linhaEmEdicao) return;

    setRegistros(prev => prev.map(r => {
      if (r.id !== linhaEmEdicao.id) return r;
      // Reavalia situação se tiver preenchido matrícula e nome
      const matriculaPreenchida = Boolean(linhaEmEdicao.matricula && linhaEmEdicao.matricula.trim());
      const nomePreenchido = Boolean(linhaEmEdicao.nome && linhaEmEdicao.nome.trim());
      
      let novaSituacao = r.situacao;
      let novaObs = r.observacao;

      if (matriculaPreenchida && nomePreenchido) {
        novaSituacao = 'Pronto para cadastrar';
        novaObs = 'Dados ajustados manualmente pela Coordenação.';
      }

      return {
        ...linhaEmEdicao,
        situacao: novaSituacao,
        observacao: novaObs,
        selecionado: novaSituacao === 'Pronto para cadastrar',
      };
    }));

    setLinhaEmEdicao(null);
  };

  // Confirmar Importação
  const handleConfirmarImportacao = () => {
    setErroOperacao(null);
    setIsProcessando(true);

    const res = confirmStudentImport({
      registrosConfirmados: registros,
      currentUserRoles,
      currentUserName,
      professoresDisponiveis,
      existingStudents,
    });

    setIsProcessando(false);

    if (!res.success) {
      setErroOperacao(res.message);
      return;
    }

    if (res.data) {
      const { estudantesCriados, resumo } = res.data;
      onImportacaoSucesso(estudantesCriados);
      setResumoFinal({
        total: resumo.totalImportados,
        vinculados: resumo.totalComProfessoresVinculados,
      });

      // Indicadores com texto e ícone
      if (estudantesCriados.length === registros.length) {
        setStatusIndicador('importacao_concluida');
        setMensagemIndicador(`Importação concluída: Todas as ${estudantesCriados.length} fichas individuais foram geradas.`);
      } else {
        setStatusIndicador('importacao_parcial');
        setMensagemIndicador(`Importação parcial: ${estudantesCriados.length} fichas criadas (${registros.length - estudantesCriados.length} ignoradas ou pendentes).`);
      }

      setEtapa('sucesso');
    }
  };

  // Filtragem de registros
  const registrosFiltrados = registros.filter(r => {
    if (filtroSituacao === 'prontos' && r.situacao !== 'Pronto para cadastrar') return false;
    if (filtroSituacao === 'pendentes' && r.situacao === 'Pronto para cadastrar') return false;
    if (filtroSituacao === 'duplicados' && !r.situacao.includes('duplicad') && !r.situacao.includes('já cadastrado')) return false;

    if (buscaTexto.trim()) {
      const t = buscaTexto.toLowerCase();
      return r.nome.toLowerCase().includes(t) || 
             r.matricula.toLowerCase().includes(t) || 
             r.turma.toLowerCase().includes(t);
    }
    return true;
  });

  const totalSelecionados = registros.filter(r => r.selecionado && r.situacao === 'Pronto para cadastrar').length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden text-slate-800">
        
        {/* Cabeçalho do Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Upload className="h-5 w-5 text-emerald-700" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                Exclusivo Coordenação
              </span>
              <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                Importação & Revisão de Estudantes (PDF)
              </h2>
              <p className="text-xs text-slate-500">
                Geração segura de fichas individuais no banco de dados com descarte de dados sensíveis.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
            title="Fechar janela"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* BARRA DE INDICADORES OBRIGATÓRIOS (TEXTO + ÍCONE) */}
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-100/70 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">Status da Operação:</span>
            
            {statusIndicador === 'aguardando_arquivo' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-200 text-slate-700 font-bold border border-slate-300">
                <FileText className="h-4 w-4 text-slate-600" />
                <span>Aguardando arquivo</span>
              </span>
            )}

            {statusIndicador === 'analise_em_andamento' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-100 text-sky-900 font-bold border border-sky-300 animate-pulse">
                <Loader2 className="h-4 w-4 text-sky-700 animate-spin" />
                <span>Análise em andamento</span>
              </span>
            )}

            {statusIndicador === 'arquivo_analisado' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 font-bold border border-emerald-300">
                <FileCheck className="h-4 w-4 text-emerald-700" />
                <span>Arquivo analisado</span>
              </span>
            )}

            {statusIndicador === 'registros_encontrados' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 font-bold border border-emerald-300">
                <Users className="h-4 w-4 text-emerald-700" />
                <span>Registros encontrados</span>
              </span>
            )}

            {statusIndicador === 'registros_pendentes' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 font-bold border border-amber-300">
                <AlertTriangle className="h-4 w-4 text-amber-700" />
                <span>Registros pendentes</span>
              </span>
            )}

            {statusIndicador === 'importacao_concluida' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 font-bold border border-emerald-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                <span>Importação concluída</span>
              </span>
            )}

            {statusIndicador === 'importacao_parcial' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 font-bold border border-amber-300">
                <AlertCircle className="h-4 w-4 text-amber-700" />
                <span>Importação parcial</span>
              </span>
            )}

            {statusIndicador === 'erro_analise' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-100 text-rose-900 font-bold border border-rose-300">
                <XCircle className="h-4 w-4 text-rose-700" />
                <span>Erro de análise</span>
              </span>
            )}
          </div>

          <div className="text-slate-600 text-xs italic">
            {mensagemIndicador}
          </div>
        </div>

        {/* ALERTA DE ERRO GERAL */}
        {erroOperacao && (
          <div className="m-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-rose-700" />
              <span>{erroOperacao}</span>
            </div>
            <button onClick={() => setErroOperacao(null)}><X className="h-4 w-4" /></button>
          </div>
        )}

        {/* CORPO DO MODAL */}
        <div className="p-5 flex-1 overflow-y-auto">

          {/* ================================================================= */}
          {/* ETAPA 1: SELEÇÃO E UPLOAD DO ARQUIVO */}
          {/* ================================================================= */}
          {etapa === 'upload' && (
            <div className="space-y-6 max-w-2xl mx-auto py-4">
              
              {/* Card Institucional de Segurança e LGPD */}
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                  <ShieldCheck className="h-5 w-5 text-emerald-700" />
                  <span>Protocolo de Privacidade e Proteção de Dados (LGPD Escolar)</span>
                </div>
                <p className="text-slate-700 leading-relaxed">
                  O sistema extrai exclusivamente dados acadêmicos: <strong>Nome oficial do estudante, Matrícula, Turma, Ano/Série e Turno</strong>.
                </p>
                <div className="p-2.5 bg-white rounded-lg border border-emerald-100 text-[11px] text-slate-600">
                  <span className="font-bold text-slate-800">Dados deliberadamente ignorados e descartados:</span> Laudos clínicos, CIDs, diagnósticos médicos (TEA, TDAH, deficiências), CPF, RG, filiação, telefones e endereços residenciais. Nenhum dado sensível é armazenado ou exibido.
                </div>
              </div>

              {/* Área de Seleção de Arquivo */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-emerald-600 rounded-2xl p-8 text-center bg-slate-50/50 hover:bg-emerald-50/30 transition-all cursor-pointer space-y-3"
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange}
                  accept=".pdf,.txt,.csv" 
                  className="hidden" 
                />
                <div className="h-14 w-14 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
                  <Upload className="h-7 w-7 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Clique para selecionar a relação de estudantes em PDF
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Formatos aceitos: PDF oficial (SIGE / SEDUC Goiás), CSV ou TXT
                  </p>
                </div>
                <button
                  type="button"
                  className="px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-emerald-800 pointer-events-none"
                >
                  Selecionar Arquivo do Computador
                </button>
              </div>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-4 text-xs font-bold text-slate-400 uppercase">ou utilize o documento institucional da escola</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              {/* Botão de Carga Rápida do Documento Oficial da Escola */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5">
                    <School className="h-4 w-4 text-emerald-700" />
                    <span className="font-bold text-xs text-slate-900">{DOCUMENTO_ESTUDANTES_PADRAO.nomeArquivo}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {DOCUMENTO_ESTUDANTES_PADRAO.fonte} • 10 registros de estudantes para conferência
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isProcessando}
                  onClick={handleCarregarRelaçãoPadrao}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isProcessando ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Analisando...</span>
                    </>
                  ) : (
                    <>
                      <FileCheck className="h-3.5 w-3.5" />
                      <span>Carregar Relação Institucional da Escola</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          )}

          {/* ================================================================= */}
          {/* ETAPA 2: TABELA DE REVISÃO E CONFIRMAÇÃO DA COORDENAÇÃO */}
          {/* ================================================================= */}
          {etapa === 'revisao' && (
            <div className="space-y-4">
              
              {/* Barra de Ações da Tabela */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar por nome, matrícula ou turma..."
                      value={buscaTexto}
                      onChange={(e) => setBuscaTexto(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                    />
                  </div>

                  <select
                    value={filtroSituacao}
                    onChange={(e) => setFiltroSituacao(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-700 font-semibold"
                  >
                    <option value="todos">Todos os registros ({registros.length})</option>
                    <option value="prontos">Prontos para cadastrar ({registros.filter(r => r.situacao === 'Pronto para cadastrar').length})</option>
                    <option value="pendentes">Pendentes de revisão ({registros.filter(r => r.situacao !== 'Pronto para cadastrar').length})</option>
                    <option value="duplicados">Duplicidades ({registros.filter(r => r.situacao.includes('duplicad') || r.situacao.includes('já cadastrado')).length})</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelecionarTodosValidos}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                  >
                    Selecionar Válidos
                  </button>
                  <button
                    type="button"
                    onClick={handleDesmarcarTodos}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                  >
                    Desmarcar Todos
                  </button>
                </div>
              </div>

              {/* Tabela de Estudantes Extraídos */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white">
                <div className="overflow-x-auto max-h-[50vh]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
                      <tr>
                        <th className="p-3 w-10 text-center">Sel.</th>
                        <th className="p-3">Nome Oficial do Estudante</th>
                        <th className="p-3">Matrícula</th>
                        <th className="p-3">Turma / Ano</th>
                        <th className="p-3">Turno</th>
                        <th className="p-3">Situação</th>
                        <th className="p-3">Observações / Segurança</th>
                        <th className="p-3 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {registrosFiltrados.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-slate-500">
                            Nenhum registro encontrado com os filtros selecionados.
                          </td>
                        </tr>
                      ) : (
                        registrosFiltrados.map((reg) => {
                          const isPronto = reg.situacao === 'Pronto para cadastrar';
                          const isDuplicado = reg.situacao === 'Estudante já cadastrado' || reg.situacao === 'Matrícula duplicada no arquivo';

                          return (
                            <tr key={reg.id} className={`hover:bg-slate-50/80 ${reg.selecionado ? 'bg-emerald-50/30' : ''}`}>
                              <td className="p-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={reg.selecionado}
                                  disabled={!isPronto}
                                  onChange={() => handleToggleSelecionado(reg.id)}
                                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 disabled:opacity-30"
                                />
                              </td>
                              <td className="p-3 font-bold text-slate-900 whitespace-nowrap">
                                {reg.nome}
                              </td>
                              <td className="p-3 font-mono text-slate-700 whitespace-nowrap">
                                {reg.matricula}
                              </td>
                              <td className="p-3 text-slate-700 whitespace-nowrap">
                                <span className="font-semibold">{reg.turma}</span>
                                <span className="text-slate-400 block text-[10px]">{reg.anoSerie}</span>
                              </td>
                              <td className="p-3 text-slate-600 whitespace-nowrap">
                                {reg.turno}
                              </td>
                              <td className="p-3 whitespace-nowrap">
                                {isPronto ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    <CheckCircle2 className="h-3 w-3" />
                                    <span>Pronto para cadastrar</span>
                                  </span>
                                ) : isDuplicado ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                    <XCircle className="h-3 w-3" />
                                    <span>{reg.situacao}</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                    <AlertTriangle className="h-3 w-3" />
                                    <span>{reg.situacao}</span>
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-[11px] text-slate-500 max-w-xs">
                                <div>{reg.observacao}</div>
                                {reg.dadosIgnoradosAviso && (
                                  <span className="text-[10px] text-slate-400 block italic mt-0.5">
                                    {reg.dadosIgnoradosAviso}
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-center whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => setLinhaEmEdicao({ ...reg })}
                                  className="p-1 rounded-lg hover:bg-slate-200 text-slate-600 hover:text-emerald-700 transition-colors cursor-pointer"
                                  title="Editar dados desta linha"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Rodapé da Tabela com Resumo de Seleção */}
                <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-slate-600 gap-2">
                  <div>
                    Mostrando <strong>{registrosFiltrados.length}</strong> de <strong>{registros.length}</strong> registros analisados do arquivo <em>{nomeArquivo}</em>.
                  </div>
                  <div className="font-bold text-emerald-800 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>{totalSelecionados} estudantes selecionados para confirmação</span>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ================================================================= */}
          {/* ETAPA 3: SUCESSO DA IMPORTAÇÃO */}
          {/* ================================================================= */}
          {etapa === 'sucesso' && resumoFinal && (
            <div className="max-w-lg mx-auto py-8 text-center space-y-4">
              <div className="h-16 w-16 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-10 w-10 text-emerald-700" />
              </div>
              <h3 className="text-xl font-black text-slate-900">
                Importação Concluída com Sucesso!
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Foram geradas <strong>{resumoFinal.total}</strong> fichas individuais de estudantes no banco de dados. Os registros agora estão disponíveis para a Coordenação vincular professores e acompanhar perfis pedagógicos.
              </p>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-left space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total de Fichas Criadas:</span>
                  <span className="font-bold text-slate-900">{resumoFinal.total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Com Vínculo de Professor Automático:</span>
                  <span className="font-bold text-slate-900">{resumoFinal.vinculados}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Dados Clínicos / Médicos Exibidos:</span>
                  <span className="font-bold text-emerald-700">0 (Privacidade Garantida)</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs"
                >
                  Concluir e Ver Estudantes Cadastrados
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Rodapé de Ações do Modal */}
        {etapa === 'revisao' && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setEtapa('upload')}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 cursor-pointer"
            >
              Voltar / Trocar Arquivo
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={totalSelecionados === 0 || isProcessando}
                onClick={handleConfirmarImportacao}
                className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-40"
              >
                {isProcessando ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Gravando no Banco...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Confirmar Importação de {totalSelecionados} Estudantes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>

      {/* MODAL SECUNDÁRIO: EDITAR LINHA ANTES DE CONFIRMAR */}
      {linhaEmEdicao && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 className="font-bold text-sm text-slate-900">Editar Registro do Estudante</h3>
              <button onClick={() => setLinhaEmEdicao(null)}><X className="h-4 w-4" /></button>
            </div>
            
            <form onSubmit={handleSalvarEdicaoLinha} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome Oficial Completo *:</label>
                <input
                  type="text"
                  required
                  value={linhaEmEdicao.nome}
                  onChange={(e) => setLinhaEmEdicao({ ...linhaEmEdicao, nome: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-1.5 border rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Matrícula / Código *:</label>
                  <input
                    type="text"
                    required
                    value={linhaEmEdicao.matricula}
                    onChange={(e) => setLinhaEmEdicao({ ...linhaEmEdicao, matricula: e.target.value })}
                    className="w-full px-3 py-1.5 border rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Turma *:</label>
                  <input
                    type="text"
                    required
                    value={linhaEmEdicao.turma}
                    onChange={(e) => setLinhaEmEdicao({ ...linhaEmEdicao, turma: e.target.value })}
                    className="w-full px-3 py-1.5 border rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ano / Série *:</label>
                  <input
                    type="text"
                    required
                    value={linhaEmEdicao.anoSerie}
                    onChange={(e) => setLinhaEmEdicao({ ...linhaEmEdicao, anoSerie: e.target.value })}
                    className="w-full px-3 py-1.5 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Turno *:</label>
                  <select
                    value={linhaEmEdicao.turno}
                    onChange={(e) => setLinhaEmEdicao({ ...linhaEmEdicao, turno: e.target.value })}
                    className="w-full px-3 py-1.5 border rounded-lg bg-white"
                  >
                    <option value="Manhã">Manhã</option>
                    <option value="Tarde">Tarde</option>
                    <option value="Integral">Integral</option>
                    <option value="Noite">Noite</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setLinhaEmEdicao(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-700 text-white font-bold"
                >
                  Salvar Linha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
