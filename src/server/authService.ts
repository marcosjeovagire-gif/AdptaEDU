import { AuthorizedUser, RegistroImportacaoUsuario, UserRole, RegistroAuditoria } from '../types';
import { 
  processarRegistrosDoPdf, 
  DOMINIOS_PERMITIDOS, 
  OS_CINCO_NOMES_ESPECIAIS,
  OS_QUATRO_NOMES_ESPECIAIS,
  normalizeEmail,
  gerarUsuariosIniciaisAutorizadosDoPdf
} from '../data/pdfServerData';

export { normalizeEmail };

export const SCHOOL_ID_PADRAO = 'olynto-pereira-castro';

export interface ServiceResult<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errorCode?: string;
}

/**
 * Função de Servidor: previewUserImport
 * Prepara e analisa a extração do PDF com rigor total, identificando perfis duplos e validando domínios.
 */
export function previewUserImport(): ServiceResult<{
  registros: RegistroImportacaoUsuario[];
  totais: {
    totalIdentificados: number;
    totalValidos: number;
    totalProfessores: number;
    totalCoordenacaoProfessor: number;
    totalEmailAusente: number;
    totalEmailIlegivel: number;
    totalDuplicidades: number;
    totalPendenteRevisao: number;
  };
}> {
  const registros = processarRegistrosDoPdf();

  const totalIdentificados = registros.length;
  const totalValidos = registros.filter(r => r.situacao === 'Pronto para cadastrar' || r.situacao === 'Perfil especial confirmado').length;
  const totalProfessores = registros.filter(r => !r.isSpecialCoordinator && (r.situacao === 'Pronto para cadastrar' || r.situacao === 'Perfil especial confirmado')).length;
  const totalCoordenacaoProfessor = registros.filter(r => r.isSpecialCoordinator).length;
  const totalEmailAusente = registros.filter(r => r.situacao === 'E-mail ausente').length;
  const totalEmailIlegivel = registros.filter(r => r.situacao === 'E-mail ilegível').length;
  const totalDuplicidades = registros.filter(r => r.situacao === 'E-mail duplicado' || r.situacao === 'Registro duplicado').length;
  const totalPendenteRevisao = registros.filter(r => r.situacao === 'Pendente de revisão' || r.situacao === 'Domínio pendente de validação').length;

  return {
    success: true,
    message: 'Pré-visualização gerada com sucesso a partir do documento PDF.',
    data: {
      registros,
      totais: {
        totalIdentificados,
        totalValidos,
        totalProfessores,
        totalCoordenacaoProfessor,
        totalEmailAusente,
        totalEmailIlegivel,
        totalDuplicidades,
        totalPendenteRevisao,
      },
    },
  };
}

/**
 * Função de Servidor: authorizeNewUser
 * Cadastra um novo professor ou coordenador individualmente pela Coordenação.
 */
