import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Download, 
  Calendar, 
  Users, 
  CheckCircle2, 
  XCircle, 
  X, 
  Filter, 
  Printer, 
  FileSpreadsheet, 
  Clock, 
  HelpCircle,
  Building,
  School
} from 'lucide-react';
import { RegistroAcompanhamentoApoio, Estudante, EscolaConfig, AuthorizedUser } from '../../types';
import { 
  exportRelatorioApoioPDF, 
  exportRelatorioApoioCSV, 
  filtrarRegistrosParaRelatorio,
  RelatorioApoioFilterOptions 
} from '../../services/relatorioApoioExportService';
import { formatarDataPtBr } from '../../server/apoioService';

interface RelatorioMensalApoioModalProps {
  isOpen: boolean;
  onClose: () => void;
  registros: RegistroAcompanhamentoApoio[];
  estudantes: Estudante[];
  escolaConfig: EscolaConfig;
  currentUser: AuthorizedUser;
  alunoInicial?: Estudante | null;
  anoInicial?: number;
  mesInicial?: number;
}

const MESES = [
  { valor: 0, nome: 'Janeiro' },
  { valor: 1, nome: 'Fevereiro' },
  { valor: 2, nome: 'Março' },
  { valor: 3, nome: 'Abril' },
  { valor: 4, nome: 'Maio' },
  { valor: 5, nome: 'Junho' },
  { valor: 6, nome: 'Julho' },
  { valor: 7, nome: 'Agosto' },
  { valor: 8, nome: 'Setembro' },
  { valor: 9, nome: 'Outubro' },
  { valor: 10, nome: 'Novembro' },
  { valor: 11, nome: 'Dezembro' }
];

