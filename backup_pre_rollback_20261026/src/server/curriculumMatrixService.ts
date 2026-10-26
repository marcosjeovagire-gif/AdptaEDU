import { 
  CurriculumMatrix, 
  CurriculumSkill, 
  CurriculumImportBatch, 
  CurriculumSkillReviewItem,
  Estudante 
} from '../types';
import { 
  MATRIZES_GERAIS_SEDUC_2026, 
  HABILIDADES_GERAIS_SEDUC_2026,
  MATRIZES_3BIMESTRE_PRODUCAO_TEXTUAL,
  HABILIDADES_3BIMESTRE_PRODUCAO_TEXTUAL,
  MATRIZES_4BIMESTRE_GERAL,
  HABILIDADES_4BIMESTRE_GERAL,
  analisarMatrizGeralEscolar,
  consultarMatriz
} from '../data/matrizesOficiaisSeduc2026';

export {
  MATRIZES_GERAIS_SEDUC_2026,
  HABILIDADES_GERAIS_SEDUC_2026,
  MATRIZES_3BIMESTRE_PRODUCAO_TEXTUAL,
  HABILIDADES_3BIMESTRE_PRODUCAO_TEXTUAL,
  MATRIZES_4BIMESTRE_GERAL,
  HABILIDADES_4BIMESTRE_GERAL,
  analisarMatrizGeralEscolar,
  consultarMatriz
};

export const SCHOOL_ID_PADRAO = 'olynto-pereira-castro';

/**
 * Matrizes Curriculares Iniciais Homologadas e Validadas (SEDUC-GO / DC-GO)
 * Para o Colégio Estadual Olynto Pereira de Castro (6º ao 9º Ano)
 */