export function authorizeNewUser(params: {
  nome: string;
  email: string;
  roles: UserRole[];
  turmas?: string[];
  disciplinas?: string[];
  currentUserRoles: UserRole[];
  existingUsers: AuthorizedUser[];
  createdBy: string;
}): ServiceResult<AuthorizedUser> {
  const { nome, email, roles, turmas, disciplinas, currentUserRoles, existingUsers, createdBy } = params;

  // 1. Validação de perfil da Coordenação
  if (!currentUserRoles.includes('coordinator')) {
    return {
      success: false,
      message: 'Apenas usuários com perfil de Coordenação podem cadastrar novos profissionais.',
      errorCode: 'PERMISSION_DENIED',
    };
  }

  // 2. Validação de campos obrigatórios
  if (!nome || !nome.trim()) {
    return { success: false, message: 'O nome completo é obrigatório.' };
  }
  if (!email || !email.trim()) {
    return { success: false, message: 'O e-mail educacional é obrigatório.' };
  }

  const emailNormalized = email.trim().toLowerCase();
  const partesEmail = emailNormalized.split('@');
  const dominio = partesEmail.length > 1 ? partesEmail[1] : '';

  // 3. Validação de formato e domínio
  if (!emailNormalized.includes('@') || !DOMINIOS_PERMITIDOS.includes(dominio)) {
    return {
      success: false,
      message: `Domínio não permitido. Aceito apenas: ${DOMINIOS_PERMITIDOS.join(', ')}`,
      errorCode: 'INVALID_DOMAIN',
    };
  }

  // 4. Verificação de duplicidade
  if (existingUsers.some(u => u.emailNormalized === emailNormalized && u.status !== 'archived')) {
    return {
      success: false,
      message: 'Este e-mail educacional já está cadastrado no sistema.',
      errorCode: 'DUPLICATE_EMAIL',
    };
  }

  // 5. Verificação de perfis
  if (!roles || roles.length === 0) {
    return { success: false, message: 'É obrigatório selecionar pelo menos um perfil (Professor ou Coordenação).' };
  }

  const novoUsuario: AuthorizedUser = {
    id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    uid: null,
    name: nome.trim(),
    email: email.trim(),
    emailNormalized,
    roles,
    active: true,
    status: 'authorized',
    schoolId: SCHOOL_ID_PADRAO,
    allowedClasses: turmas || [],
    allowedDisciplines: disciplinas || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy,
    source: 'Cadastro Manual pela Coordenação',
    sourcePage: null,
    firstAccessAt: null,
    lastAccessAt: null,
    archivedAt: null,
  };

  return {
    success: true,
    message: 'Usuário autorizado com sucesso. Oriente o profissional a entrar com a conta Google Educacional cadastrada.',
    data: novoUsuario,
  };
}

/**
 * Função de Servidor: linkUserOnFirstLogin
 * Simula a vinculação segura do UID do Firebase no primeiro acesso do usuário.
 */
export function linkUserOnFirstLogin(params: {
  email: string;
  firebaseUid: string;
  authorizedUsers: AuthorizedUser[];
}): ServiceResult<AuthorizedUser> {
  const { email, firebaseUid, authorizedUsers } = params;
  const emailNormalized = email.trim().toLowerCase();

  // 1. Localiza o registro autorizado
  const user = authorizedUsers.find(u => u.emailNormalized === emailNormalized);

  if (!user) {
    return {
      success: false,
      message: 'Seu e-mail foi autenticado, mas ainda não está autorizado no AdaptaEdu Escolar. Procure a Coordenação.',
      errorCode: 'USER_NOT_AUTHORIZED',
    };
  }

  // 2. Verifica se o usuário está ativo
  if (!user.active || user.status === 'inactive' || user.status === 'archived') {
    return {
      success: false,
      message: 'Seu acesso ao AdaptaEdu Escolar está desativado. Procure a Coordenação.',
      errorCode: 'USER_INACTIVE',
    };
  }

  // 3. Validação de UID duplicado em outro usuário
  const outroUsuarioComMesmoUid = authorizedUsers.find(u => u.uid === firebaseUid && u.id !== user.id);
  if (outroUsuarioComMesmoUid) {
    return {
      success: false,
      message: 'Divergência de credencial de autenticação identificada. Acesso bloqueado por segurança.',
      errorCode: 'UID_CONFLICT',
    };
  }

  const now = new Date().toISOString();
  const updatedUser: AuthorizedUser = {
    ...user,
    uid: user.uid || firebaseUid,
    firstAccessAt: user.firstAccessAt || now,
    lastAccessAt: now,
    updatedAt: now,
  };

  return {
    success: true,
    message: 'Acesso autenticado e autorizado com sucesso.',
    data: updatedUser,
  };
}

/**
 * Função de Proteção da Coordenação:
 * Impede que o último coordenador ativo seja desativado, arquivado ou perca o papel de coordinator.
 */
