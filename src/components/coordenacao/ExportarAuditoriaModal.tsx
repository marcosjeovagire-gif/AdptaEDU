import React, { useState, useMemo } from 'react';
import { 
  X, 
  FileSpreadsheet, 
  FileText, 
  Printer, 
  ShieldCheck, 
  AlertTriangle, 
  Calendar, 
  Search, 
  Download,
  Filter,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { RegistroAuditoria, EscolaConfig } from '../../types';
import { exportAuditoriaToCSV, exportAuditoriaToPDF } from '../../services/auditExportService';
import { LogoOlynto } from '../common/LogoOlynto';

interface ExportarAuditoriaModalProps {
  isOpen: boolean;
  onClose: () => void;
  auditoria: RegistroAuditoria[];
  escolaConfig: EscolaConfig;
  usuarioAtualNome?: string;
}

export const ExportarAuditoriaModal: React.FC<ExportarAuditoriaModalProps> = ({
  isOpen,
  onClose,
  auditoria,
  escolaConfig,
  usuarioAtualNome,
}) => {
  const [filtroPeriodo, setFiltroPeriodo] = useState<'todos' | '7dias' | '30dias'>('todos');
  const [filtroResultado, setFiltroResultado] = useState<'todos' | 'Sucesso' | 'Bloqueado'>('todos');
  const [busca, setBusca] = useState('');
  const [exportando, setExportando] = useState<string | null>(null);

  // Filtragem dos registros
  const registrosFiltrados = useMemo(() => {
    return auditoria.filter(reg => {
      // Filtro de resultado
      if (filtroResultado !== 'todos' && reg.resultado !== filtroResultado) {
        return false;
      }

      // Filtro de busca textual
      if (busca.trim()) {
        const termo = busca.toLowerCase();
        const bateu = 
          (reg.detalhes && reg.detalhes.toLowerCase().includes(termo)) ||
          (reg.usuarioResponsavel && reg.usuarioResponsavel.toLowerCase().includes(termo)) ||
          (reg.usuarioAlterado && reg.usuarioAlterado.toLowerCase().includes(termo)) ||
          (reg.dataHora && reg.dataHora.toLowerCase().includes(termo));
        if (!bateu) return false;
      }

      // Filtro de período (estimativa por timestamp ou dias)
      if (filtroPeriodo !== 'todos') {
        const diasLimite = filtroPeriodo === '7dias' ? 7 : 30;
        const limiteMs = diasLimite * 24 * 60 * 60 * 1000;
        // Se id tiver timestamp numérico (ex: audit-1727...)
        const idTimestamp = reg.id.replace(/\D/g, '');
        if (idTimestamp && idTimestamp.length >= 10) {
          const ts = parseInt(idTimestamp.slice(0, 13), 10);
          if (Date.now() - ts > limiteMs) return false;
        }
      }

      return true;
    });
  }, [auditoria, filtroPeriodo, filtroResultado, busca]);

  const totalSucessos = useMemo(() => {
    return registrosFiltrados.filter(r => r.resultado === 'Sucesso').length;
  }, [registrosFiltrados]);

  const totalBloqueados = useMemo(() => {
    return registrosFiltrados.filter(r => r.resultado === 'Bloqueado').length;
  }, [registrosFiltrados]);

  if (!isOpen) return null;

  const handleExportCSV = () => {
    setExportando('csv');
    try {
      exportAuditoriaToCSV(registrosFiltrados, escolaConfig, usuarioAtualNome);
    } finally {
      setTimeout(() => setExportando(null), 600);
    }
  };

  const handleExportPDF = () => {
    setExportando('pdf');
    try {
      exportAuditoriaToPDF(registrosFiltrados, escolaConfig, usuarioAtualNome);
    } finally {
      setTimeout(() => setExportando(null), 800);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Cabeçalho do Modal */}
        <div className="no-print p-4 sm:p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 border border-emerald-400/30 rounded-xl">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-extrabold tracking-tight">Exportar Relatório Formal de Auditoria</h3>
              <p className="text-xs text-slate-300">
                Gere arquivos em CSV ou PDF assinados digitalmente para prestação de contas e controle institucional.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Barra de Ações Rápidas de Exportação */}
        <div className="no-print p-4 bg-emerald-50/70 border-b border-emerald-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-emerald-950">Formatos disponíveis:</span>
            <span className="text-[11px] text-emerald-800 font-medium">
              ({registrosFiltrados.length} registros selecionados)
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Botão CSV */}
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={exportando !== null}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-700" />
              <span>{exportando === 'csv' ? 'Gerando...' : 'Exportar CSV (Excel)'}</span>
            </button>

            {/* Botão PDF Direto */}
            <button
              type="button"
              onClick={handleExportPDF}
              disabled={exportando !== null}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <FileText className="h-4 w-4 text-white" />
              <span>{exportando === 'pdf' ? 'Gerando...' : 'Exportar PDF Oficial'}</span>
            </button>

            {/* Botão Imprimir / Salvar como PDF */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              <Printer className="h-4 w-4 text-slate-300" />
              <span>Imprimir / A4</span>
            </button>
          </div>
        </div>

        {/* Filtros e Busca */}
        <div className="no-print p-4 bg-white border-b border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Filtrar por ação, usuário ou data..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-slate-50 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
            <select
              value={filtroPeriodo}
              onChange={(e) => setFiltroPeriodo(e.target.value as any)}
              className="w-full text-xs p-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium"
            >
              <option value="todos">Todo o Histórico</option>
              <option value="7dias">Últimos 7 dias</option>
              <option value="30dias">Últimos 30 dias</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400 shrink-0" />
            <select
              value={filtroResultado}
              onChange={(e) => setFiltroResultado(e.target.value as any)}
              className="w-full text-xs p-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium"
            >
              <option value="todos">Todos os Resultados</option>
              <option value="Sucesso">Apenas Sucesso</option>
              <option value="Bloqueado">Apenas Bloqueados</option>
            </select>
          </div>
        </div>

        {/* Indicadores Resumidos */}
        <div className="no-print px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-4">
            <span>Total: <strong className="text-slate-900">{registrosFiltrados.length}</strong></span>
            <span className="text-emerald-700">Sucesso: <strong>{totalSucessos}</strong></span>
            <span className="text-rose-700">Bloqueios de Segurança: <strong>{totalBloqueados}</strong></span>
          </div>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Em conformidade com a LGPD e Diretrizes SEDUC-GO
          </span>
        </div>

        {/* Pré-visualização da Folha Formal A4 (Pronta para Impressão) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100">
          <div className="print-page bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm max-w-3xl mx-auto space-y-6">
            
            {/* Cabeçalho Oficial do Relatório */}
            <div className="border-b-2 border-emerald-800 pb-3 flex items-start justify-between gap-3 text-left">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <LogoOlynto 
                  variant="pdf" 
                  style={{ maxHeight: '40px', maxWidth: '120px', width: 'auto', height: 'auto', objectFit: 'contain', flexShrink: 0 }} 
                  className="pdf-school-logo max-h-[40px] max-w-[120px] w-auto h-auto object-contain flex-shrink-0 shrink-0 self-start"
                  alt="Logo Oficial"
                />
                <div className="leading-tight flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500">
                    Governo do Estado de Goiás • Secretaria de Estado da Educação
                  </p>
                  <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                    {escolaConfig.nome || 'Colégio Estadual Olynto Pereira de Castro'}
                  </h2>
                  <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                    LIVRO OFICIAL DE AUDITORIA, SEGURANÇA E RASTREABILIDADE
                  </p>
                </div>
              </div>
              <div className="border border-slate-300 px-2.5 py-1 text-right shrink-0 bg-slate-50/50 self-start text-[10px]">
                <span className="text-slate-500 block">SEDUC-GO</span>
                <span className="font-bold text-slate-700">Audit Log</span>
              </div>
            </div>

            {/* Metadados do Documento */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <span className="text-slate-500 block">Emitido por:</span>
                <strong className="text-slate-900">{usuarioAtualNome || 'Coordenação Pedagógica'}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Data e Hora de Emissão:</span>
                <strong className="text-slate-900">{new Date().toLocaleString('pt-BR')}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Registros Relacionados:</span>
                <strong className="text-slate-900">{registrosFiltrados.length} evento(s)</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Finalidade:</span>
                <span className="text-slate-700 font-medium">Controle Administrativo & LGPD</span>
              </div>
            </div>

            {/* Tabela de Registros */}
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="p-2.5">Data/Hora</th>
                    <th className="p-2.5">Responsável</th>
                    <th className="p-2.5">Alvo/Usuário</th>
                    <th className="p-2.5">Resultado</th>
                    <th className="p-2.5">Detalhes da Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {registrosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-400">
                        Nenhum registro encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    registrosFiltrados.map((reg) => (
                      <tr key={reg.id} className="hover:bg-slate-50 text-[11px]">
                        <td className="p-2.5 whitespace-nowrap font-mono text-slate-600">{reg.dataHora}</td>
                        <td className="p-2.5 font-bold text-slate-900">{reg.usuarioResponsavel}</td>
                        <td className="p-2.5 text-slate-700">{reg.usuarioAlterado || 'Geral'}</td>
                        <td className="p-2.5 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            reg.resultado === 'Sucesso' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {reg.resultado}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-600 leading-snug">{reg.detalhes}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Bloco de Assinatura Formal */}
            <div className="pt-8 text-center space-y-4">
              <div className="max-w-xs mx-auto border-t border-slate-400 pt-2">
                <p className="text-xs font-bold text-slate-900 uppercase">
                  Coordenação Pedagógica / Direção
                </p>
                <p className="text-[10px] text-slate-500">
                  {escolaConfig.nome || 'Colégio Estadual Olynto Pereira de Castro'}
                </p>
              </div>
              <p className="text-[9px] text-slate-400 italic">
                Documento emitido eletronicamente pelo Sistema AdaptaEdu Escolar em conformidade com o regimento escolar e a LGPD.
              </p>
            </div>

          </div>
        </div>

        {/* Rodapé do Modal */}
        <div className="no-print p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>{registrosFiltrados.length} evento(s) pronto(s) para exportação</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