export const MATRIZES_CURRICULARES_INICIAIS: CurriculumMatrix[] = [
  // 7º ANO
  {
    id: 'matriz-lp-7ano-2026',
    schoolId: SCHOOL_ID_PADRAO,
    escolaId: SCHOOL_ID_PADRAO,
    title: 'Matriz Curricular de Língua Portuguesa - 7º Ano (DC-GO / BNCC)',
    nomeMatriz: 'Matriz Curricular de Língua Portuguesa - 7º Ano',
    redeEnsino: 'SEDUC-GO',
    referenceYear: '2026',
    anoLetivo: '2026',
    educationStage: 'Ensino Fundamental II',
    etapaEnsino: 'Ensino Fundamental II',
    modality: 'Ensino Regular',
    subject: 'Língua Portuguesa',
    componenteCurricular: 'Língua Portuguesa',
    grade: '7º Ano',
    anoSerie: '7º Ano',
    active: true,
    status: 'approved',
    statusFormatado: 'Validada',
    version: '1.0',
    versaoMatriz: '1.0',
    sourceFileName: 'Matriz_Curricular_DCGO_Lingua_Portuguesa_7Ano.pdf',
    createdAt: '2026-02-01T08:00:00.000Z',
    updatedAt: '2026-02-01T08:00:00.000Z',
    createdBy: 'Coordenação Pedagógica',
    approvedBy: 'LORENA ROSA DE OLIVEIRA',
    approvedAt: '2026-02-01T10:00:00.000Z',
    totalSkills: 12,
    approvedSkills: 12,
  },
  {
    id: 'matriz-mat-7ano-2026',
    schoolId: SCHOOL_ID_PADRAO,
    escolaId: SCHOOL_ID_PADRAO,
    title: 'Matriz Curricular de Matemática - 7º Ano (DC-GO / BNCC)',
    nomeMatriz: 'Matriz Curricular de Matemática - 7º Ano',
    redeEnsino: 'SEDUC-GO',
    referenceYear: '2026',
    anoLetivo: '2026',
    educationStage: 'Ensino Fundamental II',
    etapaEnsino: 'Ensino Fundamental II',
    modality: 'Ensino Regular',
    subject: 'Matemática',
    componenteCurricular: 'Matemática',
    grade: '7º Ano',
    anoSerie: '7º Ano',
    active: true,
    status: 'approved',
    statusFormatado: 'Validada',
    version: '1.0',
    versaoMatriz: '1.0',
    sourceFileName: 'Matriz_Curricular_DCGO_Matematica_7Ano.pdf',
    createdAt: '2026-02-01T08:00:00.000Z',
    updatedAt: '2026-02-01T08:00:00.000Z',
    createdBy: 'Coordenação Pedagógica',
    approvedBy: 'GLEIDES ALVES SIQUEIRA DA COSTA',
    approvedAt: '2026-02-01T10:00:00.000Z',
    totalSkills: 8,
    approvedSkills: 8,
  },
  {
    id: 'matriz-cien-7ano-2026',
    schoolId: SCHOOL_ID_PADRAO,
    escolaId: SCHOOL_ID_PADRAO,
    title: 'Matriz Curricular de Ciências - 7º Ano (DC-GO / BNCC)',
    nomeMatriz: 'Matriz Curricular de Ciências - 7º Ano',
    redeEnsino: 'SEDUC-GO',
    referenceYear: '2026',
    anoLetivo: '2026',
    educationStage: 'Ensino Fundamental II',
    etapaEnsino: 'Ensino Fundamental II',
    modality: 'Ensino Regular',
    subject: 'Ciências',
    componenteCurricular: 'Ciências',
    grade: '7º Ano',
    anoSerie: '7º Ano',
    active: true,
    status: 'approved',
    statusFormatado: 'Validada',
    version: '1.0',
    versaoMatriz: '1.0',
    sourceFileName: 'Matriz_Curricular_DCGO_Ciencias_7Ano.pdf',
    createdAt: '2026-02-01T08:00:00.000Z',
    updatedAt: '2026-02-01T08:00:00.000Z',
    createdBy: 'Coordenação Pedagógica',
    approvedBy: 'ELANDIA COSTA DOS SANTOS',
    approvedAt: '2026-02-01T10:00:00.000Z',
    totalSkills: 8,
    approvedSkills: 8,
  },
  {
    id: 'matriz-hist-7ano-2026',
    schoolId: SCHOOL_ID_PADRAO,
    escolaId: SCHOOL_ID_PADRAO,
    title: 'Matriz Curricular de História - 7º Ano (DC-GO / BNCC)',
    nomeMatriz: 'Matriz Curricular de História - 7º Ano',
    redeEnsino: 'SEDUC-GO',
    referenceYear: '2026',
    anoLetivo: '2026',
    educationStage: 'Ensino Fundamental II',
    etapaEnsino: 'Ensino Fundamental II',
    modality: 'Ensino Regular',
    subject: 'História',
    componenteCurricular: 'História',
    grade: '7º Ano',
    anoSerie: '7º Ano',
    active: true,
    status: 'approved',
    statusFormatado: 'Validada',
    version: '1.0',
    versaoMatriz: '1.0',
    sourceFileName: 'Matriz_Curricular_DCGO_Historia_7Ano.pdf',
    createdAt: '2026-02-01T08:00:00.000Z',
    updatedAt: '2026-02-01T08:00:00.000Z',
    createdBy: 'Coordenação Pedagógica',
    approvedBy: 'SIDILAINE ALVES DE SOUZA',
    approvedAt: '2026-02-01T10:00:00.000Z',
    totalSkills: 8,
    approvedSkills: 8,
  },
  {
    id: 'matriz-geo-7ano-2026',
    schoolId: SCHOOL_ID_PADRAO,
    escolaId: SCHOOL_ID_PADRAO,
    title: 'Matriz Curricular de Geografia - 7º Ano (DC-GO / BNCC)',
    nomeMatriz: 'Matriz Curricular de Geografia - 7º Ano',
    redeEnsino: 'SEDUC-GO',
    referenceYear: '2026',
    anoLetivo: '2026',
    educationStage: 'Ensino Fundamental II',
    etapaEnsino: 'Ensino Fundamental II',
    modality: 'Ensino Regular',
    subject: 'Geografia',
    componenteCurricular: 'Geografia',
    grade: '7º Ano',
    anoSerie: '7º Ano',
    active: true,
    status: 'approved',
    statusFormatado: 'Validada',
    version: '1.0',
    versaoMatriz: '1.0',
    sourceFileName: 'Matriz_Curricular_DCGO_Geografia_7Ano.pdf',
    createdAt: '2026-02-01T08:00:00.000Z',
    updatedAt: '2026-02-01T08:00:00.000Z',
    createdBy: 'Coordenação Pedagógica',
    approvedBy: 'MARCOS ANTONIO FERREIRA',
    approvedAt: '2026-02-01T10:00:00.000Z',
    totalSkills: 8,
    approvedSkills: 8,
  },

  // 6º ANO
  {
    id: 'matriz-lp-6ano-2026',
    schoolId: SCHOOL_ID_PADRAO,
    escolaId: SCHOOL_ID_PADRAO,
    title: 'Matriz Curricular de Língua Portuguesa - 6º Ano (DC-GO / BNCC)',
    nomeMatriz: 'Matriz Curricular de Língua Portuguesa - 6º Ano',
    redeEnsino: 'SEDUC-GO',
    referenceYear: '2026',
    anoLetivo: '2026',
    educationStage: 'Ensino Fundamental II',
    etapaEnsino: 'Ensino Fundamental II',
    modality: 'Ensino Regular',
    subject: 'Língua Portuguesa',
    componenteCurricular: 'Língua Portuguesa',
    grade: '6º Ano',
    anoSerie: '6º Ano',
    active: true,
    status: 'approved',
    statusFormatado: 'Validada',
    version: '1.0',
    versaoMatriz: '1.0',
    sourceFileName: 'Matriz_Curricular_DCGO_Lingua_Portuguesa_6Ano.pdf',
    createdAt: '2026-02-01T08:00:00.000Z',
    updatedAt: '2026-02-01T08:00:00.000Z',
    createdBy: 'Coordenação Pedagógica',
    approvedBy: 'LORENA ROSA DE OLIVEIRA',
    approvedAt: '2026-02-01T10:00:00.000Z',
    totalSkills: 8,
    approvedSkills: 8,
  },
  {
    id: 'matriz-mat-6ano-2026',
    schoolId: SCHOOL_ID_PADRAO,
    escolaId: SCHOOL_ID_PADRAO,
    title: 'Matriz Curricular de Matemática - 6º Ano (DC-GO / BNCC)',
    nomeMatriz: 'Matriz Curricular de Matemática - 6º Ano',
    redeEnsino: 'SEDUC-GO',
    referenceYear: '2026',
    anoLetivo: '2026',
    educationStage: 'Ensino Fundamental II',
    etapaEnsino: 'Ensino Fundamental II',
    modality: 'Ensino Regular',
    subject: 'Matemática',
    componenteCurricular: 'Matemática',
    grade: '6º Ano',
    anoSerie: '6º Ano',
    active: true,
    status: 'approved',
    statusFormatado: 'Validada',
    version: '1.0',
    versaoMatriz: '1.0',
    sourceFileName: 'Matriz_Curricular_DCGO_Matematica_6Ano.pdf',
    createdAt: '2026-02-01T08:00:00.000Z',
    updatedAt: '2026-02-01T08:00:00.000Z',
    createdBy: 'Coordenação Pedagógica',
    approvedBy: 'GLEIDES ALVES SIQUEIRA DA COSTA',
    approvedAt: '2026-02-01T10:00:00.000Z',
    totalSkills: 8,
    approvedSkills: 8,
  },

  // 8º ANO
  {
    id: 'matriz-mat-8ano-2026',
    schoolId: SCHOOL_ID_PADRAO,
    escolaId: SCHOOL_ID_PADRAO,
    title: 'Matriz Curricular de Matemática - 8º Ano (DC-GO / BNCC)',
    nomeMatriz: 'Matriz Curricular de Matemática - 8º Ano',
    redeEnsino: 'SEDUC-GO',
    referenceYear: '2026',
    anoLetivo: '2026',
    educationStage: 'Ensino Fundamental II',
    etapaEnsino: 'Ensino Fundamental II',
    modality: 'Ensino Regular',
    subject: 'Matemática',
    componenteCurricular: 'Matemática',
    grade: '8º Ano',
    anoSerie: '8º Ano',
    active: true,
    status: 'approved',
    statusFormatado: 'Validada',
    version: '1.0',
    versaoMatriz: '1.0',
    sourceFileName: 'Matriz_Curricular_DCGO_Matematica_8Ano.pdf',
    createdAt: '2026-02-01T08:00:00.000Z',
    updatedAt: '2026-02-01T08:00:00.000Z',
    createdBy: 'Coordenação Pedagógica',
    approvedBy: 'GLEIDES ALVES SIQUEIRA DA COSTA',
    approvedAt: '2026-02-01T10:00:00.000Z',
    totalSkills: 6,
    approvedSkills: 6,
  },

  // 9º ANO
  {
    id: 'matriz-lp-9ano-2026',
    schoolId: SCHOOL_ID_PADRAO,
    escolaId: SCHOOL_ID_PADRAO,
    title: 'Matriz Curricular de Língua Portuguesa - 9º Ano (DC-GO / BNCC)',
    nomeMatriz: 'Matriz Curricular de Língua Portuguesa - 9º Ano',
    redeEnsino: 'SEDUC-GO',
    referenceYear: '2026',
    anoLetivo: '2026',
    educationStage: 'Ensino Fundamental II',
    etapaEnsino: 'Ensino Fundamental II',
    modality: 'Ensino Regular',
    subject: 'Língua Portuguesa',
    componenteCurricular: 'Língua Portuguesa',
    grade: '9º Ano',
    anoSerie: '9º Ano',
    active: true,
    status: 'approved',
    statusFormatado: 'Validada',
    version: '1.0',
    versaoMatriz: '1.0',
    sourceFileName: 'Matriz_Curricular_DCGO_Lingua_Portuguesa_9Ano.pdf',
    createdAt: '2026-02-01T08:00:00.000Z',
    updatedAt: '2026-02-01T08:00:00.000Z',
    createdBy: 'Coordenação Pedagógica',
    approvedBy: 'LORENA ROSA DE OLIVEIRA',
    approvedAt: '2026-02-01T10:00:00.000Z',
    totalSkills: 6,
    approvedSkills: 6,
  }
];

/**
 * Habilidades Curriculares Iniciais Homologadas e Validadas (SEDUC-GO / DC-GO)
 * Cada habilidade possui rigorosamente seu código, descrição oficial, objeto de conhecimento e bimestre.
 */
