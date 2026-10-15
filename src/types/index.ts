export type UserRole = 'superadmin' | 'coordinator' | 'teacher' | 'developer' | 'PROFISSIONAL_DE_APOIO';

export interface UserRoleOption {
  id: UserRole;
  label: string;
}

export interface UserProfile {
  uid: string | null;
  name: string;
  email: string;
  emailNormalized: string;
  roles: UserRole[];
  active: boolean;
  status: 'authorized' | 'inactive' | 'archived';
  schoolId: string;
  allowedClasses: string[];
  allowedDisciplines: string[];
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  source: string;
  sourcePage?: number | null;
  firstAccessAt?: string | null;
  lastAccessAt?: string | null;
  archivedAt?: string | null;
}

export interface AuthorizedUser {
  id: string; // Random secure document ID
  uid: string | null;
  name: string;
  email: string;
  emailNormalized: string;
  roles: UserRole[];
  active: boolean;
  status: 'authorized' | 'inactive' | 'archived';
  schoolId: string;
  allowedClasses: string[];
  allowedDisciplines: string[];
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  source: string;
  sourcePage: number | null;
  firstAccessAt: string | null;
  lastAccessAt: string | null;
  archivedAt: string | null;
}

export type SituacaoImportacao = 
  | 'Pronto para cadastrar'
  | 'Perfil especial confirmado'
  | 'E-mail ausente'
  | 'E-mail ilegível'
  | 'Nome não localizado'
  | 'Registro duplicado'
  | 'E-mail duplicado'
  | 'Domínio pendente de validação'
  | 'Pendente de revisão'
  | 'Já cadastrado';

export interface RegistroImportacaoUsuario {
  id: string;
  nome: string;
  emailEducacional: string;
  dominio: string;
  roles: UserRole[];
  situacao: SituacaoImportacao;
  arquivoOrigem: string;
  paginaDocumento: number;
  observacao: string;
  selecionado: boolean;
  isSpecialCoordinator: boolean;
}

export interface Estudante {
  id: string;
  nome: string; // Nome completo oficial para cabeçalhos e documentos
  matricula: string; // Matrícula ou código institucional único
  turma: string; // Turma (ex: 6º Ano A, 8º B, etc.)
  anoSerie: string; // Ano ou série
  turno: string; // Matutino, Vespertino, Noturno
  dataNascimento?: string; // Data de nascimento formatada (DD/MM/AAAA)
  situacao: 'ativo' | 'arquivado' | 'transferido';
  professoresAutorizadosIds: string[]; // Professores autorizados vinculados
  profissionaisApoioIds?: string[]; // Profissionais de apoio vinculados
  fotoUrl?: string; // Fotografia oficial do aluno (Base64 ou URL segura)
  arquivoOrigem?: string;
  paginaDocumento?: number | null;
  dataImportacao?: string;
  observacoesAcessibilidade?: string;
  perfilPedagogicoId?: string | null;
  laudo?: string; // Diagnóstico oficial ou hipótese (CID-10 / CID-11)
  responsaveis?: string; // Nomes dos pais, mães ou responsáveis legais
  telefones?: string; // Telefones e contatos dos responsáveis
  paeResponsavelNome?: string; // Nome da Profissional de Apoio Escolar (PAE) ou Intérprete
  paeResponsavelEmail?: string; // E-mail educacional da PAE
  statusLaudo?: 'aprovado' | 'reprovado' | 'investigacao' | 'defasagem' | 'medicacao_sem_laudo';
}

export type SituacaoImportacaoEstudante = 
  | 'Pronto para cadastrar'
  | 'Matrícula ausente'
  | 'Nome ausente'
  | 'Turma pendente'
  | 'Estudante já cadastrado'
  | 'Matrícula duplicada no arquivo'
  | 'Pendente de revisão';

