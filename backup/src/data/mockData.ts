import { EscolaConfig, PerfilPedagogico, AtividadeAdaptada, RegistroAcompanhamentoApoio } from '../types';
import { gerarEstudantesOficiaisDoPdf } from './pdfEstudantesData';

export const ESCOLA_CONFIG_INICIAL: EscolaConfig = {
  nome: 'Colégio Estadual Olynto Pereira de Castro',
  subtitulo: 'Centro de Apoio Pedagógico e Atendimento Educacional Especializado (AEE)',
  endereco: 'Goiás - GO',
  municipio: 'SEDUC Goiás',
  emailInstitucional: 'colegio.olynto@educa.go.gov.br',
  telefone: '(64) 3620-0000',
  textoRodape: 'Colégio Estadual Olynto Pereira de Castro • Sistema de Inclusão e Atendimento Pedagógico Especializado 2026',
  logoUrl: '',
  corPrincipal: '#15803d',
  corSecundaria: '#0284c7',
  corDestaque: '#f59e0b',
  permitirAcessoEmailSenha: false,
};

// Relação Oficial de Estudantes e Salas Extraída do Documento PDF Oficial da Escola
export const ESTUDANTES_INICIAIS = gerarEstudantesOficiaisDoPdf();
// Perfis Pedagógicos Iniciais Aprovados pela Coordenação para Alunos Oficiais do PDF
export const PERFIS_PEDAGOGICOS_INICIAIS: PerfilPedagogico[] = [
  {
    id: 'perfil-wislla-8b',
    estudanteId: 'std-pdf-1',
    estudanteNome: 'Wislla Silva Marques',
    nivelLeitura: 'Leitura silábica com necessidade de mediação e frases curtas',
    nivelEscrita: 'Escrita em desenvolvimento, responde melhor com marcação direta',
    conhecimentosMatematicos: 'Reconhece numerais até 50; operações com material concreto',
    habilidadesConsolidadas: 'Identificação de figuras, correspondência biunívoca, seguimento de rotinas visuais',
    habilidadesEmDesenvolvimento: 'Interpretação textual inferencial, cálculos com reagrupamento',
    barreirasPedagogicas: 'Sobrecarga sensorial com excesso de texto e hipersensibilidade auditiva',
    estrategiasRecomendadas: 'Instruções curtas, apoio por ícones e figuras, redução de alternativas para 3 ou 4 opções',
    recursosAcessibilidade: 'Linguagem simplificada, fonte sem serifa ampliada, espaçamento duplo',
    adaptacoesAvaliativas: 'Tempo estendido (+20 min), leitura compartilhada pelo profissional de apoio',
    extensaoEnunciados: 'Curto',
    quantidadeAlternativas: 3,
    necessidadeApoioVisual: true,
    necessidadeInstrucoesCurtas: true,
    tempoAdicionalAutorizado: '20 minutos',
    observacoesPedagogicas: 'Apresenta excelente resposta com esquemas visuais e diagramas ilustrados.',
    status: 'aprovado',
    dataCadastro: '2026-08-10T10:00:00.000Z',
  },
  {
    id: 'perfil-david-8b',
    estudanteId: 'std-pdf-2',
    estudanteNome: 'David Emmanuel Queiroz Borges',
    nivelLeitura: 'Leitura fluente para textos curtos; dispersão em enunciados longos',
    nivelEscrita: 'Produção textual objetiva',
    conhecimentosMatematicos: 'Domínio das 4 operações básicas',
    habilidadesConsolidadas: 'Atenção visual a elementos destacados e esquemas organizados',
    habilidadesEmDesenvolvimento: 'Manutenção da atenção sustentada em atividades com mais de 3 itens',
    barreirasPedagogicas: 'Fadiga cognitiva rápida diante de blocos maciços de texto',
    estrategiasRecomendadas: 'Segmentação das etapas de resolução em passos ordenados',
    recursosAcessibilidade: 'Destaque em negrito para comandos principais',
    adaptacoesAvaliativas: 'Pausas programadas durante a realização',
    extensaoEnunciados: 'Curto',
    quantidadeAlternativas: 4,
    necessidadeApoioVisual: true,
    necessidadeInstrucoesCurtas: true,
    tempoAdicionalAutorizado: '15 minutos',
    observacoesPedagogicas: 'Estimular respostas com frases afirmativas e opções claras.',
    status: 'aprovado',
    dataCadastro: '2026-08-11T14:30:00.000Z',
  },
  {
    id: 'perfil-aysha-8b',
    estudanteId: 'std-pdf-3',
    estudanteNome: 'Aysha Júlia Neves Paiva',
    nivelLeitura: 'Leitura em consolidação; decodificação funcional',
    nivelEscrita: 'Respostas curtas guiadas',
    conhecimentosMatematicos: 'Cálculo mental com suporte visual',
    habilidadesConsolidadas: 'Associação de colunas, ordenação cronológica com apoio imagético',
    habilidadesEmDesenvolvimento: 'Compreensão de problemas matemáticos contextualizados',
    barreirasPedagogicas: 'Insegurança na interpretação de múltiplos comandos simultâneos',
    estrategiasRecomendadas: 'Um comando por questão, uso de caixas de destaque para dicas',
    recursosAcessibilidade: 'Ícones pedagógicos, diagramação arejada',
    adaptacoesAvaliativas: 'Feedback imediato e mediação pedagógica',
    extensaoEnunciados: 'Curto',
    quantidadeAlternativas: 3,
    necessidadeApoioVisual: true,
    necessidadeInstrucoesCurtas: true,
    tempoAdicionalAutorizado: '15 minutos',
    observacoesPedagogicas: 'Progresso constante no raciocínio lógico.',
    status: 'aprovado',
    dataCadastro: '2026-08-12T09:15:00.000Z',
  }
];