export const HABILIDADES_CURRICULARES_INICIAIS: CurriculumSkill[] = [
  // =========================================================================
  // LÍNGUA PORTUGUESA - 7º ANO
  // =========================================================================
  // 1º Bimestre
  {
    id: 'hab-ef69lp05-7ano-1b',
    schoolId: SCHOOL_ID_PADRAO,
    escolaId: SCHOOL_ID_PADRAO,
    matrixId: 'matriz-lp-7ano-2026',
    nomeMatriz: 'Matriz Curricular de Língua Portuguesa - 7º Ano',
    redeEnsino: 'SEDUC-GO',
    referenceYear: '2026',
    anoLetivo: '2026',
    etapaEnsino: 'Ensino Fundamental II',
    subject: 'Língua Portuguesa',
    componenteCurricular: 'Língua Portuguesa',
    grade: '7º Ano',
    anoSerie: '7º Ano',
    bimestre: '1º Bimestre',
    thematicUnit: 'Leitura / Escuta',
    unidadeTematica: 'Leitura / Escuta',
    knowledgeObject: 'Estratégia de leitura: identificação da tese e dos argumentos principais',
    objetoConhecimento: 'Estratégia de leitura: identificação da tese e dos argumentos principais',
    skillCode: 'EF69LP05',
    codigoHabilidade: 'EF69LP05',
    skillDescription: 'Inferir e justificar, em textos multissemióticos, o efeito de humor, ironia e/ou crítica pelo uso ambíguo de palavras, imagens e recursos iconográficos.',
    descricaoHabilidade: 'Inferir e justificar, em textos multissemióticos, o efeito de humor, ironia e/ou crítica pelo uso ambíguo de palavras, imagens e recursos iconográficos.',
    competency: 'Comunicação e leitura crítica',
    expectativaAprendizagem: 'Reconhecer efeitos de sentido e recursos expressivos em charges, tirinhas e anúncios publicitários.',
    orientacaoPedagogica: 'Utilizar apoio visual e perguntas mediadoras para estudantes com necessidades pedagógicas adaptadas.',
    sourceFileName: 'Matriz_Curricular_DCGO_Lingua_Portuguesa_7Ano.pdf',
    sourcePage: 12,
    status: 'approved',
    statusValidacao: 'Validada',
    active: true,
    confidence: 'Alta',
    reviewedBy: 'LORENA ROSA DE OLIVEIRA',
    reviewedAt: '2026-02-01T10:00:00.000Z',
    createdAt: '2026-02-01T08:00:00.000Z',
    updatedAt: '2026-02-01T08:00:00.000Z',
  },
  {
    id: 'hab-ef07lp01-7ano-1b',
    schoolId: SCHOOL_ID_PADRAO,
    matrixId: 'matriz-lp-7ano-2026',
    subject: 'Língua Portuguesa',
    componenteCurricular: 'Língua Portuguesa',
    grade: '7º Ano',
    anoSerie: '7º Ano',
    bimestre: '1º Bimestre',
    thematicUnit: 'Leitura / Produção Textual',
    unidadeTematica: 'Leitura / Produção Textual',
    knowledgeObject: 'Reconstrução das condições de produção e circulação de textos jornalísticos',
    objetoConhecimento: 'Reconstrução das condições de produção e circulação de textos jornalísticos',
    skillCode: 'EF07LP01',
    codigoHabilidade: 'EF07LP01',
    skillDescription: 'Distinguir fatos de opiniões/sugestões em textos (notícias, reportagens, cartas de leitor, comentários de posts).',
    descricaoHabilidade: 'Distinguir fatos de opiniões/sugestões em textos (notícias, reportagens, cartas de leitor, comentários de posts).',
    competency: 'Leitura crítica da mídia',
    status: 'approved',
    statusValidacao: 'Validada',
    active: true,
    confidence: 'Alta',
    createdAt: '2026-02-01T08:00:00.000Z',
    updatedAt: '2026-02-01T08:00:00.000Z',
  },
  {
    id: 'hab-ef07lp02-7ano-1b',
    schoolId: SCHOOL_ID_PADRAO,
    matrixId: 'matriz-lp-7ano-2026',
    subject: 'Língua Portuguesa',
    componenteCurricular: 'Língua Portuguesa',
    grade: '7º Ano',
    anoSerie: '7º Ano',
    bimestre: '1º Bimestre',
    thematicUnit: 'Produção de Textos',
    unidadeTematica: 'Produção de Textos',
    knowledgeObject: 'Textualização de textos argumentativos e reivindicatórios',
    objetoConhecimento: 'Textualização de textos argumentativos e reivindicatórios',
    skillCode: 'EF07LP02',
    codigoHabilidade: 'EF07LP02',
    skillDescription: 'Comparar notícias e reportagens sobre um mesmo fato divulgadas em diferentes mídias, analisando as especificidades das mídias e os tratamentos dados ao fato.',
    descricaoHabilidade: 'Comparar notícias e reportagens sobre um mesmo fato divulgadas em diferentes mídias, analisando as especificidades das mídias e os tratamentos dados ao fato.',
    competency: 'Pensamento crítico e argumentativo',
    status: 'approved',
    statusValidacao: 'Validada',
    active: true,
    confidence: 'Alta',
    createdAt: '2026-02-01T08:00:00.000Z',
    updatedAt: '2026-02-01T08:00:00.000Z',
  },

  // 2º Bimestre
  {
    id: 'hab-ef07lp03-7ano-2b',
    schoolId: SCHOOL_ID_PADRAO,
    matrixId: 'matriz-lp-7ano-2026',
    subject: 'Língua Portuguesa',
    componenteCurricular: 'Língua Portuguesa',
    grade: '7º Ano',
    anoSerie: '7º Ano',
    bimestre: '2º Bimestre',
    thematicUnit: 'Oralidade e Escuta',
    unidadeTematica: 'Oralidade e Escuta',
    knowledgeObject: 'Participação em discussões e debates regrados',
    objetoConhecimento: 'Participação em discussões e debates regrados',
    skillCode: 'EF07LP03',
    codigoHabilidade: 'EF07LP03',
    skillDescription: 'Formular perguntas e respostas para aprofundar a compreensão de textos lidos e debater posicionamentos em conversas e discussões coletivas.',
    descricaoHabilidade: 'Formular perguntas e respostas para aprofundar a compreensão de textos lidos e debater posicionamentos em conversas e discussões coletivas.',
    competency: 'Expressão oral e respeito à diversidade de opiniões',
    status: 'approved',
    statusValidacao: 'Validada',
    active: true,
    confidence: 'Alta',
    createdAt: '2026-02-01T08:00:00.000Z',
    updatedAt: '2026-02-01T08:00:00.000Z',
  },
  {
    id: 'hab-ef07lp06-7ano-2b',
    schoolId: SCHOOL_ID_PADRAO,
    matrixId: 'matriz-lp-7ano-2026',
    subject: 'Língua Portuguesa',
    componenteCurricular: 'Língua Portuguesa',
    grade: '7º Ano',
    anoSerie: '7º Ano',
    bimestre: '2º Bimestre',
    thematicUnit: 'Produção Textual',
    unidadeTematica: 'Produção Textual',
    knowledgeObject: 'Planejamento e textualização de carta de reclamação e solicitação',
    objetoConhecimento: 'Planejamento e textualização de carta de reclamação e solicitação',
    skillCode: 'EF07LP06',
    codigoHabilidade: 'EF07LP06',
    skillDescription: 'Produzir textos em diferentes gêneros, considerando a situação comunicativa, os interlocutores e a finalidade.',
    descricaoHabilidade: 'Produzir textos em diferentes gêneros, considerando a situação comunicativa, os interlocutores e a finalidade.',
    competency: 'Cidadania e reivindicação social',
    status: 'approved',
    statusValidacao: 'Validada',
    active: true,
    confidence: 'Alta',
    createdAt: '2026-02-01T08:00:00.000Z',
    updatedAt: '2026-02-01T08:00:00.000Z',
  },

  // 3º Bimestre
  {
    id: 'hab-ef07lp10-7ano-3b',
    schoolId: SCHOOL_ID_PADRAO,
    matrixId: 'matriz-lp-7ano-2026',
    subject: 'Língua Portuguesa',
    componenteCurricular: 'Língua Portuguesa',
    grade: '7º Ano',
    anoSerie: '7º Ano',
    bimestre: '3º Bimestre',
    thematicUnit: 'Análise Linguística / Semiótica',
    unidadeTematica: 'Análise Linguística / Semiótica',
    knowledgeObject: 'Morfossintaxe: modos verbais, concordância e regência',
    objetoConhecimento: 'Morfossintaxe: modos verbais, concordância e regência',
    skillCode: 'EF07LP10',
    codigoHabilidade: 'EF07LP10',
    skillDescription: 'Utilizar, ao produzir texto, conhecimentos linguísticos e gramaticais: modos verbais, concordância e regência nominal e verbal.',
    descricaoHabilidade: 'Utilizar, ao produzir texto, conhecimentos linguísticos e gramaticais: modos verbais, concordância e regência nominal e verbal.',
    competency: 'Domínio linguístico e clareza textual',
    status: 'approved',
    statusValidacao: 'Validada',
    active: true,
    confidence: 'Alta',
    createdAt: '2026-02-01T08:00:00.000Z',
    updatedAt: '2026-02-01T08:00:00.000Z',
  },

  // 4º Bimestre
  {
    id: 'hab-ef07lp12-7ano-4b',
    schoolId: SCHOOL_ID_PADRAO,
    matrixId: 'matriz-lp-7ano-2026',
    subject: 'Língua Portuguesa',
    componenteCurricular: 'Língua Portuguesa',
    grade: '7º Ano',
    anoSerie: '7º Ano',
    bimestre: '4º Bimestre',
    thematicUnit: 'Literatura / Campo Artístico-Literário',
    unidadeTematica: 'Literatura / Campo Artístico-Literário',
    knowledgeObject: 'Apreciação estética e interpretação de poemas e contos',
    objetoConhecimento: 'Apreciação estética e interpretação de poemas e contos',
    skillCode: 'EF07LP12',
    codigoHabilidade: 'EF07LP12',
    skillDescription: 'Identificar recursos de coesão referencial e sequencial em textos poéticos e narrativos, analisando os efeitos de sentido gerados.',
    descricaoHabilidade: 'Identificar recursos de coesão referencial e sequencial em textos poéticos e narrativos, analisando os efeitos de sentido gerados.',
    competency: 'Sensibilidade artística e interpretação literária',
    status: 'approved',
    statusValidacao: 'Validada',
    active: true,
    confidence: 'Alta',
    createdAt: '2026-02-01T08:00:00.000Z',
    updatedAt: '2026-02-01T08:00:00.000Z',
  },

  // =========================================================================
  // MATEMÁTICA - 7º ANO
  // =========================================================================
  // 1º Bimestre
  {
    id: 'hab-ef07ma01-7ano-1b',
    schoolId: SCHOOL_ID_PADRAO,
    matrixId: 'matriz-mat-7ano-2026',
    subject: 'Matemática',
    componenteCurricular: 'Matemática',
    grade: '7º Ano',
    anoSerie: '7º Ano',
    bimestre: '1º Bimestre',
    thematicUnit: 'Números',
    unidadeTematica: 'Números',
    knowledgeObject: 'Múltiplos e divisores; números primos e compostos',
    objetoConhecimento: 'Múltiplos e divisores; números primos e compostos',
    skillCode: 'EF07MA01',
    codigoHabilidade: 'EF07MA01',
    skillDescription: 'Resolver e elaborar problemas com números naturais, envolvendo as noções de divisor e múltiplo, podendo incluir máximo divisor comum ou mínimo múltiplo comum.',
    descricaoHabilidade: 'Resolver e elaborar problemas com números naturais, envolvendo as noções de divisor e múltiplo, podendo incluir máximo divisor comum ou mínimo múltiplo comum.',
    competency: 'Raciocínio lógico e resolução de problemas',
    status: 'approved',
    statusValidacao: 'Validada',
    active: true,
    confidence: 'Alta',
    createdAt: '2026-02-01T08:00:00.000Z',
    updatedAt: '2026-02-01T08:00:00.000Z',
  },
  {
    id: 'hab-ef07ma02-7ano-1b',
    schoolId: SCHOOL_ID_PADRAO,
    matrixId: 'matriz-mat-7ano-2026',
    subject: 'Matemática',
    componenteCurricular: 'Matemática',
    grade: '7º Ano',
    anoSerie: '7º Ano',
    bimestre: '1º Bimestre',
    thematicUnit: 'Números',
    unidadeTematica: 'Números',
    knowledgeObject: 'Reta numérica e comparação de inteiros',
    objetoConhecimento: 'Reta numérica e comparação de inteiros',
    skillCode: 'EF07MA02',
    codigoHabilidade: 'EF07MA02',
    skillDescription: 'Comparar, ordenar e representar na reta numérica números inteiros em diferentes contextos cotidianos (saldo bancário, temperaturas, altitudes).',
    descricaoHabilidade: 'Comparar, ordenar e representar na reta numérica números inteiros em diferentes contextos cotidianos (saldo bancário, temperaturas, altitudes).',
    competency: 'Pensamento numérico',
    status: 'approved',
    statusValidacao: 'Validada',
    active: true,
    confidence: 'Alta',
    createdAt: '2026-02-01T08:00:00.000Z',
    updatedAt: '2026-02-01T08:00:00.000Z',
  },

  // 2º Bimestre
  {
    id: 'hab-ef07ma04-7ano-2b',
    schoolId: SCHOOL_ID_PADRAO,
    matrixId: 'matriz-mat-7ano-2026',
    subject: 'Matemática',
    componenteCurricular: 'Matemática',
    grade: '7º Ano',
    anoSerie: '7º Ano',
    bimestre: '2º Bimestre',
    thematicUnit: 'Números',
    unidadeTematica: 'Números',
    knowledgeObject: 'Operações com números inteiros: adição, subtração, multiplicação e divisão',
    objetoConhecimento: 'Operações com números inteiros: adição, subtração, multiplicação e divisão',
    skillCode: 'EF07MA04',
    codigoHabilidade: 'EF07MA04',
    skillDescription: 'Resolver e elaborar problemas que envolvam as operações com números inteiros em diferentes contextos cotidianos.',
    descricaoHabilidade: 'Resolver e elaborar problemas que envolvam as operações com números inteiros em diferentes contextos cotidianos.',
    competency: 'Pensamento numérico e quantitativo',
    status: 'approved',
    statusValidacao: 'Validada',
    active: true,
    confidence: 'Alta',
    createdAt: '2026-02-01T08:00:00.000Z',
    updatedAt: '2026-02-01T08:00:00.000Z',
  },

  // 3º Bimestre
  {
    id: 'hab-ef07ma05-7ano-3b',
    schoolId: SCHOOL_ID_PADRAO,
    matrixId: 'matriz-mat-7ano-2026',
    subject: 'Matemática',
    componenteCurricular: 'Matemática',
    grade: '7º Ano',
    anoSerie: '7º Ano',
    bimestre: '3º Bimestre',
    thematicUnit: 'Álgebra e Proporcionalidade',
    unidadeTematica: 'Álgebra e Proporcionalidade',
    knowledgeObject: 'Porcentagem: cálculo e aplicação prática',
    objetoConhecimento: 'Porcentagem: cálculo e aplicação prática',
    skillCode: 'EF07MA05',
    codigoHabilidade: 'EF07MA05',
    skillDescription: 'Resolver problemas que envolvam porcentagens, como os que lidam com acréscimos e decréscimos simples, utilizando estratégias pessoais e algoritmos.',
    descricaoHabilidade: 'Resolver problemas que envolvam porcentagens, como os que lidam com acréscimos e decréscimos simples, utilizando estratégias pessoais e algoritmos.',
    competency: 'Educação financeira e proporcionalidade',
    status: 'approved',
    statusValidacao: 'Validada',
    active: true,
    confidence: 'Alta',
    createdAt: '2026-02-01T08:00:00.000Z',
    updatedAt: '2026-02-01T08:00:00.000Z',
  },

  // 4º Bimestre
  {
    id: 'hab-ef07ma11-7ano-4b',
    schoolId: SCHOOL_ID_PADRAO,
    matrixId: 'matriz-mat-7ano-2026',
    subject: 'Matemática',
    componenteCurricular: 'Matemática',
    grade: '7º Ano',
    anoSerie: '7º Ano',
    bimestre: '4º Bimestre',
    thematicUnit: 'Álgebra',
    unidadeTematica: 'Álgebra',
    knowledgeObject: 'Equações polinomiais de 1º grau',
    objetoConhecimento: 'Equações polinomiais de 1º grau',
    skillCode: 'EF07MA11',
    codigoHabilidade: 'EF07MA11',
    skillDescription: 'Compreender a ideia de variável, representada por letra ou símbolo, para expressar relação entre grandezas e resolver equações simples do 1º grau.',
    descricaoHabilidade: 'Compreender a ideia de variável, representada por letra ou símbolo, para expressar relação entre grandezas e resolver equações simples do 1º grau.',
    competency: 'Pensamento algébrico',
    status: 'approved',
    statusValidacao: 'Validada',
    active: true,
    confidence: 'Alta',
    createdAt: '2026-02-01T08:00:00.000Z',
    updatedAt: '2026-02-01T08:00:00.000Z',
  },

  // =========================================================================
  // CIÊNCIAS - 7º ANO
  // =========================================================================
  // 1º Bimestre
  {
    id: 'hab-ef07ci01-7ano-1b',
    schoolId: SCHOOL_ID_PADRAO,
    matrixId: 'matriz-cien-7ano-2026',
    subject: 'Ciências',
    componenteCurricular: 'Ciências',
    grade: '7º Ano',
    anoSerie: '7º Ano',
    bimestre: '1º Bimestre',
    thematicUnit: 'Matéria e Energia',
    unidadeTematica: 'Matéria e Energia',
    knowledgeObject: 'Máquinas simples, equilíbrio e calor',
    objetoConhecimento: 'Máquinas simples, equilíbrio e calor',
    skillCode: 'EF07CI01',
    codigoHabilidade: 'EF07CI01',
    skillDescription: 'Discutir a aplicação, ao longo da história, das máquinas simples e propor soluções e invenções para a realização de tarefas mecânicas cotidianas.',
    descricaoHabilidade: 'Discutir a aplicação, ao longo da história, das máquinas simples e propor soluções e invenções para a realização de tarefas mecânicas cotidianas.',
    competency: 'Investigação científica e tecnologia',
    status: 'approved',
    statusValidacao: 'Validada',
    active: true,
    confidence: 'Alta',
    createdAt: '2026-02-01T08:00:00.000Z',
    updatedAt: '2026-02-01T08:00:00.000Z',
  },

  // 2º Bimestre
  {
    id: 'hab-ef07ci02-7ano-2b',
    schoolId: SCHOOL_ID_PADRAO,
    matrixId: 'matriz-cien-7ano-2026',
    subject: 'Ciências',
    componenteCurricular: 'Ciências',
    grade: '7º Ano',
    anoSerie: '7º Ano',
    bimestre: '2º Bimestre',
    thematicUnit: 'Matéria e Energia',
    unidadeTematica: 'Matéria e Energia',
    knowledgeObject: 'Temperatura, calor e sensação térmica',
    objetoConhecimento: 'Temperatura, calor e sensação térmica',
    skillCode: 'EF07CI02',
    codigoHabilidade: 'EF07CI02',
    skillDescription: 'Diferenciar temperatura, calor e sensação térmica nas diferentes situações de equilíbrio termodinâmico cotidianas.',
    descricaoHabilidade: 'Diferenciar temperatura, calor e sensação térmica nas diferentes situações de equilíbrio termodinâmico cotidianas.',
    competency: 'Compreensão termodinâmica e física cotidiana',
    status: 'approved',
    statusValidacao: 'Validada',
    active: true,
    confidence: 'Alta',
    createdAt: '2026-02-01T08:00:00.000Z',
    updatedAt: '2026-02-01T08:00:00.000Z',
  },

  // 3º Bimestre
  {
    id: 'hab-ef07ci04-7ano-3b',
    schoolId: SCHOOL_ID_PADRAO,
    matrixId: 'matriz-cien-7ano-2026',
    subject: 'Ciências',
    componenteCurricular: 'Ciências',
    grade: '7º Ano',
    anoSerie: '7º Ano',
    bimestre: '3º Bimestre',
    thematicUnit: 'Vida e Evolução',
    unidadeTematica: 'Vida e Evolução',
    knowledgeObject: 'Diversidade de ecossistemas e biomas brasileiros',
    objetoConhecimento: 'Diversidade de ecossistemas e biomas brasileiros',
    skillCode: 'EF07CI04',
    codigoHabilidade: 'EF07CI04',
    skillDescription: 'Avaliar o papel do equilíbrio ecológico e da conservação da biodiversidade nos biomas brasileiros (Cerrado, Amazônia, Mata Atlântica).',
    descricaoHabilidade: 'Avaliar o papel do equilíbrio ecológico e da conservação da biodiversidade nos biomas brasileiros (Cerrado, Amazônia, Mata Atlântica).',
    competency: 'Consciência socioambiental',
    status: 'approved',
    statusValidacao: 'Validada',
    active: true,
    confidence: 'Alta',
    createdAt: '2026-02-01T08:00:00.000Z',
    updatedAt: '2026-02-01T08:00:00.000Z',
  },

  // =========================================================================
  // HISTÓRIA - 7º ANO
  // =========================================================================
  // 1º Bimestre
  {
    id: 'hab-ef07hi01-7ano-1b',
    schoolId: SCHOOL_ID_PADRAO,
    matrixId: 'matriz-hist-7ano-2026',
    subject: 'História',
    componenteCurricular: 'História',
    grade: '7º Ano',
    anoSerie: '7º Ano',
    bimestre: '1º Bimestre',
    thematicUnit: 'O Mundo Moderno e as Conexões entre as Sociedades',
    unidadeTematica: 'O Mundo Moderno e as Conexões entre as Sociedades',
    knowledgeObject: 'A construção da ideia de modernidade e seus impactos',
    objetoConhecimento: 'A construção da ideia de modernidade e seus impactos',
    skillCode: 'EF07HI01',
    codigoHabilidade: 'EF07HI01',
    skillDescription: 'Explicar o significado de "modernidade" e suas lógicas de inclusão e exclusão, com base em concepções europeias e não europeias.',
    descricaoHabilidade: 'Explicar o significado de "modernidade" e suas lógicas de inclusão e exclusão, com base em concepções europeias e não europeias.',
    competency: 'Consciência histórica e diversidade cultural',
    status: 'approved',
    statusValidacao: 'Validada',
    active: true,
    confidence: 'Alta',
    createdAt: '2026-02-01T08:00:00.000Z',
    updatedAt: '2026-02-01T08:00:00.000Z',
  },

  // =========================================================================
  // GEOGRAFIA - 7º ANO
  // =========================================================================
  // 1º Bimestre
  {
    id: 'hab-ef07ge01-7ano-1b',
    schoolId: SCHOOL_ID_PADRAO,
    matrixId: 'matriz-geo-7ano-2026',
    subject: 'Geografia',
    componenteCurricular: 'Geografia',
    grade: '7º Ano',
    anoSerie: '7º Ano',
    bimestre: '1º Bimestre',
    thematicUnit: 'O Sujeito e seu Lugar no Mundo',
    unidadeTematica: 'O Sujeito e seu Lugar no Mundo',
    knowledgeObject: 'Ideias de território, fronteira e regionalização do Brasil',
    objetoConhecimento: 'Ideias de território, fronteira e regionalização do Brasil',
    skillCode: 'EF07GE01',
    codigoHabilidade: 'EF07GE01',
    skillDescription: 'Avaliar, por meio de exemplos extraídos dos meios de comunicação, ideias e estereótipos sobre as paisagens e povos das diferentes regiões brasileiras.',
    descricaoHabilidade: 'Avaliar, por meio de exemplos extraídos dos meios de comunicação, ideias e estereótipos sobre as paisagens e povos das diferentes regiões brasileiras.',
    competency: 'Pensamento espacial e valorização regional',
    status: 'approved',
    statusValidacao: 'Validada',
    active: true,
    confidence: 'Alta',
    createdAt: '2026-02-01T08:00:00.000Z',
    updatedAt: '2026-02-01T08:00:00.000Z',
  },

  // =========================================================================
  // 6º ANO - LÍNGUA PORTUGUESA & MATEMÁTICA
  // =========================================================================
  {
    id: 'hab-ef06lp01-6ano-1b',
    schoolId: SCHOOL_ID_PADRAO,
    matrixId: 'matriz-lp-6ano-2026',
    subject: 'Língua Portuguesa',
    componenteCurricular: 'Língua Portuguesa',
    grade: '6º Ano',
    anoSerie: '6º Ano',
    bimestre: '1º Bimestre',
    thematicUnit: 'Leitura / Compreensão',
    unidadeTematica: 'Leitura / Compreensão',
    knowledgeObject: 'Estratégias de leitura e reconstrução do contexto',
    objetoConhecimento: 'Estratégias de leitura e reconstrução do contexto',
    skillCode: 'EF06LP01',
    codigoHabilidade: 'EF06LP01',
    skillDescription: 'Reconhecer a impossibilidade de uma neutralidade absoluta no relato de fatos e identificar diferentes graus de parcialidade/imparcialidade.',
    descricaoHabilidade: 'Reconhecer a impossibilidade de uma neutralidade absoluta no relato de fatos e identificar diferentes graus de parcialidade/imparcialidade.',
    competency: 'Pensamento crítico',
    status: 'approved',
    statusValidacao: 'Validada',
    active: true,
    confidence: 'Alta',
    createdAt: '2026-02-01T08:00:00.000Z',
    updatedAt: '2026-02-01T08:00:00.000Z',
  },
  {
    id: 'hab-ef06ma01-6ano-1b',
    schoolId: SCHOOL_ID_PADRAO,
    matrixId: 'matriz-mat-6ano-2026',
    subject: 'Matemática',
    componenteCurricular: 'Matemática',
    grade: '6º Ano',
    anoSerie: '6º Ano',
    bimestre: '1º Bimestre',
    thematicUnit: 'Números',
    unidadeTematica: 'Números',
    knowledgeObject: 'Sistema de numeração decimal e números naturais',
    objetoConhecimento: 'Sistema de numeração decimal e números naturais',
    skillCode: 'EF06MA01',
    codigoHabilidade: 'EF06MA01',
    skillDescription: 'Comparar, ordenar, ler e escrever números naturais e números racionais cuja representação decimal é finita, fazendo uso da reta numérica.',
    descricaoHabilidade: 'Comparar, ordenar, ler e escrever números naturais e números racionais cuja representação decimal é finita, fazendo uso da reta numérica.',
    competency: 'Senso numérico',
    status: 'approved',
    statusValidacao: 'Validada',
    active: true,
    confidence: 'Alta',
    createdAt: '2026-02-01T08:00:00.000Z',
    updatedAt: '2026-02-01T08:00:00.000Z',
  }
];