export interface RegistroImportacaoEstudante {
  id: string;
  nome: string;
  matricula: string;
  turma: string;
  anoSerie: string;
  turno: string;
  dataNascimento?: string;
  situacao: SituacaoImportacaoEstudante;
  arquivoOrigem: string;
  paginaDocumento: number;
  observacao: string;
  selecionado: boolean;
  dadosIgnoradosAviso?: string;
}

export type StatusIndicadorAnalise = 
  | 'aguardando_arquivo'
  | 'analise_em_andamento'
  | 'arquivo_analisado'
  | 'registros_encontrados'
  | 'registros_pendentes'
  | 'importacao_concluida'
  | 'importacao_parcial'
  | 'erro_analise';

export interface Professor {
  id: string; // UID ou identificador interno
  nome: string; // Nome completo
  email: string; // E-mail institucional/educacional
  disciplinas: string[]; // Disciplinas autorizadas
  turmas: string[]; // Turmas autorizadas
  status: 'ativo' | 'pendente';
  photoUrl?: string;
}

export interface PerfilPedagogico {
  id: string;
  estudanteId: string;
  estudanteNome: string;
  nivelLeitura: string;
  nivelEscrita: string;
  conhecimentosMatematicos: string;
  habilidadesConsolidadas: string;
  habilidadesEmDesenvolvimento: string;
  barreirasPedagogicas: string;
  estrategiasRecomendadas: string;
  recursosAcessibilidade: string;
  adaptacoesAvaliativas: string;
  extensaoEnunciados: string;
  quantidadeAlternativas: number;
  necessidadeApoioVisual: boolean;
  necessidadeInstrucoesCurtas: boolean;
  tempoAdicionalAutorizado: string;
  observacoesPedagogicas: string;
  status: 'pendente_revisao' | 'aprovado';
  dataCadastro: string;
  dataAtualizacao?: string;
  dataCriacao?: string;
}

export interface HabilidadeAprovada {
  id: string;
  disciplina: string;
  serie: string;
  unidadeTematica: string;
  objetoConhecimento: string;
  codigo: string;
  descricao: string;
  documentoOrigem: string;
  paginaOrigem: string;
  status: 'pendente_revisao' | 'aprovada';
}

export interface DocumentoImportado {
  id: string;
  tipo: 'lista_estudantes' | 'pei' | 'documento_pedagogico' | 'matriz_curricular' | 'logo_escola' | 'modelo_atividade' | 'lista_professores';
  nomeArquivo: string;
  formato: 'PDF' | 'DOCX' | 'XLSX' | 'CSV' | 'PNG' | 'JPG' | string;
  tamanho: string;
  dataEnvio: string;
  status: 'analisado' | 'pendente_revisao' | 'aprovado';
  camposExtraidos: {
    campo: string;
    valor: string;
    confianca: 'identificado' | 'pendente_revisao';
  }[];
  // Vínculo opcional com dados do PEI oficial
  peiDados?: PeiDocumento;
}

export interface PeiOrigemCampo {
  status: 'base' | 'manual' | 'nao_cadastrado';
  descricao?: string;
}

export interface PeiIdentificacao {
  cre: string;
  municipio: string;
  unidadeEscolar: string;
  studentId?: string;
  studentName: string;
  matricula?: string;
  grade: string;
  classRoom: string;
  turno?: string;
  diagnosis: string;
  formatoLetra?: 'bastao' | 'cursiva';
  professoresRegentes?: string;
  profissionalApoio?: string;
  origemCampos?: {
    studentName?: PeiOrigemCampo;
    matricula?: PeiOrigemCampo;
    grade?: PeiOrigemCampo;
    classRoom?: PeiOrigemCampo;
    turno?: PeiOrigemCampo;
    diagnosis?: PeiOrigemCampo;
    professoresRegentes?: PeiOrigemCampo;
    profissionalApoio?: PeiOrigemCampo;
  };
}

export interface PeiAspectosCognitivos {
  percepcao: string;
  atencaoConcentracao: string;
  linguagemComunicacao: string;
  memoriaAbstracaoGeneralizacao: string;
  criatividade: string;
  aspectosPsicomotores: string;
  raciocinioLogico: string;
}