export function validarProtecaoUltimoCoordenador(
  userToModify: AuthorizedUser,
  allUsers: AuthorizedUser[],
  newRoles?: UserRole[],
  newActiveStatus?: boolean
): ServiceResult {
  const wasCoordinator = userToModify.roles.includes('coordinator') && userToModify.active;

  if (!wasCoordinator) {
    return { success: true, message: 'Operação permitida.' };
  }

  const activeCoordinators = allUsers.filter(u => u.active && u.roles.includes('coordinator') && u.id !== userToModify.id);

  const isLosingCoordinatorRole = newRoles && !newRoles.includes('coordinator');
  const isBeingDeactivated = newActiveStatus === false;

  if ((isLosingCoordinatorRole || isBeingDeactivated) && activeCoordinators.length === 0) {
    return {
      success: false,
      message: 'Não é possível remover ou desativar o último usuário ativo da Coordenação.',
      errorCode: 'LAST_COORDINATOR_PROTECTION',
    };
  }

  return { success: true, message: 'Validação de segurança aprovada.' };
}

/**
 * Função de Servidor: unlinkUserUid
 * Desvincula o UID para permitir nova autenticação com conta educacional
 */
export function unlinkUserUid(
  userId: string,
  currentUserRoles: UserRole[],
  allUsers: AuthorizedUser[]
): ServiceResult<AuthorizedUser> {
  if (!currentUserRoles.includes('coordinator')) {
    return { success: false, message: 'Apenas a Coordenação pode desvincular o UID.' };
  }

  const user = allUsers.find(u => u.id === userId);
  if (!user) {
    return { success: false, message: 'Usuário não encontrado.' };
  }

  const updated: AuthorizedUser = {
    ...user,
    uid: null,
    firstAccessAt: null,
    lastAccessAt: null,
    updatedAt: new Date().toISOString(),
  };

  return {
    success: true,
    message: 'UID desvinculado. O usuário precisará vincular a conta novamente no próximo login.',
    data: updated,
  };
}

/**
 * Função de Servidor: verifyLocalPreviewAccess
 * Realiza a verificação estrita para o Modo de Pré-visualização Local do AdaptaEdu Escolar:
 * - Valida se o e-mail foi fornecido.
 * - Normaliza (trim e lowercase).
 * - Valida se o domínio pertence a @educa.go.gov.br ou @admin.educa.go.gov.br.
 * - Consulta a lista oficial de profissionais extraída do PDF.
 * - Se não localizado: "E-mail educacional não localizado na lista anexada."
 * - Se localizado e perfil compatível: "E-mail localizado na lista de profissionais. Abrindo ambiente de pré-visualização."
 * - Se usuário tentar Coordenação sem possuir 'coordinator' (ex: Marcos Antonio Ferreira):
 *   "Seu e-mail educacional está cadastrado, mas não possui autorização para o Espaço da Coordenação."
 *   Retorna flag oferecerEspacoProfessor: true e o objeto do usuário para transição automática.
 */
