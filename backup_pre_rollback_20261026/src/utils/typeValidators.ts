import { 
  AuthorizedUser, 
  Estudante, 
  AtividadeAdaptada, 
  QuestaoAdaptada,
  RegistroAcompanhamentoApoio, 
  PerfilPedagogico, 
  EscolaConfig, 
  UserRole 
} from '../types';
import { normalizeEmail } from '../data/pdfServerData';

const VALID_ROLES: Set<UserRole> = new Set([
  'superadmin', 
  'coordinator', 
  'teacher', 
  'developer', 
  'PROFISSIONAL_DE_APOIO'
]);

/**
 * Validador e Sanitizador Estrito para AuthorizedUser
 * Previne falhas de runtime garantindo que arrays, strings e papéis existam e sejam válidos.
 */
export function validateAndSanitizeAuthorizedUser(raw: any): AuthorizedUser | null {
  if (!raw || typeof raw !== 'object') return null;

  const email = typeof raw.email === 'string' ? raw.email.trim() : '';
  if (!email) return null;

  const emailNormalized = typeof raw.emailNormalized === 'string' && raw.emailNormalized
    ? raw.emailNormalized.trim().toLowerCase()
    : normalizeEmail(email) || email.toLowerCase();

  const id = typeof raw.id === 'string' && raw.id ? raw.id : `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : email.split('@')[0];

  // Normalização estrita de papéis (roles)
  let roles: UserRole[] = [];
  if (Array.isArray(raw.roles)) {
    roles = raw.roles.filter((r: any): r is UserRole => VALID_ROLES.has(r));
  }
  if (roles.length === 0) {
    roles = ['teacher'];
  }

  // Arrays de turmas e disciplinas permitidas
  const allowedClasses = Array.isArray(raw.allowedClasses)
    ? raw.allowedClasses.filter((c: any) => typeof c === 'string')
    : [];

  const allowedDisciplines = Array.isArray(raw.allowedDisciplines)
    ? raw.allowedDisciplines.filter((d: any) => typeof d === 'string')
    : [];

  const validStatuses: Array<'authorized' | 'inactive' | 'archived'> = ['authorized', 'inactive', 'archived'];
  const status = validStatuses.includes(raw.status) ? raw.status : 'authorized';

  return {
    id,
    uid: typeof raw.uid === 'string' ? raw.uid : null,
    name,
    email,
    emailNormalized,
    roles,
    active: typeof raw.active === 'boolean' ? raw.active : true,
    status,
    schoolId: typeof raw.schoolId === 'string' ? raw.schoolId : 'escola-1',
    allowedClasses,
    allowedDisciplines,
    photoUrl: typeof raw.photoUrl === 'string' ? raw.photoUrl : undefined,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
    createdBy: typeof raw.createdBy === 'string' ? raw.createdBy : 'system',
    source: typeof raw.source === 'string' ? raw.source : 'import',
    sourcePage: typeof raw.sourcePage === 'number' ? raw.sourcePage : null,
    firstAccessAt: typeof raw.firstAccessAt === 'string' ? raw.firstAccessAt : null,
    lastAccessAt: typeof raw.lastAccessAt === 'string' ? raw.lastAccessAt : null,
    archivedAt: typeof raw.archivedAt === 'string' ? raw.archivedAt : null,
  };
}

export function validateAndSanitizeAuthorizedUsers(list: any): AuthorizedUser[] {
  if (!Array.isArray(list)) return [];
  const result: AuthorizedUser[] = [];
  for (const item of list) {
    const sanitized = validateAndSanitizeAuthorizedUser(item);
    if (sanitized) result.push(sanitized);
  }
  return result;
}

/**
 * Validador e Sanitizador Estrito para Estudante
 * Garante que professoresAutorizadosIds seja sempre um array não-nulo,
 * prevenindo erros comuns de `professoresAutorizadosIds.includes()` em produção.
 */
export function validateAndSanitizeEstudante(raw: any): Estudante | null {
  if (!raw || typeof raw !== 'object') return null;

  const nome = typeof raw.nome === 'string' ? raw.nome.trim() : '';
  if (!nome) return null;

  const id = typeof raw.id === 'string' && raw.id ? raw.id : `est-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const matricula = typeof raw.matricula === 'string' && raw.matricula.trim() ? raw.matricula.trim() : `MAT-${id.slice(-6)}`;
  const turma = typeof raw.turma === 'string' ? raw.turma.trim() : 'Sem turma';
  const anoSerie = typeof raw.anoSerie === 'string' ? raw.anoSerie.trim() : turma;
  const turno = typeof raw.turno === 'string' ? raw.turno.trim() : 'Matutino';

  const validSituacao: Array<'ativo' | 'arquivado' | 'transferido'> = ['ativo', 'arquivado', 'transferido'];
  const situacao = validSituacao.includes(raw.situacao) ? raw.situacao : 'ativo';

  // Array estritamente garantido de professores e apoios vinculados
  const professoresAutorizadosIds = Array.isArray(raw.professoresAutorizadosIds)
    ? raw.professoresAutorizadosIds.filter((p: any) => typeof p === 'string')
    : [];

  const profissionaisApoioIds = Array.isArray(raw.profissionaisApoioIds)
    ? raw.profissionaisApoioIds.filter((p: any) => typeof p === 'string')
    : [];

  const validStatusLaudo: Array<'aprovado' | 'reprovado' | 'investigacao' | 'defasagem' | 'medicacao_sem_laudo'> = [
    'aprovado', 'reprovado', 'investigacao', 'defasagem', 'medicacao_sem_laudo'
  ];
  const statusLaudo = validStatusLaudo.includes(raw.statusLaudo) ? raw.statusLaudo : undefined;

  return {
    id,
    nome,
    matricula,
    turma,
    anoSerie,
    turno,
    dataNascimento: typeof raw.dataNascimento === 'string' ? raw.dataNascimento : undefined,
    situacao,
    professoresAutorizadosIds,
    profissionaisApoioIds,
    fotoUrl: typeof raw.fotoUrl === 'string' ? raw.fotoUrl : undefined,
    arquivoOrigem: typeof raw.arquivoOrigem === 'string' ? raw.arquivoOrigem : undefined,
    paginaDocumento: typeof raw.paginaDocumento === 'number' ? raw.paginaDocumento : null,
    dataImportacao: typeof raw.dataImportacao === 'string' ? raw.dataImportacao : undefined,
    observacoesAcessibilidade: typeof raw.observacoesAcessibilidade === 'string' ? raw.observacoesAcessibilidade : undefined,
    perfilPedagogicoId: typeof raw.perfilPedagogicoId === 'string' ? raw.perfilPedagogicoId : null,
    laudo: typeof raw.laudo === 'string' ? raw.laudo : undefined,
    responsaveis: typeof raw.responsaveis === 'string' ? raw.responsaveis : undefined,
    telefones: typeof raw.telefones === 'string' ? raw.telefones : undefined,
    paeResponsavelNome: typeof raw.paeResponsavelNome === 'string' ? raw.paeResponsavelNome : undefined,
    paeResponsavelEmail: typeof raw.paeResponsavelEmail === 'string' ? raw.paeResponsavelEmail : undefined,
    statusLaudo,
  };
}

