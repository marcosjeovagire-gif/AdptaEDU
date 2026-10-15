import { GoogleGenAI } from '@google/genai';
import { 
  PeiDocumento, 
  PeiIdentificacao, 
  PeiEtapa1Siap, 
  PeiEtapa2Siap,
  PeiSecaoAspectos,
  PeiItemAreaAcademica,
  PeiAssinaturasOficiais,
  AtividadeAdaptada,
  Estudante
} from '../types';
import { 
  gerarAtividadeEstruturada, 
  ParametrosGeracaoAtividade 
} from '../utils/activityGenerator';

export const PEI_STORAGE_KEY = 'adaptaedu_peis_seduc_go';

/**
 * Determina o formato de letra ('bastao' ou 'cursiva') a partir do laudo, CID e histórico pedagógico do aluno,
 * com suporte a override manual informado pelo professor ou equipe escolar.
 * Termos que indicam necessidade de Letra Bastão: TEA, Autismo, Deficiência Intelectual, Paralisia, Disgrafia, etc.
 */
export function determinarFormatoLetraPorLaudo(
  laudoOuAluno?: string | { 
    laudo?: string; 
    observacoesAcessibilidade?: string; 
    diagnosis?: string; 
    cid?: string; 
    diagnostico?: string; 
    perfil?: any 
  },
  override?: 'bastao' | 'cursiva'
): 'bastao' | 'cursiva' {
  if (override === 'bastao' || override === 'cursiva') {
    return override;
  }

  let textoAnalise = '';
  if (typeof laudoOuAluno === 'string') {
    textoAnalise = laudoOuAluno;
  } else if (laudoOuAluno && typeof laudoOuAluno === 'object') {
    textoAnalise = [
      laudoOuAluno.laudo,
      laudoOuAluno.observacoesAcessibilidade,
      laudoOuAluno.diagnosis,
      laudoOuAluno.cid,
      laudoOuAluno.diagnostico,
      laudoOuAluno.perfil?.recursosAcessibilidade,
      laudoOuAluno.perfil?.barreirasPedagogicas
    ].filter(Boolean).join(' ');
  }

  const texto = textoAnalise.toLowerCase();

  const termosBastao = [
    'tea', 'autis', 'espectro autista', 'f84',
    'intelectual', 'deficiência intelectual', 'deficiencia intelectual', 'di', 'f70', 'f71', 'f72', 'f79',
    'disgrafia', 'disgraf', 'dislexia', 'dislex',
    'motora', 'coordenação motora', 'atraso motor', 'apraxia',
    'paralisia', 'pci', 'paralisia cerebral', 'g80',
    'down', 't21', 'trissomia 21', 'microcefalia',
    'baixa visao', 'baixa visão',
    'bastao', 'bastão', 'caixa alta', 'forma', 'lexend'
  ];

  const encontrouTermo = termosBastao.some(termo => texto.includes(termo));
  return encontrouTermo ? 'bastao' : 'cursiva';
}

/**
 * Retorna detalhamento da preferência de formato de letra com justificativa pedagógica para UI/badges
 */
export function obterPreferenciaFormatoLetraEstudante(
  estudante: { laudo?: string; observacoesAcessibilidade?: string; diagnosis?: string; diagnostico?: string },
  pei?: { diagnosis?: string; formatoLetra?: 'bastao' | 'cursiva' } | null
): {
  formatoSugerido: 'bastao' | 'cursiva';
  motivo: string;
  identificadoPorTermo: boolean;
} {
  if (pei?.formatoLetra) {
    return {
      formatoSugerido: pei.formatoLetra,
      motivo: `Formato ${pei.formatoLetra === 'bastao' ? 'Letra Bastão (Caixa Alta / Lexend)' : 'Letra Cursiva'} registrado no PEI do estudante.`,
      identificadoPorTermo: true
    };
  }

  const laudoTexto = [
    estudante?.laudo,
    estudante?.observacoesAcessibilidade,
    estudante?.diagnosis,
    estudante?.diagnostico,
    pei?.diagnosis
  ].filter(Boolean).join(' ');

  const formato = determinarFormatoLetraPorLaudo(laudoTexto);
  const identificadoPorTermo = formato === 'bastao';

  const motivo = identificadoPorTermo
    ? 'Identificada necessidade pedagógica de Letra Bastão (Caixa Alta com fonte Lexend) no laudo/CID para facilitação da decodificação e redução de sobrecarga cognitiva.'
    : 'Sem indicativo restritivo no laudo. Padrão cursivo ou à escolha do professor regente.';

  return {
    formatoSugerido: formato,
    motivo,
    identificadoPorTermo
  };
}

/**
 * Gera as assinaturas padrão no modelo oficial do Estado de Goiás
 */
export function gerarAssinaturasOficiaisPadrao(
  regentTeacher?: string,
  supportTeacher?: string,
  coordinatorName?: string,
  principalName?: string
): PeiAssinaturasOficiais {
  const hoje = new Date();
  const meses = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];
  const dia = String(hoje.getDate()).padStart(2, '0');
  const mes = meses[hoje.getMonth()];
  const ano = hoje.getFullYear();

  return {
    professorAee: 'Professor(a) de AEE',
    coordenacaoPedagogica: coordinatorName || 'Coordenação Pedagógica',
    profissionalApoio: supportTeacher || 'Profissional de Apoio Escolar (colaborador)',
    professoresRegentes: regentTeacher || 'Professores Regentes',
    gestor: principalName || 'Gestor Escolar',
    local: 'Rio Verde - GO',
    data: `${dia} de ${mes} de ${ano}`,
  };
}

/**
 * Gera a tabela de componentes curriculares oficiais para a Área Acadêmica (Anexo 9 SEDUC-GO)
 */