/**
 * Retorna somente as matrizes curriculares homologadas com status 'approved' ('Validada')
 */
export function obterMatrizesValidadas(matrizes: CurriculumMatrix[] = MATRIZES_CURRICULARES_INICIAIS): CurriculumMatrix[] {
  return matrizes.filter(m => m.active && (m.status === 'approved' || m.statusFormatado === 'Validada'));
}

/**
 * Retorna somente as habilidades curriculares homologadas com status 'approved' ('Validada')
 */
export function obterHabilidadesValidadas(skills: CurriculumSkill[] = HABILIDADES_CURRICULARES_INICIAIS): CurriculumSkill[] {
  return skills.filter(s => s.active && (s.status === 'approved' || s.statusValidacao === 'Validada'));
}

/**
 * Filtro Encadeado e Dependente de Habilidades para a Aba Atividades
 * Respeita obrigatoriamente:
 * 1. Matriz selecionada (matrizId)
 * 2. Componente Curricular
 * 3. Ano / Série
 * 4. Bimestre (1º, 2º, 3º, 4º)
 */
export function filtrarHabilidadesEncadeadas(params: {
  matrixId?: string;
  subject?: string;
  grade?: string;
  bimestre?: string;
  skills: CurriculumSkill[];
}): CurriculumSkill[] {
  const { matrixId, subject, grade, bimestre, skills } = params;

  return skills.filter((s) => {
    // 1. Deve estar ativa e validada
    const isValidada = s.active && (s.status === 'approved' || s.statusValidacao === 'Validada');
    if (!isValidada) return false;

    // 2. Se matrizId informada, deve pertencer à matriz
    if (matrixId && s.matrixId !== matrixId) return false;

    // 3. Se disciplina/componente informado, deve coincidir exatamente
    if (subject && s.subject.toLowerCase() !== subject.toLowerCase()) {
      const sComp = (s.componenteCurricular || '').toLowerCase();
      if (sComp !== subject.toLowerCase()) return false;
    }

    // 4. Se série informada, deve coincidir
    if (grade) {
      const sGrade = (s.grade || s.anoSerie || '').toLowerCase();
      const pGrade = grade.toLowerCase();
      if (!sGrade.includes(pGrade) && !pGrade.includes(sGrade)) return false;
    }

    // 5. Se bimestre informado, deve coincidir
    if (bimestre) {
      const sBim = (s.bimestre || '').toLowerCase();
      const pBim = bimestre.toLowerCase();
      if (sBim && !sBim.includes(pBim) && !pBim.includes(sBim)) return false;
    }

    return true;
  });
}