export function validateAndSanitizeEstudantes(list: any): Estudante[] {
  if (!Array.isArray(list)) return [];
  const result: Estudante[] = [];
  for (const item of list) {
    const sanitized = validateAndSanitizeEstudante(item);
    if (sanitized) result.push(sanitized);
  }
  return result;
}

/**
 * Validador e Sanitizador Estrito para AtividadeAdaptada
 * Garante que o array questoes seja sempre um array válido de QuestaoAdaptada.
 */
export function validateAndSanitizeAtividade(raw: any): AtividadeAdaptada | null {
  if (!raw || typeof raw !== 'object') return null;

  const id = typeof raw.id === 'string' && raw.id ? raw.id : `ativ-${Date.now()}`;
  const estudanteId = typeof raw.estudanteId === 'string' ? raw.estudanteId : '';
  const estudanteNome = typeof raw.estudanteNome === 'string' ? raw.estudanteNome : 'Estudante';
  const disciplina = typeof raw.disciplina === 'string' ? raw.disciplina : 'Geral';
  const conteudo = typeof raw.conteudo === 'string' ? raw.conteudo : '';

  // Sanitiza array de questões
  const questoes: QuestaoAdaptada[] = Array.isArray(raw.questoes)
    ? raw.questoes.map((q: any, idx: number) => ({
        id: typeof q?.id === 'string' ? q.id : `q-${idx + 1}-${Date.now()}`,
        numero: typeof q?.numero === 'number' ? q.numero : idx + 1,
        tipo: ['multipla_escolha', 'verdadeiro_falso', 'discursiva', 'associacao'].includes(q?.tipo)
          ? q.tipo
          : 'multipla_escolha',
        enunciado: typeof q?.enunciado === 'string' ? q.enunciado : `Questão ${idx + 1}`,
        alternativas: Array.isArray(q?.alternativas) ? q.alternativas.filter((a: any) => typeof a === 'string') : undefined,
        linhasResposta: typeof q?.linhasResposta === 'number' ? q.linhasResposta : undefined,
      }))
    : [];

  return {
    id,
    estudanteId,
    estudanteNome,
    turma: typeof raw.turma === 'string' ? raw.turma : '',
    professorId: typeof raw.professorId === 'string' ? raw.professorId : '',
    professorNome: typeof raw.professorNome === 'string' ? raw.professorNome : 'Professor',
    disciplina,
    conteudo,
    habilidadeCodigo: typeof raw.habilidadeCodigo === 'string' ? raw.habilidadeCodigo : '',
    habilidadeDescricao: typeof raw.habilidadeDescricao === 'string' ? raw.habilidadeDescricao : '',
    quantidadeQuestoes: typeof raw.quantidadeQuestoes === 'number' ? raw.quantidadeQuestoes : questoes.length,
    tipoQuestoes: typeof raw.tipoQuestoes === 'string' ? raw.tipoQuestoes : 'Múltipla Escolha',
    observacaoProfessor: typeof raw.observacaoProfessor === 'string' ? raw.observacaoProfessor : undefined,
    questoes,
    dataCriacao: typeof raw.dataCriacao === 'string' ? raw.dataCriacao : new Date().toISOString(),
    status: raw.status === 'Revisada' ? 'Revisada' : 'Gerada',
    alinhadaAoPei: typeof raw.alinhadaAoPei === 'boolean' ? raw.alinhadaAoPei : undefined,
    peiAlinhamentoDetalhes: typeof raw.peiAlinhamentoDetalhes === 'string' ? raw.peiAlinhamentoDetalhes : undefined,
    peiAlinhadoEm: typeof raw.peiAlinhadoEm === 'string' ? raw.peiAlinhadoEm : undefined,
    peiAlinhadoPor: typeof raw.peiAlinhadoPor === 'string' ? raw.peiAlinhadoPor : undefined,
    syncStatus: ['synced', 'pending_sync', 'offline_created', 'offline_updated'].includes(raw.syncStatus)
      ? raw.syncStatus
      : 'synced',
    lastModifiedLocally: typeof raw.lastModifiedLocally === 'string' ? raw.lastModifiedLocally : undefined,
  };
}