// Atividades Adaptadas Iniciais para o Dashboard do Professor
export const ATIVIDADES_INICIAIS: AtividadeAdaptada[] = [
  {
    id: 'ativ-wislla-lp-01',
    estudanteId: 'std-pdf-1',
    estudanteNome: 'Wislla Silva Marques',
    turma: '8º B',
    professorId: 'prof-default',
    professorNome: 'Equipe Pedagógica / Professor Regente',
    disciplina: 'Língua Portuguesa',
    conteudo: 'Leitura e Interpretação: Gênero Fábula (A Raposa e as Uvas)',
    habilidadeCodigo: 'EF67LP28',
    habilidadeDescricao: 'Ler e compreender fábulas, parábolas e contos, identificando a moral da história e o conflito central.',
    quantidadeQuestoes: 3,
    tipoQuestoes: 'multipla_escolha',
    observacaoProfessor: 'Atividade adaptada com enunciados enxutos, apoio imagético e 3 alternativas por questão.',
    dataCriacao: '2026-09-28T09:30:00.000Z',
    status: 'Revisada',
    alinhadaAoPei: true,
    peiAlinhamentoDetalhes: 'Alinhada às diretrizes do PEI: suporte visual ilustrado e enunciados diretos.',
    peiAlinhadoEm: '2026-09-28T10:00:00.000Z',
    peiAlinhadoPor: 'Professor Regente',
    questoes: [
      {
        id: 'q-wislla-1',
        numero: 1,
        tipo: 'multipla_escolha',
        enunciado: 'Leia o texto com atenção:\n\n"Uma raposa faminta viu cachos de uvas maduras no alto de uma videira. Ela pulou várias vezes, mas não conseguiu alcançar. Desanimada, disse: \'Essas uvas estão verdes mesmo!\' e foi embora."\n\nQual animal é a personagem principal desta fábula?',
        alternativas: [
          'A) Uma raposa faminta.',
          'B) Um passarinho cantador.',
          'C) Um peixinho dourado.'
        ]
      },
      {
        id: 'q-wislla-2',
        numero: 2,
        tipo: 'multipla_escolha',
        enunciado: 'Por que a raposa não comeu as uvas?',
        alternativas: [
          'A) Porque ela não conseguiu alcançá-las.',
          'B) Porque ela não gostava de frutas doces.',
          'C) Porque outro bicho comeu todas antes.'
        ]
      },
      {
        id: 'q-wislla-3',
        numero: 3,
        tipo: 'multipla_escolha',
        enunciado: 'Qual ensinamento (moral) a atitude da raposa nos mostra?',
        alternativas: [
          'A) É comum inventar desculpas quando não conseguimos o que queremos.',
          'B) É sempre bom desistir na primeira tentativa.',
          'C) As frutas da floresta nunca devem ser comidas.'
        ]
      }
    ]
  },
  {
    id: 'ativ-david-ci-01',
    estudanteId: 'std-pdf-2',
    estudanteNome: 'David Emmanuel Queiroz Borges',
    turma: '8º B',
    professorId: 'prof-default',
    professorNome: 'Equipe Pedagógica / Professor Regente',
    disciplina: 'Ciências',
    conteudo: 'Ecossistemas: Cadeia Alimentar e Níveis Tróficos',
    habilidadeCodigo: 'EF07CI07',
    habilidadeDescricao: 'Caracterizar os principais ecossistemas e reconhecer os papéis de produtores, consumidores e decompositores.',
    quantidadeQuestoes: 3,
    tipoQuestoes: 'multipla_escolha',
    observacaoProfessor: 'Uso de esquema visual de setas demonstrando o fluxo de energia.',
    dataCriacao: '2026-09-29T14:15:00.000Z',
    status: 'Revisada',
    alinhadaAoPei: true,
    peiAlinhamentoDetalhes: 'Alinhada às diretrizes do PEI: esquema de setas para fluxo trófico e 4 alternativas.',
    peiAlinhadoEm: '2026-09-29T14:30:00.000Z',
    peiAlinhadoPor: 'Professor Regente',
    questoes: [
      {
        id: 'q-david-1',
        numero: 1,
        tipo: 'multipla_escolha',
        enunciado: 'Em uma cadeia alimentar na natureza, os vegetais (como o capim e as árvores) produzem seu próprio alimento através da luz do Sol.\n\nComo esses seres vivos são chamados?',
        alternativas: [
          'A) Produtores.',
          'B) Consumidores secundários.',
          'C) Decompositores subterrâneos.',
          'D) Predadores carnívoros.'
        ]
      },
      {
        id: 'q-david-2',
        numero: 2,
        tipo: 'multipla_escolha',
        enunciado: 'Observe a sequência:\n\nCapim  ➔  Gafanhoto  ➔  Sapo  ➔  Cobra\n\nNesta cadeia alimentar, quem serve de alimento para o sapo?',
        alternativas: [
          'A) O gafanhoto.',
          'B) A cobra.',
          'C) O capim.',
          'D) A árvore.'
        ]
      },
      {
        id: 'q-david-3',
        numero: 3,
        tipo: 'multipla_escolha',
        enunciado: 'Qual é o papel fundamental dos fungos e bactérias (decompositores) em nosso ecossistema?',
        alternativas: [
          'A) Reciclar a matéria orgânica dos seres mortos devolvendo nutrientes ao solo.',
          'B) Impedir que as plantas recebam a luz do sol.',
          'C) Caçar animais de grande porte na floresta.',
          'D) Produzir oxigênio durante a noite.'
        ]
      }
    ]
  },
  {
    id: 'ativ-aysha-mat-01',
    estudanteId: 'std-pdf-3',
    estudanteNome: 'Aysha Júlia Neves Paiva',
    turma: '8º B',
    professorId: 'prof-default',
    professorNome: 'Equipe Pedagógica / Professor Regente',
    disciplina: 'Matemática',
    conteudo: 'Operações Fundamentais e Resolução de Problemas do Cotidiano',
    habilidadeCodigo: 'EF08MA01',
    habilidadeDescricao: 'Efetuar cálculos com números inteiros e resolver situações-problema envolvendo adição e multiplicação contextualizadas.',
    quantidadeQuestoes: 3,
    tipoQuestoes: 'multipla_escolha',
    observacaoProfessor: 'Instruções diretas com números ilustrados para facilitar o cálculo.',
    dataCriacao: '2026-09-30T10:45:00.000Z',
    status: 'Gerada',
    questoes: [
      {
        id: 'q-aysha-1',
        numero: 1,
        tipo: 'multipla_escolha',
        enunciado: 'Na biblioteca da escola, havia 3 caixas de livros para organizar. Cada caixa continha 5 livros ilustrados.\n\nQuantos livros havia ao todo para organizar?',
        alternativas: [
          'A) 15 livros (pois 3 x 5 = 15).',
          'B) 8 livros (pois 3 + 5 = 8).',
          'C) 12 livros.'
        ]
      },
      {
        id: 'q-aysha-2',
        numero: 2,
        tipo: 'multipla_escolha',
        enunciado: 'Uma turma do 8º Ano arrecadou 20 cadernos na gincana solidária. Os alunos doaram 6 cadernos para outra sala.\n\nCom quantos cadernos a turma ficou?',
        alternativas: [
          'A) 14 cadernos (pois 20 - 6 = 14).',
          'B) 26 cadernos.',
          'C) 10 cadernos.'
        ]
      },
      {
        id: 'q-aysha-3',
        numero: 3,
        tipo: 'multipla_escolha',
        enunciado: 'Se você comprar 2 lápis de R$ 3,00 cada um, quanto você irá gastar no total?',
        alternativas: [
          'A) R$ 6,00.',
          'B) R$ 5,00.',
          'C) R$ 3,00.'
        ]
      }
    ]
  },
  {
    id: 'ativ-miguel-his-01',
    estudanteId: 'std-pdf-5',
    estudanteNome: 'Miguel Gonçalves Santos',
    turma: '8º A',
    professorId: 'prof-default',
    professorNome: 'Equipe Pedagógica / Professor Regente',
    disciplina: 'História',
    conteudo: 'Cidadania e Participação na Grécia Antiga',
    habilidadeCodigo: 'EF06HI09',
    habilidadeDescricao: 'Identificar os conceitos de cidadania, política e democracia na pólis grega.',
    quantidadeQuestoes: 2,
    tipoQuestoes: 'multipla_escolha',
    observacaoProfessor: 'Vocabulário adaptado e conceitos centrais demarcados em negrito.',
    dataCriacao: '2026-10-01T08:20:00.000Z',
    status: 'Revisada',
    questoes: [
      {
        id: 'q-miguel-1',
        numero: 1,
        tipo: 'multipla_escolha',
        enunciado: 'Na cidade grega de Atenas Antiga, as decisões importantes eram debatidas em praça pública pelos cidadãos.\n\nQual sistema de governo nasceu nessa época?',
        alternativas: [
          'A) A Democracia (governo com participação dos cidadãos).',
          'B) A Monarquia Absoluta.',
          'C) A Ditadura Militar.'
        ]
      },
      {
        id: 'q-miguel-2',
        numero: 2,
        tipo: 'multipla_escolha',
        enunciado: 'Como era chamada a grande praça pública em Atenas onde os cidadãos se reuniam para conversar e votar as leis?',
        alternativas: [
          'A) Ágora.',
          'B) Coliseu.',
          'C) Pirâmide.'
        ]
      }
    ]
  }
];