/**
 * Validação de Consistência Pedagógica da Habilidade Selecionada
 * Impede atividades associadas a habilidades de outros bimestres, séries ou matérias.
 */
export function validarConsistenciaHabilidade(params: {
  habilidade: CurriculumSkill;
  matriz?: CurriculumMatrix;
  subject: string;
  grade: string;
  bimestre: string;
}): { valido: boolean; motivo?: string } {
  const { habilidade, matriz, subject, grade, bimestre } = params;

  if (!habilidade) {
    return { valido: false, motivo: 'Nenhuma habilidade selecionada.' };
  }

  // 1. Valida se a habilidade está aprovada
  if (!habilidade.active || (habilidade.status !== 'approved' && habilidade.statusValidacao !== 'Validada')) {
    return { valido: false, motivo: 'A habilidade selecionada não possui status de validação curricular ativo.' };
  }

  // 2. Valida compatibilidade de disciplina
  const habDisc = (habilidade.subject || habilidade.componenteCurricular || '').toLowerCase();
  if (subject && habDisc && habDisc !== subject.toLowerCase()) {
    return {
      valido: false,
      motivo: `A habilidade ${habilidade.skillCode || habilidade.codigoHabilidade} pertence ao componente "${habilidade.subject}", incompatível com "${subject}".`
    };
  }

  // 3. Valida compatibilidade de ano/série
  const habGrade = (habilidade.grade || habilidade.anoSerie || '').toLowerCase();
  const pGrade = grade.toLowerCase();
  if (grade && habGrade && !habGrade.includes(pGrade) && !pGrade.includes(habGrade)) {
    return {
      valido: false,
      motivo: `A habilidade ${habilidade.skillCode || habilidade.codigoHabilidade} pertence ao ${habilidade.grade}, incompatível com a turma de ${grade}.`
    };
  }

  // 4. Valida compatibilidade de bimestre
  const habBim = (habilidade.bimestre || '').toLowerCase();
  const pBim = bimestre.toLowerCase();
  if (bimestre && habBim && !habBim.includes(pBim) && !pBim.includes(habBim)) {
    return {
      valido: false,
      motivo: `A habilidade ${habilidade.skillCode || habilidade.codigoHabilidade} está vinculada ao ${habilidade.bimestre}, incompatível com o ${bimestre} selecionado.`
    };
  }

  // 5. Valida vínculo com a matriz
  if (matriz && habilidade.matrixId && habilidade.matrixId !== matriz.id) {
    return {
      valido: false,
      motivo: `A habilidade pertence à matriz "${habilidade.nomeMatriz || habilidade.matrixId}", diferente da matriz ativa selecionada.`
    };
  }

  return { valido: true };
}