export const RelatorioMensalApoioModal: React.FC<RelatorioMensalApoioModalProps> = ({
  isOpen,
  onClose,
  registros,
  estudantes,
  escolaConfig,
  currentUser,
  alunoInicial,
  anoInicial,
  mesInicial,
}) => {
  const agora = new Date();
  const [ano, setAno] = useState<number>(anoInicial || agora.getFullYear());
  const [mes, setMes] = useState<number>(mesInicial !== undefined ? mesInicial : agora.getMonth());
  const [estudanteId, setEstudanteId] = useState<string>(alunoInicial ? alunoInicial.id : 'todos');
  const [turma, setTurma] = useState<string>('todas');
  const [feedbackDownload, setFeedbackDownload] = useState<string | null>(null);

  // Turmas únicas disponíveis
  const turmasDisponiveis = useMemo(() => {
    return Array.from(new Set(estudantes.map(e => e.turma).filter(Boolean))).sort();
  }, [estudantes]);

  // Filtros aplicados
  const filtros: RelatorioApoioFilterOptions = useMemo(() => ({
    ano,
    mes,
    estudanteId,
    turma,
    tipo: estudanteId !== 'todos' ? 'individual' : 'geral'
  }), [ano, mes, estudanteId, turma]);

  const { registrosFiltrados, estudanteAlvo, mesNome } = useMemo(() => {
    return filtrarRegistrosParaRelatorio(registros, estudantes, filtros);
  }, [registros, estudantes, filtros]);

  // Métricas
  const total = registrosFiltrados.length;
  const presentes = registrosFiltrados.filter(r => r.presente).length;
  const ausentes = registrosFiltrados.filter(r => !r.presente).length;
  const atividades = registrosFiltrados.filter(r => r.recebeuAtividadeAdaptada === 'Sim').length;
  const taxaPresenca = total > 0 ? Math.round((presentes / total) * 100) : 0;

  const handleExportarPDF = () => {
    try {
      exportRelatorioApoioPDF(registros, estudantes, escolaConfig, currentUser, filtros);
      setFeedbackDownload('Relatório PDF oficial gerado e baixado com sucesso!');
      setTimeout(() => setFeedbackDownload(null), 4000);
    } catch (e: any) {
      console.error('Erro ao exportar PDF', e);
      alert('Erro ao gerar PDF: ' + (e.message || 'Falha inesperada'));
    }
  };

  const handleExportarCSV = () => {
    try {
      exportRelatorioApoioCSV(registros, estudantes, escolaConfig, currentUser, filtros);
      setFeedbackDownload('Planilha CSV gerada e baixada com sucesso!');
      setTimeout(() => setFeedbackDownload(null), 4000);
    } catch (e: any) {
      console.error('Erro ao exportar CSV', e);
      alert('Erro ao gerar CSV: ' + (e.message || 'Falha inesperada'));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Cabeçalho do Modal */}
        <div className="bg-gradient-to-r from-emerald-800 to-emerald-950 p-5 text-white flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest bg-emerald-700/80 text-emerald-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <FileText className="h-3 w-3" />
                <span>Relatório Oficial para Direção</span>
              </span>
              <span className="text-[10px] font-semibold text-emerald-200/90">
                Padrão SEDUC Goiás
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
              Exportar Relatório Mensal de Acompanhamento
            </h2>
            <p className="text-xs text-emerald-200/90">
              Gera documento formatado em Folha A4 com estatísticas, frequência, atividades adaptadas e campo de assinaturas.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Corpo com Parâmetros e Filtros */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          
          {feedbackDownload && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
              <span>{feedbackDownload}</span>
            </div>
          )}

          {/* 1. Seleção de Período (Mês e Ano) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-emerald-700" />
                <span>Mês de Referência:</span>
              </label>
              <select
                value={mes}
                onChange={(e) => setMes(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white"
              >
                {MESES.map(m => (
                  <option key={m.valor} value={m.valor}>
                    {m.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-emerald-700" />
                <span>Ano Letivo:</span>
              </label>
              <select
                value={ano}
                onChange={(e) => setAno(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white"
              >
                {[2025, 2026, 2027].map(a => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 2. Seleção de Estudante e Turma */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-emerald-700" />
                <span>Estudante (Escopo):</span>
              </label>
              <select
                value={estudanteId}
                onChange={(e) => setEstudanteId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white"
              >
                <option value="todos">Todos os Estudantes (Relatório Geral)</option>
                {estudantes.map(est => (
                  <option key={est.id} value={est.id}>
                    {est.nome} — {est.turma}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                <School className="h-3.5 w-3.5 text-emerald-700" />
                <span>Filtrar por Turma:</span>
              </label>
              <select
                value={turma}
                onChange={(e) => setTurma(e.target.value)}
                disabled={estudanteId !== 'todos'}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="todas">Todas as Turmas</option>
                {turmasDisponiveis.map(t => (
                  <option key={t} value={t}>
                    Turma {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. Card de Resumo Estatístico do Período */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                Resumo do Período: {mesNome} de {ano}
              </span>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                {total} {total === 1 ? 'registro' : 'registros'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Dias</span>
                <span className="text-xl font-black text-slate-900">{total}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Presenças</span>
                <span className="text-xl font-black text-emerald-700">{presentes} ({taxaPresenca}%)</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Faltas</span>
                <span className="text-xl font-black text-rose-700">{ausentes}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Atividades</span>
                <span className="text-xl font-black text-sky-700">{atividades}</span>
              </div>
            </div>

            {total === 0 && (
              <p className="text-xs text-amber-800 bg-amber-50 p-2 rounded-lg font-medium text-center">
                Não há registros lançados para os filtros selecionados neste mês. Você ainda pode gerar o documento formal se desejar.
              </p>
            )}
          </div>

          {/* 4. Pré-visualização dos Registros */}
          {total > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span>Amostra dos registros que constarão no relatório ({Math.min(total, 4)} de {total}):</span>
              </div>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden max-h-40 overflow-y-auto text-xs">
                {registrosFiltrados.slice(0, 4).map(reg => {
                  const est = estudantes.find(e => e.id === reg.studentId);
                  return (
                    <div key={reg.id} className="p-2.5 bg-white hover:bg-slate-50 flex items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            reg.presente ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {reg.presente ? 'Presente' : 'Ausente'}
                          </span>
                          <strong className="text-slate-800">{formatarDataPtBr(reg.data)}</strong>
                          <span className="text-slate-500 font-medium">— {est ? est.nome : 'Estudante'}</span>
                        </div>
                        {reg.presente && (
                          <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-md">
                            Atividade: {reg.recebeuAtividadeAdaptada} • {reg.disciplinasEnvolvidas?.join(', ') || 'Geral'}
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">{reg.horario}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Aviso sobre conformidade */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 flex items-start gap-2">
            <Building className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
            <div>
              <strong>Conformidade Administrativa:</strong> O PDF gerado inclui cabeçalho institucional oficial do Colégio Estadual Olynto Pereira de Castro, tabela detalhada de diário de bordo e campo de visto da Coordenação Pedagógica / Direção Escolar.
            </div>
          </div>

        </div>

        {/* Rodapé com Ações de Download */}
        <div className="bg-slate-50 p-4 sm:p-5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-white transition-colors cursor-pointer"
          >
            Fechar
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleExportarCSV}
              className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
              title="Baixar planilha CSV"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-700" />
              <span>Planilha CSV</span>
            </button>

            <button
              type="button"
              onClick={handleExportarPDF}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm"
              title="Baixar documento PDF formatado em A4"
            >
              <Printer className="h-4 w-4" />
              <span>Baixar Relatório em PDF (A4)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