export function validateAndSanitizeAtividades(list: any): AtividadeAdaptada[] {
  if (!Array.isArray(list)) return [];
  const result: AtividadeAdaptada[] = [];
  for (const item of list) {
    const sanitized = validateAndSanitizeAtividade(item);
    if (sanitized) result.push(sanitized);
  }
  return result;
}

/**
 * Validador e Sanitizador Estrito para RegistroAcompanhamentoApoio
 */
export function validateAndSanitizeRegistroApoio(raw: any): RegistroAcompanhamentoApoio | null {
  if (!raw || typeof raw !== 'object') return null;

  const id = typeof raw.id === 'string' && raw.id ? raw.id : `reg-apoio-${Date.now()}`;
  const studentId = typeof raw.studentId === 'string' ? raw.studentId : '';
  const nomeEstudante = typeof raw.nomeEstudante === 'string' ? raw.nomeEstudante : 'Estudante';
  const data = typeof raw.data === 'string' ? raw.data : new Date().toISOString().split('T')[0];

  const disciplinasEnvolvidas = Array.isArray(raw.disciplinasEnvolvidas)
    ? raw.disciplinasEnvolvidas.filter((d: any) => typeof d === 'string')
    : undefined;

  return {
    id,
    studentId,
    nomeEstudante,
    turma: typeof raw.turma === 'string' ? raw.turma : '',
    data,
    diaSemana: typeof raw.diaSemana === 'string' ? raw.diaSemana : 'Segunda-feira',
    profissionalResponsavelNome: typeof raw.profissionalResponsavelNome === 'string' ? raw.profissionalResponsavelNome : 'PAE',
    profissionalResponsavelEmail: typeof raw.profissionalResponsavelEmail === 'string' ? raw.profissionalResponsavelEmail : '',
    profissionalResponsavelId: typeof raw.profissionalResponsavelId === 'string' ? raw.profissionalResponsavelId : '',
    presente: typeof raw.presente === 'boolean' ? raw.presente : true,
    demonstrouIrritabilidadeOuSinais: ['Sim', 'Não', 'Não se aplica'].includes(raw.demonstrouIrritabilidadeOuSinais)
      ? raw.demonstrouIrritabilidadeOuSinais
      : undefined,
    observacaoComportamental: typeof raw.observacaoComportamental === 'string' ? raw.observacaoComportamental : undefined,
    recebeuAtividadeAdaptada: ['Sim', 'Não'].includes(raw.recebeuAtividadeAdaptada) ? raw.recebeuAtividadeAdaptada : undefined,
    disciplinasEnvolvidas,
    conseguiuRealizarAtividade: ['Sim', 'Parcialmente', 'Não'].includes(raw.conseguiuRealizarAtividade) ? raw.conseguiuRealizarAtividade : undefined,
    observacaoAtividade: typeof raw.observacaoAtividade === 'string' ? raw.observacaoAtividade : undefined,
    informacoesAdicionais: typeof raw.informacoesAdicionais === 'string' ? raw.informacoesAdicionais : undefined,
    fotoDiarioBordoUrl: typeof raw.fotoDiarioBordoUrl === 'string' ? raw.fotoDiarioBordoUrl : undefined,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
    horario: typeof raw.horario === 'string' ? raw.horario : '08:00',
    usuarioRegistroNome: typeof raw.usuarioRegistroNome === 'string' ? raw.usuarioRegistroNome : 'Sistema',
    usuarioRegistroEmail: typeof raw.usuarioRegistroEmail === 'string' ? raw.usuarioRegistroEmail : '',
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : undefined,
    syncStatus: ['synced', 'pending_sync', 'offline_created', 'offline_updated'].includes(raw.syncStatus)
      ? raw.syncStatus
      : undefined,
    lastModifiedLocally: typeof raw.lastModifiedLocally === 'string' ? raw.lastModifiedLocally : undefined,
  };
}