export function verifyLocalPreviewAccess(params: {
  email: string;
  espacoDesejado?: 'coordinator' | 'teacher' | 'apoio' | 'PROFISSIONAL_DE_APOIO' | null;
  authorizedUsers?: AuthorizedUser[];
}): ServiceResult<{
  user: AuthorizedUser;
  acessoPermitido: boolean;
  espacoAutorizado: UserRole;
  rotaDestino: string;
  mensagemErro?: string;
  oferecerEspacoProfessor?: boolean;
}> {
  const { email, espacoDesejado, authorizedUsers } = params;

  // 1. Nenhum espaço selecionado
  if (!espacoDesejado) {
    return {
      success: false,
      message: 'Selecione Coordenação ou Professor.',
      errorCode: 'NO_SPACE_SELECTED',
    };
  }

  // 2. Campo vazio
  if (!email || !email.trim()) {
    return {
      success: false,
      message: 'Informe seu e-mail educacional.',
      errorCode: 'EMAIL_REQUIRED',
    };
  }

  // 3. Normalização estrita usando normalizeEmail()
  const emailNormalized = normalizeEmail(email);

  // 4. Formato inválido
  if (!emailNormalized.includes('@') || emailNormalized.startsWith('@') || emailNormalized.endsWith('@')) {
    return {
      success: false,
      message: 'Informe um e-mail educacional válido.',
      errorCode: 'INVALID_FORMAT',
    };
  }

  // 5. Domínio inválido
  const partesDom = emailNormalized.split('@');
  const dominio = partesDom.length > 1 ? partesDom[1] : '';
  if (!DOMINIOS_PERMITIDOS.includes(dominio)) {
    return {
      success: false,
      message: 'Utilize um e-mail @educa.go.gov.br ou @admin.educa.go.gov.br.',
      errorCode: 'INVALID_DOMAIN',
    };
  }

  // 6. Base canônica oficial do PDF: garante que TODOS os 87 profissionais estejam disponíveis
  const canonicalPdfUsers = gerarUsuariosIniciaisAutorizadosDoPdf();
  const userMap = new Map<string, AuthorizedUser>();

  for (const u of canonicalPdfUsers) {
    userMap.set(u.emailNormalized, u);
  }

  // Mescla com quaisquer atualizações dinâmicas passadas pelo componente
  if (Array.isArray(authorizedUsers)) {
    for (const u of authorizedUsers) {
      const norm = normalizeEmail(u.emailNormalized || u.email);
      if (norm) {
        const existing = userMap.get(norm);
        if (existing) {
          // Marcos Antonio Ferreira sempre mantém superadmin, coordinator, teacher
          if (norm === 'marcos.ferreira@admin.educa.go.gov.br') {
            userMap.set(norm, {
              ...existing,
              ...u,
              roles: ['superadmin', 'coordinator', 'teacher'],
              active: true,
              status: 'authorized',
            });
          } else {
            userMap.set(norm, { ...existing, ...u });
          }
        } else {
          userMap.set(norm, u);
        }
      }
    }
  }

  // Localização insensível a maiúsculas/minúsculas e caracteres invisíveis
  const user = userMap.get(emailNormalized) || 
    Array.from(userMap.values()).find(u => 
      normalizeEmail(u.emailNormalized) === emailNormalized || 
      normalizeEmail(u.email) === emailNormalized
    );

  if (!user) {
    return {
      success: false,
      message: 'E-mail educacional não localizado na lista autorizada.',
      errorCode: 'EMAIL_NOT_FOUND',
    };
  }

  // 7. Usuário inativo
  if (!user.active || user.status === 'inactive' || user.status === 'archived') {
    return {
      success: false,
      message: 'Seu acesso está desativado. Procure a Coordenação.',
      errorCode: 'USER_INACTIVE',
    };
  }

  // 8. Verificação para o Espaço da Coordenação
  if (espacoDesejado === 'coordinator') {
    const isCoordinator = user.roles.includes('coordinator') || user.roles.includes('superadmin');
    if (!isCoordinator) {
      return {
        success: false,
        message: 'Seu e-mail está cadastrado somente para o Espaço do Professor.',
        errorCode: 'ACCESS_DENIED_TEACHER_ONLY',
        data: {
          user,
          acessoPermitido: false,
          espacoAutorizado: 'teacher',
          rotaDestino: '/teacher-preview',
          mensagemErro: 'Seu e-mail está cadastrado somente para o Espaço do Professor.',
          oferecerEspacoProfessor: true,
        },
      };
    }

    return {
      success: true,
      message: 'E-mail localizado com perfil de Coordenação.',
      data: {
        user,
        acessoPermitido: true,
        espacoAutorizado: 'coordinator',
        rotaDestino: '/coordinator-preview',
      },
    };
  }

  // 9. Verificação para o Espaço do Professor
  if (espacoDesejado === 'teacher') {
    if (!user.roles.includes('teacher')) {
      return {
        success: false,
        message: 'E-mail educacional não localizado na lista autorizada.',
        errorCode: 'NOT_TEACHER',
      };
    }

    return {
      success: true,
      message: 'E-mail localizado com perfil de Professor.',
      data: {
        user,
        acessoPermitido: true,
        espacoAutorizado: 'teacher',
        rotaDestino: '/teacher-preview',
      },
    };
  }

  // 10. Verificação para o Espaço do Profissional de Apoio
  if (espacoDesejado === 'apoio' || espacoDesejado === 'PROFISSIONAL_DE_APOIO') {
    const isApoioAllowed = user.roles.includes('PROFISSIONAL_DE_APOIO') || 
                           user.roles.includes('coordinator') || 
                           user.roles.includes('superadmin') || 
                           user.roles.includes('developer');
    if (!isApoioAllowed) {
      return {
        success: false,
        message: 'Acesso restrito: seu e-mail não possui perfil de Profissional de Apoio ou Coordenação.',
        errorCode: 'ACCESS_DENIED_APOIO_RESTRICTED',
        data: {
          user,
          acessoPermitido: false,
          espacoAutorizado: 'teacher',
          rotaDestino: '/teacher-preview',
          mensagemErro: 'Acesso restrito: seu e-mail não possui perfil de Profissional de Apoio ou Coordenação.',
          oferecerEspacoProfessor: user.roles.includes('teacher'),
        },
      };
    }

    return {
      success: true,
      message: 'E-mail localizado com autorização para Profissional de Apoio.',
      data: {
        user,
        acessoPermitido: true,
        espacoAutorizado: 'PROFISSIONAL_DE_APOIO' as UserRole,
        rotaDestino: '/apoio-preview',
      },
    };
  }

  return {
    success: false,
    message: 'Selecione Coordenação, Professor ou Profissional de Apoio.',
  };
}

