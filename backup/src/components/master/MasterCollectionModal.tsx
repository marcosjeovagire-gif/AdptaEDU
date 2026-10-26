import React, { useState, useMemo } from 'react';
import { 
  Users, 
  GraduationCap, 
  FileText, 
  BookOpen, 
  Sparkles, 
  ShieldCheck, 
  Activity, 
  Building, 
  Upload, 
  Clock, 
  Settings, 
  Search, 
  Filter, 
  Edit3, 
  Archive, 
  RotateCcw, 
  Trash2, 
  Eye, 
  Save, 
  X, 
  CheckCircle2, 
  AlertCircle,
  FileSpreadsheet,
  FileDown,
  Loader2
} from 'lucide-react';
import { 
  AuthorizedUser, 
  Estudante, 
  CurriculumMatrix, 
  CurriculumSkill, 
  PerfilPedagogico, 
  DocumentoImportado, 
  AtividadeAdaptada, 
  RegistroAuditoria, 
  EscolaConfig 
} from '../../types';
import { SafeActionDialog, SafeActionType } from './SafeActionDialog';
import { InstitutionalLogo } from '../common/InstitutionalLogo';
import { LogoOlynto } from '../common/LogoOlynto';
import { exportAuditoriaToCSV, exportAuditoriaToPDF } from '../../services/auditExportService';
import { baixarPeiComoPdf } from '../../services/peiPdfService';
import { 
  getBrandingConfiguration, 
  updateBrandingConfiguration, 
  HISTORICO_VERSOES_LOGO, 
  restoreInstitutionalLogoVersion 
} from '../../services/brandingService';

export type CollectionModalType = 
  | 'users'
  | 'students'
  | 'profiles'
  | 'documents'
  | 'matrices'
  | 'skills'
  | 'competencies'
  | 'activities'
  | 'branding'
  | 'batches'
  | 'audit'
  | 'settings';

interface MasterCollectionModalProps {
  collectionType: CollectionModalType;
  onClose: () => void;
  currentUser: AuthorizedUser;
  usuariosAutorizados: AuthorizedUser[];
  onUpdateUsuarios?: (usuarios: AuthorizedUser[]) => void;
  estudantes: Estudante[];
  onUpdateEstudantes: (estudantes: Estudante[]) => void;
  matrizes: CurriculumMatrix[];
  habilidades: CurriculumSkill[];
  perfis: PerfilPedagogico[];
  documentos: DocumentoImportado[];
  atividades: AtividadeAdaptada[];
  auditoria: RegistroAuditoria[];
  escolaConfig: EscolaConfig;
  onUpdateEscolaConfig?: (config: EscolaConfig) => void;
  onAddAuditoria: (auditoria: RegistroAuditoria) => void;
}