export function validateAndSanitizeRegistrosApoio(list: any): RegistroAcompanhamentoApoio[] {
  if (!Array.isArray(list)) return [];
  const result: RegistroAcompanhamentoApoio[] = [];
  for (const item of list) {
    const sanitized = validateAndSanitizeRegistroApoio(item);
    if (sanitized) result.push(sanitized);
  }
  return result;
}

/**
 * Validador e Sanitizador Estrito para PerfilPedagogico
 */
export function validateAndSanitizePerfilPedagogico(raw: any): PerfilPedagogico | null {
  if (!raw || typeof raw !== 'object') return null;

  const id = typeof raw.id === 'string' && raw.id ? raw.id : `perfil-${Date.now()}`;
  const estudanteId = typeof raw.estudanteId === 'string' ? raw.estudanteId : '';
  const estudanteNome = typeof raw.estudanteNome === 'string' ? raw.estudanteNome : 'Estudante';

  return {
    id,
    estudanteId,
    estudanteNome,
    nivelLeitura: typeof raw.nivelLeitura === 'string' ? raw.nivelLeitura : 'Em desenvolvimento',
    nivelEscrita: typeof raw.nivelEscrita === 'string' ? raw.nivelEscrita : 'Em desenvolvimento',
    conhecimentosMatematicos: typeof raw.conhecimentosMatematicos === 'string' ? raw.conhecimentosMatematicos : 'Em desenvolvimento',
    habilidadesConsolidadas: typeof raw.habilidadesConsolidadas === 'string' ? raw.habilidadesConsolidadas : '',
    habilidadesEmDesenvolvimento: typeof raw.habilidadesEmDesenvolvimento === 'string' ? raw.habilidadesEmDesenvolvimento : '',
    barreirasPedagogicas: typeof raw.barreirasPedagogicas === 'string' ? raw.barreirasPedagogicas : '',
    estrategiasRecomendadas: typeof raw.estrategiasRecomendadas === 'string' ? raw.estrategiasRecomendadas : '',
    recursosAcessibilidade: typeof raw.recursosAcessibilidade === 'string' ? raw.recursosAcessibilidade : '',
    adaptacoesAvaliativas: typeof raw.adaptacoesAvaliativas === 'string' ? raw.adaptacoesAvaliativas : '',
    extensaoEnunciados: typeof raw.extensaoEnunciados === 'string' ? raw.extensaoEnunciados : 'Curto e direto',
    quantidadeAlternativas: typeof raw.quantidadeAlternativas === 'number' ? raw.quantidadeAlternativas : 3,
    necessidadeApoioVisual: typeof raw.necessidadeApoioVisual === 'boolean' ? raw.necessidadeApoioVisual : true,
    necessidadeInstrucoesCurtas: typeof raw.necessidadeInstrucoesCurtas === 'boolean' ? raw.necessidadeInstrucoesCurtas : true,
    tempoAdicionalAutorizado: typeof raw.tempoAdicionalAutorizado === 'string' ? raw.tempoAdicionalAutorizado : '50% adicional',
    observacoesPedagogicas: typeof raw.observacoesPedagogicas === 'string' ? raw.observacoesPedagogicas : '',
    status: raw.status === 'pendente_revisao' ? 'pendente_revisao' : 'aprovado',
    dataCadastro: typeof raw.dataCadastro === 'string' ? raw.dataCadastro : new Date().toISOString(),
  };
}

