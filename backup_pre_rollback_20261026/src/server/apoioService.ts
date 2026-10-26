import { 
  RegistroAcompanhamentoApoio, 
  Estudante, 
  AuthorizedUser, 
  UserRole, 
  RegistroAuditoria 
} from '../types';
import { ServiceResult } from './authService';

/**
 * Validação rigorosa de permissão de acesso ao módulo Profissional de Apoio
 * Conforme Seção 3 da especificação:
 * - Profissional de Apoio autorizado
 * - Coordenação
 * - Coordenação Geral (Superadmin / Developer)
 * 
 * PROFESSORES COMUNS NÃO POSSUEM ACESSO.
 */
export function verificarAcessoProfissionalApoio(user: AuthorizedUser | null): boolean {
  if (!user || !user.active || user.status !== 'authorized') return false;
  return user.roles.some((r: UserRole) => 
    r === 'PROFISSIONAL_DE_APOIO' || 
    r === 'coordinator' || 
    r === 'superadmin' || 
    r === 'developer'
  );
}

/**
 * Verifica se uma data específica é dia útil (Segunda a Sexta-feira)
 * Sábado (6) e Domingo (0) são estritamente desabilitados.
 */
export function isDiaUtil(dataOuIso?: string | Date | null): boolean {
  if (!dataOuIso) return false;
  let dateObj: Date;
  if (typeof dataOuIso === 'string') {
    // Formato YYYY-MM-DD
    const parts = dataOuIso.split('-');
    if (parts && parts.length === 3) {
      dateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    } else {
      dateObj = new Date(dataOuIso);
    }
  } else {
    dateObj = dataOuIso;
  }

  if (!dateObj || isNaN(dateObj.getTime())) return false;
  const diaSemana = dateObj.getDay(); // 0 = Domingo, 6 = Sábado
  return diaSemana >= 1 && diaSemana <= 5;
}

/**
 * Retorna o nome por extenso do dia da semana em português
 */
export function getNomeDiaSemana(dataIso?: string | null): string {
  if (!dataIso) return '';
  const parts = dataIso.split('-');
  if (!parts || parts.length !== 3) return '';
  const date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  if (isNaN(date.getTime())) return '';
  const dias = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  return dias[date.getDay()] || '';
}

/**
 * Formata data no padrão brasileiro DD/MM/YYYY
 */
