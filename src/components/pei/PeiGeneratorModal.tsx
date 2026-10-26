import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Sparkles, 
  Loader2, 
  Save, 
  FileDown, 
  Printer, 
  Eye, 
  FileText, 
  GraduationCap, 
  User, 
  BookOpen, 
  CheckCircle2, 
  AlertCircle,
  AlertTriangle,
  Plus, 
  Trash2, 
  Check, 
  Building, 
  PenTool,
  ArrowRight
} from 'lucide-react';
import { 
  Estudante, 
  AuthorizedUser, 
  EscolaConfig, 
  PeiDocumento, 
  PeiIdentificacao, 
  PeiEtapa1Siap, 
  PeiEtapa2Siap,
  PeiSecaoAspectos,
  PeiItemAreaAcademica,
  PeiAssinaturasOficiais
} from '../../types';
import { 
  gerarSugestaoPeiComIa, 
  salvarPeiDocumento,
  gerarAreaAcademicaPadrao,
  gerarAssinaturasOficiaisPadrao,
  validarCamposPei as validarCamposPeiService,
  ResultadoValidacaoCamposPei,
  determinarFormatoLetraPorLaudo,
  obterPreferenciaFormatoLetraEstudante
} from '../../services/peiService';
import { baixarPeiComoPdf } from '../../services/peiPdfService';
import { LogoOlynto } from '../common/LogoOlynto';

interface PeiGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Estudante[];
  staffMembers: AuthorizedUser[];
  escolaConfig: EscolaConfig;
  initialStudentId?: string;
  onSavePei: (peiData: PeiDocumento) => void;
  onViewA4Preview?: (peiData: PeiDocumento) => void;
}

type TabEdicao = 'identificacao' | 'potencialidades' | 'necessidades' | 'area_academica' | 'assinaturas';