export interface PeiHabilidadesAdaptativas {
  autocuidado: string;
  autonomiaIndependencia: string;
  habilidadesSociais: string;
}

export interface PeiSecaoAspectos {
  cognitivoPsiquico: PeiAspectosCognitivos;
  comportamentoAdaptativo: PeiHabilidadesAdaptativas;
}

export interface PeiItemAreaAcademica {
  id: string;
  componenteCurricular: string;
  expectativas: string;
  conteudos: string;
  metodologias: string;
  avaliacao: string;
  professor: string;
}

export interface PeiAssinaturasOficiais {
  professorAee: string;
  coordenacaoPedagogica: string;
  profissionalApoio: string;
  professoresRegentes: string;
  gestor: string;
  local: string;
  data: string;
}

export interface PeiEtapa1Siap {
  habilidadesCognitivas: string;
  habilidadesAdaptativas: string;
  dificuldadesCognitivas: string;
  dificuldadesAdaptativas: string;
}

export interface PeiEtapa2Siap {
  expectativas: string;
  conteudos: string;
  metodologias: string;
  avaliacao: string;
}

export interface PeiDocumento {
  id: string;
  studentId: string;
  studentName: string;
  grade: string;
  classRoom: string;
  diagnosis: string;
  subject: string;
  period: string; // ex: '1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'
  regentTeacher: string;
  supportTeacher: string;
  coordinatorName?: string;
  principalName?: string;
  formatoLetra?: 'bastao' | 'cursiva';
  identification: PeiIdentificacao;

  // Seções Oficiais Rigorosamente Fiéis ao Modelo DOCX / Anexo 9 SEDUC-GO
  potencialidades?: PeiSecaoAspectos;
  necessidadesDificuldades?: PeiSecaoAspectos;
  areaAcademica?: PeiItemAreaAcademica[];
  assinaturasOficiais?: PeiAssinaturasOficiais;

  // Campos de compatibilidade com versões existentes
  etapa1: PeiEtapa1Siap;
  etapa2: PeiEtapa2Siap;
  createdAt: string;
  updatedAt?: string;
  dataValidade?: string;
  dataRevisao?: string;
  status?: 'rascunho' | 'homologado' | 'em_revisao';
  origemIa?: boolean;
}

export interface QuestaoAdaptada {
  id: string;
  numero: number;
  tipo: 'multipla_escolha' | 'verdadeiro_falso' | 'discursiva' | 'associacao';
  enunciado: string;
  alternativas?: string[];
  linhasResposta?: number;

  // Tipografia pedagógica, Ilustrações da Matriz e Pauta Cursiva
  ilustracaoSvgOuUrl?: string;
  descricaoDesenhoMatriz?: string;
  textoCaligraficoPontilhado?: string;
  estiloDesenho?: 'colorido' | 'preto_e_branco_colorir';
}

export interface AtividadeAdaptada {
  id: string;
  escolaId?: string;
  estudanteId: string;
  estudanteNome: string;
  turma: string;
  turmaId?: string;
  anoLetivo?: string;
  etapaEnsino?: string;
  anoSerie?: string;
  professorId: string;
  professorNome: string;
  disciplina: string;
  conteudo: string;
  bimestre?: string;
  matrizId?: string;
  matrizNome?: string;
  versaoMatriz?: string;
  habilidadeId?: string;
  habilidadeCodigo: string;
  habilidadeDescricao: string;
  habilidadesComplementares?: Array<{
    codigo: string;
    descricao: string;
    objetoConhecimento?: string;
  }>;
  objetoConhecimento?: string;
  quantidadeQuestoes: number;
  tipoQuestoes: string;
  tipoAtividade?: 'multipla_escolha' | 'desenhos' | 'cursiva' | 'forma' | 'combinada' | string;
  modeloAdaptacao?: string;
  nivelAdaptacao?: 'Baixo' | 'Médio' | 'Alto' | 'Universal';
  tipoLetra?: 'cursiva' | 'forma' | 'mista';