/**
 * Função de Servidor: requestPasswordlessEmailLink
 * Fluxo de Produção com Firebase Authentication Email Link.
 */
export function requestPasswordlessEmailLink(params: {
  email: string;
  espacoDesejado: 'coordinator' | 'teacher' | 'apoio' | 'PROFISSIONAL_DE_APOIO';
  authorizedUsers: AuthorizedUser[];
}): ServiceResult<{
  emailNormalized: string;
  emailEnviado: boolean;
  linkSimulado: string;
}> {
  const { email, espacoDesejado, authorizedUsers } = params;

  if (!email || !email.trim()) {
    return { success: false, message: 'O e-mail educacional é obrigatório.' };
  }

  const emailNormalized = email.trim().toLowerCase();
  const partesAuthDom = emailNormalized.split('@');
  const dominio = partesAuthDom.length > 1 ? partesAuthDom[1] : '';

  if (!DOMINIOS_PERMITIDOS.includes(dominio)) {
    return {
      success: false,
      message: 'Entre com o e-mail educacional (@educa.go.gov.br ou @admin.educa.go.gov.br).',
      errorCode: 'INVALID_DOMAIN',
    };
  }

  const user = authorizedUsers.find(u => u.emailNormalized === emailNormalized);
  if (!user) {
    return {
      success: false,
      message: 'E-mail educacional não localizado na lista anexada.',
      errorCode: 'USER_NOT_AUTHORIZED',
    };
  }

  if (!user.active || user.status === 'inactive' || user.status === 'archived') {
    return {
      success: false,
      message: 'Seu acesso ao AdaptaEdu Escolar está desativado. Procure a Coordenação.',
      errorCode: 'USER_INACTIVE',
    };
  }

  const tokenAcesso = `authlink_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  return {
    success: true,
    message: 'Enviamos um link de acesso ao seu e-mail educacional.',
    data: {
      emailNormalized,
      emailEnviado: true,
      linkSimulado: `https://adaptaedu.escolar/verify-email?token=${tokenAcesso}&email=${encodeURIComponent(emailNormalized)}&role=${espacoDesejado}`,
    }
  };
}

/**
 * Função de Servidor: verifyPasswordlessLinkAndRole
 * Valida a confirmação do link de e-mail e confere rigorosamente os papéis para o espaço solicitado.
 */
