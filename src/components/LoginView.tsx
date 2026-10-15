import React, { useState } from 'react';
import { 
  GraduationCap, 
  ShieldAlert, 
  CheckCircle2, 
  Shield, 
  AlertCircle,
  School,
  UserCheck,
  ArrowRight,
  Mail,
  Loader2,
  HeartHandshake
} from 'lucide-react';
import { AuthorizedUser, EscolaConfig, UserRole } from '../types';
import { 
  verifyLocalPreviewAccess, 
  requestPasswordlessEmailLink 
} from '../server/authService';
import { signInWithGoogleDrive } from '../services/googleDriveService';
import { InstitutionalLogo } from './common/InstitutionalLogo';
import LogoOlynto, { LogoOlynto as LogoOlyntoComponent } from './common/LogoOlynto';

interface LoginViewProps {
  escolaConfig: EscolaConfig;
  usuariosAutorizados: AuthorizedUser[];
  onLoginSucesso: (user: AuthorizedUser, requestedRole: UserRole, targetRoute: string) => void;
  isFirebaseConfigured?: boolean;
}

export const LoginView: React.FC<LoginViewProps> = ({
  escolaConfig,
  usuariosAutorizados,
  onLoginSucesso,
  isFirebaseConfigured = false,
}) => {
  // 1. Seleção do espaço desejado: [ COORDENAÇÃO ], [ PROFESSOR ] ou [ APOIO ]
  const [espacoDesejado, setEspacoDesejado] = useState<'coordinator' | 'teacher' | 'apoio'>('coordinator');

  // 2. Campo de e-mail educacional - INICIA ESTRITAMENTE VAZIO
  const [emailInput, setEmailInput] = useState('');

  // 3. Estados de feedback e validação
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [mostrarBotaoIrParaProfessor, setMostrarBotaoIrParaProfessor] = useState(false);
  const [isProcessando, setIsProcessando] = useState(false);
  const [linkEnviadoProducao, setLinkEnviadoProducao] = useState(false);

  // Submissão do Acesso (Modo Local ou Envio de Link em Produção)
  const handleSubmitAcesso = (e: React.FormEvent) => {
    e.preventDefault();
    setMensagemErro(null);
    setMensagemSucesso(null);
    setMostrarBotaoIrParaProfessor(false);

    // FLUXO DO MODO LOCAL DE PRÉ-VISUALIZAÇÃO (Firebase ainda não conectado)
    if (!isFirebaseConfigured) {
      setIsProcessando(true);
      const res = verifyLocalPreviewAccess({
        email: emailInput,
        espacoDesejado,
        authorizedUsers: usuariosAutorizados,
      });
      setIsProcessando(false);

      if (!res.success) {
        setMensagemErro(res.message);
        if (res.data?.oferecerEspacoProfessor) {
          setMostrarBotaoIrParaProfessor(true);
        }
        return;
      }

      setMensagemSucesso(res.message);
      if (res.data) {
        const loginData = res.data;
        setTimeout(() => {
          onLoginSucesso(loginData.user, loginData.espacoAutorizado, loginData.rotaDestino);
        }, 350);
      }
      return;
    }

    // FLUXO PREPARADO PARA PRODUÇÃO (Firebase Authentication Email Link)
    setIsProcessando(true);
    const res = requestPasswordlessEmailLink({
      email: emailInput,
      espacoDesejado,
      authorizedUsers: usuariosAutorizados,
    });
    setIsProcessando(false);

    if (!res.success) {
      setMensagemErro(res.message);
      return;
    }

    setLinkEnviadoProducao(true);
    setMensagemSucesso('Enviamos um link de acesso ao seu e-mail educacional.');
  };

  // Ação ao clicar no botão "IR PARA O ESPAÇO DO PROFESSOR"
  const handleIrParaEspacoProfessor = () => {
    setEspacoDesejado('teacher');
    setMensagemErro(null);
    setMostrarBotaoIrParaProfessor(false);

    // Efetua nova verificação imediata para o Espaço do Professor
    const res = verifyLocalPreviewAccess({
      email: emailInput,
      espacoDesejado: 'teacher',
      authorizedUsers: usuariosAutorizados,
    });

    if (res.success && res.data) {
      const teacherData = res.data;
      setMensagemSucesso(res.message);
      setTimeout(() => {
        onLoginSucesso(teacherData.user, 'teacher', '/teacher-preview');
      }, 300);
    } else {
      setMensagemErro(res.message);
    }
  };

  // Autenticação direta com Google para habilitar Google Drive
  const handleSignInWithGoogle = async () => {
    setIsProcessando(true);
    setMensagemErro(null);
    setMensagemSucesso(null);
    try {
      const res = await signInWithGoogleDrive();
      const gUser = res.user;
      const gEmail = gUser.email?.toLowerCase().trim() || '';

      // Tenta associar com o usuário oficial
      let userEncontrado = usuariosAutorizados.find(
        u => u.emailNormalized === gEmail || u.email.toLowerCase() === gEmail
      );

      // Se entrou com Gmail pessoal (ex: Marcos Antonio / marcosjeovagire@gmail.com), vincula ao superadmin
      if (!userEncontrado) {
        if (gEmail.includes('marcos') || gEmail.includes('admin')) {
          userEncontrado = usuariosAutorizados.find(
            u => u.emailNormalized === 'marcos.ferreira@admin.educa.go.gov.br'
          );
        } else if (espacoDesejado === 'coordinator') {
          userEncontrado = usuariosAutorizados.find(u => u.roles.includes('coordinator'));
        } else if (espacoDesejado === 'apoio') {
          userEncontrado = usuariosAutorizados.find(u => u.roles.includes('PROFISSIONAL_DE_APOIO'));
        } else {
          userEncontrado = usuariosAutorizados.find(u => u.roles.includes('teacher'));
        }
      }

      if (userEncontrado) {
        setMensagemSucesso(`Autenticado com sucesso via Google (${gEmail})! Conectando ao Google Drive...`);
        const targetRoute = espacoDesejado === 'coordinator' 
          ? '/coordinator-preview' 
          : espacoDesejado === 'apoio' 
          ? '/apoio-preview' 
          : '/teacher-preview';
        const roleParaLogin: UserRole = espacoDesejado === 'apoio' 
          ? 'PROFISSIONAL_DE_APOIO' 
          : espacoDesejado;
        setTimeout(() => {
          onLoginSucesso(userEncontrado!, roleParaLogin, targetRoute);
        }, 350);
      }
    } catch (err: any) {
      setMensagemErro(err.message || 'Falha ao autenticar com a conta Google.');
    } finally {
      setIsProcessando(false);
    }
  };

  // Acesso rápido em 1 clique para avaliação do sistema em link compartilhado
  const handleQuickAccess = (emailDemo: string, role: 'coordinator' | 'teacher' | 'apoio') => {
    setEmailInput(emailDemo);
    setEspacoDesejado(role);
    setMensagemErro(null);
    setIsProcessando(true);

    const res = verifyLocalPreviewAccess({
      email: emailDemo,
      espacoDesejado: role,
      authorizedUsers: usuariosAutorizados,
    });
    setIsProcessando(false);

    if (res.success && res.data) {
      setMensagemSucesso(res.message);
      setTimeout(() => {
        onLoginSucesso(res.data!.user, res.data!.espacoAutorizado, res.data!.rotaDestino);
      }, 300);
    } else {
      setMensagemErro(res.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      
      {/* Top Banner Institucional com Logo Oficial */}
      <div className="max-w-4xl mx-auto w-full pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <LogoOlynto 
              variant="custom"
              style={{ height: '48px', width: 'auto', objectFit: 'contain' }}
              className="shrink-0"
            />
            <div className="hidden xs:block border-l border-slate-200 pl-3">
              <span className="font-black text-lg sm:text-xl tracking-tight text-slate-900 block">
                Adapta<span className="text-emerald-700">Edu</span> Escolar
              </span>
              <p className="text-[11px] text-slate-500 font-medium">
                Colégio Estadual Olynto Pereira de Castro
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-900 bg-emerald-50 border border-emerald-300 px-3 py-1.5 rounded-full self-start sm:self-auto">
            <Shield className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
            <span>Ambiente Escolar Oficial</span>
          </div>
        </div>
      </div>

      {/* Caixa Central de Acesso */}
      <div className="max-w-md mx-auto w-full my-auto py-6">
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xl space-y-6">
          
          {/* Formulário de Acesso com Logo Oficial Centralizado no Topo */}
          <form onSubmit={handleSubmitAcesso} className="space-y-6">
            
            {/* Topo do Formulário: Logo centralizado aplicando max-width: 300px; height: auto; margin-bottom: 20px; object-fit: contain; */}
            <div className="flex justify-center text-center">
              <LogoOlynto 
                variant="login"
                style={{ maxWidth: '300px', height: 'auto', marginBottom: '20px', objectFit: 'contain' }}
                clickable
                onClick={() => {
                  setMensagemErro(null);
                  setMensagemSucesso(null);
                }}
              />
            </div>

            {/* Título AdaptaEdu Escolar & Subtítulo */}
            <div className="text-center">
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Adapta<span className="text-emerald-700">Edu</span> Escolar
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Sistema de Atividades Pedagógicas Adaptadas
              </p>
            </div>

            {/* Pergunta "Qual espaço deseja acessar?" */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 text-center">
                Qual espaço deseja acessar?
              </label>

              {/* Botões [ COORDENAÇÃO ], [ PROFESSOR ] e [ APOIO ] */}
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setEspacoDesejado('coordinator');
                    setMensagemErro(null);
                    setMostrarBotaoIrParaProfessor(false);
                  }}
                  className={`py-2 px-1 rounded-lg text-[11px] font-extrabold flex flex-col sm:flex-row items-center justify-center gap-1 transition-all cursor-pointer ${
                    espacoDesejado === 'coordinator'
                      ? 'bg-emerald-700 text-white shadow-xs ring-2 ring-emerald-600 ring-offset-1'
                      : 'text-slate-600 hover:text-emerald-800 hover:bg-slate-200/60'
                  }`}
                >
                  <ShieldAlert className="h-3.5 w-3.5" />
                  <span>COORDENAÇÃO</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEspacoDesejado('teacher');
                    setMensagemErro(null);
                    setMostrarBotaoIrParaProfessor(false);
                  }}
                  className={`py-2 px-1 rounded-lg text-[11px] font-extrabold flex flex-col sm:flex-row items-center justify-center gap-1 transition-all cursor-pointer ${
                    espacoDesejado === 'teacher'
                      ? 'bg-sky-700 text-white shadow-xs ring-2 ring-sky-600 ring-offset-1'
                      : 'text-slate-600 hover:text-sky-800 hover:bg-slate-200/60'
                  }`}
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  <span>PROFESSOR</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEspacoDesejado('apoio');
                    setMensagemErro(null);
                    setMostrarBotaoIrParaProfessor(false);
                  }}
                  className={`py-2 px-1 rounded-lg text-[11px] font-extrabold flex flex-col sm:flex-row items-center justify-center gap-1 transition-all cursor-pointer ${
                    espacoDesejado === 'apoio'
                      ? 'bg-emerald-800 text-white shadow-xs ring-2 ring-emerald-700 ring-offset-1'
                      : 'text-slate-600 hover:text-emerald-900 hover:bg-slate-200/60'
                  }`}
                >
                  <HeartHandshake className="h-3.5 w-3.5" />
                  <span>APOIO</span>
                </button>
              </div>
            </div>

            {/* Campos de Input */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  E-mail educacional
                </label>
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => {
                    setEmailInput(e.target.value);
                    if (mensagemErro) setMensagemErro(null);
                    if (mostrarBotaoIrParaProfessor) setMostrarBotaoIrParaProfessor(false);
                  }}
                  placeholder="nome@educa.go.gov.br"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                />
                <span className="text-[11px] text-slate-500 mt-1.5 block">
                  Use o e-mail educacional cadastrado na lista da escola.
                </span>
              </div>

              {/* Mensagem de Erro (aparece apenas após tentativa de acesso inválida) */}
              {mensagemErro && (
                <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs font-bold text-rose-900 flex items-start gap-2 animate-fadeIn">
                  <AlertCircle className="h-4 w-4 text-rose-700 shrink-0 mt-0.5" />
                  <span className="leading-snug">{mensagemErro}</span>
                </div>
              )}

              {/* Botão Especial: IR PARA O ESPAÇO DO PROFESSOR (quando usuário não possui perfil de Coordenação) */}
              {mostrarBotaoIrParaProfessor && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleIrParaEspacoProfessor}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-extrabold text-white bg-sky-700 hover:bg-sky-800 transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2 ring-2 ring-sky-600 ring-offset-1"
                  >
                    <UserCheck className="h-4 w-4" />
                    <span>IR PARA O ESPAÇO DO PROFESSOR</span>
                  </button>
                </div>
              )}

              {/* Mensagem de Sucesso */}
              {mensagemSucesso && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900 flex items-start gap-2 animate-fadeIn">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
                  <span className="leading-snug">{mensagemSucesso}</span>
                </div>
              )}

              {/* Botão de Envio */}
              <button
                type="submit"
                disabled={isProcessando}
                className={`w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold text-white transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2.5 disabled:opacity-50 ${
                  isFirebaseConfigured
                    ? 'bg-emerald-700 hover:bg-emerald-800'
                    : espacoDesejado === 'coordinator'
                    ? 'bg-emerald-700 hover:bg-emerald-800'
                    : espacoDesejado === 'apoio'
                    ? 'bg-emerald-800 hover:bg-emerald-900'
                    : 'bg-sky-700 hover:bg-sky-800'
                }`}
              >
                {isProcessando ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Verificando autorização...</span>
                  </>
                ) : isFirebaseConfigured ? (
                  <>
                    <Mail className="h-4 w-4" />
                    <span>ENVIAR LINK DE ACESSO</span>
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-4 w-4" />
                    <span>ACESSAR O SISTEMA</span>
                  </>
                )}
              </button>

              {/* Divisor */}
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  ou integre com Google Drive
                </span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              {/* Botão Oficial "Sign in with Google" para Google Drive */}
              <button
                type="button"
                onClick={handleSignInWithGoogle}
                disabled={isProcessando}
                className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold flex items-center justify-center gap-3 cursor-pointer shadow-2xs hover:shadow-xs transition-all disabled:opacity-50"
                title="Entrar com a conta Google para salvar fotos e registros em pastas separadas por série no Google Drive"
              >
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-4 w-4 shrink-0">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                </svg>
                <span>Entrar com Google (Habilitar Drive)</span>
              </button>
            </div>
          </form>

          {/* Atalhos de Demonstração e Teste Rápido em Link Compartilhado */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600">
                Acesso Rápido para Avaliação em Rede:
              </span>
              <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                1 Clique
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickAccess('marcos.ferreira@admin.educa.go.gov.br', 'coordinator')}
                className="p-1.5 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-lg text-left transition-colors cursor-pointer"
              >
                <span className="text-[10px] font-extrabold text-slate-800 block truncate">Marcos Antonio</span>
                <span className="text-[9px] font-semibold text-emerald-700 block truncate">Coordenação Geral</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickAccess('lorena.oliveira@educa.go.gov.br', 'coordinator')}
                className="p-1.5 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-lg text-left transition-colors cursor-pointer"
              >
                <span className="text-[10px] font-extrabold text-slate-800 block truncate">Lorena Rosa</span>
                <span className="text-[9px] font-semibold text-emerald-700 block truncate">Coordenação Pedagógica</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickAccess('adevania.batista@educa.go.gov.br', 'teacher')}
                className="p-1.5 bg-white hover:bg-sky-50 border border-slate-200 hover:border-sky-300 rounded-lg text-left transition-colors cursor-pointer"
              >
                <span className="text-[10px] font-extrabold text-slate-800 block truncate">Adevania Pereira</span>
                <span className="text-[9px] font-semibold text-sky-700 block truncate">Espaço do Professor</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickAccess('mailcy.moraes53@educa.go.gov.br', 'apoio')}
                className="p-1.5 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-lg text-left transition-colors cursor-pointer"
              >
                <span className="text-[10px] font-extrabold text-slate-800 block truncate">Mailcy Francisca</span>
                <span className="text-[9px] font-semibold text-emerald-800 block truncate">Profissional de Apoio</span>
              </button>
            </div>
          </div>

          {/* 10. Mensagem de ambiente local */}
          {!isFirebaseConfigured && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-center">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 block">
                MODO DE PRÉ-VISUALIZAÇÃO LOCAL
              </span>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                O Firebase ainda não está configurado. Este acesso serve somente para testar os perfis e a navegação.
              </p>
            </div>
          )}

          {/* 11. Aviso de acesso exclusivo */}
          <div className="pt-2 border-t border-slate-100 text-center">
            <span className="text-[11px] font-semibold text-slate-500 flex items-center justify-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-emerald-700" />
              <span>Acesso exclusivo para profissionais autorizados</span>
            </span>
          </div>

        </div>
      </div>

      {/* Rodapé Institucional */}
      <footer className="text-center py-2 text-xs text-slate-400">
        AdaptaEdu Escolar • {escolaConfig.nome || 'Colégio Estadual Olynto Pereira de Castro'}
      </footer>
    </div>
  );
};