export const PeiGeneratorModal: React.FC<PeiGeneratorModalProps> = ({
  isOpen,
  onClose,
  students,
  staffMembers,
  escolaConfig,
  initialStudentId,
  onSavePei,
  onViewA4Preview,
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>(initialStudentId || '');
  const [subject, setSubject] = useState<string>('Geral / Base Nacional Comum');
  const [period, setPeriod] = useState<string>('1º Bimestre');
  const [regentTeacher, setRegentTeacher] = useState<string>('');
  const [supportTeacher, setSupportTeacher] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabEdicao>('identificacao');
  const [formatoLetra, setFormatoLetra] = useState<'bastao' | 'cursiva'>('bastao');
  const [infoFormatoLetra, setInfoFormatoLetra] = useState<{
    formatoSugerido: 'bastao' | 'cursiva';
    motivo: string;
    identificadoPorTermo: boolean;
  } | null>(null);

  // Identificação Oficial
  const [identification, setIdentification] = useState<PeiIdentificacao>({
    cre: 'Rio Verde',
    municipio: escolaConfig.municipio || 'Rio Verde - GO',
    unidadeEscolar: escolaConfig.nome || 'Colégio Estadual Olynto Pereira de Castro',
    studentId: '',
    studentName: '',
    matricula: '',
    grade: '',
    classRoom: '',
    turno: 'Matutino',
    diagnosis: '',
    formatoLetra: 'bastao',
    professoresRegentes: '',
    profissionalApoio: '',
  });

  // Indicador interno de origem dos dados para cada campo do cabeçalho
  const [origemCampos, setOrigemCampos] = useState<Record<string, 'base' | 'manual' | 'nao_cadastrado'>>({
    studentName: 'nao_cadastrado',
    matricula: 'nao_cadastrado',
    grade: 'nao_cadastrado',
    classRoom: 'nao_cadastrado',
    turno: 'nao_cadastrado',
    diagnosis: 'nao_cadastrado',
    regentTeacher: 'nao_cadastrado',
    supportTeacher: 'nao_cadastrado',
  });

  // Seção Oficial: Potencialidades do Estudante (Aspectos cognitivo/psíquico e Comportamento adaptativo)
  const [potencialidades, setPotencialidades] = useState<PeiSecaoAspectos>({
    cognitivoPsiquico: {
      percepcao: '',
      atencaoConcentracao: '',
      linguagemComunicacao: '',
      memoriaAbstracaoGeneralizacao: '',
      criatividade: '',
      aspectosPsicomotores: '',
      raciocinioLogico: '',
    },
    comportamentoAdaptativo: {
      autocuidado: '',
      autonomiaIndependencia: '',
      habilidadesSociais: '',
    },
  });

  // Seção Oficial: Necessidades/Dificuldades do Estudante
  const [necessidadesDificuldades, setNecessidadesDificuldades] = useState<PeiSecaoAspectos>({
    cognitivoPsiquico: {
      percepcao: '',
      atencaoConcentracao: '',
      linguagemComunicacao: '',
      memoriaAbstracaoGeneralizacao: '',
      criatividade: '',
      aspectosPsicomotores: '',
      raciocinioLogico: '',
    },
    comportamentoAdaptativo: {
      autocuidado: '',
      autonomiaIndependencia: '',
      habilidadesSociais: '',
    },
  });

  // Seção Oficial: Área Acadêmica (Tabela de 6 Colunas)
  const [areaAcademica, setAreaAcademica] = useState<PeiItemAreaAcademica[]>([]);

  // Seção Oficial: Assinaturas
  const [assinaturasOficiais, setAssinaturasOficiais] = useState<PeiAssinaturasOficiais>({
    professorAee: 'Professor(a) de AEE',
    coordenacaoPedagogica: 'Coordenação Pedagógica',
    profissionalApoio: 'Profissional de Apoio Escolar (colaborador)',
    professoresRegentes: 'Professores Regentes',
    gestor: 'Gestor Escolar',
    local: 'Rio Verde - GO',
    data: '',
  });

  // Compatibilidade com Etapa 1 e Etapa 2 consolidadas
  const [etapa1, setEtapa1] = useState<PeiEtapa1Siap>({
    habilidadesCognitivas: '',
    habilidadesAdaptativas: '',
    dificuldadesCognitivas: '',
    dificuldadesAdaptativas: '',
  });
  const [etapa2, setEtapa2] = useState<PeiEtapa2Siap>({
    expectativas: '',
    conteudos: '',
    metodologias: '',
    avaliacao: '',
  });

  const [loadingAi, setLoadingAi] = useState<boolean>(false);
  const [aiSuccessMsg, setAiSuccessMsg] = useState<string | null>(null);
  const [salvando, setSalvando] = useState<boolean>(false);
  const [exportandoPdf, setExportandoPdf] = useState<boolean>(false);
  const [modoA4Preview, setModoA4Preview] = useState<boolean>(false);

  // Estados de destaque e foco em validação de campos
  const [tentouGerarPdf, setTentouGerarPdf] = useState<boolean>(false);
  const [primeiroCampoErro, setPrimeiroCampoErro] = useState<string | null>(null);

  // Refs para focar no primeiro erro sem fechar o modal
  const primeiroCampoNecRef = useRef<HTMLTextAreaElement | null>(null);
  const primeiroCampoEstrategiaRef = useRef<HTMLTextAreaElement | null>(null);

  // Inicializa quando abre com initialStudentId
  useEffect(() => {
    if (initialStudentId) {
      setSelectedStudentId(initialStudentId);
    }
  }, [initialStudentId, isOpen]);

  /**
   * Resolução rigorosa do estudante conforme ordem prioritária do usuário:
   * 1. ID único do estudante
   * 2. Matrícula oficial
   * 3. Identificador interno da base
   * 4. Nome completo normalizado
   */
  const localizarEstudante = (idOuTermo: string): Estudante | undefined => {
    if (!idOuTermo) return undefined;
    // 1. ID único
    const porId = students.find((s) => s.id === idOuTermo);
    if (porId) return porId;
    // 2. Matrícula
    const porMatricula = students.find((s) => s.matricula && s.matricula.trim() === idOuTermo.trim());
    if (porMatricula) return porMatricula;
    // 3. Identificador interno
    const porIdentificador = students.find((s) => (s as any).codigoInterno === idOuTermo || (s as any).alunoId === idOuTermo);
    if (porIdentificador) return porIdentificador;
    // 4. Nome completo normalizado
    const termoNorm = idOuTermo.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return students.find((s) => s.nome.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === termoNorm);
  };

  // Preenchimento automático do cabeçalho a partir do estudante selecionado na base
  useEffect(() => {
    if (!selectedStudentId) return;
    const student = localizarEstudante(selectedStudentId);
    if (student) {
      const diag = student.laudo || (student as any).diagnostico || 'Transtorno do Espectro Autista (TEA)';
      
      // Busca professores regentes vinculados na base de usuários
      const profsVinculados = staffMembers
        .filter((m) => student.professoresAutorizadosIds?.includes(m.id) && m.roles.includes('teacher'))
        .map((m) => m.name);
      const regentesEncontrados = profsVinculados.length > 0 
        ? profsVinculados.join(', ') 
        : (student as any).professoresResponsaveisNomes?.[0] || '';

      // Busca profissional de apoio vinculado na base
      const apoioEncontrado = student.paeResponsavelNome || 
        staffMembers.find((m) => student.profissionaisApoioIds?.includes(m.id) || (m.roles.includes('PROFISSIONAL_DE_APOIO') && student.turma?.includes(m.allowedClasses?.[0] || '___')))?.name || 
        '';

      const novaOrigem: Record<string, 'base' | 'manual' | 'nao_cadastrado'> = {
        studentName: student.nome ? 'base' : 'nao_cadastrado',
        matricula: student.matricula ? 'base' : 'nao_cadastrado',
        grade: student.anoSerie ? 'base' : 'nao_cadastrado',
        classRoom: student.turma ? 'base' : 'nao_cadastrado',
        turno: student.turno ? 'base' : 'nao_cadastrado',
        diagnosis: diag ? 'base' : 'nao_cadastrado',
        regentTeacher: regentesEncontrados ? 'base' : 'nao_cadastrado',
        supportTeacher: apoioEncontrado ? 'base' : 'nao_cadastrado',
      };

      setOrigemCampos(novaOrigem);

      const prefLetra = obterPreferenciaFormatoLetraEstudante(student);
      setFormatoLetra(prefLetra.formatoSugerido);
      setInfoFormatoLetra(prefLetra);

      setIdentification({
        cre: 'Rio Verde',
        municipio: escolaConfig.municipio || 'Rio Verde - GO',
        unidadeEscolar: escolaConfig.nome || 'Colégio Estadual Olynto Pereira de Castro',
        studentId: student.id,
        studentName: student.nome,
        matricula: student.matricula || '',
        grade: student.anoSerie || '6º Ano',
        classRoom: student.turma || 'Turma A',
        turno: student.turno || 'Matutino',
        diagnosis: diag,
        formatoLetra: prefLetra.formatoSugerido,
        professoresRegentes: regentesEncontrados,
        profissionalApoio: apoioEncontrado,
      });

      if (regentesEncontrados && !regentTeacher) {
        setRegentTeacher(regentesEncontrados);
      }
      if (apoioEncontrado && !supportTeacher) {
        setSupportTeacher(apoioEncontrado);
      }

      // Inicializa área acadêmica e assinaturas caso ainda vazias
      if (areaAcademica.length === 0) {
        setAreaAcademica(gerarAreaAcademicaPadrao(student.anoSerie || '6º Ano', subject, regentesEncontrados));
      }

      setAssinaturasOficiais(gerarAssinaturasOficiaisPadrao(regentesEncontrados, apoioEncontrado));
    }
  }, [selectedStudentId, students, escolaConfig, staffMembers]);

  // =========================================================================
  // VALIDAÇÃO DE COERÊNCIA SEMÂNTICA ENTRE NECESSIDADES E ESTRATÉGIAS (SEDUC-GO)
  // =========================================================================
  interface InconsistenciaSemantica {
    tipo: 'critico' | 'atencao';
    campo: string;
    mensagem: string;
    abaRecomendada: 'necessidades' | 'area_academica' | 'potencialidades';
    categoria: 'necessidades' | 'estrategias' | 'coerencia';
  }

  interface DiagnosticoCoerencia {
    inconsistencias: InconsistenciaSemantica[];
    totalNecessidadesPreenchidas: number;
    totalEstrategiasPreenchidas: number;
    necessidadesCriticasVazias: boolean;
    estrategiasCriticasVazias: boolean;
    temInconsistenciaCritica: boolean;
    disciplinasSemEstrategia: string[];
  }

  /**
   * Função interna de validação de coerência semântica:
   * 1. Verifica se os campos críticos de 'Necessidades' (cognitivas e adaptativas) estão preenchidos.
   * 2. Verifica se os campos de 'Estratégias' (metodologias na Área Acadêmica) estão preenchidos.
   * 3. Analisa a coerência semântica e correspondência pedagógica entre as necessidades levantadas
   *    e os recursos/estratégias metodológicas adotados, conforme as diretrizes do SIAP / SEDUC-GO.
   */
  const validarCoerenciaSemantica = (): DiagnosticoCoerencia => {
    const alertas: InconsistenciaSemantica[] = [];

    const isPreenchido = (texto?: string): boolean => Boolean(texto && texto.trim().length >= 3);

    // 1. ANÁLISE DOS CAMPOS DE NECESSIDADES / DIFICULDADES (10 ASPECTOS OFICIAIS)
    const necCog = necessidadesDificuldades.cognitivoPsiquico;
    const necAdapt = necessidadesDificuldades.comportamentoAdaptativo;

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

    // Alertas de campos críticos de Necessidades
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

    // 2. ANÁLISE DOS CAMPOS DE ESTRATÉGIAS / METODOLOGIAS (ÁREA ACADÊMICA)
    const disciplinasSemEstrategia: string[] = [];
    const disciplinasComEstrategia: string[] = [];

    if (areaAcademica.length === 0) {
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
    const estrategiasCriticasVazias = areaAcademica.length === 0 || totalEstrategiasPreenchidas === 0;

    // 3. ANÁLISE DE COERÊNCIA SEMÂNTICA GLOBAL (NECESSIDADES VS ESTRATÉGIAS)
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

    // 4. ANÁLISE DE COERÊNCIA SEMÂNTICA ESPECÍFICA (CORRESPONDÊNCIA TEMÁTICA SEDUC-GO)
    const todasEstrategias = areaAcademica
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
  };

  const diagnosticoCoerencia = validarCoerenciaSemantica();
  const inconsistencias = diagnosticoCoerencia.inconsistencias;
  const temInconsistenciaCritica = diagnosticoCoerencia.temInconsistenciaCritica;

  /**
   * Função interna `validarCamposPei`:
   * Verifica se os campos 'Necessidades' e 'Estratégias' estão preenchidos.
   * Conforme especificação:
   * 1. Verifica se os campos 'Necessidades' e 'Estratégias' estão preenchidos.
   * 2. Caso falhe, deve exibir um alerta visual com 'role="alert"' no rodapé do modal.
   * 3. Bloquear a geração do PDF.
   * 4. Destacar os campos correspondentes com erro visual.
   * 5. Focar no primeiro erro sem fechar o modal.
   */
  const validarCamposPei = (focarPrimeiroErro: boolean = true): ResultadoValidacaoCamposPei => {
    const resultado = validarCamposPeiService(necessidadesDificuldades, areaAcademica);

    if (!resultado.valido) {
      if (focarPrimeiroErro) {
        setTentouGerarPdf(true);
        if (!resultado.necessidadesPreenchidas) {
          setPrimeiroCampoErro('necessidades');
          setActiveTab('necessidades');
          setTimeout(() => {
            if (primeiroCampoNecRef.current) {
              primeiroCampoNecRef.current.focus();
              primeiroCampoNecRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 80);
        } else if (!resultado.estrategiasPreenchidas) {
          setPrimeiroCampoErro('estrategias');
          setActiveTab('area_academica');
          setTimeout(() => {
            if (primeiroCampoEstrategiaRef.current) {
              primeiroCampoEstrategiaRef.current.focus();
              primeiroCampoEstrategiaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 80);
        }
      }
    } else {
      if (focarPrimeiroErro) {
        setPrimeiroCampoErro(null);
      }
    }

    return resultado;
  };

  const validacaoCampos = validarCamposPeiService(necessidadesDificuldades, areaAcademica);

  const isCampoNecessidadeInvalido = (val?: string) =>
    tentouGerarPdf && !validacaoCampos.necessidadesPreenchidas && (!val || val.trim().length < 3);

  if (!isOpen) return null;

  const professoresRegentesOpcoes = staffMembers.filter(
    (m) => m.roles.includes('teacher') || m.roles.includes('coordinator') || m.roles.includes('superadmin')
  );
  const profissionaisApoioOpcoes = staffMembers.filter(
    (m) => m.roles.includes('PROFISSIONAL_DE_APOIO') || m.roles.includes('teacher')
  );

  // Geração completa com IA / Diretrizes SEDUC-GO
  const handleGenerateWithGem = async () => {
    if (!identification.studentName) {
      alert('Por favor, selecione primeiro um estudante da base.');
      return;
    }

    setLoadingAi(true);
    setAiSuccessMsg(null);
    try {
      const res = await gerarSugestaoPeiComIa({
        identification: {
          ...identification,
          professoresRegentes: regentTeacher || identification.professoresRegentes,
          profissionalApoio: supportTeacher || identification.profissionalApoio,
        },
        subject,
        period,
      });

      if (res.etapa1) setEtapa1(res.etapa1);
      if (res.etapa2) setEtapa2(res.etapa2);
      if (res.potencialidades) setPotencialidades(res.potencialidades);
      if (res.necessidadesDificuldades) setNecessidadesDificuldades(res.necessidadesDificuldades);
      if (res.areaAcademica && res.areaAcademica.length > 0) {
        setAreaAcademica(res.areaAcademica);
      }
      if (res.assinaturasOficiais) {
        setAssinaturasOficiais(res.assinaturasOficiais);
      }

      setAiSuccessMsg(
        res.origemIa 
          ? 'Proposta do PEI gerada com IA do Gem de acordo com as diretrizes da SEDUC-GO!'
          : 'Proposta pedagógica oficial da SEDUC-GO preenchida com sucesso para o estudante!'
      );
      setTimeout(() => setAiSuccessMsg(null), 5000);
    } catch (error) {
      console.error('Erro ao gerar sugestão para o PEI:', error);
      alert('Não foi possível gerar a sugestão com IA. Você pode preencher os campos manualmente.');
    } finally {
      setLoadingAi(false);
    }
  };

  // Monta objeto PEI completo e validado
  const montarObjetoPei = (): PeiDocumento => {
    return {
      id: `pei-${Date.now()}`,
      studentId: identification.studentId || selectedStudentId,
      studentName: identification.studentName,
      grade: identification.grade,
      classRoom: identification.classRoom,
      diagnosis: identification.diagnosis,
      subject,
      period,
      regentTeacher: regentTeacher || identification.professoresRegentes || 'Professores Regentes',
      supportTeacher: supportTeacher || identification.profissionalApoio || 'Profissional de Apoio Escolar',
      coordinatorName: assinaturasOficiais.coordenacaoPedagogica || 'Coordenação Pedagógica',
      principalName: assinaturasOficiais.gestor || 'Gestor Escolar',
      identification: {
        ...identification,
        professoresRegentes: regentTeacher || identification.professoresRegentes,
        profissionalApoio: supportTeacher || identification.profissionalApoio,
      },
      potencialidades,
      necessidadesDificuldades,
      areaAcademica: areaAcademica.length > 0 
        ? areaAcademica 
        : gerarAreaAcademicaPadrao(identification.grade, subject, regentTeacher),
      assinaturasOficiais,
      etapa1: {
        habilidadesCognitivas: etapa1.habilidadesCognitivas || 
          `Percepção: ${potencialidades.cognitivoPsiquico.percepcao}\nAtenção: ${potencialidades.cognitivoPsiquico.atencaoConcentracao}\nLinguagem: ${potencialidades.cognitivoPsiquico.linguagemComunicacao}`,
        habilidadesAdaptativas: etapa1.habilidadesAdaptativas || 
          `Autocuidado: ${potencialidades.comportamentoAdaptativo.autocuidado}\nAutonomia: ${potencialidades.comportamentoAdaptativo.autonomiaIndependencia}`,
        dificuldadesCognitivas: etapa1.dificuldadesCognitivas || 
          `Percepção: ${necessidadesDificuldades.cognitivoPsiquico.percepcao}\nAtenção: ${necessidadesDificuldades.cognitivoPsiquico.atencaoConcentracao}`,
        dificuldadesAdaptativas: etapa1.dificuldadesAdaptativas || 
          `Autocuidado: ${necessidadesDificuldades.comportamentoAdaptativo.autocuidado}\nAutonomia: ${necessidadesDificuldades.comportamentoAdaptativo.autonomiaIndependencia}`,
      },
      etapa2: {
        expectativas: etapa2.expectativas || (areaAcademica[0]?.expectativas || 'Expectativas pedagógicas conforme DC-GO.'),
        conteudos: etapa2.conteudos || (areaAcademica[0]?.conteudos || 'Conteúdos essenciais flexibilizados.'),
        metodologias: etapa2.metodologias || (areaAcademica[0]?.metodologias || 'Metodologias e recursos acessíveis.'),
        avaliacao: etapa2.avaliacao || (areaAcademica[0]?.avaliacao || 'Avaliação processual contínua.'),
      },
      createdAt: new Date().toISOString(),
      status: 'homologado',
    };
  };

  const handleSave = async () => {
    if (!identification.studentName) {
      alert('Por favor, selecione um estudante antes de salvar.');
      return;
    }

    if (temInconsistenciaCritica) {
      const confirmacao = window.confirm(
        'Aviso de Coerência Pedagógica (SEDUC-GO):\n' +
        'Foram identificados campos críticos não preenchidos ou inconsistências entre Necessidades e Estratégias:\n\n' +
        inconsistencias.map((i) => `• [${i.campo}]: ${i.mensagem}`).join('\n') +
        '\n\nRecomenda-se preencher todos os campos críticos antes de salvar. Deseja prosseguir mesmo assim?'
      );
      if (!confirmacao) return;
    }

    setSalvando(true);
    try {
      const peiCompleto = montarObjetoPei();
      await salvarPeiDocumento(peiCompleto);
      onSavePei(peiCompleto);
      onClose();
    } catch (e) {
      console.error('Erro ao salvar PEI:', e);
      alert('Erro ao salvar PEI.');
    } finally {
      setSalvando(false);
    }
  };

  const handleExportarPdf = async () => {
    if (!identification.studentName) {
      alert('Por favor, selecione um estudante antes de exportar o PDF.');
      return;
    }

    // Validação estrita do Anexo 9 (SEDUC-GO): impede a geração do PDF se Necessidades ou Estratégias estiverem vazias
    // Destaca os campos, bloqueia a geração do PDF e foca no primeiro erro sem fechar o modal
    const checagemCampos = validarCamposPei(true);
    if (!checagemCampos.valido) {
      // Bloqueia a geração do PDF e mantém o modal aberto focado no primeiro erro
      return;
    }

    if (temInconsistenciaCritica) {
      const confirmacao = window.confirm(
        'Aviso de Coerência Pedagógica (SEDUC-GO):\n' +
        'Existem campos críticos não preenchidos ou inconsistências entre as Necessidades e as Estratégias metodológicas:\n\n' +
        inconsistencias.map((i) => `• [${i.campo}]: ${i.mensagem}`).join('\n') +
        '\n\nRecomenda-se preencher todos os campos críticos antes de gerar o documento oficial. Deseja prosseguir com a geração do PDF mesmo assim?'
      );
      if (!confirmacao) return;
    }
    setExportandoPdf(true);
    try {
      const peiCompleto = montarObjetoPei();
      await baixarPeiComoPdf(peiCompleto, escolaConfig);
    } catch (e) {
      console.error('Erro ao exportar PDF do PEI:', e);
      alert('Erro ao exportar PDF do PEI.');
    } finally {
      setExportandoPdf(false);
    }
  };

  const handleVisualizarA4 = () => {
    if (!identification.studentName) {
      alert('Por favor, selecione um estudante.');
      return;
    }
    const peiCompleto = montarObjetoPei();
    if (onViewA4Preview) {
      onViewA4Preview(peiCompleto);
    } else {
      setModoA4Preview(true);
    }
  };

  // Funções para gerenciar a tabela da Área Acadêmica
  const handleAddDisciplinaArea = () => {
    const novoItem: PeiItemAreaAcademica = {
      id: `item-${Date.now()}`,
      componenteCurricular: 'Novo Componente Curricular',
      expectativas: 'Expectativas de aprendizagem específicas para o estudante.',
      conteudos: 'Conteúdos e objetos de conhecimento selecionados.',
      metodologias: 'Estratégias pedagógicas e recursos didáticos acessíveis.',
      avaliacao: 'Critérios e instrumentos avaliativos formativos.',
      professor: regentTeacher || 'Professor Regente',
    };
    setAreaAcademica([...areaAcademica, novoItem]);
  };

  const handleRemoveDisciplinaArea = (id: string) => {
    setAreaAcademica(areaAcademica.filter((i) => i.id !== id));
  };

  const handleUpdateDisciplinaArea = (id: string, campo: keyof PeiItemAreaAcademica, valor: string) => {
    setAreaAcademica(
      areaAcademica.map((i) => (i.id === id ? { ...i, [campo]: valor } : i))
    );
  };

  // Badge interna discreta para origem do dado (sem alterar o modelo impresso)
  const renderOrigemBadge = (campoKey: string) => {
    const status = origemCampos[campoKey];
    if (status === 'base') {
      return (
        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200" title="Dado importado automaticamente da base">
          <Check className="h-2.5 w-2.5" /> Base
        </span>
      );
    }
    if (status === 'manual') {
      return (
        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200" title="Dado digitado manualmente">
          Manual
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200" title="Dado pendente de cadastro na base">
        Disponível para edição
      </span>
    );
  };

  // =========================================================================
  // MODO VISUALIZAÇÃO DE IMPRESSÃO A4 (RÉPLICA MILIMÉTRICA DO MODELO DOCX)
  // =========================================================================
  if (modoA4Preview) {
    const peiDoc = montarObjetoPei();

    return (
      <div className="PeiGeneratorModal fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn">
        <div className="bg-slate-100 rounded-2xl shadow-2xl w-full max-w-5xl p-3 sm:p-6 max-h-[96vh] overflow-y-auto border border-slate-300 my-auto">
          {/* Barra de Ações Superior (no-print) */}
          <div className="no-print flex items-center justify-between pb-3 mb-4 border-b border-slate-300 gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setModoA4Preview(false)}
                className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                ← Voltar para Edição
              </button>
              <span className="text-xs font-extrabold text-slate-800">
                Modelo Oficial Imutável • PEI (SEDUC-GO / Anexo 9)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Imprimir Folha A4</span>
              </button>
              <button
                type="button"
                onClick={handleExportarPdf}
                disabled={exportandoPdf}
                className="px-3.5 py-1.5 bg-rose-700 hover:bg-rose-800 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                {exportandoPdf ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Gerando PDF...</span>
                  </>
                ) : (
                  <>
                    <FileDown className="h-3.5 w-3.5" />
                    <span>Baixar PDF (A4)</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 bg-white border border-slate-300 text-slate-500 hover:text-slate-800 rounded-lg cursor-pointer"
                title="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* FOLHA FÍSICA A4 OFICIAL: MODELO DOCX / SEDUC-GO */}
          <div className="flex justify-center">
            <div
              id="folha-pei-impressao"
              className="print-page w-full max-w-[840px] bg-white text-black p-4 sm:p-[10mm] print:p-0 print:border-none print:shadow-none print:max-w-full text-[11px] leading-snug font-sans"
              style={{ minHeight: '1120px' }}
            >
              {/* CABEÇALHO OFICIAL COM LOGO NO CANTO SUPERIOR ESQUERDO (MAX-HEIGHT: 40PX) */}
              <div className="border border-black p-2 mb-0">
                <div className="relative flex items-center justify-center min-h-[46px]">
                  {/* Logo da Escola no Canto Superior Esquerdo */}
                  <div className="absolute left-0 top-0 flex items-center">
                    <LogoOlynto
                      variant="pdf"
                      style={{ maxHeight: '40px', maxWidth: '120px', width: 'auto', height: 'auto', objectFit: 'contain', flexShrink: 0 }}
                      className="pdf-school-logo max-h-[40px] max-w-[120px] w-auto h-auto object-contain flex-shrink-0 shrink-0"
                      alt="Logo Oficial - Colégio Estadual Olynto Pereira de Castro e SEDUC-GO"
                    />
                  </div>
                  {/* Títulos Oficiais do Governo de Goiás */}
                  <div className="text-center w-full px-28">
                    <span className="font-bold text-[11px] uppercase block tracking-wide">
                      GOVERNO DO ESTADO DE GOIÁS
                    </span>
                    <span className="text-[10px] block font-medium">
                      SECRETARIA DE ESTADO DA EDUCAÇÃO
                    </span>
                    <span className="text-[9.5px] block">
                      SUPERINTENDÊNCIA DE MODALIDADES E TEMÁTICAS ESPECIAIS
                    </span>
                    <span className="text-[9.5px] block font-semibold">
                      GERÊNCIA DE EDUCAÇÃO ESPECIAL
                    </span>
                    <span className="font-bold text-[11px] uppercase block mt-1 tracking-wider border-t border-black pt-0.5">
                      PLANO EDUCACIONAL INDIVIDUALIZADO - PEI
                    </span>
                  </div>
                </div>
              </div>

              {/* TABELA DE IDENTIFICAÇÃO (MODELO DOCX) */}
              <table className="w-full border-collapse border border-black text-[10px] mb-2">
                <tbody>
                  <tr>
                    <td className="border border-black p-1.5 w-3/5">
                      <span className="font-semibold">CRE: </span>
                      <span>Coordenação Regional de Educação de {peiDoc.identification.cre || 'Rio Verde'}</span>
                    </td>
                    <td className="border border-black p-1.5 w-2/5">
                      <span className="font-semibold">Município: </span>
                      <span>{peiDoc.identification.municipio || 'Rio Verde - GO'}</span>
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={2} className="border border-black p-1.5">
                      <span className="font-semibold">Unidade Escolar: </span>
                      <span>{peiDoc.identification.unidadeEscolar || 'Colégio Estadual Olynto Pereira de Castro'}</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-black p-1.5">
                      <span className="font-bold">Estudante: </span>
                      <span className="font-bold">{peiDoc.studentName}</span>
                    </td>
                    <td className="border border-black p-1.5">
                      <span className="font-semibold">Ano/série: </span>
                      <span>{peiDoc.grade}</span>
                      <span className="font-semibold ml-3">Turma/turno: </span>
                      <span>{peiDoc.classRoom} / {peiDoc.identification.turno || 'Matutino'}</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-black p-1.5">
                      <span className="font-semibold">Professores Regentes: </span>
                      <span>{peiDoc.regentTeacher || 'Não informado'}</span>
                    </td>
                    <td className="border border-black p-1.5">
                      <span className="font-semibold">Profissional Apoio Escolar: </span>
                      <span>{peiDoc.supportTeacher || 'Não informado'}</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-black p-1.5">
                      <span className="font-semibold">Período: </span>
                      <span>{peiDoc.period}</span>
                    </td>
                    <td className="border border-black p-1.5">
                      <span className="font-semibold">Condição/Diagnóstico (Laudo): </span>
                      <span>{peiDoc.diagnosis || 'TEA'}</span>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* SEÇÃO: POTENCIALIDADES DO ESTUDANTE (MODELO DOCX) */}
              <div className="border border-black mb-2">
                <div className="bg-slate-100 border-b border-black text-center font-bold text-[10.5px] uppercase py-1">
                  POTENCIALIDADES DO ESTUDANTE
                </div>
                
                {/* Bloco: Aspectos cognitivo/psíquico */}
                <div className="bg-slate-50 border-b border-black px-2 py-0.5 font-bold text-[10px]">
                  Aspectos cognitivo/psíquico:
                </div>
                <div className="p-2 space-y-1 text-[9.8px] leading-relaxed border-b border-black">
                  <div><strong>Percepção: </strong>{potencialidades.cognitivoPsiquico.percepcao || 'Sem anotações.'}</div>
                  <div><strong>Atenção/concentração: </strong>{potencialidades.cognitivoPsiquico.atencaoConcentracao || 'Sem anotações.'}</div>
                  <div><strong>Linguagem/comunicação: </strong>{potencialidades.cognitivoPsiquico.linguagemComunicacao || 'Sem anotações.'}</div>
                  <div><strong>Memória/abstração/generalização: </strong>{potencialidades.cognitivoPsiquico.memoriaAbstracaoGeneralizacao || 'Sem anotações.'}</div>
                  <div><strong>Criatividade: </strong>{potencialidades.cognitivoPsiquico.criatividade || 'Sem anotações.'}</div>
                  <div><strong>Aspectos psicomotores: </strong>{potencialidades.cognitivoPsiquico.aspectosPsicomotores || 'Sem anotações.'}</div>
                  <div><strong>Raciocínio lógico: </strong>{potencialidades.cognitivoPsiquico.raciocinioLogico || 'Sem anotações.'}</div>
                </div>

                {/* Bloco: Habilidades do comportamento adaptativo */}
                <div className="bg-slate-50 border-b border-black px-2 py-0.5 font-bold text-[10px]">
                  Habilidades do comportamento adaptativo:
                </div>
                <div className="p-2 space-y-1 text-[9.8px] leading-relaxed">
                  <div><strong>Autocuidado: </strong>{potencialidades.comportamentoAdaptativo.autocuidado || 'Sem anotações.'}</div>
                  <div><strong>Autonomia/independência: </strong>{potencialidades.comportamentoAdaptativo.autonomiaIndependencia || 'Sem anotações.'}</div>
                  <div><strong>Habilidades sociais: </strong>{potencialidades.comportamentoAdaptativo.habilidadesSociais || 'Sem anotações.'}</div>
                </div>
              </div>

              {/* SEÇÃO: NECESSIDADES/DIFICULDADES DO ESTUDANTE (MODELO DOCX) */}
              <div className="border border-black mb-2">
                <div className="bg-slate-100 border-b border-black text-center font-bold text-[10.5px] uppercase py-1">
                  NECESSIDADES/DIFICULDADES DO ESTUDANTE
                </div>

                {/* Bloco: Aspectos cognitivo/psíquico */}
                <div className="bg-slate-50 border-b border-black px-2 py-0.5 font-bold text-[10px]">
                  Aspectos cognitivo/psíquico:
                </div>
                <div className="p-2 space-y-1 text-[9.8px] leading-relaxed border-b border-black">
                  <div><strong>Percepção: </strong>{necessidadesDificuldades.cognitivoPsiquico.percepcao || 'Sem anotações.'}</div>
                  <div><strong>Atenção/concentração: </strong>{necessidadesDificuldades.cognitivoPsiquico.atencaoConcentracao || 'Sem anotações.'}</div>
                  <div><strong>Linguagem/comunicação: </strong>{necessidadesDificuldades.cognitivoPsiquico.linguagemComunicacao || 'Sem anotações.'}</div>
                  <div><strong>Memória/abstração/generalização: </strong>{necessidadesDificuldades.cognitivoPsiquico.memoriaAbstracaoGeneralizacao || 'Sem anotações.'}</div>
                  <div><strong>Criatividade: </strong>{necessidadesDificuldades.cognitivoPsiquico.criatividade || 'Sem anotações.'}</div>
                  <div><strong>Aspectos psicomotores: </strong>{necessidadesDificuldades.cognitivoPsiquico.aspectosPsicomotores || 'Sem anotações.'}</div>
                  <div><strong>Raciocínio lógico: </strong>{necessidadesDificuldades.cognitivoPsiquico.raciocinioLogico || 'Sem anotações.'}</div>
                </div>

                {/* Bloco: Habilidades do comportamento adaptativo */}
                <div className="bg-slate-50 border-b border-black px-2 py-0.5 font-bold text-[10px]">
                  Habilidades do comportamento adaptativo:
                </div>
                <div className="p-2 space-y-1 text-[9.8px] leading-relaxed">
                  <div><strong>Autocuidado: </strong>{necessidadesDificuldades.comportamentoAdaptativo.autocuidado || 'Sem anotações.'}</div>
                  <div><strong>Autonomia/independência: </strong>{necessidadesDificuldades.comportamentoAdaptativo.autonomiaIndependencia || 'Sem anotações.'}</div>
                  <div><strong>Habilidades sociais: </strong>{necessidadesDificuldades.comportamentoAdaptativo.habilidadesSociais || 'Sem anotações.'}</div>
                </div>
              </div>

              {/* SEÇÃO: ÁREA ACADÊMICA (TABELA DE 6 COLUNAS OFICIAL DA SEDUC-GO) */}
              <div className="border border-black mb-2">
                <div className="bg-slate-100 border-b border-black text-center font-bold text-[10.5px] uppercase py-1">
                  ÁREA ACADÊMICA
                </div>
                <table className="w-full border-collapse text-[9px] leading-tight">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="border border-black p-1 text-center font-bold w-[16%]">
                        Componente Curricular
                      </th>
                      <th className="border border-black p-1 text-center font-bold w-[22%]">
                        Expectativas de aprendizagem para o estudante
                      </th>
                      <th className="border border-black p-1 text-center font-bold w-[18%]">
                        Conteúdo/s proposto/s
                      </th>
                      <th className="border border-black p-1 text-center font-bold w-[20%]">
                        Estratégias/metodologias
                      </th>
                      <th className="border border-black p-1 text-center font-bold w-[14%]">
                        Procedimentos e instrumentos de avaliação
                      </th>
                      <th className="border border-black p-1 text-center font-bold w-[10%]">
                        Professor
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(peiDoc.areaAcademica && peiDoc.areaAcademica.length > 0
                      ? peiDoc.areaAcademica
                      : areaAcademica
                    ).map((item) => (
                      <tr key={item.id}>
                        <td className="border border-black p-1.5 font-bold align-top break-words">
                          {item.componenteCurricular}
                        </td>
                        <td className="border border-black p-1.5 align-top break-words whitespace-pre-wrap">
                          {item.expectativas}
                        </td>
                        <td className="border border-black p-1.5 align-top break-words whitespace-pre-wrap">
                          {item.conteudos}
                        </td>
                        <td className="border border-black p-1.5 align-top break-words whitespace-pre-wrap">
                          {item.metodologias}
                        </td>
                        <td className="border border-black p-1.5 align-top break-words whitespace-pre-wrap">
                          {item.avaliacao}
                        </td>
                        <td className="border border-black p-1.5 align-top text-center break-words">
                          {item.professor || peiDoc.regentTeacher}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* SEÇÃO: ASSINATURAS (MODELO DOCX) */}
              <div className="border border-black break-inside-avoid">
                <div className="bg-slate-100 border-b border-black text-center font-bold text-[10.5px] uppercase py-1">
                  ASSINATURAS
                </div>
                <div className="p-2.5 space-y-3.5 text-[9.5px]">
                  <div className="flex items-center justify-between border-b border-black pb-1">
                    <span className="font-bold">Professor(a) de AEE:</span>
                    <span className="text-slate-600 italic">{assinaturasOficiais.professorAee || '________________________________________________'}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-black pb-1">
                    <span className="font-bold">Coordenação Pedagógica:</span>
                    <span className="text-slate-600 italic">{assinaturasOficiais.coordenacaoPedagogica || '________________________________________________'}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-black pb-1">
                    <span className="font-bold">Profissional de Apoio Escolar (colaborador):</span>
                    <span className="text-slate-600 italic">{assinaturasOficiais.profissionalApoio || '________________________________________________'}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-black pb-1">
                    <span className="font-bold">Professores Regentes:</span>
                    <span className="text-slate-600 italic">{assinaturasOficiais.professoresRegentes || '________________________________________________'}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-black pb-1">
                    <span className="font-bold">Gestor:</span>
                    <span className="text-slate-600 italic">{assinaturasOficiais.gestor || '________________________________________________'}</span>
                  </div>
                  <div className="pt-2 text-right text-[10px]">
                    <span>
                      {assinaturasOficiais.data
                        ? `${assinaturasOficiais.local || 'Rio Verde - GO'}, ${assinaturasOficiais.data}.`
                        : `${assinaturasOficiais.local || 'Rio Verde - GO'}, _____ de _________________ de 20____.`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Rodapé Oficial da Folha */}
              <div className="mt-3 pt-1 border-t border-slate-300 flex items-center justify-between text-[8px] text-slate-400">
                <span>Documento Oficial • SEDUC-GO • Colégio Estadual Olynto Pereira de Castro</span>
                <span>Educação Especial Inclusiva • Anexo 9</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // MODO EDIÇÃO DO FORMULÁRIO (COM CRUZAMENTO INTELIGENTE E VALIDAÇÃO)
  // =========================================================================
  return (
    <div className="PeiGeneratorModal fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-4 sm:p-6 max-h-[94vh] overflow-y-auto border border-slate-200">
        
        {/* Cabeçalho do Modal */}
        <div className="flex flex-row items-center justify-between border-b border-slate-200 pb-3 mb-3 gap-3 flex-wrap sm:flex-nowrap">
          <div className="grid grid-cols-[auto_1fr] items-center gap-3 min-w-0">
            <div className="flex items-center gap-2 flex-shrink-0 shrink-0">
              <LogoOlynto
                variant="pdf"
                style={{ maxHeight: '40px', maxWidth: '100px', width: 'auto', height: 'auto', objectFit: 'contain', flexShrink: 0 }}
                className="pdf-school-logo max-h-[40px] max-w-[100px] w-auto h-auto object-contain flex-shrink-0 shrink-0 self-center hidden xs:block"
                alt="Logo Oficial"
              />
              <div className="p-2.5 bg-emerald-100/80 rounded-xl text-emerald-800 flex-shrink-0 shrink-0 flex items-center justify-center">
                <GraduationCap className="h-6 w-6" />
              </div>
            </div>
            <div className="flex flex-col justify-center min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Plano Educacional Individualizado (PEI Oficial)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                  SEDUC-GO • Modelo Oficial
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate">
                {identification.unidadeEscolar} • CRE {identification.cre} • {identification.municipio}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0 self-start sm:self-center"
            title="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Feedback de IA */}
        {aiSuccessMsg && (
          <div className="mb-3 p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900 flex items-center justify-between animate-fadeIn shadow-2xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
              <span>{aiSuccessMsg}</span>
            </div>
            <span className="text-[10px] font-mono bg-emerald-100 px-2 py-0.5 rounded text-emerald-800">
              Gem IA Integrado
            </span>
          </div>
        )}

        {/* ALERTA VISUAL DE COERÊNCIA SEMÂNTICA (NECESSIDADES VS ESTRATÉGIAS) */}
        {inconsistencias.length > 0 ? (
          <div className={`mb-3.5 p-3.5 rounded-xl border text-xs animate-fadeIn shadow-2xs ${
            temInconsistenciaCritica 
              ? 'bg-amber-50/95 border-amber-300 text-amber-950 ring-1 ring-amber-300/60' 
              : 'bg-sky-50 border-sky-300 text-sky-950'
          }`}>
            <div className="flex items-start gap-2.5">
              <AlertTriangle className={`h-5 w-5 mt-0.5 shrink-0 ${
                temInconsistenciaCritica ? 'text-amber-600' : 'text-sky-600'
              }`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-[11.5px] uppercase tracking-wide">
                      {temInconsistenciaCritica 
                        ? 'Alerta de Coerência Pedagógica (Campos Críticos Incompletos)' 
                        : 'Sugestão de Alinhamento Semântico (SEDUC-GO)'}
                    </span>
                    <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full ${
                      temInconsistenciaCritica ? 'bg-amber-200 text-amber-950 font-mono' : 'bg-sky-200 text-sky-950 font-mono'
                    }`}>
                      {inconsistencias.length} {inconsistencias.length === 1 ? 'ponto a revisar' : 'pontos a revisar'}
                    </span>
                  </div>

                  {/* Badges de preenchimento dos campos críticos */}
                  <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                    <span className={`px-2 py-0.5 rounded font-bold ${
                      diagnosticoCoerencia.necessidadesCriticasVazias
                        ? 'bg-rose-100 text-rose-800 border border-rose-300'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    }`}>
                      {diagnosticoCoerencia.necessidadesCriticasVazias 
                        ? '❌ Necessidades: Vazias' 
                        : `✓ Necessidades: ${diagnosticoCoerencia.totalNecessidadesPreenchidas}/10`}
                    </span>
                    <span className={`px-2 py-0.5 rounded font-bold ${
                      diagnosticoCoerencia.estrategiasCriticasVazias
                        ? 'bg-rose-100 text-rose-800 border border-rose-300'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    }`}>
                      {diagnosticoCoerencia.estrategiasCriticasVazias 
                        ? '❌ Estratégias: Vazias' 
                        : `✓ Estratégias: ${diagnosticoCoerencia.totalEstrategiasPreenchidas} componente(s)`}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-700 mb-2 leading-relaxed">
                  {temInconsistenciaCritica
                    ? 'O modelo oficial do PEI da SEDUC-GO exige que as Necessidades do estudante e as Estratégias metodológicas estejam devidamente preenchidas e com coerência mútua antes da homologação final do documento.'
                    : 'Recomenda-se alinhar as metodologias de ensino para contemplar diretamente as especificidades e necessidades cadastradas.'}
                </p>

                <div className="space-y-1.5 bg-white/70 p-2.5 rounded-lg border border-amber-200/70">
                  {inconsistencias.map((inc, idx) => (
                    <div key={idx} className="flex items-start justify-between gap-2 text-[11px] py-0.5 border-b border-amber-100 last:border-b-0">
                      <div className="flex items-start gap-1.5 min-w-0">
                        <span className={`mt-1 h-1.5 w-1.5 rounded-full shrink-0 ${
                          inc.tipo === 'critico' ? 'bg-rose-600' : 'bg-sky-600'
                        }`} />
                        <span className="text-slate-800">
                          <strong className={inc.tipo === 'critico' ? 'text-rose-900 font-bold' : 'text-slate-900 font-semibold'}>
                            [{inc.campo}]:
                          </strong>{' '}
                          {inc.mensagem}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab(inc.abaRecomendada)}
                        className="text-[10px] font-bold text-emerald-800 hover:text-emerald-950 underline shrink-0 cursor-pointer flex items-center gap-0.5 bg-emerald-50 px-2 py-0.5 rounded hover:bg-emerald-100 transition-colors ml-2"
                      >
                        <span>Ir para Aba</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-3 p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900 flex items-center justify-between animate-fadeIn shadow-2xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
              <span>Coerência Semântica Aprovada: Necessidades e Estratégias pedagógicas preenchidas e alinhadas (Diretrizes SEDUC-GO).</span>
            </div>
            <span className="text-[10px] font-mono bg-emerald-100 px-2 py-0.5 rounded text-emerald-800">
              100% Coerente
            </span>
          </div>
        )}

        {/* NAVEGAÇÃO ENTRE ABAS DO MODELO OFICIAL */}
        <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 pb-2 mb-4 scrollbar-thin">
          <button
            type="button"
            onClick={() => setActiveTab('identificacao')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'identificacao'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <User className="h-3.5 w-3.5" />
            <span>1. Identificação</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('potencialidades')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'potencialidades'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>2. Potencialidades (10 Aspectos)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('necessidades')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer relative ${
              activeTab === 'necessidades'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <AlertCircle className="h-3.5 w-3.5" />
            <span>3. Necessidades/Dificuldades</span>
            {diagnosticoCoerencia.necessidadesCriticasVazias ? (
              <span className="ml-1 px-1.5 py-0.5 bg-rose-500 text-white text-[9px] rounded-full font-mono font-bold animate-pulse" title="Campo crítico vazio">
                Vazio
              </span>
            ) : (
              <span className={`ml-1 px-1.5 py-0.5 text-[9px] rounded-full font-mono font-bold ${
                activeTab === 'necessidades' ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-200 text-slate-700'
              }`}>
                {diagnosticoCoerencia.totalNecessidadesPreenchidas}/10
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('area_academica')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer relative ${
              activeTab === 'area_academica'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>4. Área Acadêmica (Estratégias)</span>
            {diagnosticoCoerencia.estrategiasCriticasVazias ? (
              <span className="ml-1 px-1.5 py-0.5 bg-rose-500 text-white text-[9px] rounded-full font-mono font-bold animate-pulse" title="Estratégias críticas vazias">
                Vazio
              </span>
            ) : diagnosticoCoerencia.disciplinasSemEstrategia.length > 0 ? (
              <span className="ml-1 px-1.5 py-0.5 bg-amber-500 text-white text-[9px] rounded-full font-mono font-bold" title="Alguns componentes sem estratégia">
                Pendente
              </span>
            ) : (
              <span className={`ml-1 px-1.5 py-0.5 text-[9px] rounded-full font-mono font-bold ${
                activeTab === 'area_academica' ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-200 text-slate-700'
              }`}>
                {diagnosticoCoerencia.totalEstrategiasPreenchidas} OK
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('assinaturas')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'assinaturas'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <PenTool className="h-3.5 w-3.5" />
            <span>5. Assinaturas</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* ABA 1: IDENTIFICAÇÃO E CRUZAMENTO COM BASE DE DADOS DO APLICATIVO         */}
        {/* ========================================================================= */}
        {activeTab === 'identificacao' && (
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                  <User className="h-3.5 w-3.5 text-emerald-700" />
                  <span>Cruzamento Automático com a Base de Alunos</span>
                </h3>
                <span className="text-[10px] text-slate-500 font-semibold">
                  Consulta Prioritária: ID único &gt; Matrícula &gt; Nome
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {/* Seleção do Estudante */}
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-700">
                      Selecionar Estudante Cadastrado *
                    </label>
                    {renderOrigemBadge('studentName')}
                  </div>
                  <select
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500 font-medium"
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                  >
                    <option value="">Selecione o estudante...</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nome} • {s.matricula ? `Matrícula: ${s.matricula}` : ''} ({s.anoSerie || s.turma})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Período Bimestral */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Período Bimestral *
                  </label>
                  <select
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500 font-medium"
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                  >
                    <option value="1º Bimestre">1º Bimestre</option>
                    <option value="2º Bimestre">2º Bimestre</option>
                    <option value="3º Bimestre">3º Bimestre</option>
                    <option value="4º Bimestre">4º Bimestre</option>
                    <option value="Anual / Semestral">Anual / Semestral</option>
                  </select>
                </div>

                {/* Ano/Série */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-700">Ano/Série</label>
                    {renderOrigemBadge('grade')}
                  </div>
                  <input
                    type="text"
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-800 font-semibold"
                    value={identification.grade}
                    onChange={(e) => {
                      setIdentification({ ...identification, grade: e.target.value });
                      setOrigemCampos({ ...origemCampos, grade: 'manual' });
                    }}
                    placeholder="Ex: 6º Ano"
                  />
                </div>

                {/* Turma e Turno */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-700">Turma e Turno</label>
                    {renderOrigemBadge('classRoom')}
                  </div>
                  <input
                    type="text"
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-800 font-semibold"
                    value={`${identification.classRoom} (${identification.turno || 'Matutino'})`}
                    onChange={(e) => {
                      setIdentification({ ...identification, classRoom: e.target.value });
                      setOrigemCampos({ ...origemCampos, classRoom: 'manual' });
                    }}
                    placeholder="Ex: Turma A (Matutino)"
                  />
                </div>

                {/* Diagnóstico / Condição */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-700">Diagnóstico / Laudo</label>
                    {renderOrigemBadge('diagnosis')}
                  </div>
                  <input
                    type="text"
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-800 font-semibold"
                    value={identification.diagnosis}
                    onChange={(e) => {
                      setIdentification({ ...identification, diagnosis: e.target.value });
                      setOrigemCampos({ ...origemCampos, diagnosis: 'manual' });
                    }}
                    placeholder="Ex: Transtorno do Espectro Autista (TEA)"
                  />
                </div>

                {/* Professores Regentes */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-700">Professores Regentes</label>
                    {renderOrigemBadge('regentTeacher')}
                  </div>
                  <input
                    type="text"
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500 font-medium"
                    value={regentTeacher}
                    onChange={(e) => {
                      setRegentTeacher(e.target.value);
                      setOrigemCampos({ ...origemCampos, regentTeacher: 'manual' });
                    }}
                    placeholder="Nomes dos professores regentes..."
                  />
                </div>

                {/* Profissional de Apoio Escolar */}
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-700">Profissional Apoio Escolar (PAE)</label>
                    {renderOrigemBadge('supportTeacher')}
                  </div>
                  <input
                    type="text"
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500 font-medium"
                    value={supportTeacher}
                    onChange={(e) => {
                      setSupportTeacher(e.target.value);
                      setOrigemCampos({ ...origemCampos, supportTeacher: 'manual' });
                    }}
                    placeholder="Nome do profissional de apoio ou colaborador..."
                  />
                </div>
              </div>

              {/* Botão de Preenchimento com IA do Gem */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-200">
                <span className="text-[11px] text-slate-500 italic">
                  SEDUC-GO • Colégio Estadual Olynto Pereira de Castro
                </span>
                <button
                  type="button"
                  onClick={handleGenerateWithGem}
                  disabled={loadingAi || !selectedStudentId}
                  className="bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white text-xs font-extrabold px-4 py-2 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-2 disabled:cursor-not-allowed"
                >
                  {loadingAi ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Gerando proposta pedagógica...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>✨ Preencher com IA (Gem Educação Especial)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA 2: POTENCIALIDADES DO ESTUDANTE (10 ASPECTOS OFICIAIS)                */}
        {/* ========================================================================= */}
        {activeTab === 'potencialidades' && (
          <div className="space-y-4">
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-3">
              <span className="font-extrabold text-xs text-slate-900 uppercase block tracking-wider">
                Aspectos cognitivo/psíquico (Potencialidades)
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Percepção:</label>
                  <textarea
                    rows={2}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                    value={potencialidades.cognitivoPsiquico.percepcao}
                    onChange={(e) => setPotencialidades({
                      ...potencialidades,
                      cognitivoPsiquico: { ...potencialidades.cognitivoPsiquico, percepcao: e.target.value }
                    })}
                    placeholder="Percepção visual, auditiva e espacial..."
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Atenção/concentração:</label>
                  <textarea
                    rows={2}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                    value={potencialidades.cognitivoPsiquico.atencaoConcentracao}
                    onChange={(e) => setPotencialidades({
                      ...potencialidades,
                      cognitivoPsiquico: { ...potencialidades.cognitivoPsiquico, atencaoConcentracao: e.target.value }
                    })}
                    placeholder="Foco em atividades estruturadas..."
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Linguagem/comunicação:</label>
                  <textarea
                    rows={2}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                    value={potencialidades.cognitivoPsiquico.linguagemComunicacao}
                    onChange={(e) => setPotencialidades({
                      ...potencialidades,
                      cognitivoPsiquico: { ...potencialidades.cognitivoPsiquico, linguagemComunicacao: e.target.value }
                    })}
                    placeholder="Expressão verbal, comandos visuais..."
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Memória/abstração/generalização:</label>
                  <textarea
                    rows={2}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                    value={potencialidades.cognitivoPsiquico.memoriaAbstracaoGeneralizacao}
                    onChange={(e) => setPotencialidades({
                      ...potencialidades,
                      cognitivoPsiquico: { ...potencialidades.cognitivoPsiquico, memoriaAbstracaoGeneralizacao: e.target.value }
                    })}
                    placeholder="Memória visual de rotinas e símbolos..."
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Criatividade:</label>
                  <textarea
                    rows={2}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                    value={potencialidades.cognitivoPsiquico.criatividade}
                    onChange={(e) => setPotencialidades({
                      ...potencialidades,
                      cognitivoPsiquico: { ...potencialidades.cognitivoPsiquico, criatividade: e.target.value }
                    })}
                    placeholder="Produções visuais e soluções criativas..."
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Aspectos psicomotores:</label>
                  <textarea
                    rows={2}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                    value={potencialidades.cognitivoPsiquico.aspectosPsicomotores}
                    onChange={(e) => setPotencialidades({
                      ...potencialidades,
                      cognitivoPsiquico: { ...potencialidades.cognitivoPsiquico, aspectosPsicomotores: e.target.value }
                    })}
                    placeholder="Coordenação ampla, destreza..."
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Raciocínio lógico:</label>
                  <textarea
                    rows={2}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                    value={potencialidades.cognitivoPsiquico.raciocinioLogico}
                    onChange={(e) => setPotencialidades({
                      ...potencialidades,
                      cognitivoPsiquico: { ...potencialidades.cognitivoPsiquico, raciocinioLogico: e.target.value }
                    })}
                    placeholder="Classificação, seriação, resolução sequenciada..."
                  />
                </div>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-3">
              <span className="font-extrabold text-xs text-slate-900 uppercase block tracking-wider">
                Habilidades do comportamento adaptativo (Potencialidades)
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Autocuidado:</label>
                  <textarea
                    rows={2}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                    value={potencialidades.comportamentoAdaptativo.autocuidado}
                    onChange={(e) => setPotencialidades({
                      ...potencialidades,
                      comportamentoAdaptativo: { ...potencialidades.comportamentoAdaptativo, autocuidado: e.target.value }
                    })}
                    placeholder="Alimentação, higiene e rotina..."
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Autonomia/independência:</label>
                  <textarea
                    rows={2}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                    value={potencialidades.comportamentoAdaptativo.autonomiaIndependencia}
                    onChange={(e) => setPotencialidades({
                      ...potencialidades,
                      comportamentoAdaptativo: { ...potencialidades.comportamentoAdaptativo, autonomiaIndependencia: e.target.value }
                    })}
                    placeholder="Locomoção e cumprimento de rotina..."
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Habilidades sociais:</label>
                  <textarea
                    rows={2}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                    value={potencialidades.comportamentoAdaptativo.habilidadesSociais}
                    onChange={(e) => setPotencialidades({
                      ...potencialidades,
                      comportamentoAdaptativo: { ...potencialidades.comportamentoAdaptativo, habilidadesSociais: e.target.value }
                    })}
                    placeholder="Interação com colegas e equipe..."
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA 3: NECESSIDADES/DIFICULDADES DO ESTUDANTE (10 ASPECTOS OFICIAIS)       */}
        {/* ========================================================================= */}
        {activeTab === 'necessidades' && (
          <div className="space-y-4">
            {diagnosticoCoerencia.necessidadesCriticasVazias && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-center gap-2.5 animate-fadeIn">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Atenção de Preenchimento:</strong> A seção de Necessidades e Dificuldades do estudante está vazia. Documente os aspectos cognitivos e adaptativos do aluno ou gere uma sugestão automática via IA para assegurar a coerência com as estratégias curriculares da SEDUC-GO.
                </span>
              </div>
            )}
            <div className={`border rounded-xl p-3 space-y-3 transition-colors ${
              tentouGerarPdf && !validacaoCampos.necessidadesPreenchidas
                ? 'border-rose-400 bg-rose-50/30 ring-2 ring-rose-300'
                : 'border-amber-200 bg-amber-50/20'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs text-amber-950 uppercase block tracking-wider">
                  Aspectos cognitivo/psíquico (Necessidades/Dificuldades)
                </span>
                {tentouGerarPdf && !validacaoCampos.necessidadesPreenchidas && (
                  <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded border border-rose-300">
                    Obrigatório preencher Necessidades
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-amber-900 block mb-1">
                    Percepção: *
                  </label>
                  <textarea
                    ref={primeiroCampoNecRef}
                    rows={2}
                    className={`w-full text-xs border rounded-lg p-2 bg-white transition-all ${
                      tentouGerarPdf && !validacaoCampos.necessidadesPreenchidas && !necessidadesDificuldades.cognitivoPsiquico.percepcao
                        ? 'border-rose-500 ring-2 ring-rose-400 bg-rose-50/20'
                        : 'border-amber-200'
                    }`}
                    value={necessidadesDificuldades.cognitivoPsiquico.percepcao}
                    onChange={(e) => setNecessidadesDificuldades({
                      ...necessidadesDificuldades,
                      cognitivoPsiquico: { ...necessidadesDificuldades.cognitivoPsiquico, percepcao: e.target.value }
                    })}
                    placeholder="Sensibilidade sensorial ou ruídos..."
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-amber-900 block mb-1">Atenção/concentração:</label>
                  <textarea
                    rows={2}
                    className={`w-full text-xs border rounded-lg p-2 bg-white transition-all ${
                      isCampoNecessidadeInvalido(necessidadesDificuldades.cognitivoPsiquico.atencaoConcentracao)
                        ? 'border-rose-400 ring-1 ring-rose-300 bg-rose-50/15'
                        : 'border-amber-200'
                    }`}
                    value={necessidadesDificuldades.cognitivoPsiquico.atencaoConcentracao}
                    onChange={(e) => setNecessidadesDificuldades({
                      ...necessidadesDificuldades,
                      cognitivoPsiquico: { ...necessidadesDificuldades.cognitivoPsiquico, atencaoConcentracao: e.target.value }
                    })}
                    placeholder="Oscilações de atenção sustentada..."
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-amber-900 block mb-1">Linguagem/comunicação:</label>
                  <textarea
                    rows={2}
                    className={`w-full text-xs border rounded-lg p-2 bg-white transition-all ${
                      isCampoNecessidadeInvalido(necessidadesDificuldades.cognitivoPsiquico.linguagemComunicacao)
                        ? 'border-rose-400 ring-1 ring-rose-300 bg-rose-50/15'
                        : 'border-amber-200'
                    }`}
                    value={necessidadesDificuldades.cognitivoPsiquico.linguagemComunicacao}
                    onChange={(e) => setNecessidadesDificuldades({
                      ...necessidadesDificuldades,
                      cognitivoPsiquico: { ...necessidadesDificuldades.cognitivoPsiquico, linguagemComunicacao: e.target.value }
                    })}
                    placeholder="Interpretação de textos longos ou metafóricos..."
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-amber-900 block mb-1">Memória/abstração/generalização:</label>
                  <textarea
                    rows={2}
                    className={`w-full text-xs border rounded-lg p-2 bg-white transition-all ${
                      isCampoNecessidadeInvalido(necessidadesDificuldades.cognitivoPsiquico.memoriaAbstracaoGeneralizacao)
                        ? 'border-rose-400 ring-1 ring-rose-300 bg-rose-50/15'
                        : 'border-amber-200'
                    }`}
                    value={necessidadesDificuldades.cognitivoPsiquico.memoriaAbstracaoGeneralizacao}
                    onChange={(e) => setNecessidadesDificuldades({
                      ...necessidadesDificuldades,
                      cognitivoPsiquico: { ...necessidadesDificuldades.cognitivoPsiquico, memoriaAbstracaoGeneralizacao: e.target.value }
                    })}
                    placeholder="Necessidade de suporte visual concreto..."
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-amber-900 block mb-1">Criatividade:</label>
                  <textarea
                    rows={2}
                    className={`w-full text-xs border rounded-lg p-2 bg-white transition-all ${
                      isCampoNecessidadeInvalido(necessidadesDificuldades.cognitivoPsiquico.criatividade)
                        ? 'border-rose-400 ring-1 ring-rose-300 bg-rose-50/15'
                        : 'border-amber-200'
                    }`}
                    value={necessidadesDificuldades.cognitivoPsiquico.criatividade}
                    onChange={(e) => setNecessidadesDificuldades({
                      ...necessidadesDificuldades,
                      cognitivoPsiquico: { ...necessidadesDificuldades.cognitivoPsiquico, criatividade: e.target.value }
                    })}
                    placeholder="Dificuldade com comandos abertos..."
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-amber-900 block mb-1">Aspectos psicomotores:</label>
                  <textarea
                    rows={2}
                    className={`w-full text-xs border rounded-lg p-2 bg-white transition-all ${
                      isCampoNecessidadeInvalido(necessidadesDificuldades.cognitivoPsiquico.aspectosPsicomotores)
                        ? 'border-rose-400 ring-1 ring-rose-300 bg-rose-50/15'
                        : 'border-amber-200'
                    }`}
                    value={necessidadesDificuldades.cognitivoPsiquico.aspectosPsicomotores}
                    onChange={(e) => setNecessidadesDificuldades({
                      ...necessidadesDificuldades,
                      cognitivoPsiquico: { ...necessidadesDificuldades.cognitivoPsiquico, aspectosPsicomotores: e.target.value }
                    })}
                    placeholder="Coordenação motora fina para escrita..."
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[11px] font-bold text-amber-900 block mb-1">Raciocínio lógico:</label>
                  <textarea
                    rows={2}
                    className={`w-full text-xs border rounded-lg p-2 bg-white transition-all ${
                      isCampoNecessidadeInvalido(necessidadesDificuldades.cognitivoPsiquico.raciocinioLogico)
                        ? 'border-rose-400 ring-1 ring-rose-300 bg-rose-50/15'
                        : 'border-amber-200'
                    }`}
                    value={necessidadesDificuldades.cognitivoPsiquico.raciocinioLogico}
                    onChange={(e) => setNecessidadesDificuldades({
                      ...necessidadesDificuldades,
                      cognitivoPsiquico: { ...necessidadesDificuldades.cognitivoPsiquico, raciocinioLogico: e.target.value }
                    })}
                    placeholder="Operações matemáticas abstratas sem material..."
                  />
                </div>
              </div>
            </div>

            <div className="border border-amber-200 rounded-xl p-3 bg-amber-50/20 space-y-3">
              <span className="font-extrabold text-xs text-amber-950 uppercase block tracking-wider">
                Habilidades do comportamento adaptativo (Necessidades/Dificuldades)
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-amber-900 block mb-1">Autocuidado:</label>
                  <textarea
                    rows={2}
                    className={`w-full text-xs border rounded-lg p-2 bg-white transition-all ${
                      isCampoNecessidadeInvalido(necessidadesDificuldades.comportamentoAdaptativo.autocuidado)
                        ? 'border-rose-400 ring-1 ring-rose-300 bg-rose-50/15'
                        : 'border-amber-200'
                    }`}
                    value={necessidadesDificuldades.comportamentoAdaptativo.autocuidado}
                    onChange={(e) => setNecessidadesDificuldades({
                      ...necessidadesDificuldades,
                      comportamentoAdaptativo: { ...necessidadesDificuldades.comportamentoAdaptativo, autocuidado: e.target.value }
                    })}
                    placeholder="Organização e conferência de materiais..."
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-amber-900 block mb-1">Autonomia/independência:</label>
                  <textarea
                    rows={2}
                    className={`w-full text-xs border rounded-lg p-2 bg-white transition-all ${
                      isCampoNecessidadeInvalido(necessidadesDificuldades.comportamentoAdaptativo.autonomiaIndependencia)
                        ? 'border-rose-400 ring-1 ring-rose-300 bg-rose-50/15'
                        : 'border-amber-200'
                    }`}
                    value={necessidadesDificuldades.comportamentoAdaptativo.autonomiaIndependencia}
                    onChange={(e) => setNecessidadesDificuldades({
                      ...necessidadesDificuldades,
                      comportamentoAdaptativo: { ...necessidadesDificuldades.comportamentoAdaptativo, autonomiaIndependencia: e.target.value }
                    })}
                    placeholder="Manejo do tempo em tarefas..."
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-amber-900 block mb-1">Habilidades sociais:</label>
                  <textarea
                    rows={2}
                    className={`w-full text-xs border rounded-lg p-2 bg-white transition-all ${
                      isCampoNecessidadeInvalido(necessidadesDificuldades.comportamentoAdaptativo.habilidadesSociais)
                        ? 'border-rose-400 ring-1 ring-rose-300 bg-rose-50/15'
                        : 'border-amber-200'
                    }`}
                    value={necessidadesDificuldades.comportamentoAdaptativo.habilidadesSociais}
                    onChange={(e) => setNecessidadesDificuldades({
                      ...necessidadesDificuldades,
                      comportamentoAdaptativo: { ...necessidadesDificuldades.comportamentoAdaptativo, habilidadesSociais: e.target.value }
                    })}
                    placeholder="Turnos de fala e frustração em dinâmicas..."
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA 4: ÁREA ACADÊMICA – TABELA OFICIAL DE 6 COLUNAS                       */}
        {/* ========================================================================= */}
        {activeTab === 'area_academica' && (
          <div className="space-y-4">
            {diagnosticoCoerencia.estrategiasCriticasVazias ? (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-center gap-2.5 animate-fadeIn">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Atenção de Preenchimento:</strong> Adicione componentes curriculares e preencha o campo <em>"Estratégias / Metodologias"</em> para assegurar o alinhamento pedagógico com as necessidades do estudante.
                </span>
              </div>
            ) : diagnosticoCoerencia.disciplinasSemEstrategia.length > 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-center gap-2.5 animate-fadeIn">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Atenção:</strong> Os seguintes componentes estão sem estratégias pedagógicas preenchidas: <strong>{diagnosticoCoerencia.disciplinasSemEstrategia.join(', ')}</strong>. Preencha-os antes de homologar.
                </span>
              </div>
            ) : null}

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wide">
                  Tabela Oficial de Flexibilizações Curriculares (Anexo 9)
                </h3>
                <p className="text-[11px] text-slate-500">
                  6 Colunas Oficiais • Quebra automática de linha sem ultrapassar bordas
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddDisciplinaArea}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Adicionar Disciplina</span>
              </button>
            </div>

            <div className="space-y-3">
              {areaAcademica.map((item, idx) => (
                <div key={item.id} className="border border-slate-300 rounded-xl p-3 bg-slate-50/60 space-y-2">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                    <span className="font-black text-xs text-slate-800">
                      #{idx + 1} {item.componenteCurricular}
                    </span>
                    {areaAcademica.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveDisciplinaArea(item.id)}
                        className="text-rose-600 hover:text-rose-800 p-1 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        title="Remover componente"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Remover</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Componente Curricular:</label>
                      <input
                        type="text"
                        className="w-full text-xs border border-slate-300 rounded-lg p-1.5 bg-white font-bold"
                        value={item.componenteCurricular}
                        onChange={(e) => handleUpdateDisciplinaArea(item.id, 'componenteCurricular', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Professor:</label>
                      <input
                        type="text"
                        className="w-full text-xs border border-slate-300 rounded-lg p-1.5 bg-white"
                        value={item.professor}
                        onChange={(e) => handleUpdateDisciplinaArea(item.id, 'professor', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Expectativas de Aprendizagem:</label>
                      <textarea
                        rows={2}
                        className="w-full text-xs border border-slate-300 rounded-lg p-1.5 bg-white"
                        value={item.expectativas}
                        onChange={(e) => handleUpdateDisciplinaArea(item.id, 'expectativas', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Conteúdo/s Proposto/s:</label>
                      <textarea
                        rows={2}
                        className="w-full text-xs border border-slate-300 rounded-lg p-1.5 bg-white"
                        value={item.conteudos}
                        onChange={(e) => handleUpdateDisciplinaArea(item.id, 'conteudos', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5 flex items-center justify-between">
                        <span>Estratégias / Metodologias: *</span>
                        {(!item.metodologias || item.metodologias.trim().length < 5) && (
                          <span className={`text-[9px] font-bold px-1 py-0.2 rounded ${
                            tentouGerarPdf && !validacaoCampos.estrategiasPreenchidas
                              ? 'text-rose-700 bg-rose-100 border border-rose-300'
                              : 'text-amber-700 bg-amber-100'
                          }`}>
                            {tentouGerarPdf && !validacaoCampos.estrategiasPreenchidas ? 'Obrigatório Preencher' : 'Campo Crítico'}
                          </span>
                        )}
                      </label>
                      <textarea
                        ref={idx === 0 || (!item.metodologias || item.metodologias.trim().length < 5) ? primeiroCampoEstrategiaRef : undefined}
                        rows={2}
                        className={`w-full text-xs border rounded-lg p-1.5 bg-white transition-all ${
                          tentouGerarPdf && (!item.metodologias || item.metodologias.trim().length < 5)
                            ? 'border-rose-500 bg-rose-50/20 ring-2 ring-rose-400'
                            : !item.metodologias || item.metodologias.trim().length < 5
                            ? 'border-amber-400 bg-amber-50/20 ring-1 ring-amber-300'
                            : 'border-slate-300'
                        }`}
                        value={item.metodologias}
                        onChange={(e) => handleUpdateDisciplinaArea(item.id, 'metodologias', e.target.value)}
                        placeholder="Estratégias pedagógicas e metodologias adaptadas..."
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Procedimentos de Avaliação:</label>
                      <textarea
                        rows={2}
                        className="w-full text-xs border border-slate-300 rounded-lg p-1.5 bg-white"
                        value={item.avaliacao}
                        onChange={(e) => handleUpdateDisciplinaArea(item.id, 'avaliacao', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA 5: VALIDAÇÃO INSTITUCIONAL E ASSINATURAS                              */}
        {/* ========================================================================= */}
        {activeTab === 'assinaturas' && (
          <div className="space-y-4">
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
              <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wide">
                Validação Institucional e Assinaturas Oficiais (Anexo 9)
              </h3>
              <p className="text-[11px] text-slate-500">
                Campos oficiais destinados à equipe escolar e homologação da Coordenação.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Professor(a) de AEE:</label>
                  <input
                    type="text"
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                    value={assinaturasOficiais.professorAee}
                    onChange={(e) => setAssinaturasOficiais({ ...assinaturasOficiais, professorAee: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Coordenação Pedagógica:</label>
                  <input
                    type="text"
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                    value={assinaturasOficiais.coordenacaoPedagogica}
                    onChange={(e) => setAssinaturasOficiais({ ...assinaturasOficiais, coordenacaoPedagogica: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Profissional de Apoio Escolar (colaborador):</label>
                  <input
                    type="text"
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                    value={assinaturasOficiais.profissionalApoio}
                    onChange={(e) => setAssinaturasOficiais({ ...assinaturasOficiais, profissionalApoio: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Professores Regentes:</label>
                  <input
                    type="text"
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                    value={assinaturasOficiais.professoresRegentes}
                    onChange={(e) => setAssinaturasOficiais({ ...assinaturasOficiais, professoresRegentes: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Gestor:</label>
                  <input
                    type="text"
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                    value={assinaturasOficiais.gestor}
                    onChange={(e) => setAssinaturasOficiais({ ...assinaturasOficiais, gestor: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Local:</label>
                  <input
                    type="text"
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                    value={assinaturasOficiais.local}
                    onChange={(e) => setAssinaturasOficiais({ ...assinaturasOficiais, local: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* RODAPÉ DO MODAL COM ALERTA VISUAL E BOTÕES DE AÇÃO                       */}
        {/* ========================================================================= */}
        <div className="border-t border-slate-200 pt-4 mt-4 space-y-3">
          {/* ALERTA VISUAL NO RODAPÉ DO MODAL: CAMPOS CRÍTICOS PENDENTES (ANEXO 9) */}
          {!validacaoCampos.valido && (
            <div 
              role="alert" 
              aria-live="assertive"
              className="p-3.5 bg-amber-50/95 border-2 border-amber-400 rounded-xl text-amber-950 flex items-start gap-3 animate-fadeIn shadow-2xs"
            >
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                  <span className="font-black text-xs uppercase tracking-wide text-amber-900 flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    Atenção: Campos Críticos Pendentes (Anexo 9 SEDUC-GO)
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-200 text-amber-900 rounded font-mono">
                    Geração de PDF Bloqueada
                  </span>
                </div>
                <p className="text-[11px] text-amber-900 mb-2 leading-relaxed">
                  Preencha os campos obrigatórios ‘Necessidades’ e ‘Estratégias’ antes de gerar o PDF do PEI. Conforme estritamente as orientações do <strong>Anexo 9 da SEDUC-GO</strong>, a emissão do documento oficial é bloqueada até que ambas as seções estejam devidamente estruturadas.
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {!validacaoCampos.necessidadesPreenchidas && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('necessidades')}
                      className="text-[10.5px] font-bold px-2.5 py-1 bg-amber-200 hover:bg-amber-300 text-amber-950 rounded-lg flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                    >
                      <span>Preencher Necessidades (Aba 3)</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  )}
                  {!validacaoCampos.estrategiasPreenchidas && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('area_academica')}
                      className="text-[10.5px] font-bold px-2.5 py-1 bg-amber-200 hover:bg-amber-300 text-amber-950 rounded-lg flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                    >
                      <span>Preencher Estratégias (Aba 4)</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleVisualizarA4}
                disabled={!identification.studentName}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Eye className="h-4 w-4" />
                <span>Visualizar Impressão A4</span>
              </button>
              <button
                type="button"
                onClick={handleExportarPdf}
                disabled={exportandoPdf || !identification.studentName || !validacaoCampos.valido}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs ${
                  !validacaoCampos.valido
                    ? 'bg-slate-200 text-slate-500 cursor-not-allowed border border-slate-300'
                    : 'bg-rose-700 hover:bg-rose-800 text-white cursor-pointer'
                }`}
                title={
                  !validacaoCampos.valido
                    ? 'Atenção: Campos Críticos Pendentes. Preencha Necessidades e Estratégias (Anexo 9) para liberar a geração do PDF.'
                    : 'Baixar PDF Oficial'
                }
              >
                {exportandoPdf ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Gerando PDF...</span>
                  </>
                ) : (
                  <>
                    <FileDown className="h-4 w-4" />
                    <span>Baixar PDF Oficial</span>
                    {!validacaoCampos.valido && (
                      <span className="ml-1 text-[9px] bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded font-mono font-bold">
                        Bloqueado
                      </span>
                    )}
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={salvando || !identification.studentName}
                className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                {salvando ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Salvar PEI no Sistema</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