  // Configuração Tipográfica e Visual Obrigatória (Assistente / Wizard)
  estiloTipograficoVisual?: 'letra_bastao' | 'letra_bastao_desenho_matriz' | 'so_desenhos' | 'letra_cursiva' | 'letra_bastao_e_cursiva';
  formatoLetra?: 'bastao' | 'cursiva';
  usarCaixaAlta?: boolean;
  estiloDesenho?: 'colorido' | 'preto_e_branco_colorir';
  trechoMatrizPdfConsultado?: string;
  resumoRelatorioApoioUtilizado?: string;
  laudoPeiConsiderado?: string;
  exibirHabilidadeCabecalho?: 
    | 'nao_exibir' 
    | 'somente_codigo' 
    | 'somente_descricao' 
    | 'codigo_e_descricao' 
    | 'simplificada' 
    | 'cabecalho_e_relatorio' 
    | 'principal_e_complementares' 
    | boolean;
  apoioVisual?: {
    habilitado: boolean;
    tipo: 'desenhos' | 'pictogramas' | 'associacao' | 'colorir';
    estilo: 'colorido' | 'preto_e_branco';
    quantidadePorPagina: number;
    imagens?: Array<{ id: string; url?: string; rotulo: string; textoAlternativo: string; tema: string }>;
  };
  opcoesCursiva?: {
    tipoPauta: 'simples' | 'dupla' | 'caligrafica';
    tracadoPontilhado: boolean;
    ladoALadoForma: boolean;
    tamanho: 'pequeno' | 'medio' | 'grande';
    contrastado: boolean;
  };
  registrosApoioConsultados?: Array<{
    registroId: string;
    data: string;
    estrategiaEficaz?: string;
    barreiraObservada?: string;
    nivelAutonomia?: string;
  }>;
  informacoesAdaptacao?: {
    habilidadeMatrizUtilizada: string;
    dadosPeiConsiderados: string;
    registrosApoioConsiderados: string;
    estrategiasPedagogicasSugeridas: string;
    justificativaAdaptacao: string;
  };
  observacaoProfessor?: string;
  questoes: QuestaoAdaptada[];
  dataCriacao: string;
  dataAtualizacao?: string;
  status: 'Gerada' | 'Revisada';
  alinhadaAoPei?: boolean; // Indicador de atividade alinhada ao Plano de Ensino Individualizado (PEI)
  peiId?: string;
  peiAlinhamentoDetalhes?: string; // Observação pedagógica do alinhamento
  peiAlinhadoEm?: string; // Data ISO da marcação de alinhamento
  peiAlinhadoPor?: string; // Nome do professor responsável pela validação
  folhaComGabarito?: boolean;
  arquivoDriveId?: string;
  pdfUrl?: string;

  // Persistência Offline e Sincronização IndexedDB
  syncStatus?: 'synced' | 'pending_sync' | 'offline_created' | 'offline_updated';
  lastModifiedLocally?: string;
}

export interface RegistroHistorico {
  id: string;
  data: string;
  tipo: string;
  usuario: string;
  descricao: string;
}

export interface RegistroAuditoria {
  id: string;
  dataHora: string;
  usuarioResponsavel: string;
  usuarioAlterado: string;
  perfisAnteriores: string[];
  perfisPosteriores: string[];
  situacaoAnterior: string;
  situacaoPosterior: string;
  resultado: 'Sucesso' | 'Bloqueado';
  detalhes: string;
}

export interface EscolaConfig {
  id?: string;
  nome: string;
  subtitulo: string;
  endereco: string;
  municipio: string;
  emailInstitucional: string;
  telefone: string;
  textoRodape: string;
  logoUrl: string;
  corPrincipal: string;
  corSecundaria: string;
  corDestaque: string;
  permitirAcessoEmailSenha: boolean;
  backupHorario?: string;
  backupFrequencia?: 'diario' | 'semanal';
  backupConfig?: {
    horario: string;
    frequencia: 'diario' | 'semanal';
    enabled?: boolean;
    atualizadoEm?: string;
    atualizadoPor?: string;
  };
}