export function gerarAreaAcademicaPadrao(
  grade: string,
  subject?: string,
  regentTeacher?: string,
  expectativasGerais?: string,
  conteudosGerais?: string,
  metodologiasGerais?: string,
  avaliacaoGerais?: string,
  formatoLetra?: 'bastao' | 'cursiva'
): PeiItemAreaAcademica[] {
  const professor = regentTeacher || 'Professor Regente';

  const sulfixoBastao = formatoLetra === 'bastao'
    ? ' Prescrição de AEE: Uso obrigatório de LETRA BASTÃO (Caixa Alta com fonte Lexend) e ilustrações da Matriz SEDUC-GO.'
    : '';

  const defaultDisciplinas = [
    {
      nome: 'Língua Portuguesa',
      expectativas: expectativasGerais || 'Desenvolver a leitura funcional, decodificação com apoio visual e compreensão de textos curtos e mensagens cotidianas.',
      conteudos: conteudosGerais || 'Gêneros textuais instrucionais, leitura compartilhada, ortografia contextualizada e vocabulário temático.',
      metodologias: (metodologiasGerais || 'Textos com fonte ampliada, espaçamento duplo, pistas visuais, mediação do Profissional de Apoio Escolar.') + sulfixoBastao,
      avaliacao: avaliacaoGerais || 'Avaliação processual contínua com redução da extensão de leitura, questões de múltipla escolha com apoio de imagens e tempo estendido.',
    },
    {
      nome: 'Matemática',
      expectativas: 'Compreender o sistema de numeração decimal, noções de grandeza e resolução de operações fundamentais aplicadas ao cotidiano.',
      conteudos: 'Números e operações, sistema monetário brasileiro, noções de tempo, espaço e medidas concretas.',
      metodologias: 'Uso de material dourado, ábaco, calculadora pedagógica, esquemas visuais coloridos e instruções sequenciadas passo a passo.' + sulfixoBastao,
      avaliacao: 'Instrumentos avaliativos práticos, com enunciados objetivos, diagramação limpa e mediação para leitura dos enunciados.',
    },
    {
      nome: 'Ciências',
      expectativas: 'Identificar relações ecológicas básicas, cuidados com o corpo e saúde e fenômenos da natureza por meio de observação dirigida.',
      conteudos: 'Seres vivos, meio ambiente, sustentabilidade e hábitos de vida saudável.',
      metodologias: 'Aulas práticas, vídeos curtos com legendas, mapas conceituais ilustrados e recursos multissensoriais.' + sulfixoBastao,
      avaliacao: 'Registro em portfólio pedagógico, participação em atividades práticas e questionários ilustrados com redução de alternativas.',
    },
    {
      nome: 'História',
      expectativas: 'Reconhecer marcos temporais, história pessoal, familiar e da comunidade escolar com respeito à diversidade cultural.',
      conteudos: 'Passado e presente, patrimônio cultural, comunidade e cidadania.',
      metodologias: 'Linhas do tempo com fotografias, contação mediada de histórias e atividades com organizadores visuais.' + sulfixoBastao,
      avaliacao: 'Atividades adaptadas de correspondência iconográfica, autoavaliação mediada e observação contínua.',
    },
    {
      nome: 'Geografia',
      expectativas: 'Reconhecer o espaço vivido, noções de paisagem local, elementos geográficos de Goiás e Rio Verde.',
      conteudos: 'Lugar e paisagem, orientação espacial básica, mapas simplificados e representações espaciais.',
      metodologias: 'Uso de maquetes, imagens de satélite simplificadas, desenhos esquemáticos e mediação direta.' + sulfixoBastao,
      avaliacao: 'Desenhos explicativos, identificação de legendas visuais e testes com enunciados diretos.',
    },
  ];

  // Se o usuário selecionou um componente curricular específico que não está na lista padrão
  if (subject && !defaultDisciplinas.some(d => d.nome.toLowerCase() === subject.toLowerCase())) {
    defaultDisciplinas.unshift({
      nome: subject,
      expectativas: expectativasGerais || `Apreender os conceitos prioritários do componente ${subject} previstos no DC-GO.`,
      conteudos: conteudosGerais || `Objetos de conhecimento flexibilizados para ${subject}.`,
      metodologias: (metodologiasGerais || 'Metodologias ativas com recursos visuais e apoio do PAE.') + sulfixoBastao,
      avaliacao: avaliacaoGerais || 'Avaliação formativa processual com critérios flexibilizados.',
    });
  }

  return defaultDisciplinas.map((disc, idx) => ({
    id: `area-acad-${idx + 1}-${disc.nome.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
    componenteCurricular: disc.nome,
    expectativas: disc.expectativas,
    conteudos: disc.conteudos,
    metodologias: disc.metodologias,
    avaliacao: disc.avaliacao,
    professor: professor,
  }));
}

// =========================================================================
// VALIDAÇÃO DE COERÊNCIA SEMÂNTICA ENTRE NECESSIDADES E ESTRATÉGIAS (SEDUC-GO)
// =========================================================================

export interface InconsistenciaSemanticaPei {
  tipo: 'critico' | 'atencao';
  campo: string;
  mensagem: string;
  abaRecomendada: 'necessidades' | 'area_academica' | 'potencialidades';
  categoria: 'necessidades' | 'estrategias' | 'coerencia';
}

export interface DiagnosticoCoerenciaPei {
  inconsistencias: InconsistenciaSemanticaPei[];
  totalNecessidadesPreenchidas: number;
  totalEstrategiasPreenchidas: number;
  necessidadesCriticasVazias: boolean;
  estrategiasCriticasVazias: boolean;
  temInconsistenciaCritica: boolean;
  disciplinasSemEstrategia: string[];
}

/**
 * Validador Oficial de Coerência Semântica do PEI (SEDUC-GO / SIAP):
 * 1. Verifica se os campos de Necessidades/Dificuldades estão devidamente preenchidos.
 * 2. Verifica se os campos de Estratégias / Metodologias estão preenchidos na Área Acadêmica.
 * 3. Analisa a coerência pedagógica semântica cruzando as necessidades apontadas
 *    com as metodologias e recursos cadastrados.
 */
export function validarCoerenciaSemanticaPei(
  necessidadesDificuldades: PeiSecaoAspectos,
  areaAcademica: PeiItemAreaAcademica[]
): DiagnosticoCoerenciaPei {
  const alertas: InconsistenciaSemanticaPei[] = [];

  const isPreenchido = (texto?: string): boolean => Boolean(texto && texto.trim().length >= 3);

  // 1. Análise dos campos de Necessidades / Dificuldades
  const necCog = necessidadesDificuldades.cognitivoPsiquico || ({} as any);
  const necAdapt = necessidadesDificuldades.comportamentoAdaptativo || ({} as any);

  const listaNecCognitivas = [
    { campo: 'Percepção', valor: necCog.percepcao },
    { campo: 'Atenção/Concentração', valor: necCog.atencaoConcentracao },
    { campo: 'Linguagem/Comunicação', valor: necCog.linguagemComunicacao },
    { campo: 'Memória/Abstração/Generalização', valor: necCog.memoriaAbstracaoGeneralizacao },
    { campo: 'Criatividade', valor: necCog.criatividade },
    { campo: 'Aspectos Psicomotores', valor: necCog.aspectosPsicomotores },
    { campo: 'Raciocínio Lógico', valor: necCog.raciocinioLogico },
  ];

  const listaNecAdaptativas = [
    { campo: 'Autocuidado', valor: necAdapt.autocuidado },
    { campo: 'Autonomia/Independência', valor: necAdapt.autonomiaIndependencia },
    { campo: 'Habilidades Sociais', valor: necAdapt.habilidadesSociais },
  ];

  const necCognitivasPreenchidas = listaNecCognitivas.filter((i) => isPreenchido(i.valor));
  const necAdaptativasPreenchidas = listaNecAdaptativas.filter((i) => isPreenchido(i.valor));
  const totalNecessidadesPreenchidas = necCognitivasPreenchidas.length + necAdaptativasPreenchidas.length;
  const necessidadesCriticasVazias = totalNecessidadesPreenchidas === 0;

  if (necessidadesCriticasVazias) {
    alertas.push({
      tipo: 'critico',
      campo: 'Necessidades/Dificuldades (Aba 3)',
      mensagem: 'A seção de Necessidades/Dificuldades está totalmente vazia. O modelo oficial do PEI (SEDUC-GO) exige o mapeamento das necessidades cognitivas e adaptativas do estudante antes da formulação das estratégias.',
      abaRecomendada: 'necessidades',
      categoria: 'necessidades',
    });
  } else if (necCognitivasPreenchidas.length === 0) {
    alertas.push({
      tipo: 'critico',
      campo: 'Aspectos Cognitivos (Aba 3)',
      mensagem: 'Nenhum aspecto cognitivo/psíquico foi preenchido em Necessidades (Atenção, Linguagem, Raciocínio, etc.). É crítico documentar as demandas cognitivas.',
      abaRecomendada: 'necessidades',
      categoria: 'necessidades',
    });
  }

  // 2. Análise dos campos de Estratégias / Metodologias (Área Acadêmica)
  const disciplinasSemEstrategia: string[] = [];
  const disciplinasComEstrategia: string[] = [];

  if (!areaAcademica || areaAcademica.length === 0) {
    alertas.push({
      tipo: 'critico',
      campo: 'Estratégias / Área Acadêmica (Aba 4)',
      mensagem: 'A tabela da Área Acadêmica está vazia. Adicione ao menos um componente curricular e preencha suas respectivas estratégias metodológicas.',
      abaRecomendada: 'area_academica',
      categoria: 'estrategias',
    });
  } else {
    areaAcademica.forEach((comp) => {
      const temEstrategia = Boolean(comp.metodologias && comp.metodologias.trim().length >= 5);
      if (!temEstrategia) {
        disciplinasSemEstrategia.push(comp.componenteCurricular || 'Componente Curricular');
        alertas.push({
          tipo: 'critico',
          campo: `Estratégia: ${comp.componenteCurricular || 'Componente'}`,
          mensagem: `O campo "Estratégias / Metodologias" do componente "${comp.componenteCurricular || 'Sem título'}" está em branco ou incompleto. Defina os recursos didáticos acessíveis.`,
          abaRecomendada: 'area_academica',
          categoria: 'estrategias',
        });
      } else {
        disciplinasComEstrategia.push(comp.componenteCurricular || 'Componente');
      }
    });
  }

  const totalEstrategiasPreenchidas = disciplinasComEstrategia.length;
  const estrategiasCriticasVazias = !areaAcademica || areaAcademica.length === 0 || totalEstrategiasPreenchidas === 0;

  // 3. Análise de Coerência Semântica Global
  if (totalNecessidadesPreenchidas > 0 && estrategiasCriticasVazias) {
    alertas.push({
      tipo: 'critico',
      campo: 'Coerência Semântica: Necessidades sem Estratégias',
      mensagem: `Foram registradas ${totalNecessidadesPreenchidas} necessidade(s) do estudante, mas nenhuma estratégia metodológica foi preenchida na Área Acadêmica para atendê-las.`,
      abaRecomendada: 'area_academica',
      categoria: 'coerencia',
    });
  }

  if (totalEstrategiasPreenchidas > 0 && necessidadesCriticasVazias) {
    alertas.push({
      tipo: 'critico',
      campo: 'Coerência Semântica: Estratégias sem Necessidades',
      mensagem: 'Foram cadastradas estratégias metodológicas na Área Acadêmica sem o prévio registro das necessidades/dificuldades do estudante.',
      abaRecomendada: 'necessidades',
      categoria: 'coerencia',
    });
  }

  // 4. Análise de Coerência Semântica Específica (Termos Pedagógicos SEDUC-GO)
  const todasEstrategias = (areaAcademica || [])
    .map((item) => `${item.metodologias || ''} ${item.expectativas || ''}`)
    .join(' ')
    .toLowerCase();

  // Atenção / Concentração
  if (isPreenchido(necCog.atencaoConcentracao)) {
    const termos = ['atenc', 'foco', 'tempo', 'pausa', 'rotina', 'visual', 'passo', 'fracion', 'apoio', 'recurso', 'organiz', 'instruç', 'ambiente'];
    if (!termos.some((t) => todasEstrategias.includes(t))) {
      alertas.push({
        tipo: 'atencao',
        campo: 'Atenção/Concentração vs Estratégias',
        mensagem: 'Identificada necessidade em "Atenção/Concentração", mas as metodologias acadêmicas não especificam recursos compensatórios (ex: pausas estruturadas, organizadores visuais ou fracionamento).',
        abaRecomendada: 'area_academica',
        categoria: 'coerencia',
      });
    }
  }

  // Linguagem / Comunicação
  if (isPreenchido(necCog.linguagemComunicacao)) {
    const termos = ['comunic', 'visual', 'pictogr', 'vocabular', 'imagem', 'leitura', 'oral', 'concreto', 'caa', 'pcas', 'apoio', 'texto', 'simplific', 'glossario', 'flexibiliz'];
    if (!termos.some((t) => todasEstrategias.includes(t))) {
      alertas.push({
        tipo: 'atencao',
        campo: 'Linguagem/Comunicação vs Estratégias',
        mensagem: 'Identificada dificuldade em "Linguagem/Comunicação", mas as estratégias da Área Acadêmica não contemplam suportes visuais, ampliação ou flexibilização de textos.',
        abaRecomendada: 'area_academica',
        categoria: 'coerencia',
      });
    }
  }

  // Raciocínio Lógico
  if (isPreenchido(necCog.raciocinioLogico)) {
    const termos = ['concreto', 'calculador', 'material', 'esquema', 'passo', 'jogos', 'pratic', 'visual', 'recurso', 'etapa', 'manipul'];
    if (!termos.some((t) => todasEstrategias.includes(t))) {
      alertas.push({
        tipo: 'atencao',
        campo: 'Raciocínio Lógico vs Recursos',
        mensagem: 'Identificada necessidade em "Raciocínio Lógico", porém falta menção a materiais concretos, recursos manipuláveis ou esquemas estruturados nas estratégias.',
        abaRecomendada: 'area_academica',
        categoria: 'coerencia',
      });
    }
  }

  // Memória / Abstração / Generalização
  if (isPreenchido(necCog.memoriaAbstracaoGeneralizacao)) {
    const termos = ['memor', 'resumo', 'pista', 'esquema', 'sintese', 'reforco', 'revisao', 'concreto', 'visual', 'mapa', 'tabela', 'fixac', 'repeti'];
    if (!termos.some((t) => todasEstrategias.includes(t))) {
      alertas.push({
        tipo: 'atencao',
        campo: 'Memória/Abstração vs Estratégias',
        mensagem: 'Identificada demanda em "Memória/Abstração", mas as metodologias não preveem pistas visuais, esquemas síntese ou recursos periódicos de fixação.',
        abaRecomendada: 'area_academica',
        categoria: 'coerencia',
      });
    }
  }

  // Aspectos Psicomotores
  if (isPreenchido(necCog.aspectosPsicomotores)) {
    const termos = ['motor', 'escrita', 'digit', 'adaptad', 'lapis', 'engrossador', 'tempo extra', 'oral', 'grafic', 'ergonom', 'folha ampliad'];
    if (!termos.some((t) => todasEstrategias.includes(t))) {
      alertas.push({
        tipo: 'atencao',
        campo: 'Psicomotricidade vs Recursos Adaptados',
        mensagem: 'Identificada necessidade em "Aspectos Psicomotores", sem especificação de instrumentos adaptados para escrita, suporte digital ou pausas motoras.',
        abaRecomendada: 'area_academica',
        categoria: 'coerencia',
      });
    }
  }

  // Habilidades Adaptativas e Suporte
  if (
    isPreenchido(necAdapt.autocuidado) ||
    isPreenchido(necAdapt.autonomiaIndependencia) ||
    isPreenchido(necAdapt.habilidadesSociais)
  ) {
    const termos = ['apoio', 'pae', 'aee', 'media', 'acompanh', 'supervis', 'parceria', 'rotina', 'social', 'grupo', 'dupla', 'autonomia', 'emocion'];
    if (!termos.some((t) => todasEstrategias.includes(t))) {
      alertas.push({
        tipo: 'atencao',
        campo: 'Habilidades Adaptativas vs Apoio Escolar',
        mensagem: 'Estudante com demandas em comportamento adaptativo/autonomia sem referência à mediação do Profissional de Apoio Escolar (PAE) nas estratégias curriculares.',
        abaRecomendada: 'area_academica',
        categoria: 'coerencia',
      });
    }
  }

  const temInconsistenciaCritica = alertas.some((i) => i.tipo === 'critico');

  return {
    inconsistencias: alertas,
    totalNecessidadesPreenchidas,
    totalEstrategiasPreenchidas,
    necessidadesCriticasVazias,
    estrategiasCriticasVazias,
    temInconsistenciaCritica,
    disciplinasSemEstrategia,
  };
}

export interface ResultadoValidacaoCamposPei {
  valido: boolean;
  necessidadesPreenchidas: boolean;
  estrategiasPreenchidas: boolean;
  detalhesPendencias: string[];
  mensagemAlertaRodape: string;
}

/**
 * Validação de campos críticos do PEI (Anexo 9 SEDUC-GO):
 * Verifica se os estados de 'Necessidades' e 'Estratégias' estão preenchidos.
 * Se vazios, acusa pendência crítica e impede a emissão do PDF.
 */
export function validarCamposPei(
  necessidadesDificuldades: PeiSecaoAspectos,
  areaAcademica: PeiItemAreaAcademica[]
): ResultadoValidacaoCamposPei {
  const isPreenchido = (texto?: string): boolean => Boolean(texto && texto.trim().length >= 3);
  const pendencias: string[] = [];

  // 1. Validação do estado de Necessidades (necessidadesDificuldades)
  const necCog = necessidadesDificuldades?.cognitivoPsiquico || ({} as any);
  const necAdapt = necessidadesDificuldades?.comportamentoAdaptativo || ({} as any);

  const temCognitivo = [
    necCog.percepcao,
    necCog.atencaoConcentracao,
    necCog.linguagemComunicacao,
    necCog.memoriaAbstracaoGeneralizacao,
    necCog.criatividade,
    necCog.aspectosPsicomotores,
    necCog.raciocinioLogico,
  ].some(isPreenchido);

  const temAdaptativo = [
    necAdapt.autocuidado,
    necAdapt.autonomiaIndependencia,
    necAdapt.habilidadesSociais,
  ].some(isPreenchido);

  const necessidadesPreenchidas = temCognitivo || temAdaptativo;
  if (!necessidadesPreenchidas) {
    pendencias.push('Necessidades/Dificuldades do Estudante (Aba 3)');
  }

  // 2. Validação do estado de Estratégias (areaAcademica e metodologias)
  const temDisciplinas = Array.isArray(areaAcademica) && areaAcademica.length > 0;
  const disciplinasComEstrategia = temDisciplinas
    ? areaAcademica.filter((item) => isPreenchido(item.metodologias))
    : [];

  const estrategiasPreenchidas =
    temDisciplinas &&
    disciplinasComEstrategia.length > 0 &&
    disciplinasComEstrategia.length === areaAcademica.length;

  if (!temDisciplinas) {
    pendencias.push('Nenhum componente curricular cadastrado na Área Acadêmica (Aba 4)');
  } else if (disciplinasComEstrategia.length === 0) {
    pendencias.push('Estratégias/Metodologias pedagógicas não preenchidas na Área Acadêmica (Aba 4)');
  } else if (disciplinasComEstrategia.length < areaAcademica.length) {
    const faltantes = areaAcademica
      .filter((i) => !isPreenchido(i.metodologias))
      .map((i) => i.componenteCurricular || 'Componente')
      .join(', ');
    pendencias.push(`Estratégias/Metodologias em branco nos componentes: ${faltantes}`);
  }

  const valido = necessidadesPreenchidas && estrategiasPreenchidas;
  const mensagemAlertaRodape = !valido
    ? `Atenção: Campos Críticos Pendentes (${pendencias.join('; ')}). Conforme orientações do Anexo 9 (SEDUC-GO), preencha as Necessidades e as Estratégias para habilitar a geração do PDF.`
    : '';

  return {
    valido,
    necessidadesPreenchidas,
    estrategiasPreenchidas,
    detalhesPendencias: pendencias,
    mensagemAlertaRodape,
  };
}

/**
 * Banco de sugestões pedagógicas especializadas para Educação Especial da SEDUC-GO (SIAP)
 * Preenche integralmente tanto as seções consolidadas quanto os 10 aspectos oficiais do modelo DOCX.
 */
function gerarSugestaoPedagogicaSeducFallback(
  studentName: string,
  diagnosis: string,
  grade: string,
  subject: string,
  period: string,
  formatoLetra?: 'bastao' | 'cursiva'
): { 
  etapa1: PeiEtapa1Siap; 
  etapa2: PeiEtapa2Siap;
  potencialidades: PeiSecaoAspectos;
  necessidadesDificuldades: PeiSecaoAspectos;
} {
  const diagLower = (diagnosis || '').toLowerCase();
  const isTea = diagLower.includes('tea') || diagLower.includes('autista') || diagLower.includes('autismo');
  const isDi = diagLower.includes('intelectual') || diagLower.includes('di');
  const ehBastao = formatoLetra === 'bastao' || isTea || isDi || diagLower.includes('bastao') || diagLower.includes('motora') || diagLower.includes('disgraf');

  let potCognitivo: PeiSecaoAspectos['cognitivoPsiquico'];
  let potAdaptativo: PeiSecaoAspectos['comportamentoAdaptativo'];
  let necCognitivo: PeiSecaoAspectos['cognitivoPsiquico'];
  let necAdaptativo: PeiSecaoAspectos['comportamentoAdaptativo'];

  let expectativas = '';
  let conteudos = '';
  let metodologias = '';
  let avaliacao = '';

  const prescricaoBastao = ehBastao
    ? ' Prescrição de Acessibilidade Pedagógica (SEDUC-GO): Uso mandatório de LETRA BASTÃO (Caixa Alta com fonte Lexend e espaçamento ampliado) para viabilizar decodificação e evitar sobrecarga cognitiva.'
    : '';

  if (isTea) {
    potCognitivo = {
      percepcao: 'Excelente percepção visual de detalhes, discriminação de formas geométricas, cores e padrões organizados.',
      atencaoConcentracao: 'Concentração sustentada prolongada em tópicos de hiperfoco ou tarefas estruturadas com pistas visuais claras.',
      linguagemComunicacao: 'Compreensão satisfatória de instruções literais e diretas; responde bem a comandos visuais e comunicação com suporte iconográfico.',
      memoriaAbstracaoGeneralizacao: 'Excelente memória visual e memorização de sequências lógicas, símbolos numéricos e rotinas familiares.',
      criatividade: 'Expressão criativa em desenhos esquemáticos, produções estruturadas e construções táteis com regras definidas.',
      aspectosPsicomotores: 'Coordenação motora ampla adequada para locomoção e atividades físicas habituais com mediação.',
      raciocinioLogico: 'Bom desempenho em seriação, classificação e resolução de problemas estruturados passo a passo.',
    };

    potAdaptativo = {
      autocuidado: 'Realiza com autonomia as rotinas de higiene básica, alimentação e organização dos pertences pessoais.',
      autonomiaIndependencia: 'Locomove-se com segurança pelos espaços conhecidos da escola e segue a rotina diária quando previsível.',
      habilidadesSociais: 'Afetivo com profissionais de referência; responde cordialmente a cumprimentos e aceita mediação individual do PAE.',
    };

    necCognitivo = {
      percepcao: 'Sobrecarga sensorial com estímulos sonoros intensos simultâneos ou iluminação excessiva.',
      atencaoConcentracao: 'Dificuldade em alternar foco em momentos de transição brusca sem aviso prévio.',
      linguagemComunicacao: 'Necessita de apoio na compreensão de linguagem figurada, metáforas, ironias e enunciados textuais extensos.',
      memoriaAbstracaoGeneralizacao: 'Necessidade de mediação concreta para generalizar conceitos abstratos para contextos novos.',
      criatividade: 'Resistência a atividades com comandos abertos ou sem delimitação explícita de passos.',
      aspectosPsicomotores: 'Coordenação motora fina requer exercícios com apoio para escrita cursiva prolongada e recorte de precisão.',
      raciocinioLogico: 'Necessita de mediação em situações-problema com múltiplos passos sem organizador gráfico.',
    };

    necAdaptativo = {
      autocuidado: 'Necessita de lembretes esporádicos para ingestão regular de água e organização da mesa ao final da aula.',
      autonomiaIndependencia: 'Insegurança em ambientes desconhecidos ou com aglomeração sem acompanhamento de referência.',
      habilidadesSociais: 'Dificuldade de iniciativa espontânea em conversações com grandes grupos e respeito a turnos de fala coletivos.',
    };

    expectativas = `Compreender os conceitos fundamentais propostos no ${period} para ${subject || 'o componente curricular'}, identificando ideias centrais por meio de esquemas visuais e exercitando a resolução guiada com mediação pedagógica.`;
    conteudos = `Conteúdos priorizados do Currículo em Movimento (DC-GO) para ${grade || 'a série'}, com ênfase na aplicação prática, vocabulário essencial e representação iconográfica/concreta dos temas estudados.`;
    metodologias = `Uso de rotina visual estruturada na carteira, organizadores gráficos, quebra de tarefas em etapas curtas e consecutivas. Mediação continuada do Profissional de Apoio Escolar e uso de recursos de Tecnologia Assistiva / Comunicação Aumentativa quando necessário.${prescricaoBastao}`;
    avaliacao = `Avaliação processual, contínua e formativa, valorizando a evolução individual do estudante. Instrumentos adaptados: enunciados com fonte ampliada (tamanho 14/16), espaçamento duplo, alternativas com imagens de apoio e possibilidade de mediação oral com transcrição assistida.`;
  } else if (isDi) {
    potCognitivo = {
      percepcao: 'Reconhece elementos visuais familiares, fotografias e símbolos do cotidiano escolar.',
      atencaoConcentracao: 'Atenção receptiva satisfatória quando as atividades contam com estímulos concretos e mediação individualizada.',
      linguagemComunicacao: 'Expressa oralmente necessidades imediatas e sentimentos; interage de forma compreensível com a comunidade escolar.',
      memoriaAbstracaoGeneralizacao: 'Retém aprendizagens quando reforçadas por repetição contextualizada e vivências cotidianas.',
      criatividade: 'Participação ativa em produções artísticas, colagens, pintura e dramatizações.',
      aspectosPsicomotores: 'Boa agilidade motora ampla em jogos corporais e dinâmicas coletivas no pátio.',
      raciocinioLogico: 'Compreende relações de causa e efeito em situações concretas e operações numéricas com apoio de material manipulável.',
    };

    potAdaptativo = {
      autocuidado: 'Executa atividades de vida diária como lavar as mãos, alimentar-se e cuidar de sua mochila.',
      autonomiaIndependencia: 'Boa disposição para realizar tarefas em sala quando os passos são demonstrados previamente.',
      habilidadesSociais: 'Muito sociável, empático e participativo com os colegas de turma e funcionários da escola.',
    };

    necCognitivo = {
      percepcao: 'Dificuldade em discriminar detalhes sutis em textos densos sem destaque tipográfico.',
      atencaoConcentracao: 'Dispersão diante de atividades puramente expositivas teóricas de longa duração.',
      linguagemComunicacao: 'Construção frasal elaborada requer mediação; ritmo diferenciado na consolidação da leitura alfabética.',
      memoriaAbstracaoGeneralizacao: 'Ritmo diferenciado na fixação de conteúdos puramente conceituais sem contextualização prática.',
      criatividade: 'Necessita de modelos iniciais como referência para iniciar produções autorais.',
      aspectosPsicomotores: 'Fadiga muscular em tarefas de escrita longa contínua.',
      raciocinioLogico: 'Necessita de material concreto (material dourado, calculadora) para operações matemáticas.',
    };

    necAdaptativo = {
      autocuidado: 'Necessita de supervisão para guardar e conferir todos os materiais escolares ao término da aula.',
      autonomiaIndependencia: 'Requer encorajamento para tomar decisões pedagógicas sem esperar autorização imediata.',
      habilidadesSociais: 'Apoio para identificar limites em situações de brincadeiras com regras complexas.',
    };

    expectativas = `Desenvolver a compreensão dos tópicos essenciais de ${subject || 'aprendizagem'}, relacionando o objeto de conhecimento a situações reais do seu cotidiano com autonomia orientada.`;
    conteudos = `Flexibilização curricular priorizando habilidades basais do componente (${subject}), com textos em formato de leitura fácil, fontes adaptadas e jogos pedagógicos.`;
    metodologias = `Abordagem multissensorial (visual, auditiva e tátil), mediação constante, repetição contextualizada, fichas de estudo ilustradas e cooperação assistida pelo profissional de apoio escolar.${prescricaoBastao}`;
    avaliacao = `Portfólio pedagógico individualizado, registros diários de evolução no Diário de Bordo e avaliações práticas estruturadas com redução da carga de leitura pesada.`;
  } else {
    potCognitivo = {
      percepcao: 'Capacidade receptiva visual e auditiva satisfatória em ambientes com poucos distratores.',
      atencaoConcentracao: 'Foco excelente em atividades de ritmo dinâmico e recursos interativos digitais.',
      linguagemComunicacao: 'Comunicação verbal clara, vocabulário amplo e boa argumentação em discussões orais.',
      memoriaAbstracaoGeneralizacao: 'Boa retenção de conteúdos quando explicados de maneira dialógica e participativa.',
      criatividade: 'Iniciativa em propor soluções criativas e ideias inovadoras para projetos em grupo.',
      aspectosPsicomotores: 'Ótima destreza corporal ampla e fina para desenho, esportes e jogos.',
      raciocinioLogico: 'Raciocínio lógico dedutivo rápido em desafios contextualizados de seu interesse.',
    };

    potAdaptativo = {
      autocuidado: 'Total autonomia em cuidados pessoais e zelo com seus pertences.',
      autonomiaIndependencia: 'Excelente independência para circular pela unidade escolar e tomar iniciativas rotineiras.',
      habilidadesSociais: 'Comunicação ativa e facilidade de entrosamento com colegas e equipe escolar.',
    };

    necCognitivo = {
      percepcao: 'Dificuldade de filtro perceptivo quando ocorrem múltiplos estímulos simultâneos na sala.',
      atencaoConcentracao: 'Oscilação da atenção sustentada em aulas estritamente teóricas ou leituras silenciosas prolongadas.',
      linguagemComunicacao: 'Tendência a interromper turnos de fala por impulsividade verbal momentânea.',
      memoriaAbstracaoGeneralizacao: 'Organização sequencial de raciocínios em redações longas requer roteiro estruturado.',
      criatividade: 'Dificuldade em concluir produções quando surge um novo foco de interesse antes da finalização.',
      aspectosPsicomotores: 'Inquietação motora leve em situações de permanência sentada prolongada.',
      raciocinioLogico: 'Necessidade de checagem para evitar erros por pressa ou descuido na revisão de cálculos.',
    };

    necAdaptativo = {
      autocuidado: 'Organização do estojo e cadernos requer orientação para evitar perda de itens.',
      autonomiaIndependencia: 'Manejo do tempo durante provas formais extensas.',
      habilidadesSociais: 'Aprimoramento da tolerância à frustração em dinâmicas competitivas.',
    };

    expectativas = `Consolidar as habilidades essenciais previstas para o ${period} em ${subject || 'sua matriz curricular'}, executando tarefas de forma progressiva e com autonomia crescente.`;
    conteudos = `Objetos de conhecimento estruturados com mapas conceituais e sínteses visuais temáticas alinhadas à Base Curricular da SEDUC-GO.`;
    metodologias = `Atividades fracionadas em blocos menores com pausas estratégicas, feedbacks frequentes, destaque em negrito para comandos-chave e acompanhamento próximo.${prescricaoBastao}`;
    avaliacao = `Instrumentos avaliativos objetivos, flexibilização de tempo de realização em sala reservada quando necessário e valorização do processo contínuo de aprendizagem.`;
  }

  // Gera versões consolidadas para etapa1 e etapa2
  const habilidadesCognitivas = `Percepção: ${potCognitivo.percepcao}\nAtenção/concentração: ${potCognitivo.atencaoConcentracao}\nLinguagem/comunicação: ${potCognitivo.linguagemComunicacao}\nMemória/abstração: ${potCognitivo.memoriaAbstracaoGeneralizacao}\nCriatividade: ${potCognitivo.criatividade}\nPsicomotricidade: ${potCognitivo.aspectosPsicomotores}\nRaciocínio lógico: ${potCognitivo.raciocinioLogico}`;
  const habilidadesAdaptativas = `Autocuidado: ${potAdaptativo.autocuidado}\nAutonomia/independência: ${potAdaptativo.autonomiaIndependencia}\nHabilidades sociais: ${potAdaptativo.habilidadesSociais}`;
  const dificuldadesCognitivas = `Percepção: ${necCognitivo.percepcao}\nAtenção/concentração: ${necCognitivo.atencaoConcentracao}\nLinguagem/comunicação: ${necCognitivo.linguagemComunicacao}\nMemória/abstração: ${necCognitivo.memoriaAbstracaoGeneralizacao}\nCriatividade: ${necCognitivo.criatividade}\nPsicomotricidade: ${necCognitivo.aspectosPsicomotores}\nRaciocínio lógico: ${necCognitivo.raciocinioLogico}`;
  const dificuldadesAdaptativas = `Autocuidado: ${necAdaptativo.autocuidado}\nAutonomia/independência: ${necAdaptativo.autonomiaIndependencia}\nHabilidades sociais: ${necAdaptativo.habilidadesSociais}`;

  return {
    etapa1: {
      habilidadesCognitivas,
      habilidadesAdaptativas,
      dificuldadesCognitivas,
      dificuldadesAdaptativas,
    },
    etapa2: {
      expectativas,
      conteudos,
      metodologias,
      avaliacao,
    },
    potencialidades: {
      cognitivoPsiquico: potCognitivo,
      comportamentoAdaptativo: potAdaptativo,
    },
    necessidadesDificuldades: {
      cognitivoPsiquico: necCognitivo,
      comportamentoAdaptativo: necAdaptativo,
    },
  };
}

/**
 * Gera proposta pedagógica para o PEI utilizando a IA do Google Gemini (@google/genai)
 * com fallback inteligente e completo para o Modelo Oficial do PEI da SEDUC-GO.
 */
export async function gerarSugestaoPeiComIa(dados: {
  identification: PeiIdentificacao;
  subject?: string;
  period?: string;
  idade?: number;
  formatoLetra?: 'bastao' | 'cursiva';
}): Promise<{ 
  etapa1: PeiEtapa1Siap; 
  etapa2: PeiEtapa2Siap;
  potencialidades: PeiSecaoAspectos;
  necessidadesDificuldades: PeiSecaoAspectos;
  areaAcademica: PeiItemAreaAcademica[];
  assinaturasOficiais: PeiAssinaturasOficiais;
  origemIa: boolean;
  formatoLetra: 'bastao' | 'cursiva';
}> {
  const { identification, subject = 'Geral / Língua Portuguesa e Matemática', period = '1º Bimestre' } = dados;

  // Determina o formato de letra com detecção por termos do laudo/CID ou override manual
  const formatoLetraFinal = determinarFormatoLetraPorLaudo(
    identification.diagnosis,
    dados.formatoLetra || identification.formatoLetra
  );
  identification.formatoLetra = formatoLetraFinal;

  // Fallback padrão robusto alinhado ao formato de letra
  const fallback = gerarSugestaoPedagogicaSeducFallback(
    identification.studentName,
    identification.diagnosis,
    identification.grade,
    subject,
    period,
    formatoLetraFinal
  );
  const assinaturasPadrao = gerarAssinaturasOficiaisPadrao(
    identification.professoresRegentes,
    identification.profissionalApoio
  );
  const areaAcademicaPadrao = gerarAreaAcademicaPadrao(
    identification.grade,
    subject,
    identification.professoresRegentes,
    fallback.etapa2.expectativas,
    fallback.etapa2.conteudos,
    fallback.etapa2.metodologias,
    fallback.etapa2.avaliacao,
    formatoLetraFinal
  );

  const apiKey = (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY) ||
    '';

  const prompt = `Você é o especialista pedagógico oficial da Gerência de Educação Especial da SEDUC-GO (Colégio Estadual Olynto Pereira de Castro, CRE Rio Verde - GO).
Preencha a proposta pedagógica oficial do Plano Educacional Individualizado (PEI) para:
- Estudante: ${identification.studentName}
- Ano/Série: ${identification.grade} (${identification.classRoom})
- Diagnóstico: ${identification.diagnosis || 'Deficiência / TEA'}
- Formato de Letra Obrigatório: ${formatoLetraFinal === 'bastao' ? 'LETRA BASTÃO (Caixa Alta / Lexend)' : 'Letra Cursiva'}
- Componente: ${subject}
- Período: ${period}

Diretriz de Acessibilidade: ${
  formatoLetraFinal === 'bastao' 
    ? 'Registre expressamente no campo metodologias a utilização mandante de LETRA BASTÃO (Caixa Alta com fonte Lexend e espaçamento ampliado) e ilustrações da matriz curricular.'
    : 'Registre metodologias diversificadas com apoio visual e mediação do PAE.'
}

Retorne estritamente um JSON válido com esta estrutura exata:
{
  "habilidadesCognitivas": "resumo aspectos cognitivos potenciais",
  "habilidadesAdaptativas": "resumo habilidades adaptativas potenciais",
  "dificuldadesCognitivas": "resumo necessidades cognitivas",
  "dificuldadesAdaptativas": "resumo necessidades adaptativas",
  "expectativas": "expectativas prioritárias DC-GO",
  "conteudos": "conteúdos flexibilizados",
  "metodologias": "metodologias acessíveis com prescrição de formato de letra e apoio PAE",
  "avaliacao": "avaliação processual formativa"
}`;

  try {
    const aiPromise = (async () => {
      const ai = new GoogleGenAI(apiKey ? { apiKey } : {});
      return await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: { 
          responseMimeType: 'application/json',
          temperature: 0.3,
        },
      });
    })();

    let timer: any = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('AI request timeout')), 3500);
    });

    let response: any;
    try {
      response = await Promise.race([aiPromise, timeoutPromise]);
    } finally {
      if (timer) clearTimeout(timer);
    }

    const rawText = response.text || '{}';
    const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    if (parsed.habilidadesCognitivas && parsed.expectativas) {
      const etapa1Result: PeiEtapa1Siap = {
        habilidadesCognitivas: parsed.habilidadesCognitivas || fallback.etapa1.habilidadesCognitivas,
        habilidadesAdaptativas: parsed.habilidadesAdaptativas || fallback.etapa1.habilidadesAdaptativas,
        dificuldadesCognitivas: parsed.dificuldadesCognitivas || fallback.etapa1.dificuldadesCognitivas,
        dificuldadesAdaptativas: parsed.dificuldadesAdaptativas || fallback.etapa1.dificuldadesAdaptativas,
      };

      let metodologiasIa = parsed.metodologias || fallback.etapa2.metodologias;
      if (formatoLetraFinal === 'bastao' && !metodologiasIa.toLowerCase().includes('bast') && !metodologiasIa.toLowerCase().includes('caixa alta')) {
        metodologiasIa += ' Prescrição de Acessibilidade Pedagógica (SEDUC-GO): Uso mandatório de LETRA BASTÃO (Caixa Alta com fonte Lexend e espaçamento ampliado).';
      }

      const etapa2Result: PeiEtapa2Siap = {
        expectativas: parsed.expectativas || fallback.etapa2.expectativas,
        conteudos: parsed.conteudos || fallback.etapa2.conteudos,
        metodologias: metodologiasIa,
        avaliacao: parsed.avaliacao || fallback.etapa2.avaliacao,
      };

      const areaAtualizada = gerarAreaAcademicaPadrao(
        identification.grade,
        subject,
        identification.professoresRegentes,
        etapa2Result.expectativas,
        etapa2Result.conteudos,
        etapa2Result.metodologias,
        etapa2Result.avaliacao,
        formatoLetraFinal
      );

      return {
        etapa1: etapa1Result,
        etapa2: etapa2Result,
        potencialidades: fallback.potencialidades,
        necessidadesDificuldades: fallback.necessidadesDificuldades,
        areaAcademica: areaAtualizada,
        assinaturasOficiais: assinaturasPadrao,
        origemIa: true,
        formatoLetra: formatoLetraFinal,
      };
    }
  } catch (error) {
    console.warn('[PeiService] Fallback pedagógico oficial SEDUC-GO aplicado:', error);
  }

  return {
    ...fallback,
    areaAcademica: areaAcademicaPadrao,
    assinaturasOficiais: assinaturasPadrao,
    origemIa: false,
    formatoLetra: formatoLetraFinal,
  };
}

let memoryPeiStore: PeiDocumento[] = [];

function getStorageItem(key: string): string | null {
  if (typeof localStorage !== 'undefined') {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  return JSON.stringify(memoryPeiStore);
}

function setStorageItem(key: string, value: string): void {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(key, value);
      return;
    } catch {}
  }
  try {
    memoryPeiStore = JSON.parse(value);
  } catch {}
}

function gerarPeisIniciaisPadrao(): PeiDocumento[] {
  const agora = new Date().toISOString();
  return [
    {
      id: 'pei-inicial-wislla',
      studentId: 'std-pdf-1',
      studentName: 'Wislla Silva Marques',
      grade: '8º Ano',
      classRoom: '8º B',
      diagnosis: 'TEA nível 2 + DI - Deficiência Intelectual',
      subject: 'Língua Portuguesa',
      period: '1º Bimestre',
      regentTeacher: 'Professores Regentes do 8º Ano',
      supportTeacher: 'Eliane Dourado da Silva Vaz',
      coordinatorName: 'Coordenação Pedagógica',
      principalName: 'Diretoria Escolar',
      identification: {
        cre: 'CRE - Rio Verde',
        municipio: 'Rio Verde',
        unidadeEscolar: 'Colégio Estadual Olynto Pereira de Castro',
        studentId: 'std-pdf-1',
        studentName: 'Wislla Silva Marques',
        matricula: '2026-8B-001',
        grade: '8º Ano',
        classRoom: '8º B',
        turno: 'Matutino',
        diagnosis: 'TEA nível 2 + DI - Deficiência Intelectual',
        professoresRegentes: 'Professores Regentes do 8º Ano',
        profissionalApoio: 'Eliane Dourado da Silva Vaz'
      },
      etapa1: {
        habilidadesCognitivas: 'Compreensão de instruções visuais e enunciados curtos com suporte iconográfico.',
        habilidadesAdaptativas: 'Boa socialização com suporte da PAE e rotina estruturada em sala.',
        dificuldadesCognitivas: 'Hipersensibilidade auditiva, abstração de conceitos complexos e leitura autônoma longa.',
        dificuldadesAdaptativas: 'Transições bruscas de ambiente ou ruídos sonoros elevados.'
      },
      etapa2: {
        expectativas: 'Reconhecer gêneros textuais breves, localizar informações explícitas e produzir pequenas frases com apoio visual.',
        conteudos: 'Leitura e interpretação de textos curtos, pontuação básica e correspondência grafema-fonema.',
        metodologias: 'Uso de pauta ampliada, recursos multissensoriais, tempo estendido e mediação direta da PAE.',
        avaliacao: 'Formativa e processual, com registro diário de avanços e atividades adaptadas em formato A4.'
      },
      createdAt: agora,
      updatedAt: agora,
      dataValidade: new Date(Date.now() + 45 * 86400000).toISOString(),
      status: 'homologado',
      origemIa: false
    },
    {
      id: 'pei-inicial-david',
      studentId: 'std-pdf-2',
      studentName: 'David Emmanuel Queiroz Borges',
      grade: '8º Ano',
      classRoom: '8º B',
      diagnosis: 'TEA com déficit de atenção',
      subject: 'Matemática',
      period: '1º Bimestre',
      regentTeacher: 'Professores Regentes do 8º Ano',
      supportTeacher: 'Eliane Dourado da Silva Vaz',
      coordinatorName: 'Coordenação Pedagógica',
      principalName: 'Diretoria Escolar',
      identification: {
        cre: 'CRE - Rio Verde',
        municipio: 'Rio Verde',
        unidadeEscolar: 'Colégio Estadual Olynto Pereira de Castro',
        studentId: 'std-pdf-2',
        studentName: 'David Emmanuel Queiroz Borges',
        matricula: '2026-8B-002',
        grade: '8º Ano',
        classRoom: '8º B',
        turno: 'Matutino',
        diagnosis: 'TEA com déficit de atenção',
        professoresRegentes: 'Professores Regentes do 8º Ano',
        profissionalApoio: 'Eliane Dourado da Silva Vaz'
      },
      etapa1: {
        habilidadesCognitivas: 'Raciocínio lógico-concreto desenvolvido para operações fundamentais.',
        habilidadesAdaptativas: 'Participativo nas aulas quando estimulado com desafios gamificados.',
        dificuldadesCognitivas: 'Manutenção de foco em instruções orais longas e problemas com múltiplos passos.',
        dificuldadesAdaptativas: 'Inquietação motora e necessidade de pausas ativas regulares.'
      },
      etapa2: {
        expectativas: 'Resolver cálculos de quatro operações com suporte visual e tabelas de apoio.',
        conteudos: 'Números racionais, porcentagem simples e geometria básica.',
        metodologias: 'Fragmentação de tarefas em passos sequenciais, uso de calculadora pedagógica e material dourado.',
        avaliacao: 'Verificação contínua através de produções práticas e autoavaliação mediada.'
      },
      createdAt: agora,
      updatedAt: agora,
      dataValidade: new Date(Date.now() + 6 * 86400000).toISOString(),
      status: 'homologado',
      origemIa: false
    },
    {
      id: 'pei-inicial-miguel',
      studentId: 'std-pdf-5',
      studentName: 'Miguel Gonçalves Santos',
      grade: '8º Ano',
      classRoom: '8º A',
      diagnosis: 'DI- Deficiência Intelectual com agitação + TDAH',
      subject: 'Ciências da Natureza',
      period: '1º Bimestre',
      regentTeacher: 'Professores Regentes do 8º Ano',
      supportTeacher: 'Eliane Dourado da Silva Vaz',
      coordinatorName: 'Coordenação Pedagógica',
      principalName: 'Diretoria Escolar',
      identification: {
        cre: 'CRE - Rio Verde',
        municipio: 'Rio Verde',
        unidadeEscolar: 'Colégio Estadual Olynto Pereira de Castro',
        studentId: 'std-pdf-5',
        studentName: 'Miguel Gonçalves Santos',
        matricula: '2026-8A-005',
        grade: '8º Ano',
        classRoom: '8º A',
        turno: 'Matutino',
        diagnosis: 'DI- Deficiência Intelectual + TDAH',
        professoresRegentes: 'Professores Regentes do 8º Ano',
        profissionalApoio: 'Eliane Dourado da Silva Vaz'
      },
      etapa1: {
        habilidadesCognitivas: 'Interesse por experimentos práticos e temas ligados ao meio ambiente.',
        habilidadesAdaptativas: 'Comunicação verbal espontânea.',
        dificuldadesCognitivas: 'Retenção de terminologias científicas complexas.',
        dificuldadesAdaptativas: 'Tempo de atenção reduzido em aulas puramente teóricas.'
      },
      etapa2: {
        expectativas: 'Identificar sistemas do corpo humano e hábitos saudáveis de vida.',
        conteudos: 'Nutrição, sistema circulatório e preservação ambiental.',
        metodologias: 'Esquemas ilustrados, infográficos coloridos e maquetes conceituais.',
        avaliacao: 'Acompanhamento processual com valorização do engajamento experimental.'
      },
      createdAt: agora,
      updatedAt: agora,
      dataValidade: new Date(Date.now() - 3 * 86400000).toISOString(),
      status: 'homologado',
      origemIa: false
    },
    {
      id: 'pei-inicial-alexandre',
      studentId: 'std-pdf-87',
      studentName: 'Alexandre da Silva Camargo',
      grade: '2º Ano (E.M.)',
      classRoom: '2º E',
      diagnosis: 'TDAH + Epilepsia',
      subject: 'Biologia',
      period: '1º Bimestre',
      regentTeacher: 'Professores do Ensino Médio',
      supportTeacher: 'Tais Lima Chaves',
      coordinatorName: 'Coordenação Pedagógica',
      principalName: 'Diretoria Escolar',
      identification: {
        cre: 'CRE - Rio Verde',
        municipio: 'Rio Verde',
        unidadeEscolar: 'Colégio Estadual Olynto Pereira de Castro',
        studentId: 'std-pdf-87',
        studentName: 'Alexandre da Silva Camargo',
        matricula: '2026-2E-087',
        grade: '2º Ano (E.M.)',
        classRoom: '2º E',
        turno: 'Vespertino',
        diagnosis: 'TDAH + Epilepsia',
        professoresRegentes: 'Professores do Ensino Médio',
        profissionalApoio: 'Tais Lima Chaves'
      },
      etapa1: {
        habilidadesCognitivas: 'Bom raciocínio dedutivo e capacidade de expressão textual quando calmo.',
        habilidadesAdaptativas: 'Autonomia para deslocamento e respeito aos combinados escolares.',
        dificuldadesCognitivas: 'Sobrecarga cognitiva sob pressão de tempo para resolução de provas.',
        dificuldadesAdaptativas: 'Sensibilidade a oscilações de luminosidade e estresse acentuado.'
      },
      etapa2: {
        expectativas: 'Compreender conceitos de genética e transmissão hereditária com auxílio de árvores genealógicas simplificadas.',
        conteudos: 'Leis mendelianas básicas, células e biodiversidade do Cerrado goiano.',
        metodologias: 'Mapas conceituais impressos com fonte legível, tempo extra em avaliações e suporte da PAE.',
        avaliacao: 'Instrumentos diversificados, portfólio de atividades e acompanhamento contínuo.'
      },
      createdAt: agora,
      updatedAt: agora,
      dataValidade: new Date(Date.now() + 11 * 86400000).toISOString(),
      status: 'homologado',
      origemIa: false
    }
  ];
}

/**
 * Obtém todos os PEIs armazenados no sistema
 */
export async function obterTodosPeis(): Promise<PeiDocumento[]> {
  try {
    const raw = getStorageItem(PEI_STORAGE_KEY);
    if (!raw) {
      const peisPadrao = gerarPeisIniciaisPadrao();
      try {
        setStorageItem(PEI_STORAGE_KEY, JSON.stringify(peisPadrao));
      } catch {}
      return peisPadrao;
    }
    const list: PeiDocumento[] = JSON.parse(raw);
    if (!Array.isArray(list) || list.length === 0) {
      const peisPadrao = gerarPeisIniciaisPadrao();
      try {
        setStorageItem(PEI_STORAGE_KEY, JSON.stringify(peisPadrao));
      } catch {}
      return peisPadrao;
    }
    return list;
  } catch (e) {
    console.error('Erro ao ler PEIs do armazenamento:', e);
    return gerarPeisIniciaisPadrao();
  }
}

/**
 * Obtém PEIs vinculados a um estudante específico
 */
export async function obterPeisDoEstudante(studentId: string): Promise<PeiDocumento[]> {
  const todos = await obterTodosPeis();
  return todos.filter(p => p.studentId === studentId);
}

/**
 * Salva ou atualiza um PEI no armazenamento do sistema
 */
export async function salvarPeiDocumento(pei: PeiDocumento): Promise<PeiDocumento> {
  const todos = await obterTodosPeis();
  const index = todos.findIndex(p => p.id === pei.id);
  
  let atualizados: PeiDocumento[];
  if (index >= 0) {
    atualizados = [...todos];
    atualizados[index] = { ...pei, updatedAt: new Date().toISOString() };
  } else {
    atualizados = [{ ...pei, createdAt: pei.createdAt || new Date().toISOString() }, ...todos];
  }

  try {
    setStorageItem(PEI_STORAGE_KEY, JSON.stringify(atualizados));
  } catch (e) {
    console.warn('Erro ao salvar PEI no armazenamento:', e);
  }

  // Dispara evento global para que outros componentes atualizem suas listagens
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('adaptaedu:pei_atualizado', { detail: pei }));
  }

  return pei;
}

/**
 * Exclui um PEI cadastrado
 */
export async function excluirPeiDocumento(peiId: string): Promise<void> {
  const todos = await obterTodosPeis();
  const filtrados = todos.filter(p => p.id !== peiId);
  try {
    setStorageItem(PEI_STORAGE_KEY, JSON.stringify(filtrados));
  } catch (e) {
    console.warn('Erro ao excluir PEI do armazenamento:', e);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('adaptaedu:pei_excluido', { detail: { id: peiId } }));
  }
}

/**
 * Serviço de geração de atividades adaptadas baseado no PEI e no laudo do estudante.
 * Aplica o parâmetro formatoLetra ('bastao' ou 'cursiva') baseado nas preferências do laudo
 * e garante que todas as atividades geradas utilizem fontes legíveis e 'bastao' quando
 * o sistema identificar a necessidade pedagógica.
 */
export function gerarAtividadeAdaptadaPei(
  params: ParametrosGeracaoAtividade & { formatoLetra?: 'bastao' | 'cursiva' }
): AtividadeAdaptada {
  const formatoEfetivo = params.formatoLetra || determinarFormatoLetraPorLaudo(params.estudante);
  
  const paramsCompletos: ParametrosGeracaoAtividade = {
    ...params,
    formatoLetra: formatoEfetivo,
    usarCaixaAlta: formatoEfetivo === 'bastao' ? true : Boolean(params.usarCaixaAlta),
    tipoLetra: formatoEfetivo === 'bastao' ? 'forma' : (params.tipoLetra || 'cursiva'),
    estiloTipograficoVisual: params.estiloTipograficoVisual === 'so_desenhos'
      ? 'so_desenhos'
      : (formatoEfetivo === 'bastao' ? 'letra_bastao' : (params.estiloTipograficoVisual || 'letra_cursiva'))
  };

  return gerarAtividadeEstruturada(paramsCompletos);
}

/**
 * Alias de conveniência para gerarAtividadeAdaptadaPei
 */
export const gerarAtividadePei = gerarAtividadeAdaptadaPei;