export const PROFESSORES_INICIAIS = [];
export const HABILIDADES_INICIAIS = [];
export const HISTORICO_INICIAL = [];
export const DOCUMENTOS_INICIAIS = [];

// Registros Diários Iniciais de Acompanhamento do Profissional de Apoio
export const REGISTROS_APOIO_INICIAIS: RegistroAcompanhamentoApoio[] = [
  {
    id: 'reg-apoio-wislla-01',
    studentId: 'std-pdf-1',
    nomeEstudante: 'Wislla Silva Marques',
    turma: '8º B',
    data: '2026-09-28',
    diaSemana: 'Segunda-feira',
    profissionalResponsavelNome: 'Eliane Dourado da Silva Vaz',
    profissionalResponsavelEmail: 'eliane.vaz@educa.go.gov.br',
    profissionalResponsavelId: 'pae-eliane',
    presente: true,
    demonstrouIrritabilidadeOuSinais: 'Não',
    observacaoComportamental: 'Estudante participativa, interagiu bem com os colegas no início da manhã.',
    recebeuAtividadeAdaptada: 'Sim',
    disciplinasEnvolvidas: ['Língua Portuguesa'],
    conseguiuRealizarAtividade: 'Sim',
    observacaoAtividade: 'Concluiu a atividade de leitura com apoio de imagens e instruções diretas.',
    informacoesAdicionais: 'Excelente evolução na autonomia durante a realização.',
    createdAt: '2026-09-28T10:15:00.000Z',
    horario: '10:15:00',
    usuarioRegistroNome: 'Eliane Dourado da Silva Vaz',
    usuarioRegistroEmail: 'eliane.vaz@educa.go.gov.br',
  },
  {
    id: 'reg-apoio-wislla-02',
    studentId: 'std-pdf-1',
    nomeEstudante: 'Wislla Silva Marques',
    turma: '8º B',
    data: '2026-09-29',
    diaSemana: 'Terça-feira',
    profissionalResponsavelNome: 'Eliane Dourado da Silva Vaz',
    profissionalResponsavelEmail: 'eliane.vaz@educa.go.gov.br',
    profissionalResponsavelId: 'pae-eliane',
    presente: true,
    demonstrouIrritabilidadeOuSinais: 'Sim',
    observacaoComportamental: 'Apresentou agitação sensorial leve devido ao barulho na quadra; acalmou-se após pausa na sala de recursos.',
    recebeuAtividadeAdaptada: 'Sim',
    disciplinasEnvolvidas: ['Matemática'],
    conseguiuRealizarAtividade: 'Parcialmente',
    observacaoAtividade: 'Realizou 2 das 3 questões com auxílio de material concreto.',
    informacoesAdicionais: 'Acompanhamento intensificado na terceira aula.',
    createdAt: '2026-09-29T11:00:00.000Z',
    horario: '11:00:00',
    usuarioRegistroNome: 'Eliane Dourado da Silva Vaz',
    usuarioRegistroEmail: 'eliane.vaz@educa.go.gov.br',
  },
  {
    id: 'reg-apoio-david-01',
    studentId: 'std-pdf-2',
    nomeEstudante: 'David Emmanuel Queiroz Borges',
    turma: '8º B',
    data: '2026-09-28',
    diaSemana: 'Segunda-feira',
    profissionalResponsavelNome: 'Eliane Dourado da Silva Vaz',
    profissionalResponsavelEmail: 'eliane.vaz@educa.go.gov.br',
    profissionalResponsavelId: 'pae-eliane',
    presente: true,
    demonstrouIrritabilidadeOuSinais: 'Não',
    observacaoComportamental: 'Atento e focado durante as explicações.',
    recebeuAtividadeAdaptada: 'Sim',
    disciplinasEnvolvidas: ['Ciências'],
    conseguiuRealizarAtividade: 'Sim',
    observacaoAtividade: 'Trabalhou muito bem com o esquema visual de cadeia alimentar.',
    informacoesAdicionais: 'Sem intercorrências.',
    createdAt: '2026-09-28T09:40:00.000Z',
    horario: '09:40:00',
    usuarioRegistroNome: 'Eliane Dourado da Silva Vaz',
    usuarioRegistroEmail: 'eliane.vaz@educa.go.gov.br',
  },
  {
    id: 'reg-apoio-david-02',
    studentId: 'std-pdf-2',
    nomeEstudante: 'David Emmanuel Queiroz Borges',
    turma: '8º B',
    data: '2026-09-30',
    diaSemana: 'Quarta-feira',
    profissionalResponsavelNome: 'Eliane Dourado da Silva Vaz',
    profissionalResponsavelEmail: 'eliane.vaz@educa.go.gov.br',
    profissionalResponsavelId: 'pae-eliane',
    presente: false,
    demonstrouIrritabilidadeOuSinais: 'Não se aplica',
    observacaoComportamental: 'Falta justificada pela família (consulta médica).',
    recebeuAtividadeAdaptada: 'Não',
    createdAt: '2026-09-30T08:00:00.000Z',
    horario: '08:00:00',
    usuarioRegistroNome: 'Eliane Dourado da Silva Vaz',
    usuarioRegistroEmail: 'eliane.vaz@educa.go.gov.br',
  },
  {
    id: 'reg-apoio-aysha-01',
    studentId: 'std-pdf-3',
    nomeEstudante: 'Aysha Júlia Neves Paiva',
    turma: '8º B',
    data: '2026-10-01',
    diaSemana: 'Quinta-feira',
    profissionalResponsavelNome: 'Eliane Dourado da Silva Vaz',
    profissionalResponsavelEmail: 'eliane.vaz@educa.go.gov.br',
    profissionalResponsavelId: 'pae-eliane',
    presente: true,
    demonstrouIrritabilidadeOuSinais: 'Não',
    observacaoComportamental: 'Muito colaborativa e tranquila durante todas as atividades.',
    recebeuAtividadeAdaptada: 'Sim',
    disciplinasEnvolvidas: ['Língua Portuguesa', 'Matemática'],
    conseguiuRealizarAtividade: 'Sim',
    observacaoAtividade: 'Compreendeu os comandos adaptados com agilidade.',
    informacoesAdicionais: 'Apresentou interesse na leitura de contos ilustrados.',
    createdAt: '2026-10-01T10:30:00.000Z',
    horario: '10:30:00',
    usuarioRegistroNome: 'Eliane Dourado da Silva Vaz',
    usuarioRegistroEmail: 'eliane.vaz@educa.go.gov.br',
  }
];