// =========================================================================
// ESTRUTURAS CURRICULARES (Matrizes, Habilidades, Lotes de Importação)
// =========================================================================

export interface CurriculumMatrix {
  id: string;
  schoolId: string;
  escolaId?: string;
  title: string;
  nomeMatriz?: string;
  redeEnsino?: string;
  referenceYear: string;
  anoLetivo?: string;
  educationStage: string;
  etapaEnsino?: string;
  modality: string;
  subject: string;
  componenteCurricular?: string;
  grade: string; // Ex: "7º Ano", "6º Ano"
  anoSerie?: string;
  bimestre?: string;
  active: boolean;
  status: 'approved' | 'pending' | 'draft' | 'archived' | 'processing' | 'pending_review' | 'with_inconsistencies' | 'superseded';
  statusFormatado?: 'Em processamento' | 'Aguardando conferência' | 'Validada' | 'Com inconsistências' | 'Arquivada' | 'Substituída por nova versão';
  version?: string;
  versaoMatriz?: string;
  sourceFileId?: string;
  sourceFileName?: string;
  sourceDriveUrl?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: string | null;
  totalSkills?: number;
  approvedSkills?: number;
}

export interface CurriculumSkill {
  id: string;
  schoolId: string;
  escolaId?: string;
  matrixId: string;
  nomeMatriz?: string;
  redeEnsino?: string;
  referenceYear?: string;
  anoLetivo?: string;
  etapaEnsino?: string;
  subject: string;
  componenteCurricular?: string;
  grade: string;
  anoSerie?: string;
  bimestre?: string;
  eixoTematico?: string;
  thematicUnit: string;
  unidadeTematica?: string;
  knowledgeObject: string;
  objetoConhecimento?: string;
  skillCode: string;
  codigoHabilidade?: string;
  skillDescription: string;
  descricaoHabilidade?: string;
  competency?: string;
  expectativaAprendizagem?: string;
  orientacaoPedagogica?: string;
  fonteOriginal?: string;
  sourceFileId?: string;
  sourceFileName?: string;
  sourcePage?: number | null;
  paginaOrigem?: number | null;
  status: 'approved' | 'pending' | 'rejected';
  statusValidacao?: 'Validada' | 'Pendente' | 'Inconsistente' | 'Rejeitada';
  active: boolean;
  confidence?: 'Alta' | 'Média' | 'Baixa';
  versaoMatriz?: string;
  reviewedBy?: string;
  reviewedAt?: string | null;
  usuarioResponsavel?: string;
  dataImportacao?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CurriculumSkillReviewItem {
  id: string;
  arquivoOrigem: string;
  pagina: number;
  disciplina: string;
  serie: string;
  bimestre?: string;
  eixoTematico?: string;
  unidadeTematica: string;
  objetoConhecimento: string;
  codigoHabilidade: string;
  descricao: string;
  competencia: string;
  expectativaAprendizagem?: string;
  orientacaoPedagogica?: string;
  confianca: 'Alta' | 'Média' | 'Baixa';
  situacao: 
    | 'Pronto para importar'
    | 'Pendente de revisão'
    | 'Código ilegível'
    | 'Descrição incompleta'
    | 'Disciplina não identificada'
    | 'Série não identificada'
    | 'Possível duplicidade'
    | 'Já cadastrado'
    | 'Rejeitado'
    | 'Aprovado';
  observacao: string;
  selecionado: boolean;
}

export interface CurriculumImportBatch {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: string;
  uploadedAt: string;
  uploadedBy: string;
  subject: string;
  grade: string;
  totalSkills: number;
  approvedSkills: number;
  pendingSkills: number;
  status: 
    | 'Aguardando análise'
    | 'Em análise'
    | 'Revisão necessária'
    | 'Pronto para aprovação'
    | 'Aprovado'
    | 'Importado'
    | 'Arquivado'
    | 'Erro de leitura';
  skillsExtracted: CurriculumSkillReviewItem[];
}

// =========================================================================
// TURMAS E SÉRIES
// =========================================================================

export interface Grade {
  id: string;
  schoolId: string;
  name: string; // Ex: "7º Ano"
  educationStage: string;
  order: number;
  active: boolean;
}

export interface SchoolClass {
  id: string;
  schoolId: string;
  name: string; // Ex: "7º Ano A"
  gradeId: string;
  gradeName: string;
  classLetter: string;
  shift: string; // Matutino, Vespertino, Noturno, Integral
  academicYear: string;
  active: boolean;
  studentIds: string[];
  teacherIds: string[];
  createdAt: string;
  updatedAt: string;
}

// =========================================================================
// GERENCIADOR MASTER DE ARQUIVOS & VERSIONAMENTO & LIXEIRA
// =========================================================================

export interface FileVersion {
  versionNumber: number;
  fileName: string;
  uploadedAt: string;
  uploadedBy: string;
  size: string;
  justification?: string;
}

export interface ManagedFile {
  id: string;
  schoolId: string;
  nomeArquivo: string;
  categoria: 
    | 'Lista de professores'
    | 'Lista de estudantes'
    | 'Matrizes curriculares'
    | 'PEIs'
    | 'Relatórios pedagógicos'
    | 'Documentos confidenciais'
    | 'Logos'
    | 'Modelos de atividades'
    | 'Outros documentos autorizados';
  estudanteRelacionadoNome?: string;
  estudanteRelacionadoId?: string;
  turma?: string;
  serie?: string;
  dataEnvio: string;
  enviadoPor: string;
  tamanho: string;
  tipo: string;
  situacao: 'ativo' | 'arquivado' | 'lixeira';
  versao: number;
  versoesAnteriores: FileVersion[];
  nivelAcesso: 'público_escolar' | 'professores' | 'coordenação' | 'superadmin';
  archived?: boolean;
  archivedAt?: string | null;
  archivedBy?: string | null;
  archiveReason?: string | null;
}

// =========================================================================
// INTEGRIDADE DAS BASES & CONTEXTO PEDAGÓGICO
// =========================================================================

export interface DatabaseIntegrityIssue {
  id: string;
  category: 'estudante' | 'turma' | 'matriz' | 'habilidade' | 'documento' | 'usuario';
  title: string;
  severity: 'erro' | 'alerta' | 'info';
  count: number;
  items: { id: string; label: string; details: string }[];
  suggestedAction: string;
}

export interface ActivityContextValidation {
  valid: boolean;
  student: Estudante;
  gradeName: string;
  className: string;
  subject: string;
  matrix?: CurriculumMatrix;
  skill?: CurriculumSkill | HabilidadeAprovada;
  pedagogicalProfile?: PerfilPedagogico;
  appliedStrategies: string[];
  questionCount: number;
  questionTypes: string[];
  missingFields: string[];
  alerts: string[];
  canProceed: boolean;
}

// =========================================================================
// MÓDULO PROFISSIONAL DE APOIO - ACOMPANHAMENTO DIÁRIO E REGISTROS
// =========================================================================

export interface RegistroAcompanhamentoApoio {
  id: string;
  studentId: string;
  nomeEstudante: string;
  turma: string;
  data: string; // Formato YYYY-MM-DD
  diaSemana: string; // Segunda-feira, Terça-feira, etc.
  profissionalResponsavelNome: string;
  profissionalResponsavelEmail: string;
  profissionalResponsavelId: string;