export function formatarDataPtBr(dataIso?: string | null): string {
  if (!dataIso) return '';
  const parts = dataIso.split('-');
  if (parts && parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dataIso;
}

/**
 * Cria ou atualiza um registro diário do Profissional de Apoio
 * Aplica rigorosamente as regras condicionais das seções 10, 11, 12, 13, 14
 */
export function processarRegistroAcompanhamento(params: {
  registroExistenteId?: string;
  studentId: string;
  nomeEstudante: string;
  turma: string;
  data: string; // YYYY-MM-DD
  presente: boolean;
  demonstrouIrritabilidadeOuSinais?: 'Sim' | 'Não' | 'Não se aplica';
  observacaoComportamental?: string;
  recebeuAtividadeAdaptada?: 'Sim' | 'Não';
  disciplinasEnvolvidas?: string[];
  conseguiuRealizarAtividade?: 'Sim' | 'Parcialmente' | 'Não';
  observacaoAtividade?: string;
  informacoesAdicionais?: string;
  fotoDiarioBordoUrl?: string;
  currentUser: AuthorizedUser;
}): ServiceResult<{
  registro: RegistroAcompanhamentoApoio;
  auditoria: RegistroAuditoria;
}> {
  const {
    registroExistenteId,
    studentId,
    nomeEstudante,
    turma,
    data,
    presente,
    demonstrouIrritabilidadeOuSinais,
    observacaoComportamental,
    recebeuAtividadeAdaptada,
    disciplinasEnvolvidas,
    conseguiuRealizarAtividade,
    observacaoAtividade,
    informacoesAdicionais,
    fotoDiarioBordoUrl,
    currentUser,
  } = params;

  // 1. Verificação de permissão real
  if (!verificarAcessoProfissionalApoio(currentUser)) {
    return {
      success: false,
      message: 'Acesso negado: Somente profissionais de apoio autorizados ou coordenação podem efetuar registros.',
      errorCode: 'PERMISSION_DENIED',
    };
  }

  // 2. Validação da data - Apenas dias úteis permitidos
  if (!isDiaUtil(data)) {
    return {
      success: false,
      message: 'Registros de acompanhamento são permitidos exclusivamente em dias letivos úteis (Segunda a Sexta-feira).',
      errorCode: 'INVALID_DATE_WEEKEND',
    };
  }

  // 3. Validação do Estudante
  if (!studentId || !nomeEstudante.trim()) {
    return {
      success: false,
      message: 'Identificação do estudante é obrigatória.',
      errorCode: 'MISSING_STUDENT',
    };
  }

  const agora = new Date();
  const horario = agora.toTimeString().split(' ')[0] || '12:00:00';
  const dataHoraFormatada = agora.toLocaleString('pt-BR');
  const diaSemana = getNomeDiaSemana(data);

  // 4. REGRA CONDICIONAL FUNDAMENTAL (Seção 11):
  // Se AUSENTE: não exige perguntas 3, 4, 5, 6 nem foto do Diário de Bordo. Salva imediatamente.
  let registroFinal: RegistroAcompanhamentoApoio;

  if (!presente) {
    registroFinal = {
      id: registroExistenteId || `apoio-${studentId}-${data}-${Date.now()}`,
      studentId,
      nomeEstudante: nomeEstudante.trim().toUpperCase(),
      turma: turma.trim(),
      data,
      diaSemana,
      profissionalResponsavelNome: currentUser.name,
      profissionalResponsavelEmail: currentUser.emailNormalized || currentUser.email,
      profissionalResponsavelId: currentUser.id,
      presente: false,
      createdAt: agora.toISOString(),
      horario,
      usuarioRegistroNome: currentUser.name,
      usuarioRegistroEmail: currentUser.emailNormalized || currentUser.email,
      updatedAt: agora.toISOString(),
    };
  } else {
    // PRESENTE: Perguntas 3 e 4 são obrigatórias
    if (!demonstrouIrritabilidadeOuSinais) {
      return {
        success: false,
        message: 'A pergunta sobre observação comportamental é obrigatória quando o aluno está presente.',
        errorCode: 'MISSING_BEHAVIOR_OBS',
      };
    }

    if (!recebeuAtividadeAdaptada) {
      return {
        success: false,
        message: 'A pergunta sobre atividade adaptada é obrigatória quando o aluno está presente.',
        errorCode: 'MISSING_ACTIVITY_STATUS',
      };
    }

    registroFinal = {
      id: registroExistenteId || `apoio-${studentId}-${data}-${Date.now()}`,
      studentId,
      nomeEstudante: nomeEstudante.trim().toUpperCase(),
      turma: turma.trim(),
      data,
      diaSemana,
      profissionalResponsavelNome: currentUser.name,
      profissionalResponsavelEmail: currentUser.emailNormalized || currentUser.email,
      profissionalResponsavelId: currentUser.id,
      presente: true,
      demonstrouIrritabilidadeOuSinais,
      observacaoComportamental: demonstrouIrritabilidadeOuSinais === 'Sim' ? observacaoComportamental?.trim() : undefined,
      recebeuAtividadeAdaptada,
      disciplinasEnvolvidas: recebeuAtividadeAdaptada === 'Sim' ? (disciplinasEnvolvidas || []) : undefined,
      conseguiuRealizarAtividade: recebeuAtividadeAdaptada === 'Sim' ? conseguiuRealizarAtividade : undefined,
      observacaoAtividade: observacaoAtividade?.trim(),
      informacoesAdicionais: informacoesAdicionais?.trim(),
      fotoDiarioBordoUrl: fotoDiarioBordoUrl || undefined,
      createdAt: agora.toISOString(),
      horario,
      usuarioRegistroNome: currentUser.name,
      usuarioRegistroEmail: currentUser.emailNormalized || currentUser.email,
      updatedAt: agora.toISOString(),
    };
  }

  // 5. Geração de registro de auditoria da operação
  const auditoria: RegistroAuditoria = {
    id: `aud-apoio-${Date.now()}`,
    dataHora: dataHoraFormatada,
    usuarioResponsavel: currentUser.name,
    usuarioAlterado: `${nomeEstudante} (${turma})`,
    perfisAnteriores: currentUser.roles,
    perfisPosteriores: currentUser.roles,
    situacaoAnterior: registroExistenteId ? 'Registro anterior existente' : 'Sem registro no dia',
    situacaoPosterior: presente ? 'Presente com acompanhamento diário' : 'Ausente registrado',
    resultado: 'Sucesso',
    detalhes: `Acompanhamento diário [${diaSemana} - ${formatarDataPtBr(data)}]: ${presente ? 'Presente' : 'Ausente'}. Registrado por ${currentUser.name}.`,
  };

  return {
    success: true,
    message: `Acompanhamento do estudante ${nomeEstudante} registrado com sucesso para o dia ${formatarDataPtBr(data)}.`,
    data: {
      registro: registroFinal,
      auditoria,
    },
  };
}

/**
 * Associa ou atualiza a fotografia oficial do aluno vinculado ao studentId
 */
export function associarFotoEstudante(params: {
  studentId: string;
  fotoBase64: string;
  currentUser: AuthorizedUser;
  estudantes: Estudante[];
}): ServiceResult<{ estudanteAtualizado: Estudante; auditoria: RegistroAuditoria }> {
  const { studentId, fotoBase64, currentUser, estudantes } = params;

  if (!verificarAcessoProfissionalApoio(currentUser)) {
    return {
      success: false,
      message: 'Acesso negado: Apenas profissionais de apoio ou coordenação podem atualizar fotos de estudantes.',
      errorCode: 'PERMISSION_DENIED',
    };
  }

  const est = estudantes.find(e => e.id === studentId);
  if (!est) {
    return {
      success: false,
      message: 'Estudante não encontrado na base de dados.',
      errorCode: 'STUDENT_NOT_FOUND',
    };
  }

  const estudanteAtualizado: Estudante = {
    ...est,
    fotoUrl: fotoBase64,
  };

  const auditoria: RegistroAuditoria = {
    id: `aud-foto-${Date.now()}`,
    dataHora: new Date().toLocaleString('pt-BR'),
    usuarioResponsavel: currentUser.name,
    usuarioAlterado: est.nome,
    perfisAnteriores: currentUser.roles,
    perfisPosteriores: currentUser.roles,
    situacaoAnterior: est.fotoUrl ? 'Fotografia existente' : 'Sem foto cadastrada',
    situacaoPosterior: 'Fotografia atualizada',
    resultado: 'Sucesso',
    detalhes: `Fotografia oficial do estudante ${est.nome} atualizada no prontuário por ${currentUser.name}.`,
  };

  return {
    success: true,
    message: `Fotografia de ${est.nome} associada com sucesso.`,
    data: {
      estudanteAtualizado,
      auditoria,
    },
  };
}