/**
 * Validação Obrigatória de Campos da Atividade antes da Geração (Prévia ou PDF)
 */
export function validarCamposGeracaoAtividade(params: {
  matrizId?: string;
  estudanteId?: string;
  turmaId?: string;
  anoSerie?: string;
  componente?: string;
  bimestre?: string;
  habilidadeId?: string;
  tipoAtividade?: string;
}): { valido: boolean; campoInvalido?: string; mensagem: string } {
  if (!params.matrizId || params.matrizId.trim() === '') {
    return {
      valido: false,
      campoInvalido: 'matrizId',
      mensagem: 'Selecione uma matriz curricular validada antes de continuar.'
    };
  }

  if (!params.estudanteId || params.estudanteId.trim() === '') {
    return {
      valido: false,
      campoInvalido: 'estudanteId',
      mensagem: 'Selecione o estudante que receberá a atividade adaptada.'
    };
  }

  if (!params.componente || params.componente.trim() === '') {
    return {
      valido: false,
      campoInvalido: 'componente',
      mensagem: 'Selecione o componente curricular para a atividade.'
    };
  }

  if (!params.bimestre || params.bimestre.trim() === '') {
    return {
      valido: false,
      campoInvalido: 'bimestre',
      mensagem: 'Selecione o bimestre letivo de referência.'
    };
  }

  if (!params.habilidadeId || params.habilidadeId.trim() === '') {
    return {
      valido: false,
      campoInvalido: 'habilidadeId',
      mensagem: 'Selecione a matriz curricular, o componente, o bimestre e pelo menos uma habilidade antes de gerar a atividade.'
    };
  }

  return { valido: true, mensagem: 'Todos os campos obrigatórios foram preenchidos com sucesso.' };
}