export const MasterCollectionModal: React.FC<MasterCollectionModalProps> = ({
  collectionType,
  onClose,
  currentUser,
  usuariosAutorizados,
  onUpdateUsuarios,
  estudantes,
  onUpdateEstudantes,
  matrizes,
  habilidades,
  perfis,
  documentos,
  atividades,
  auditoria,
  escolaConfig,
  onUpdateEscolaConfig,
  onAddAuditoria,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [detailItem, setDetailItem] = useState<any | null>(null);
  const [baixandoPeiMasterId, setBaixandoPeiMasterId] = useState<string | null>(null);

  // SafeAction state
  const [safeAction, setSafeAction] = useState<{
    isOpen: boolean;
    actionType: SafeActionType;
    item: any;
    itemName: string;
    itemType: string;
  } | null>(null);

  const isSuperadmin = Boolean(
    currentUser.roles.includes('superadmin') && 
    currentUser.emailNormalized === 'marcos.ferreira@admin.educa.go.gov.br'
  );

  // 10 Competências Gerais da BNCC
  const COMPETENCIAS_BNCC = [
    { numero: 1, titulo: 'Conhecimento', descricao: 'Valorizar e utilizar os conhecimentos historicamente construídos sobre o mundo físico, social, cultural e digital.' },
    { numero: 2, titulo: 'Pensamento Científico, Crítico e Criativo', descricao: 'Exercitar a curiosidade intelectual e recorrer à abordagem própria das ciências.' },
    { numero: 3, titulo: 'Repertório Cultural', descricao: 'Valorizar e fruir as diversas manifestações artísticas e culturais, das locais às mundiais.' },
    { numero: 4, titulo: 'Comunicação', descricao: 'Utilizar diferentes linguagens para se expressar e partilhar informações, experiências e sentimentos.' },
    { numero: 5, titulo: 'Cultura Digital', descricao: 'Compreender, utilizar e criar tecnologias digitais de informação e comunicação de forma crítica, significativa e ética.' },
    { numero: 6, titulo: 'Trabalho e Projeto de Vida', descricao: 'Valorizar a diversidade de saberes e vivências culturais e apropriar-se de conhecimentos e experiências.' },
    { numero: 7, titulo: 'Argumentação', descricao: 'Argumentar com base em fatos, dados e informações confiáveis para formular, negociar e defender ideias.' },
    { numero: 8, titulo: 'Autoconhecimento e Autocuidado', descricao: 'Conhecer-se, apreciar-se e cuidar de sua saúde física e emocional, compreendendo-se na diversidade humana.' },
    { numero: 9, titulo: 'Empatia e Cooperação', descricao: 'Exercitar a empatia, o diálogo, a resolução de conflitos e a cooperação, fazendo-se respeitar e promovendo o respeito.' },
    { numero: 10, titulo: 'Responsabilidade e Cidadania', descricao: 'Agir pessoal e coletivamente com autonomia, responsabilidade, flexibilidade, resiliência e determinação.' }
  ];

  // Configuração de Título e Ícone do Modal
  const getHeaderInfo = () => {
    switch (collectionType) {
      case 'users':
        return { title: 'Gestão de Usuários e Professores', icon: <Users className="h-5 w-5 text-emerald-600" />, count: usuariosAutorizados.length };
      case 'students':
        return { title: 'Gestão da Base de Estudantes', icon: <GraduationCap className="h-5 w-5 text-indigo-600" />, count: estudantes.length };
      case 'profiles':
        return { title: 'Perfis Pedagógicos e Adaptações', icon: <FileText className="h-5 w-5 text-teal-600" />, count: perfis.length };
      case 'documents':
        return { title: 'Documentos e Fichas Anexadas', icon: <FileText className="h-5 w-5 text-amber-600" />, count: documentos.length };
      case 'matrices':
        return { title: 'Matrizes Curriculares (DC-GO)', icon: <BookOpen className="h-5 w-5 text-emerald-600" />, count: matrizes.length };
      case 'skills':
        return { title: 'Habilidades Homologadas BNCC / DC-GO', icon: <Sparkles className="h-5 w-5 text-violet-600" />, count: habilidades.length };
      case 'competencies':
        return { title: '10 Competências Gerais da Educação Básica', icon: <ShieldCheck className="h-5 w-5 text-blue-600" />, count: 10 };
      case 'activities':
        return { title: 'Atividades Pedagógicas Adaptadas', icon: <Activity className="h-5 w-5 text-cyan-600" />, count: atividades.length };
      case 'branding':
        return { title: 'Identidade Visual Institucional Oficial', icon: <Building className="h-5 w-5 text-emerald-600" />, count: 1 };
      case 'batches':
        return { title: 'Lotes de Importação Processados', icon: <Upload className="h-5 w-5 text-indigo-600" />, count: 3 };
      case 'audit':
        return { title: 'Logs e Rastreabilidade de Auditoria', icon: <Clock className="h-5 w-5 text-slate-700" />, count: auditoria.length };
      case 'settings':
        return { title: 'Configurações Gerais da Escola', icon: <Settings className="h-5 w-5 text-slate-700" />, count: 1 };
    }
  };

  const header = getHeaderInfo();

  // Execução do SafeActionDialog
  const handleExecuteSafeAction = () => {
    if (!safeAction) return;
    const { actionType, item, itemName, itemType } = safeAction;

    if (itemType === 'Usuário' && onUpdateUsuarios) {
      if (actionType === 'archive') {
        const updated = usuariosAutorizados.map(u => u.id === item.id ? { ...u, status: 'archived' as const, active: false } : u);
        onUpdateUsuarios(updated);
      } else if (actionType === 'restore') {
        const updated = usuariosAutorizados.map(u => u.id === item.id ? { ...u, status: 'authorized' as const, active: true } : u);
        onUpdateUsuarios(updated);
      } else if (actionType === 'permanent_delete') {
        const updated = usuariosAutorizados.filter(u => u.id !== item.id);
        onUpdateUsuarios(updated);
      }
    } else if (itemType === 'Estudante') {
      if (actionType === 'archive') {
        const updated = estudantes.map(s => s.id === item.id ? { ...s, situacao: 'arquivado' as const } : s);
        onUpdateEstudantes(updated);
      } else if (actionType === 'restore') {
        const updated = estudantes.map(s => s.id === item.id ? { ...s, situacao: 'ativo' as const } : s);
        onUpdateEstudantes(updated);
      } else if (actionType === 'permanent_delete') {
        const updated = estudantes.filter(s => s.id !== item.id);
        onUpdateEstudantes(updated);
      }
    }

    // Registro na auditoria
    onAddAuditoria({
      id: `aud-${Date.now()}`,
      dataHora: new Date().toLocaleString('pt-BR'),
      usuarioResponsavel: currentUser.name,
      usuarioAlterado: itemName,
      perfisAnteriores: currentUser.roles,
      perfisPosteriores: currentUser.roles,
      situacaoAnterior: 'Ativo',
      situacaoPosterior: actionType === 'archive' ? 'Arquivado' : actionType === 'restore' ? 'Ativo' : 'Excluído',
      resultado: 'Sucesso',
      detalhes: `Ação "${actionType}" realizada em ${itemType}: ${itemName}`,
    });

    setSafeAction(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-6 animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col border border-slate-200 shadow-2xl overflow-hidden">
        
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-2xs">
              {header.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900">{header.title}</h3>
                <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-xs font-bold">
                  {header.count} registros
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Gerenciamento com controle de versão, integridade e segurança de dados.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
            title="Fechar janela"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Barra de Pesquisa e Filtros (para coleções tabulares) */}
        {['users', 'students', 'profiles', 'documents', 'matrices', 'skills', 'activities', 'audit'].includes(collectionType) && (
          <div className="p-3 sm:p-4 bg-white border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar por nome, código, e-mail..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-slate-50 focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs p-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium"
              >
                <option value="all">Todos os status</option>
                <option value="active">Apenas Ativos</option>
                <option value="archived">Arquivados</option>
              </select>
            </div>
          </div>
        )}

        {/* Corpo do Modal - Conteúdo Dinâmico por Coleção */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">

          {/* ========================================================== */}
          {/* 1. USUÁRIOS E PROFESSORES                                  */}
          {/* ========================================================== */}
          {collectionType === 'users' && (
            <div className="space-y-3">
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                    <tr>
                      <th className="p-3">Nome do Profissional</th>
                      <th className="p-3">E-mail Institucional</th>
                      <th className="p-3">Papéis / Perfis</th>
                      <th className="p-3 text-center">Situação</th>
                      <th className="p-3 text-right">Ações Seguras</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {usuariosAutorizados
                      .filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map(u => (
                        <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-bold text-slate-900">{u.name}</td>
                          <td className="p-3 font-mono text-slate-600">{u.email}</td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1">
                              {u.roles.map(r => (
                                <span key={r} className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                  {r === 'superadmin' ? 'Superadmin' : r === 'coordinator' ? 'Coordenação' : r === 'teacher' ? 'Professor' : 'Developer'}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${u.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                              {u.active ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setEditingItem(u)}
                                className="p-1.5 rounded hover:bg-slate-200 text-slate-600 cursor-pointer"
                                title="Editar dados e perfis"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setSafeAction({
                                  isOpen: true,
                                  actionType: u.active ? 'archive' : 'restore',
                                  item: u,
                                  itemName: u.name,
                                  itemType: 'Usuário',
                                })}
                                className="p-1.5 rounded hover:bg-slate-200 text-amber-600 cursor-pointer"
                                title={u.active ? 'Arquivar usuário' : 'Restaurar usuário'}
                              >
                                {u.active ? <Archive className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
                              </button>
                              {isSuperadmin && (
                                <button
                                  type="button"
                                  onClick={() => setSafeAction({
                                    isOpen: true,
                                    actionType: 'permanent_delete',
                                    item: u,
                                    itemName: u.name,
                                    itemType: 'Usuário',
                                  })}
                                  className="p-1.5 rounded hover:bg-red-100 text-red-600 cursor-pointer"
                                  title="Exclusão definitiva reforçada"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* 2. ESTUDANTES                                              */}
          {/* ========================================================== */}
          {collectionType === 'students' && (
            <div className="space-y-3">
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                    <tr>
                      <th className="p-3">Nome Oficial</th>
                      <th className="p-3">Matrícula</th>
                      <th className="p-3">Turma e Série</th>
                      <th className="p-3">Turno</th>
                      <th className="p-3 text-center">Situação</th>
                      <th className="p-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {estudantes
                      .filter(s => s.nome.toLowerCase().includes(searchTerm.toLowerCase()) || (s.turma && s.turma.toLowerCase().includes(searchTerm.toLowerCase())))
                      .map(s => (
                        <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-bold text-slate-900">{s.nome}</td>
                          <td className="p-3 font-mono text-slate-600">{s.matricula || 'Sem matrícula'}</td>
                          <td className="p-3 font-semibold text-slate-800">{s.turma || s.anoSerie || 'Não vinculada'}</td>
                          <td className="p-3 text-slate-600">{s.turno || 'Matutino'}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${s.situacao === 'ativo' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-600'}`}>
                              {s.situacao}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setEditingItem(s)}
                                className="p-1.5 rounded hover:bg-slate-200 text-slate-600 cursor-pointer"
                                title="Editar estudante"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setSafeAction({
                                  isOpen: true,
                                  actionType: s.situacao === 'ativo' ? 'archive' : 'restore',
                                  item: s,
                                  itemName: s.nome,
                                  itemType: 'Estudante',
                                })}
                                className="p-1.5 rounded hover:bg-slate-200 text-amber-600 cursor-pointer"
                                title={s.situacao === 'ativo' ? 'Arquivar estudante' : 'Restaurar'}
                              >
                                {s.situacao === 'ativo' ? <Archive className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* 3. DOCUMENTOS E PEIS ANEXADOS                              */}
          {/* ========================================================== */}
          {collectionType === 'documents' && (
            <div className="space-y-3">
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                    <tr>
                      <th className="p-3">Arquivo / Documento</th>
                      <th className="p-3">Categoria / Tipo</th>
                      <th className="p-3">Data Envio</th>
                      <th className="p-3">Tamanho</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {documentos.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500 font-medium">
                          Nenhum documento ou PEI homologado na base de dados.
                        </td>
                      </tr>
                    ) : (
                      documentos
                        .filter(d => 
                          d.nomeArquivo.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          d.tipo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (d.peiDados && d.peiDados.studentName.toLowerCase().includes(searchTerm.toLowerCase()))
                        )
                        .map(d => {
                          const isPei = d.tipo === 'pei' || Boolean(d.peiDados);
                          const pei = d.peiDados;

                          return (
                            <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  {isPei ? (
                                    <GraduationCap className="h-4 w-4 text-emerald-700 shrink-0" />
                                  ) : (
                                    <FileText className="h-4 w-4 text-amber-600 shrink-0" />
                                  )}
                                  <div>
                                    <span className="font-bold text-slate-900 block">{d.nomeArquivo}</span>
                                    {isPei && pei && (
                                      <span className="text-[10px] text-slate-500">
                                        Aluno: <strong>{pei.studentName}</strong> • {pei.period}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="p-3">
                                {isPei ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    PEI (SEDUC-GO)
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700">
                                    {d.tipo}
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-slate-600">{d.dataEnvio}</td>
                              <td className="p-3 font-mono text-slate-500">{d.tamanho}</td>
                              <td className="p-3 text-center">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  {d.status || 'aprovado'}
                                </span>
                              </td>
                              <td className="p-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {isPei && pei && (
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        setBaixandoPeiMasterId(d.id);
                                        try {
                                          await baixarPeiComoPdf(pei, escolaConfig);
                                        } catch (e) {
                                          console.error('Erro ao baixar PEI no Master:', e);
                                        } finally {
                                          setBaixandoPeiMasterId(null);
                                        }
                                      }}
                                      disabled={baixandoPeiMasterId === d.id}
                                      className="px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                      title="Baixar PDF A4 Oficial com logo da escola"
                                    >
                                      {baixandoPeiMasterId === d.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <FileDown className="h-3 w-3" />
                                      )}
                                      <span>PDF</span>
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* 8. COMPETÊNCIAS GERAIS DA BNCC                             */}
          {/* ========================================================== */}
          {collectionType === 'competencies' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {COMPETENCIAS_BNCC.map(c => (
                <div key={c.numero} className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full bg-blue-100 text-blue-800 font-extrabold text-xs flex items-center justify-center shrink-0">
                      {c.numero}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900">{c.titulo}</h4>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed pl-8">
                    {c.descricao}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* ========================================================== */}
          {/* 11. IDENTIDADE VISUAL INSTITUCIONAL (BRANDING)             */}
          {/* ========================================================== */}
          {collectionType === 'branding' && (
            <div className="space-y-6">
              {/* Preview Oficial */}
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center space-y-3">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 px-3 py-1 bg-emerald-100 rounded-full">
                  Identidade Visual Oficial (LOGO_ESCOLA_BASE64)
                </span>
                <LogoOlynto
                  variant="custom"
                  style={{ maxHeight: '120px', maxWidth: '420px', width: '100%', objectFit: 'contain' }}
                  className="max-w-[420px] mx-auto block py-2"
                />
                <p className="text-xs text-slate-600 max-w-lg">
                  Colégio Estadual Olynto Pereira de Castro • Secretaria de Estado da Educação • Governo de Goiás
                </p>
              </div>

              {/* Histórico de Versões */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Histórico de Versões da Identidade Visual
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {HISTORICO_VERSOES_LOGO.map(v => (
                    <div key={v.id} className="p-3 bg-white flex items-center justify-between gap-3 text-xs">
                      <div>
                        <span className="font-bold text-slate-900">{v.version}</span>
                        <p className="text-[11px] text-slate-500">{v.fileName} • {v.dimensions}</p>
                        <p className="text-[11px] text-emerald-700 font-medium">{v.reason}</p>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold text-[10px]">
                        Ativa
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* 13. LOGS DE AUDITORIA                                      */}
          {/* ========================================================== */}
          {collectionType === 'audit' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="text-xs text-slate-600 font-medium">
                  Total de <strong className="text-slate-900">{auditoria.length}</strong> registro(s) de auditoria catalogados.
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => exportAuditoriaToCSV(auditoria, escolaConfig)}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 text-emerald-900 border border-emerald-300 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                    title="Exportar registros de auditoria em CSV"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-700" />
                    <span>Exportar CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => exportAuditoriaToPDF(auditoria, escolaConfig)}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                    title="Exportar registros de auditoria em PDF"
                  >
                    <FileText className="h-3.5 w-3.5 text-white" />
                    <span>Exportar PDF</span>
                  </button>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                  <tr>
                    <th className="p-3">Data e Hora</th>
                    <th className="p-3">Responsável</th>
                    <th className="p-3">Registro Alterado</th>
                    <th className="p-3">Resultado</th>
                    <th className="p-3">Detalhes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditoria.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-400">
                        Nenhum registro de auditoria arquivado ainda.
                      </td>
                    </tr>
                  ) : (
                    auditoria.map(a => (
                      <tr key={a.id} className="hover:bg-slate-50">
                        <td className="p-3 font-mono text-slate-600">{a.dataHora}</td>
                        <td className="p-3 font-bold text-slate-800">{a.usuarioResponsavel}</td>
                        <td className="p-3 text-slate-700">{a.usuarioAlterado}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${a.resultado === 'Sucesso' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                            {a.resultado}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600">{a.detalhes}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          )}

          {/* ========================================================== */}
          {/* 14. CONFIGURAÇÕES GERAIS DA ESCOLA                        */}
          {/* ========================================================== */}
          {collectionType === 'settings' && (
            <div className="max-w-2xl mx-auto space-y-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Dados Institucionais do Estabelecimento de Ensino
              </h4>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nome Oficial da Escola</label>
                  <input
                    type="text"
                    defaultValue={escolaConfig.nome || 'Colégio Estadual Olynto Pereira de Castro'}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50"
                    readOnly
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Município e UF</label>
                    <input
                      type="text"
                      defaultValue={escolaConfig.municipio || 'Rio Verde - GO'}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Ano Letivo Ativo</label>
                    <input
                      type="text"
                      defaultValue="2026 / 1º e 2º Semestres"
                      className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-mono"
                      readOnly
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Órgão Regulador</label>
                  <input
                    type="text"
                    defaultValue="Secretaria de Estado da Educação - SEDUC Goiás"
                    className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50"
                    readOnly
                  />
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Rodapé do Modal */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            AdaptaEdu Escolar • Integridade e Rastreabilidade
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold bg-slate-900 text-white rounded-xl hover:bg-black transition-colors cursor-pointer shadow-xs"
          >
            Concluir e Voltar à Central
          </button>
        </div>

      </div>

      {/* Diálogo Seguro de Ação (SafeActionDialog) */}
      {safeAction && (
        <SafeActionDialog
          isOpen={safeAction.isOpen}
          onClose={() => setSafeAction(null)}
          onConfirm={handleExecuteSafeAction}
          actionType={safeAction.actionType}
          itemName={safeAction.itemName}
          itemType={safeAction.itemType}
          isSuperadmin={isSuperadmin}
        />
      )}
    </div>
  );
};