export function verifyPasswordlessLinkAndRole(params: {
  email: string;
  espacoDesejado: 'coordinator' | 'teacher';
  authorizedUsers: AuthorizedUser[];
}): ServiceResult<{
  user: AuthorizedUser;
  acessoPermitido: boolean;
  espacoAutorizado: 'coordinator' | 'teacher';
  mensagemErro?: string;
  oferecerEspacoProfessor?: boolean;
}> {
  const { email, espacoDesejado, authorizedUsers } = params;
  const emailNormalized = email.trim().toLowerCase();

  const user = authorizedUsers.find(u => u.emailNormalized === emailNormalized);
  if (!user) {
    return {
      success: false,
      message: 'E-mail educacional não localizado na lista anexada.',
      errorCode: 'USER_NOT_AUTHORIZED',
    };
  }

  if (!user.active || user.status === 'inactive' || user.status === 'archived') {
    return {
      success: false,
      message: 'Seu acesso ao AdaptaEdu Escolar está desativado. Procure a Coordenação.',
      errorCode: 'USER_INACTIVE',
    };
  }

  // REGRA OBRIGATÓRIA DA SEÇÃO 3:
  // Quando o usuário selecionar Coordenação:
  // - consultar o usuário autorizado;
  // - permitir somente se roles incluir "coordinator";
  // - negar o acesso aos demais usuários.
  // Mensagem para professor que selecionar Coordenação:
  // "Seu e-mail educacional possui autorização somente para o espaço do Professor."
  // Adicionar o botão: "Ir para o espaço do Professor"
  if (espacoDesejado === 'coordinator') {
    if (!user.roles.includes('coordinator')) {
      return {
        success: false,
        message: 'Seu e-mail educacional possui autorização somente para o espaço do Professor.',
        errorCode: 'ACCESS_DENIED_TEACHER_ONLY',
        data: {
          user,
          acessoPermitido: false,
          espacoAutorizado: 'teacher',
          mensagemErro: 'Seu e-mail educacional possui autorização somente para o espaço do Professor.',
          oferecerEspacoProfessor: true,
        },
      };
    }
  }

  // Quando o usuário selecionar Professor:
  // - permitir somente se roles incluir "teacher";
  // - abrir o painel do Professor depois da autenticação.
  if (espacoDesejado === 'teacher') {
    if (!user.roles.includes('teacher')) {
      return {
        success: false,
        message: 'Seu usuário não possui perfil de Professor.',
        errorCode: 'NOT_TEACHER',
      };
    }
  }

  const now = new Date().toISOString();
  const updatedUser: AuthorizedUser = {
    ...user,
    uid: user.uid || `google-uid-${Date.now()}`,
    firstAccessAt: user.firstAccessAt || now,
    lastAccessAt: now,
    updatedAt: now,
  };

  return {
    success: true,
    message: 'Acesso autenticado e perfil verificado com sucesso.',
    data: {
      user: updatedUser,
      acessoPermitido: true,
      espacoAutorizado: espacoDesejado,
    },
  };
}

/**
 * Função de Servidor: updateUserRoles
 * Atualiza os papéis de um usuário, exigindo justificativa caso conceda Coordenação,
 * e impedindo remoção do último coordenador ativo.
 */
export function updateUserRoles(params: {
  userId: string;
  newRoles: UserRole[];
  currentUserRoles: UserRole[];
  allUsers: AuthorizedUser[];
  justificativa?: string;
  currentUserName?: string;
}): ServiceResult<AuthorizedUser> {
  const { userId, newRoles, currentUserRoles, allUsers, justificativa, currentUserName } = params;

  // 1. Apenas Coordenação pode alterar papéis
  if (!currentUserRoles.includes('coordinator')) {
    return {
      success: false,
      message: 'Acesso negado: Apenas a Coordenação pode alterar perfis de acesso.',
      errorCode: 'PERMISSION_DENIED',
    };
  }

  const user = allUsers.find(u => u.id === userId);
  if (!user) {
    return { success: false, message: 'Usuário não encontrado.', errorCode: 'NOT_FOUND' };
  }

  // 2. Proteção do último coordenador ativo
  const validacao = validarProtecaoUltimoCoordenador(user, allUsers, newRoles, user.active);
  if (!validacao.success) {
    return validacao as any;
  }

  // 3. Se estiver concedendo 'coordinator' a quem não possuía:
  if (!user.roles.includes('coordinator') && newRoles.includes('coordinator')) {
    if (!justificativa || !justificativa.trim()) {
      return {
        success: false,
        message: 'É obrigatório informar uma justificativa administrativa para conceder o perfil de Coordenação.',
        errorCode: 'JUSTIFICATION_REQUIRED',
      };
    }
  }

  const updated: AuthorizedUser = {
    ...user,
    roles: newRoles,
    updatedAt: new Date().toISOString(),
  };

  return {
    success: true,
    message: 'Perfis de acesso atualizados com sucesso.',
    data: updated,
  };
}