  // Pergunta 2: O aluno esteve presente?
  presente: boolean; // true = Presente, false = Ausente

  // Pergunta 3: Observação do acompanhamento comportamental (apenas quando presente)
  demonstrouIrritabilidadeOuSinais?: 'Sim' | 'Não' | 'Não se aplica';
  observacaoComportamental?: string; // Descrição objetiva se Sim

  // Pergunta 4: Registro de atividade adaptada (apenas quando presente)
  recebeuAtividadeAdaptada?: 'Sim' | 'Não';
  disciplinasEnvolvidas?: string[]; // Múltipla seleção das disciplinas da Matriz Curricular
  conseguiuRealizarAtividade?: 'Sim' | 'Parcialmente' | 'Não';
  observacaoAtividade?: string;

  // Pergunta 5: Informações adicionais
  informacoesAdicionais?: string;

  // Integração Pedagógica com Matriz, PEI e Laudo
  nivelAutonomia?: 'Independente' | 'Com Mediação Verbal' | 'Com Mediação Física/Visual' | 'Não Realizou';
  recursosUtilizados?: ('Letra Bastão' | 'Ilustrações' | 'Letra Cursiva' | 'Material Concreto' | string)[];
  avancosObservados?: string;
  barreirasEnfrentadas?: string;
  observacoesParaPeiOuRelatorio?: string;
  habilidadeMatrizCodigo?: string;
  habilidadeMatrizObjeto?: string;
  habilidadesMatrizIds?: string[];