export function validateAndSanitizePerfisPedagogicos(list: any): PerfilPedagogico[] {
  if (!Array.isArray(list)) return [];
  const result: PerfilPedagogico[] = [];
  for (const item of list) {
    const sanitized = validateAndSanitizePerfilPedagogico(item);
    if (sanitized) result.push(sanitized);
  }
  return result;
}

/**
 * Validador e Sanitizador Estrito para EscolaConfig
 */
export function validateAndSanitizeEscolaConfig(raw: any, fallback: EscolaConfig): EscolaConfig {
  if (!raw || typeof raw !== 'object') return fallback;

  return {
    nome: typeof raw.nome === 'string' && raw.nome ? raw.nome : fallback.nome,
    subtitulo: typeof raw.subtitulo === 'string' ? raw.subtitulo : fallback.subtitulo,
    endereco: typeof raw.endereco === 'string' ? raw.endereco : fallback.endereco,
    municipio: typeof raw.municipio === 'string' ? raw.municipio : fallback.municipio,
    emailInstitucional: typeof raw.emailInstitucional === 'string' ? raw.emailInstitucional : fallback.emailInstitucional,
    telefone: typeof raw.telefone === 'string' ? raw.telefone : fallback.telefone,
    textoRodape: typeof raw.textoRodape === 'string' ? raw.textoRodape : fallback.textoRodape,
    logoUrl: typeof raw.logoUrl === 'string' ? raw.logoUrl : fallback.logoUrl,
    corPrincipal: typeof raw.corPrincipal === 'string' ? raw.corPrincipal : fallback.corPrincipal,
    corSecundaria: typeof raw.corSecundaria === 'string' ? raw.corSecundaria : fallback.corSecundaria,
    corDestaque: typeof raw.corDestaque === 'string' ? raw.corDestaque : fallback.corDestaque,
    permitirAcessoEmailSenha: typeof raw.permitirAcessoEmailSenha === 'boolean' ? raw.permitirAcessoEmailSenha : false,
    id: typeof raw.id === 'string' ? raw.id : fallback.id,
    backupHorario: typeof raw.backupHorario === 'string' ? raw.backupHorario : fallback.backupHorario,
    backupFrequencia: (raw.backupFrequencia === 'diario' || raw.backupFrequencia === 'semanal') ? raw.backupFrequencia : fallback.backupFrequencia,
    backupConfig: raw.backupConfig && typeof raw.backupConfig === 'object' ? raw.backupConfig : fallback.backupConfig,
  };
}