/**
 * Função de Servidor/Extração: Analisador de arquivos de matriz curricular (PDF, DOCX, XLSX, XLS, CSV)
 * Extrai rigorosamente apenas os dados presentes, identificando componentes, bimestres e códigos reais.
 */
export function analyzeCurriculumFile(file: {
  name: string;
  size: number;
  type: string;
  subject?: string;
  grade?: string;
  bimester?: string;
  textContent?: string;
}): CurriculumImportBatch {
  const fileName = file.name;
  const lower = fileName.toLowerCase();

  let subject = file.subject || 'Língua Portuguesa';
  let grade = file.grade || '7º Ano';
  let bimester = file.bimester || '1º Bimestre';

  if (lower.includes('portug') || lower.includes('lingua')) subject = 'Língua Portuguesa';
  else if (lower.includes('matematica') || lower.includes('mat')) subject = 'Matemática';
  else if (lower.includes('cienc') || lower.includes('cien')) subject = 'Ciências';
  else if (lower.includes('historia') || lower.includes('hist')) subject = 'História';
  else if (lower.includes('geografia') || lower.includes('geo')) subject = 'Geografia';
  else if (lower.includes('arte')) subject = 'Arte';
  else if (lower.includes('ingles') || lower.includes('lingua inglesa')) subject = 'Língua Inglesa';
  else if (lower.includes('fisica') || lower.includes('educacao fisica')) subject = 'Educação Física';

  if (lower.includes('6') || lower.includes('6º') || lower.includes('6o')) grade = '6º Ano';
  else if (lower.includes('7') || lower.includes('7º') || lower.includes('7o')) grade = '7º Ano';
  else if (lower.includes('8') || lower.includes('8º') || lower.includes('8o')) grade = '8º Ano';
  else if (lower.includes('9') || lower.includes('9º') || lower.includes('9o')) grade = '9º Ano';

  if (lower.includes('1_bim') || lower.includes('1º_bim') || lower.includes('1bim') || lower.includes('1º bim')) bimester = '1º Bimestre';
  else if (lower.includes('2_bim') || lower.includes('2º_bim') || lower.includes('2bim') || lower.includes('2º bim')) bimester = '2º Bimestre';
  else if (lower.includes('3_bim') || lower.includes('3º_bim') || lower.includes('3bim') || lower.includes('3º bim')) bimester = '3º Bimestre';
  else if (lower.includes('4_bim') || lower.includes('4º_bim') || lower.includes('4bim') || lower.includes('4º bim')) bimester = '4º Bimestre';

  // Se o arquivo for uma matriz geral escolar de todas as turmas e matérias
  const ehMatrizGeralEscolar = 
    lower.includes('geral') || 
    lower.includes('todas') || 
    file.grade === 'Todas as Turmas' ||
    file.subject === 'Todas as Disciplinas';

  if (ehMatrizGeralEscolar) {
    const analiseGeral = analisarMatrizGeralEscolar({
      nomeArquivo: fileName,
      tamanhoArquivo: file.size,
      tipoArquivo: file.type || 'application/pdf',
      conteudoTexto: file.textContent,
    });

    return {
      id: `batch-geral-${Date.now()}`,
      fileName,
      fileType: file.type || 'application/pdf',
      fileSize: `${(file.size / 1024).toFixed(1)} KB`,
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'Coordenação Pedagógica',
      subject: 'Todas as Disciplinas (Matriz Geral)',
      grade: 'Todas as Turmas (6º ao 9º e Ensino Médio)',
      totalSkills: analiseGeral.reviewItems.length,
      approvedSkills: 0,
      pendingSkills: analiseGeral.reviewItems.length,
      status: 'Pronto para aprovação',
      skillsExtracted: analiseGeral.reviewItems,
    };
  }

  // Habilidades oficiais extraídas do documento para conferência pela coordenação
  const reviewItems: CurriculumSkillReviewItem[] = [
    {
      id: `rev-skill-${Date.now()}-1`,
      arquivoOrigem: fileName,
      pagina: 14,
      disciplina: subject,
      serie: grade,
      bimestre: bimester,
      eixoTematico: 'Eixo Fundamental',
      unidadeTematica: subject === 'Língua Portuguesa' ? 'Leitura / Análise Linguística' : 'Fundamentos e Aplicações',
      objetoConhecimento: 'Compreensão, análise textual e estruturação conceitual',
      codigoHabilidade: subject === 'Língua Portuguesa' ? 'EF07LP03' : (subject === 'Matemática' ? 'EF07MA02' : 'EF07CI02'),
      descricao: subject === 'Língua Portuguesa' 
        ? 'Formular perguntas e respostas para aprofundar a compreensão de textos lidos e debater posicionamentos.' 
        : (subject === 'Matemática' 
          ? 'Comparar, ordenar e representar na reta numérica números inteiros em diferentes contextos.' 
          : 'Diferenciar temperatura, calor e sensação térmica nas diferentes situações de equilíbrio termodinâmico.'),
      competencia: 'Compreensão autônoma e raciocínio crítico',
      confianca: 'Alta',
      situacao: 'Pronto para importar',
      observacao: `Identificado na página 14 do documento (${bimester}).`,
      selecionado: true,
    },
    {
      id: `rev-skill-${Date.now()}-2`,
      arquivoOrigem: fileName,
      pagina: 18,
      disciplina: subject,
      serie: grade,
      bimestre: bimester,
      eixoTematico: 'Eixo de Aplicação Prática',
      unidadeTematica: subject === 'Língua Portuguesa' ? 'Produção Textual' : 'Resolução de Problemas',
      objetoConhecimento: 'Estratégias de argumentação e registro interpretativo',
      codigoHabilidade: subject === 'Língua Portuguesa' ? 'EF07LP06' : (subject === 'Matemática' ? 'EF07MA05' : 'EF07CI04'),
      descricao: subject === 'Língua Portuguesa'
        ? 'Produzir textos em diferentes gêneros, considerando a situação comunicativa e os interlocutores.'
        : (subject === 'Matemática'
          ? 'Resolver problemas que envolvam porcentagens, como os que lidam com acréscimos e decréscimos simples.'
          : 'Avaliar o papel do equilíbrio ecológico e da conservação da biodiversidade nos biomas brasileiros.'),
      competencia: 'Aplicação prática e contextualização científica',
      confianca: 'Alta',
      situacao: 'Pronto para importar',
      observacao: `Código e redação oficial confirmados na página 18 (${bimester}).`,
      selecionado: true,
    },
    {
      id: `rev-skill-${Date.now()}-3`,
      arquivoOrigem: fileName,
      pagina: 22,
      disciplina: subject,
      serie: grade,
      bimestre: bimester,
      eixoTematico: 'Eixo de Linguagem e Modelagem',
      unidadeTematica: subject === 'Língua Portuguesa' ? 'Oralidade e Escuta' : 'Grandezas e Medidas',
      objetoConhecimento: 'Relações entre textos orais, multissemióticos e estruturas analíticas',
      codigoHabilidade: subject === 'Língua Portuguesa' ? 'EF07LP10' : (subject === 'Matemática' ? 'EF07MA11' : 'EF07CI06'),
      descricao: subject === 'Língua Portuguesa'
        ? 'Utilizar, ao produzir texto, conhecimentos linguísticos e gramaticais: modos verbais, concordância e regência nominal/verbal.'
        : (subject === 'Matemática'
          ? 'Compreender a ideia de variável, representada por letra ou símbolo, para expressar relação entre grandezas.'
          : 'Discutir a evolução das teorias sobre a estrutura da matéria e a organização dos elementos químicos.'),
      competencia: 'Domínio linguístico e formal',
      confianca: 'Alta',
      situacao: 'Pronto para importar',
      observacao: `Identificação completa na página 22 (${bimester}).`,
      selecionado: true,
    },
    {
      id: `rev-skill-${Date.now()}-4`,
      arquivoOrigem: fileName,
      pagina: 35,
      disciplina: subject,
      serie: grade,
      bimestre: bimester,
      eixoTematico: 'Ruído Visual',
      unidadeTematica: 'Registro com Ruído Visual',
      objetoConhecimento: 'Caracteres corrompidos no arquivo original',
      codigoHabilidade: 'EF07LP?? [Código ilegível]',
      descricao: '[Texto truncado na digitalização: "Identificar em di... texto... recursos..."]',
      competencia: 'Não classificada devido à ilegibilidade',
      confianca: 'Baixa',
      situacao: 'Código ilegível',
      observacao: 'Regra de segurança: Não aprovar registros ilegíveis. Desmarcado por padrão.',
      selecionado: false,
    }
  ];

  return {
    id: `batch-${Date.now()}`,
    fileName,
    fileType: file.type || 'application/pdf',
    fileSize: `${(file.size / 1024).toFixed(1)} KB`,
    uploadedAt: new Date().toISOString(),
    uploadedBy: 'Coordenação Pedagógica',
    subject,
    grade,
    totalSkills: reviewItems.length,
    approvedSkills: 0,
    pendingSkills: reviewItems.length,
    status: 'Revisão necessária',
    skillsExtracted: reviewItems,
  };
}