  // Pergunta 6: Fotografia do Diário de Bordo
  fotoDiarioBordoUrl?: string; // Imagem em Base64 ou URL segura da foto anexada

  // Metadados de rastreabilidade e auditoria
  createdAt: string; // ISO 8601
  horario: string; // HH:mm:ss
  usuarioRegistroNome: string;
  usuarioRegistroEmail: string;
  updatedAt?: string;

  // Persistência IndexedDB e Sincronização Offline
  syncStatus?: 'synced' | 'pending_sync' | 'offline_created' | 'offline_updated';
  lastModifiedLocally?: string;
}

export interface RelatorioBimestralAprendizagem {
  id: string;
  schoolId: string;
  estudanteId: string;
  estudanteNome: string;
  turma: string;
  anoSerie: string;
  bimestre: '1º Bimestre' | '2º Bimestre' | '3º Bimestre' | '4º Bimestre';
  anoLetivo: number;
  dataEmissao: string;
  emitidoPor: string;
  papelEmissor: string;

  // Dados consolidados do Diário do Profissional de Apoio
  totalAtendimentosApoio: number;
  frequenciaApoioPercentual: number;
  nivelAutonomiaPredominante: string;
  recursosMaisEficazes: string[];
  sinteseEvolucaoApoio: string;

  // Dados consolidados da Matriz Curricular e Atividades
  totalAtividadesAdaptadas: number;
  habilidadesMatrizTrabalhadas: Array<{
    codigo: string;
    disciplina: string;
    objetoConhecimento: string;
    descricao: string;
  }>;

  // Metas do PEI e Laudo Clínico
  alinhamentoPei: {
    potencialidadesIdentificadas: string;
    necessidadesAtendidas: string;
    metasAlcancadas: string;
    metasEmAndamento: string;
  };

  // Parecer Final Institucional
  parecerPedagogicoFinal: string;
  conclusaoEvolucao: 'Avanço Significativo' | 'Em Desenvolvimento' | 'Atenção Prioritária';
  recomendacoesProximoBimestre: string;
  assinaturas?: {
    coordenador?: string;
    professorRegente?: string;
    profissionalApoio?: string;
    gestor?: string;
  };
}

export interface SyncQueueItem {
  id: string;
  entity: 'registro_apoio' | 'estudante' | 'atividade' | 'perfil' | 'outro';
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  payload: any;
  timestamp: string;
  retryCount: number;
  status: 'pending' | 'syncing' | 'failed' | 'synced';
  lastError?: string;
}

export interface NetworkSyncStatus {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncAt: string | null;
  storageType: 'indexeddb' | 'localstorage_fallback';
}

export interface ProfissionalApoioIdentificado {
  busca: string;
  nomeCompleto: string;
  emailEducacional: string;
  sourcePage: number;
  statusValidacao: 'confirmado' | 'pendente_validacao_homonimia';
  observacao?: string;
}


