import React, { useState } from 'react';
import { 
  UserCheck, 
  LogOut, 
  Type, 
  ShieldAlert, 
  Printer, 
  Database,
  AlertTriangle,
  HeartHandshake,
  Folder,
  GraduationCap
} from 'lucide-react';
import { UserRole, AuthorizedUser, AtividadeAdaptada, Estudante, PerfilPedagogico } from '../types';
import { InstitutionalLogo } from './common/InstitutionalLogo';
import { LogoOlynto } from './common/LogoOlynto';
import { LOGO_ESCOLA_BASE64 } from '../assets/branding/logoEscolaBase64';
import { getLogoTooltip } from '../services/brandingService';
import { OfflineStatusIndicator } from './common/OfflineStatusIndicator';
import { AlertasPendenciaNav } from './common/AlertasPendenciaNav';

interface HeaderProps {
  currentUser: AuthorizedUser | null;
  currentActiveRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  onLogout: () => void;
  isDyslexicFont: boolean;
  onToggleDyslexicFont: () => void;
  onOpenPrintPreview?: () => void;
  hasActiveActivity?: boolean;
  onNavigateToMasterDataCenter?: () => void;
  isMasterDataCenterActive?: boolean;
  hasUnsavedChanges?: boolean;
  onDiscardUnsavedChanges?: () => void;
  onOpenGoogleDrive?: () => void;
  isGoogleDriveConnected?: boolean;
  onOpenCriarPei?: () => void;
  atividades?: AtividadeAdaptada[];
  estudantes?: Estudante[];
  perfisPedagogicos?: PerfilPedagogico[];
  onVisualizarAtividadeA4?: (atividade: AtividadeAdaptada) => void;
  onNavigateToCoordenacaoTab?: (tab: string, estudanteId?: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  currentActiveRole,
  onRoleChange,
  onLogout,
  isDyslexicFont,
  onToggleDyslexicFont,
  onOpenPrintPreview,
  hasActiveActivity,
  onNavigateToMasterDataCenter,
  isMasterDataCenterActive,
  hasUnsavedChanges = false,
  onDiscardUnsavedChanges,
  onOpenGoogleDrive,
  isGoogleDriveConnected = false,
  onOpenCriarPei,
  atividades = [],
  estudantes = [],
  perfisPedagogicos = [],
  onVisualizarAtividadeA4,
  onNavigateToCoordenacaoTab,
}) => {
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  const isSuperadmin = Boolean(
    currentUser?.roles.includes('superadmin') && 
    currentUser?.emailNormalized === 'marcos.ferreira@admin.educa.go.gov.br'
  );
  const isCoordenador = currentUser?.roles.includes('coordinator') || isSuperadmin;
  const isTeacher = currentUser?.roles.includes('teacher');
  const isDeveloper = currentUser?.roles.includes('developer') || isSuperadmin;
  const isProfissionalApoio = Boolean(currentUser?.roles.includes('PROFISSIONAL_DE_APOIO'));
  const canAccessApoio = isProfissionalApoio || isCoordenador || isDeveloper;
  const hasMultipleRoles = [isCoordenador, isTeacher, canAccessApoio].filter(Boolean).length > 1;

  const iniciais = currentUser ? currentUser.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : 'US';

  const handleLogoClick = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedModal(true);
      return;
    }
    executeLogoNavigation();
  };

  const executeLogoNavigation = () => {
    if (isMasterDataCenterActive) {
      onRoleChange('coordinator');
    } else {
      onRoleChange(currentActiveRole);
    }
  };

  const handleDiscardAndNavigate = () => {
    setShowUnsavedModal(false);
    if (onDiscardUnsavedChanges) {
      onDiscardUnsavedChanges();
    }
    executeLogoNavigation();
  };

  const tooltipText = getLogoTooltip(currentActiveRole, isMasterDataCenterActive);

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-2xs no-print transition-all">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          {/* Altura calibrada entre 72px e 88px conforme Seção 7 */}
          <div className="flex flex-col md:flex-row md:items-center justify-between min-h-[76px] py-2 gap-3">
            
            {/* ========================================================= */}
            {/* ÁREA ESQUERDA: Logo Oficial + Nome do Sistema + Escola    */}
            {/* ========================================================= */}
            <div className="header-logo-container flex items-center self-center my-auto shrink-0">
              {/* Container da imagem do logo com mr-4 para espaçamento confortável */}
              <div className="mr-4 flex items-center shrink-0">
                <LogoOlynto className="hover:opacity-80 transition-opacity" />
              </div>

              {/* Título 'AdaptaEdu Escolar' e identificação da escola imediatamente seguinte */}
              <div className="flex flex-col justify-center leading-tight">
                <div className="flex items-center gap-2">
                  <span className="font-black text-lg sm:text-xl tracking-tight text-slate-900">
                    AdaptaEdu Escolar
                  </span>
                  <span className="hidden xl:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    Oficial
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium hidden xs:block truncate max-w-[240px] sm:max-w-[320px]">
                  Colégio Estadual Olynto Pereira de Castro
                </p>
              </div>
            </div>

            {/* ========================================================= */}
            {/* ÁREA DIREITA: Seletor de Espaço + Perfil + Ações         */}
            {/* ========================================================= */}
            <div className="flex items-center justify-between md:justify-end gap-2 sm:gap-3 flex-wrap">
              
              {/* Switcher de Espaços */}
              {hasMultipleRoles ? (
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
                  {isCoordenador && (
                    <button
                      onClick={() => onRoleChange('coordinator')}
                      className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        currentActiveRole === 'coordinator' && !isMasterDataCenterActive
                          ? 'bg-emerald-700 text-white shadow-xs'
                          : 'text-slate-600 hover:text-emerald-800'
                      }`}
                      title="Acessar Espaço da Coordenação Pedagógica"
                    >
                      <ShieldAlert className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{isDeveloper ? 'Coordenação Geral' : 'Coordenação'}</span>
                      <span className="sm:hidden">Coord.</span>
                    </button>
                  )}
                  {isTeacher && (
                    <button
                      onClick={() => onRoleChange('teacher')}
                      className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        currentActiveRole === 'teacher' && !isMasterDataCenterActive
                          ? 'bg-sky-700 text-white shadow-xs'
                          : 'text-slate-600 hover:text-sky-800'
                      }`}
                      title="Acessar Espaço do Professor"
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                      <span>Professor</span>
                    </button>
                  )}
                  {canAccessApoio && (
                    <button
                      onClick={() => onRoleChange('PROFISSIONAL_DE_APOIO')}
                      className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        currentActiveRole === 'PROFISSIONAL_DE_APOIO' && !isMasterDataCenterActive
                          ? 'bg-emerald-800 text-white shadow-xs'
                          : 'text-slate-600 hover:text-emerald-900'
                      }`}
                      title="Acessar Espaço do Profissional de Apoio"
                    >
                      <HeartHandshake className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Profissional de Apoio</span>
                      <span className="sm:hidden">Apoio</span>
                    </button>
                  )}
                  {isSuperadmin && (
                    <button
                      onClick={onNavigateToMasterDataCenter}
                      className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
                        isMasterDataCenterActive
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/60'
                      }`}
                      title="Central Master de Dados e Arquivos (Exclusivo Superadmin)"
                    >
                      <Database className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="hidden sm:inline">Central Master</span>
                      <span className="sm:hidden">Master</span>
                    </button>
                  )}
                </div>
              ) : isCoordenador ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-bold text-emerald-900">
                  <ShieldAlert className="h-3.5 w-3.5 text-emerald-700" />
                  <span>Espaço da Coordenação</span>
                </div>
              ) : canAccessApoio ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-bold text-emerald-900">
                  <HeartHandshake className="h-3.5 w-3.5 text-emerald-700" />
                  <span>Profissional de Apoio</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-sky-50 border border-sky-200 rounded-lg text-xs font-bold text-sky-900">
                  <UserCheck className="h-3.5 w-3.5 text-sky-700" />
                  <span>Espaço do Professor</span>
                </div>
              )}

              {/* Tag explícita do perfil atual */}
              <div className="hidden lg:flex items-center text-xs font-bold px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-400 mr-1">Perfil:</span>
                <span className={
                  isMasterDataCenterActive 
                    ? 'text-emerald-700' 
                    : currentActiveRole === 'coordinator' 
                    ? 'text-emerald-800' 
                    : currentActiveRole === 'PROFISSIONAL_DE_APOIO'
                    ? 'text-emerald-900 font-extrabold'
                    : 'text-sky-800'
                }>
                  {isMasterDataCenterActive 
                    ? 'Superadmin' 
                    : currentActiveRole === 'coordinator' 
                    ? (isDeveloper ? 'Coordenação Geral' : 'Coordenação') 
                    : currentActiveRole === 'PROFISSIONAL_DE_APOIO'
                    ? 'Profissional de Apoio'
                    : 'Professor'}
                </span>
              </div>

              {/* Seletor de Fonte Acessível */}
              <button
                onClick={onToggleDyslexicFont}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all cursor-pointer ${
                  isDyslexicFont
                    ? 'bg-amber-100 border-amber-400 text-amber-900 font-bold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
                title="Alternar fonte com espaçamento ampliado"
              >
                <Type className="h-3.5 w-3.5" />
                <span className="hidden xl:inline">Fonte:</span>
                <span>{isDyslexicFont ? 'Ampla' : 'Padrão'}</span>
              </button>

              {/* Atalho para Folha A4 */}
              {hasActiveActivity && onOpenPrintPreview && (
                <button
                  onClick={onOpenPrintPreview}
                  className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition-colors cursor-pointer"
                  title="Pré-visualizar folha timbrada A4"
                >
                  <Printer className="h-3.5 w-3.5 text-emerald-700" />
                  <span>Folha A4</span>
                </button>
              )}

              {/* Botão Oficial: Criar PEI (SEDUC-GO) */}
              {onOpenCriarPei && (
                <button
                  onClick={onOpenCriarPei}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-extrabold bg-emerald-800 hover:bg-emerald-900 text-white shadow-xs transition-colors cursor-pointer"
                  title="Criar Plano Educacional Individualizado (PEI / SIAP - SEDUC-GO)"
                >
                  <GraduationCap className="h-3.5 w-3.5 text-emerald-200" />
                  <span className="hidden sm:inline">Criar PEI (SEDUC-GO)</span>
                  <span className="sm:hidden">PEI</span>
                </button>
              )}

              {/* Botão e Status do Google Drive */}
              {onOpenGoogleDrive && (
                <button
                  onClick={onOpenGoogleDrive}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                    isGoogleDriveConnected
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100 shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                  title="Gerenciar pastas de séries e imagens no Google Drive"
                >
                  <Folder className={`h-3.5 w-3.5 ${isGoogleDriveConnected ? 'text-amber-500 fill-amber-500/20' : 'text-slate-400'}`} />
                  <span className="hidden sm:inline">Google Drive</span>
                  <span className="sm:hidden">Drive</span>
                  {isGoogleDriveConnected ? (
                    <span className="flex h-2 w-2 relative" title="Conectado">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                    </span>
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300" title="Não conectado" />
                  )}
                </button>
              )}

              {/* Indicador de Status Online / Offline com Sincronização IndexedDB */}
              <OfflineStatusIndicator />

              {/* Alertas de Pendência da Coordenação (Atividades aguardando revisão e Perfis desatualizados) */}
              <AlertasPendenciaNav
                atividades={atividades}
                estudantes={estudantes}
                perfisPedagogicos={perfisPedagogicos}
                onVisualizarAtividadeA4={onVisualizarAtividadeA4}
                onNavigateToTab={onNavigateToCoordenacaoTab}
                isCoordenador={isCoordenador}
              />

              {/* Perfil do Usuário Autenticado */}
              {currentUser && (
                <div className="flex items-center gap-2 pl-1 sm:pl-2 border-l border-slate-200 text-xs">
                  {currentUser.photoUrl ? (
                    <img src={currentUser.photoUrl} alt={currentUser.name} className="h-8 w-8 rounded-full object-cover ring-1 ring-slate-300" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[11px] shrink-0">
                      {iniciais}
                    </div>
                  )}
                  <div className="leading-tight hidden sm:block max-w-[120px] md:max-w-[140px]">
                    <p className="font-bold text-slate-800 truncate">{currentUser.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono truncate">{currentUser.email}</p>
                  </div>
                </div>
              )}

              {/* Sair */}
              <button
                onClick={onLogout}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer border border-slate-200"
                title="Encerrar sessão"
              >
                <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Modal de Confirmação para Alterações Não Salvas (Seção 11) */}
      {showUnsavedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="p-2.5 rounded-full bg-amber-50 border border-amber-200">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Alterações Não Salvas</h3>
                <p className="text-xs text-slate-500">Existem alterações pendentes no formulário atual.</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
              Existem alterações não salvas. Deseja voltar ao início e descartar o rascunho em edição?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowUnsavedModal(false)}
                className="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Continuar editando
              </button>
              <button
                type="button"
                onClick={handleDiscardAndNavigate}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer shadow-xs"
              >
                Descartar e voltar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