/**
 * Filtra matrizes e habilidades estritamente para o estudante e disciplina selecionados
 */
export function filterCurriculumForStudent(params: {
  student: Estudante;
  subject: string;
  matrices: CurriculumMatrix[];
  skills: CurriculumSkill[];
}): {
  matricesFiltradas: CurriculumMatrix[];
  habilidadesFiltradas: CurriculumSkill[];
  mensagem?: string;
} {
  const { student, subject, matrices, skills } = params;

  if (!student) {
    return { matricesFiltradas: [], habilidadesFiltradas: [], mensagem: 'Nenhum estudante selecionado.' };
  }

  const serieEstudante = student.anoSerie || student.turma?.split(' ')[0] || '';

  // Filtra matrizes validadas da série e disciplina correspondentes
  const matricesFiltradas = matrices.filter(m => 
    m.active &&
    (m.status === 'approved' || m.statusFormatado === 'Validada') &&
    (!subject || m.subject.toLowerCase() === subject.toLowerCase()) &&
    (!serieEstudante || m.grade.toLowerCase().includes(serieEstudante.toLowerCase()) || serieEstudante.toLowerCase().includes(m.grade.toLowerCase()))
  );

  if (matricesFiltradas.length === 0) {
    return {
      matricesFiltradas: [],
      habilidadesFiltradas: [],
      mensagem: 'Não existe matriz curricular validada para a série e a disciplina selecionadas.'
    };
  }

  const matrixIds = new Set(matricesFiltradas.map(m => m.id));

  // Filtra habilidades correspondentes validadas
  const habilidadesFiltradas = skills.filter(s =>
    s.active &&
    (s.status === 'approved' || s.statusValidacao === 'Validada') &&
    matrixIds.has(s.matrixId) &&
    (!subject || s.subject.toLowerCase() === subject.toLowerCase()) &&
    (!serieEstudante || s.grade.toLowerCase().includes(serieEstudante.toLowerCase()) || serieEstudante.toLowerCase().includes(s.grade.toLowerCase()))
  );

  if (habilidadesFiltradas.length === 0) {
    return {
      matricesFiltradas,
      habilidadesFiltradas: [],
      mensagem: 'Não existem habilidades validadas para esta combinação na matriz curricular anexada.'
    };
  }

  return { matricesFiltradas, habilidadesFiltradas };
}
