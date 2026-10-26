/**
 * AdaptaEdu Escolar - Sistema de Atividades Pedagógicas Adaptadas (SEDUC-GO)
 * Módulo: dashboardPdfService.ts
 * 
 * Pipeline de Geração:
 * 1. Métricas (calcularMetricasEstudantes): Função pura que normaliza datas, filtra por turma/período e calcula KPIs.
 * 2. Renderização Modular (jsPDF): Montagem estruturada do documento oficial A4 com mini-cabeçalhos determinísticos.
 * 3. Finalização Segura: Sanitização de nome de arquivo, liberação periódica da thread para turmas grandes e download via doc.save().
 */

import { jsPDF } from 'jspdf';
import { 
  AtividadeAdaptada, 
  Estudante, 
  EscolaConfig, 
  AuthorizedUser, 
  RegistroAcompanhamentoApoio,
  PerfilPedagogico 
} from '../types';
import { getLogoEscolaBase64 } from '../assets/branding/logoEscolaBase64';
import { sanitizarNomeArquivo } from './atividadeA4PdfService';

// ============================================================================
// CONSTANTES DE TEMA VISUAL (THEME)
// ============================================================================

export const THEME = {
  colors: {
    primary: [6, 95, 70] as [number, number, number],       // #065f46 (Esmeralda escuro institucional)
    primaryLight: [240, 253, 244] as [number, number, number],
    slateBorder: [203, 213, 225] as [number, number, number], // #cbd5e1
    slateBg: [248, 250, 252] as [number, number, number],     // #f8fafc
    slateCard: [241, 245, 249] as [number, number, number],   // #f1f5f9
    textDark: [15, 23, 42] as [number, number, number],       // #0f172a
    textMedium: [51, 65, 85] as [number, number, number],     // #334155
    textMuted: [100, 116, 139] as [number, number, number],   // #64748b
    textLight: [148, 163, 184] as [number, number, number],   // #94a3b8
    white: [255, 255, 255] as [number, number, number],
    success: [16, 120, 60] as [number, number, number],
    warning: [180, 100, 10] as [number, number, number],
    danger: [140, 30, 30] as [number, number, number],
    divider: [226, 232, 240] as [number, number, number],     // #e2e8f0
  },
  fonts: {
    title: 9.5,
    subtitle: 8.5,
    heading: 7.5,
    body: 7.0,
    small: 6.8,
    caption: 6.0,
    kpiValue: 10.5,
    kpiLabel: 6.2,
    footer: 6.5,
  },
  margins: {
    x: 14,
    top: 12,
    bottom: 16,
  },
  rowHeight: 7,
  headerHeight: 24,
  kpiCardHeight: 14,
} as const;

// ============================================================================
// DICIONÁRIO DE STRINGS CENTRALIZADAS (I18N)
// ============================================================================

export const I18N = {
  header: {
    defaultSchoolName: 'COLÉGIO ESTADUAL OLYNTO PEREIRA DE CASTRO',
    defaultLocation: 'Goiás • SEDUC-GO • Sistema de Atividades Pedagógicas Adaptadas',
    title: 'RELATÓRIO DE PROGRESSO E ENGAJAMENTO DOS ESTUDANTES',
    emissionPrefix: 'Emissão',
    responsiblePrefix: 'Responsável',
    defaultResponsible: 'Coordenação Pedagógica',
  },
  auditParams: {
    sectionTitle: 'PARÂMETROS DE AUDITORIA E FILTRAGEM:',
    allClasses: 'Todas as Turmas (Visão Geral)',
    classPrefix: 'Turma',
    periodPrefix: 'Período',
    totalStudentsPrefix: 'Total de Alunos no Escopo',
  },
  kpis: {
    activitiesTitle: 'ATIVIDADES NO PERÍODO',
    activitiesSubtitle: 'concluídas',
    completionRateTitle: 'TAXA DE CONCLUSÃO',
    completionRateSubtitle: 'média da turma',
    peiAlignmentTitle: 'ALINHAMENTO AO PEI',
    peiAlignmentSubtitle: 'conformidade SEDUC',
    activeStudentsTitle: 'ALUNOS COM ATIVIDADES',
    activeStudentsSubtitle: 'engajamento ativo',
  },
  table: {
    student: 'ESTUDANTE',
    class: 'TURMA',
    diagnosis: 'LAUDO / CID',
    typography: 'TIPOGRAFIA',
    activities: 'ATIV.',
    progress: 'PROG.',
    engagement: 'ENGAJAMENTO',
    fontBastao: 'Bastão (Lexend)',
    fontCursiva: 'Cursiva',
    evaluating: 'Em avaliação',
  },
  pedagogicalOpinion: {
    title: 'PARECER PEDAGÓGICO CONSOLIDADO E DIRETRIZES DA EDUCAÇÃO ESPECIAL (SEDUC-GO):',
    point1: '1. As atividades adaptadas com "Letra Bastão" e tipografia Lexend apresentam maior índice de engajamento e menor dispersão motora.',
    point2: '2. Recomenda-se a continuidade das mediações conjuntas entre Professor Regente e Profissional de Apoio com base nas matrizes SEDUC-GO 2026.',
    point3: '3. Relatório homologado para fins de conselho de classe, portfólio da Sala de Recursos Multifuncionais (AEE) e coordenação.',
    supportRecordsPrefix: 'Registros do Diário de Apoio consultados:',
    supportRecordsSuffix: 'registros diários no período analisado.',
    peiProfilesPrefix: 'Perfis pedagógicos da Educação Especial mapeados:',
  },
  signatures: {
    teacherRole: 'Docente Responsável',
    defaultTeacherTitle: 'Professor(a) Regente',
    supportRole: 'Profissional de Apoio Escolar',
    supportSubtitle: 'Acompanhamento e Mediação Diária',
    coordRole: 'Coordenação Pedagógica / AEE',
    coordSubtitle: 'Homologação SEDUC-GO',
  },
  footer: {
    left: 'AdaptaEdu Escolar • Sistema Oficial de Atividades Pedagógicas Adaptadas • SEDUC-GO 2026',
    pagePrefix: 'Página',
    pageOf: 'de',
  },
  errors: {
    noDom: 'Ambiente sem DOM (execução em servidor não suportada para download direto)',
    renderFailed: 'Falha durante a renderização do PDF analítico',
  },
} as const;

// ============================================================================
// TIPOS E INTERFACES PÚBLICAS
// ============================================================================

export type AtividadeAdaptadaComFlag = AtividadeAdaptada & { concluida?: boolean };

export interface ParametrosExportacaoDashboard {
  escolaConfig?: Partial<EscolaConfig>;
  turmaSelecionada: string;
  periodoDescricao: string;
  dataInicio?: string;
  dataFim?: string;
  estudantes: Estudante[];
  atividades: AtividadeAdaptada[];
  registrosApoio?: RegistroAcompanhamentoApoio[];
  perfisPedagogicos?: PerfilPedagogico[];
  currentUser: AuthorizedUser | null;
  /** Callback opcional de progresso (0-100) para relatórios extensos em rede */
  onProgress?: (pct: number) => void;
}

export interface MetricasAlunoDashboard {
  estudante: Estudante;
  totalAtividades: number;
  atividadesConcluidas: number;
  taxaConclusao: number;
  alinhadasAoPei: number;
  nivelEngajamento: string;
  formatoLetra: 'bastao' | 'cursiva';
  ultimaAtividadeData?: string;
}

export interface ResultadoExportacaoDashboard {
  success: boolean;
  fileName: string;
  error?: string;
}

// Detecção segura do ambiente de desenvolvimento
const isDev = (typeof import.meta !== 'undefined' && Boolean((import.meta as { env?: { DEV?: boolean } }).env?.DEV)) ||
  (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production');

// ============================================================================
// FUNÇÕES PURAS AUXILIARES E HELPERS (TESTÁVEIS)
// ============================================================================

/**
 * Verifica se a atividade foi finalizada/revisada com type guard seguro.
 */
export function estaConcluida(a: AtividadeAdaptada): boolean {
  if (a.status === 'Revisada') return true;
  if ('concluida' in a) {
    const val = (a as { concluida?: unknown }).concluida;
    return typeof val === 'boolean' && val === true;
  }
  return false;
}

/**
 * Obtém o formato tipográfico explicitamente declarado no registro do estudante, se houver.
 */
export function obterFormatoLetraDeclarado(est: Estudante): 'bastao' | 'cursiva' | null {
  if ('formatoLetra' in est) {
    const val = (est as { formatoLetra?: unknown }).formatoLetra;
    if (val === 'cursiva' || val === 'bastao') {
      return val;
    }
  }
  return null;
}

/**
 * Regra determinística de inferência tipográfica para acessibilidade curricular.
 */
export function inferirFormatoLetra(estudante: Estudante): 'bastao' | 'cursiva' {
  const declarado = obterFormatoLetraDeclarado(estudante);
  if (declarado === 'cursiva') {
    return 'cursiva';
  }
  return 'bastao';
}

/**
 * Calcula o nível de engajamento do estudante com base nos registros do apoio e na taxa de conclusão.
 */
export function calcularNivelEngajamento(
  logs: RegistroAcompanhamentoApoio[],
  taxa: number,
  temAtividades: boolean
): string {
  if (logs.length > 0) {
    const comDificuldade = logs.filter(l => 
      l.conseguiuRealizarAtividade === 'Não' || 
      l.conseguiuRealizarAtividade === 'Parcialmente' || 
      l.demonstrouIrritabilidadeOuSinais === 'Sim' || 
      l.nivelAutonomia === 'Com Mediação Física/Visual' || 
      l.nivelAutonomia === 'Não Realizou'
    ).length;

    if (comDificuldade > logs.length / 2) return 'Apoio Constante';
    if (comDificuldade > 0) return 'Mediação Pontual';
    return 'Autônomo c/ Apoio';
  }

  if (taxa >= 80) {
    return 'Alto Engajamento';
  }
  if (taxa >= 40) {
    return 'Médio Engajamento';
  }
  if (temAtividades) {
    return 'Necessita Estímulo';
  }
  return 'Sem Atividades';
}

/**
 * Normaliza e valida rigorosamente qualquer string de data para o padrão ISO (YYYY-MM-DD).
 * Retorna null se a data for inválida ou inconsistente.
 */
export function normalizarDataParaIso(input?: string): string | null {
  if (!input || typeof input !== 'string') return null;
  const limpo = input.trim();
  if (!limpo) return null;

  // Formato brasileiro DD/MM/YYYY ou D/M/YYYY
  if (limpo.includes('/')) {
    const partes = limpo.split('/');
    if (partes.length !== 3) return null;
    const [dStr, mStr, yStr] = partes;
    const d = parseInt(dStr ?? '', 10);
    const m = parseInt(mStr ?? '', 10);
    const y = parseInt(yStr ?? '', 10);

    if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
    if (y < 1900 || y > 2100) return null;
    if (m < 1 || m > 12) return null;
    if (d < 1 || d > 31) return null;

    const diasNoMes = new Date(y, m, 0).getDate();
    if (d > diasNoMes) return null;

    return `${y.toString().padStart(4, '0')}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
  }

  // Formato com marcador de hora ISO (YYYY-MM-DDTHH:mm:ss...)
  if (limpo.includes('T')) {
    const parteData = limpo.split('T')[0] ?? '';
    const partes = parteData.split('-');
    if (partes.length === 3) {
      const [y, m, d] = partes.map(p => parseInt(p, 10));
      if (!isNaN(y ?? 0) && !isNaN(m ?? 0) && !isNaN(d ?? 0) && (m ?? 0) >= 1 && (m ?? 0) <= 12 && (d ?? 0) >= 1 && (d ?? 0) <= 31) {
        return parteData;
      }
    }
  }

  // Formato padrão ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(limpo)) {
    const [y, m, d] = limpo.split('-').map(p => parseInt(p, 10));
    if (!isNaN(y ?? 0) && !isNaN(m ?? 0) && !isNaN(d ?? 0) && (m ?? 0) >= 1 && (m ?? 0) <= 12 && (d ?? 0) >= 1 && (d ?? 0) <= 31) {
      return limpo;
    }
  }

  return null;
}

/**
 * Cria nome de arquivo seguro para downloads em rede (sem caracteres especiais, limitado e com timestamp compacto).
 */
export function gerarNomeArquivoSeguro(turmaSelecionada: string): string {
  const base = sanitizarNomeArquivo(turmaSelecionada) || 'Geral';
  const semAcentos = base
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[/\\:*?"<>|]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '');

  const turmaCurta = semAcentos.slice(0, 40) || 'Geral';

  const agora = new Date();
  const y = agora.getFullYear();
  const m = String(agora.getMonth() + 1).padStart(2, '0');
  const d = String(agora.getDate()).padStart(2, '0');
  const hh = String(agora.getHours()).padStart(2, '0');
  const mm = String(agora.getMinutes()).padStart(2, '0');
  const ss = String(agora.getSeconds()).padStart(2, '0');
  const timestamp = `${y}${m}${d}-${hh}${mm}${ss}`;

  const nome = `Relatorio_Progresso_${turmaCurta}_${timestamp}.pdf`;
  return nome.slice(0, 120);
}

// ============================================================================
// CÁLCULO DE MÉTRICAS PURAS
// ============================================================================

/**
 * Calcula métricas analíticas e consolidadas dos estudantes para visualização em tela e emissão de PDF.
 */
export function calcularMetricasEstudantes(
  estudantes: Estudante[],
  atividades: AtividadeAdaptada[],
  registrosApoio: RegistroAcompanhamentoApoio[] = [],
  turmaFiltro: string = 'todas',
  dataInicio?: string,
  dataFim?: string
): {
  alunosMetricas: MetricasAlunoDashboard[];
  resumoGeral: {
    totalAlunos: number;
    totalAtividades: number;
    totalConcluidas: number;
    taxaMediaConclusao: number;
    taxaAlinhamentoPei: number;
    turmasPresentes: string[];
  };
} {
  const dataIniIso = dataInicio ? normalizarDataParaIso(dataInicio) || dataInicio : undefined;
  const dataFimIso = dataFim ? normalizarDataParaIso(dataFim) || dataFim : undefined;

  const atividadesFiltradas = atividades.filter(ativ => {
    if (turmaFiltro !== 'todas' && ativ.turma !== turmaFiltro) return false;
    if (dataIniIso || dataFimIso) {
      const dataIso = normalizarDataParaIso(ativ.dataCriacao);
      if (!dataIso) return false; // Data inconsistente descartada com segurança
      if (dataIniIso && dataIso < dataIniIso) return false;
      if (dataFimIso && dataIso > dataFimIso) return false;
    }
    return true;
  });

  const estudantesFiltrados = estudantes.filter(e => {
    if (turmaFiltro === 'todas') return true;
    return e.turma === turmaFiltro || e.anoSerie === turmaFiltro;
  });

  const alunosMetricas: MetricasAlunoDashboard[] = estudantesFiltrados.map(est => {
    const ativsDoAluno = atividadesFiltradas.filter(a => a.estudanteId === est.id);
    const concluidas = ativsDoAluno.filter(estaConcluida);
    const alinhadasPei = ativsDoAluno.filter(a => Boolean(a.alinhadaAoPei));
    const taxa = ativsDoAluno.length > 0 ? Math.round((concluidas.length / ativsDoAluno.length) * 100) : 0;

    const logsAluno = registrosApoio.filter(r => r.studentId === est.id);
    const nivelEngajamento = calcularNivelEngajamento(logsAluno, taxa, ativsDoAluno.length > 0);
    const formatoLetra = inferirFormatoLetra(est);

    const ultimaAtividade = ativsDoAluno.length > 0 ? ativsDoAluno[ativsDoAluno.length - 1] : undefined;
    const ultimaData = ultimaAtividade?.dataCriacao;

    return {
      estudante: est,
      totalAtividades: ativsDoAluno.length,
      atividadesConcluidas: concluidas.length,
      taxaConclusao: taxa,
      alinhadasAoPei: alinhadasPei.length,
      nivelEngajamento,
      formatoLetra,
      ultimaAtividadeData: ultimaData,
    };
  });

  const totalAtividades = atividadesFiltradas.length;
  const totalConcluidas = atividadesFiltradas.filter(estaConcluida).length;
  const totalAlinhadas = atividadesFiltradas.filter(a => Boolean(a.alinhadaAoPei)).length;
  const taxaMediaConclusao = totalAtividades > 0 ? Math.round((totalConcluidas / totalAtividades) * 100) : 0;
  const taxaAlinhamentoPei = totalAtividades > 0 ? Math.round((totalAlinhadas / totalAtividades) * 100) : 0;
  
  const turmasPresentes = Array.from(
    new Set(
      estudantesFiltrados
        .map(e => e.turma || e.anoSerie || 'Não informada')
        .filter(Boolean)
    )
  ).sort();

  return {
    alunosMetricas,
    resumoGeral: {
      totalAlunos: estudantesFiltrados.length,
      totalAtividades,
      totalConcluidas,
      taxaMediaConclusao,
      taxaAlinhamentoPei,
      turmasPresentes,
    },
  };
}

// ============================================================================
// RENDERIZADORES MODULARES DO DOCUMENTO OFICIAL (jsPDF)
// ============================================================================

interface RenderContext {
  doc: jsPDF;
  pageWidth: number;
  pageHeight: number;
  marginX: number;
  contentWidth: number;
  escolaConfig?: Partial<EscolaConfig>;
  turmaSelecionada: string;
  periodoDescricao: string;
  currentUser: AuthorizedUser | null;
  perfisPedagogicos?: PerfilPedagogico[];
  registrosApoio?: RegistroAcompanhamentoApoio[];
}

/**
 * Renderiza o cabeçalho institucional com logotipo oficial e identificação escolar.
 */
function renderHeaderInstitucional(currentY: number, ctx: RenderContext): number {
  const { doc, marginX, contentWidth, escolaConfig, currentUser } = ctx;
  const headerHeight = THEME.headerHeight;

  doc.setDrawColor(...THEME.colors.textMedium);
  doc.setLineWidth(0.35);
  doc.setFillColor(...THEME.colors.white);
  doc.rect(marginX, currentY, contentWidth, headerHeight, 'FD');

  const logoBase64 = getLogoEscolaBase64();
  let textStartX = marginX + 3;

  if (logoBase64 && logoBase64.startsWith('data:image')) {
    try {
      const mime = logoBase64.startsWith('data:image/jpeg') || logoBase64.startsWith('data:image/jpg')
        ? 'JPEG'
        : 'PNG';
      doc.addImage(logoBase64, mime, marginX + 2, currentY + 2, 28, 9, undefined, 'FAST');
      textStartX = marginX + 33;
    } catch (err) {
      if (isDev) {
        console.warn('Aviso: Falha ao desenhar logo institucional no cabeçalho:', err);
      }
      textStartX = marginX + 3;
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(THEME.fonts.subtitle);
  doc.setTextColor(...THEME.colors.textDark);
  doc.text((escolaConfig?.nome || I18N.header.defaultSchoolName).toUpperCase(), textStartX, currentY + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(THEME.fonts.body);
  doc.setTextColor(...THEME.colors.textMedium);
  doc.text(`${escolaConfig?.municipio || 'Goiás'} • ${I18N.header.defaultLocation}`, textStartX, currentY + 8.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(THEME.fonts.title);
  doc.setTextColor(...THEME.colors.primary);
  doc.text(I18N.header.title, textStartX, currentY + 13.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(THEME.fonts.body);
  doc.setTextColor(...THEME.colors.textMuted);
  const dataEmissao = new Date().toLocaleDateString('pt-BR', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  doc.text(`${I18N.header.emissionPrefix}: ${dataEmissao} | ${I18N.header.responsiblePrefix}: ${currentUser?.name || I18N.header.defaultResponsible}`, textStartX, currentY + 17.5);

  return currentY + headerHeight + 3.5;
}

/**
 * Renderiza o bloco de parâmetros de auditoria e filtros aplicados.
 */
function renderParametrosAuditoria(currentY: number, ctx: RenderContext, totalAlunos: number): number {
  const { doc, marginX, contentWidth, turmaSelecionada, periodoDescricao } = ctx;

  doc.setFillColor(...THEME.colors.slateBg);
  doc.setDrawColor(...THEME.colors.slateBorder);
  doc.setLineWidth(0.2);
  doc.rect(marginX, currentY, contentWidth, 12, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(THEME.fonts.heading);
  doc.setTextColor(...THEME.colors.textDark);
  doc.text(I18N.auditParams.sectionTitle, marginX + 3, currentY + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(THEME.fonts.body);
  doc.setTextColor(...THEME.colors.textMedium);
  const turmaTexto = turmaSelecionada === 'todas' 
    ? I18N.auditParams.allClasses 
    : `${I18N.auditParams.classPrefix}: ${turmaSelecionada}`;
  doc.text(`• ${turmaTexto}`, marginX + 3, currentY + 8.5);
  doc.text(`• ${I18N.auditParams.periodPrefix}: ${periodoDescricao}`, marginX + 65, currentY + 8.5);
  doc.text(`• ${I18N.auditParams.totalStudentsPrefix}: ${totalAlunos}`, marginX + 135, currentY + 8.5);

  return currentY + 15;
}

/**
 * Renderiza os quatro cartões consolidados de KPIs.
 */
function renderKpis(
  currentY: number, 
  ctx: RenderContext, 
  resumoGeral: { totalAlunos: number; totalAtividades: number; totalConcluidas: number; taxaMediaConclusao: number; taxaAlinhamentoPei: number },
  alunosMetricas: MetricasAlunoDashboard[]
): number {
  const { doc, marginX, contentWidth } = ctx;
  const cardW = (contentWidth - 6) / 4;
  const cardH = THEME.kpiCardHeight;

  const kpis = [
    { 
      label: I18N.kpis.activitiesTitle, 
      val: `${resumoGeral.totalAtividades}`, 
      sub: `${resumoGeral.totalConcluidas} ${I18N.kpis.activitiesSubtitle}` 
    },
    { 
      label: I18N.kpis.completionRateTitle, 
      val: `${resumoGeral.taxaMediaConclusao}%`, 
      sub: I18N.kpis.completionRateSubtitle 
    },
    { 
      label: I18N.kpis.peiAlignmentTitle, 
      val: `${resumoGeral.taxaAlinhamentoPei}%`, 
      sub: I18N.kpis.peiAlignmentSubtitle 
    },
    { 
      label: I18N.kpis.activeStudentsTitle, 
      val: `${alunosMetricas.filter(a => a.totalAtividades > 0).length}/${resumoGeral.totalAlunos}`, 
      sub: I18N.kpis.activeStudentsSubtitle 
    },
  ];

  kpis.forEach((kpi, idx) => {
    const kpiX = marginX + idx * (cardW + 2);
    doc.setFillColor(...THEME.colors.slateCard);
    doc.setDrawColor(...THEME.colors.slateBorder);
    doc.rect(kpiX, currentY, cardW, cardH, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(THEME.fonts.kpiLabel);
    doc.setTextColor(...THEME.colors.textMuted);
    doc.text(kpi.label, kpiX + 2.5, currentY + 3.8);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(THEME.fonts.kpiValue);
    doc.setTextColor(...THEME.colors.textDark);
    doc.text(kpi.val, kpiX + 2.5, currentY + 8.8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(THEME.fonts.caption);
    doc.setTextColor(...THEME.colors.textMuted);
    doc.text(kpi.sub, kpiX + 2.5, currentY + 12);
  });

  return currentY + cardH + 4;
}

/**
 * Renderiza o cabeçalho escuro da tabela analítica.
 */
function renderCabecalhoTabela(currentY: number, ctx: RenderContext, colX: Record<string, number>): number {
  const { doc, marginX, contentWidth } = ctx;
  doc.setFillColor(...THEME.colors.primary);
  doc.rect(marginX, currentY, contentWidth, 6, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(THEME.fonts.body);
  doc.setTextColor(...THEME.colors.white);

  doc.text(I18N.table.student, colX.nome ?? marginX, currentY + 4.2);
  doc.text(I18N.table.class, colX.turma ?? marginX, currentY + 4.2);
  doc.text(I18N.table.diagnosis, colX.laudo ?? marginX, currentY + 4.2);
  doc.text(I18N.table.typography, colX.formato ?? marginX, currentY + 4.2);
  doc.text(I18N.table.activities, colX.ativs ?? marginX, currentY + 4.2);
  doc.text(I18N.table.progress, colX.progresso ?? marginX, currentY + 4.2);
  doc.text(I18N.table.engagement, colX.engajamento ?? marginX, currentY + 4.2);

  return currentY + 6;
}

/**
 * Renderiza as linhas da tabela de estudantes de forma assíncrona, liberando a thread principal.
 */
async function renderTabelaAlunos(
  startY: number,
  ctx: RenderContext,
  alunosMetricas: MetricasAlunoDashboard[],
  checkPageBreak: (neededHeight: number) => void,
  onProgress?: (pct: number) => void
): Promise<number> {
  const { doc, marginX, contentWidth } = ctx;
  let currentY = startY;

  const colX: Record<string, number> = {
    nome: marginX + 3,
    turma: marginX + 52,
    laudo: marginX + 74,
    formato: marginX + 112,
    ativs: marginX + 132,
    progresso: marginX + 150,
    engajamento: marginX + 168,
  };

  checkPageBreak(25);
  currentY = renderCabecalhoTabela(currentY, ctx, colX);

  const CHUNK_SIZE = 50;
  for (let index = 0; index < alunosMetricas.length; index++) {
    const aluno = alunosMetricas[index];
    if (!aluno) continue;

    // Desbloqueia periodicamente a thread para turmas grandes
    if (index > 0 && index % CHUNK_SIZE === 0) {
      if (onProgress) {
        onProgress(Math.round((index / alunosMetricas.length) * 100));
      }
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    checkPageBreak(8);

    const isEven = index % 2 === 0;
    doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
    doc.setDrawColor(...THEME.colors.divider);
    doc.setLineWidth(0.15);
    doc.rect(marginX, currentY, contentWidth, THEME.rowHeight, 'FD');

    // Nome com proteção de largura
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(...THEME.colors.textDark);
    const linhasNome = doc.splitTextToSize(aluno.estudante.nome || '', 46);
    const nomeLimpo = linhasNome[0] || '';
    doc.text(nomeLimpo, colX.nome ?? marginX, currentY + 4.8);

    // Turma / Série
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(THEME.fonts.body);
    doc.setTextColor(...THEME.colors.textMedium);
    const turmaStr = aluno.estudante.turma || aluno.estudante.anoSerie || '-';
    doc.text(turmaStr, colX.turma ?? marginX, currentY + 4.8);

    // Laudo com proteção de largura
    const linhasLaudo = doc.splitTextToSize(aluno.estudante.laudo || I18N.table.evaluating, 35);
    const laudoCurto = linhasLaudo[0] || I18N.table.evaluating;
    doc.text(laudoCurto, colX.laudo ?? marginX, currentY + 4.8);

    // Tipografia (Bastão vs Cursiva)
    const ehBastao = aluno.formatoLetra === 'bastao';
    doc.setFont('helvetica', ehBastao ? 'bold' : 'normal');
    doc.setTextColor(ehBastao ? 6 : 51, ehBastao ? 95 : 65, ehBastao ? 70 : 85);
    doc.text(ehBastao ? I18N.table.fontBastao : I18N.table.fontCursiva, colX.formato ?? marginX, currentY + 4.8);

    // Quantidade de Atividades Concluídas/Total
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...THEME.colors.textDark);
    doc.text(`${aluno.atividadesConcluidas}/${aluno.totalAtividades}`, colX.ativs ?? marginX, currentY + 4.8);

    // Taxa de Conclusão com Cor Semântica
    doc.setFont('helvetica', 'bold');
    if (aluno.taxaConclusao >= 70) doc.setTextColor(...THEME.colors.success);
    else if (aluno.taxaConclusao >= 40) doc.setTextColor(...THEME.colors.warning);
    else doc.setTextColor(...THEME.colors.danger);
    doc.text(`${aluno.taxaConclusao}%`, colX.progresso ?? marginX, currentY + 4.8);

    // Nível de Engajamento
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(THEME.fonts.small);
    doc.setTextColor(...THEME.colors.textMedium);
    doc.text(aluno.nivelEngajamento, colX.engajamento ?? marginX, currentY + 4.8);

    currentY += THEME.rowHeight;
  }

  if (onProgress) onProgress(100);
  return currentY + 4;
}

/**
 * Renderiza o parecer pedagógico consolidado e diretrizes SEDUC-GO, enriquecido com perfis pedagógicos.
 */
function renderParecerPedagogico(
  currentY: number, 
  ctx: RenderContext, 
  registrosApoioCount: number,
  perfisPedagogicos: PerfilPedagogico[]
): number {
  const { doc, marginX, contentWidth } = ctx;
  const temPerfis = perfisPedagogicos && perfisPedagogicos.length > 0;
  const boxHeight = temPerfis ? 28 : 24;

  doc.setFillColor(...THEME.colors.slateBg);
  doc.setDrawColor(...THEME.colors.slateBorder);
  doc.rect(marginX, currentY, contentWidth, boxHeight, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(THEME.fonts.heading);
  doc.setTextColor(...THEME.colors.textDark);
  doc.text(I18N.pedagogicalOpinion.title, marginX + 3, currentY + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(THEME.fonts.small);
  doc.setTextColor(...THEME.colors.textMedium);
  doc.text(I18N.pedagogicalOpinion.point1, marginX + 3, currentY + 9);
  doc.text(I18N.pedagogicalOpinion.point2, marginX + 3, currentY + 13);
  doc.text(I18N.pedagogicalOpinion.point3, marginX + 3, currentY + 17);
  doc.text(`${I18N.pedagogicalOpinion.supportRecordsPrefix} ${registrosApoioCount} ${I18N.pedagogicalOpinion.supportRecordsSuffix}`, marginX + 3, currentY + 21);

  if (temPerfis) {
    const aprovados = perfisPedagogicos.filter(p => p.status === 'aprovado').length;
    doc.text(`${I18N.pedagogicalOpinion.peiProfilesPrefix} ${perfisPedagogicos.length} aluno(s) (${aprovados} homologados no AEE).`, marginX + 3, currentY + 25);
  }

  return currentY + boxHeight + 4;
}

/**
 * Renderiza o quadro de homologação com assinaturas do Professor, Apoio e Coordenação.
 */
function renderAssinaturas(currentY: number, ctx: RenderContext): number {
  const { doc, marginX, contentWidth, currentUser } = ctx;
  const signW = (contentWidth - 8) / 3;
  const signY = currentY + 12;

  // 1. Docente Responsável
  doc.setDrawColor(...THEME.colors.textMedium);
  doc.setLineWidth(0.3);
  doc.line(marginX, signY, marginX + signW, signY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(THEME.fonts.body);
  doc.setTextColor(...THEME.colors.textDark);
  doc.text(currentUser?.name || I18N.signatures.defaultTeacherTitle, marginX + signW / 2, signY + 3.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(THEME.fonts.caption);
  doc.setTextColor(...THEME.colors.textMuted);
  doc.text(I18N.signatures.teacherRole, marginX + signW / 2, signY + 6.5, { align: 'center' });

  // 2. Profissional de Apoio
  const sign2X = marginX + signW + 4;
  doc.line(sign2X, signY, sign2X + signW, signY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(THEME.fonts.body);
  doc.setTextColor(...THEME.colors.textDark);
  doc.text(I18N.signatures.supportRole, sign2X + signW / 2, signY + 3.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(THEME.fonts.caption);
  doc.setTextColor(...THEME.colors.textMuted);
  doc.text(I18N.signatures.supportSubtitle, sign2X + signW / 2, signY + 6.5, { align: 'center' });

  // 3. Coordenação Pedagógica / AEE
  const sign3X = sign2X + signW + 4;
  doc.line(sign3X, signY, sign3X + signW, signY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(THEME.fonts.body);
  doc.setTextColor(...THEME.colors.textDark);
  doc.text(I18N.signatures.coordRole, sign3X + signW / 2, signY + 3.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(THEME.fonts.caption);
  doc.setTextColor(...THEME.colors.textMuted);
  doc.text(I18N.signatures.coordSubtitle, sign3X + signW / 2, signY + 6.5, { align: 'center' });

  return signY + 12;
}

/**
 * Renderiza numeração de páginas e rodapés oficiais em todas as páginas do documento.
 */
function renderRodapes(doc: jsPDF, pageWidth: number, pageHeight: number, marginX: number): void {
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(THEME.fonts.footer);
    doc.setTextColor(...THEME.colors.textLight);
    doc.text(I18N.footer.left, marginX, pageHeight - 6);
    doc.text(`${I18N.footer.pagePrefix} ${p} ${I18N.footer.pageOf} ${totalPages}`, pageWidth - marginX, pageHeight - 6, { align: 'right' });
  }
}

// ============================================================================
// FUNÇÃO PRINCIPAL DE EXPORTAÇÃO
// ============================================================================

/**
 * Exporta o Relatório Oficial de Progresso e Engajamento dos Estudantes em formato PDF via jsPDF.
 * 
 * @param params Parâmetros de exportação com dados filtrados, configurações da escola e usuário
 * @returns Promessa com status de sucesso, nome do arquivo salvo e eventual mensagem de erro
 * 
 * @example
 * ```ts
 * const res = await exportarRelatorioProgressoPdf({
 *   turmaSelecionada: '6º Ano A',
 *   periodoDescricao: 'Mês Atual',
 *   estudantes,
 *   atividades,
 *   currentUser,
 * });
 * ```
 */
export async function exportarRelatorioProgressoPdf(
  params: ParametrosExportacaoDashboard
): Promise<ResultadoExportacaoDashboard> {
  // 1. Guard de ambiente (proteção SSR / sem DOM)
  if (typeof window === 'undefined') {
    return { 
      success: false, 
      fileName: '', 
      error: I18N.errors.noDom 
    };
  }

  const {
    escolaConfig,
    turmaSelecionada,
    periodoDescricao,
    dataInicio,
    dataFim,
    estudantes,
    atividades,
    registrosApoio = [],
    perfisPedagogicos = [],
    currentUser,
    onProgress,
  } = params;

  try {
    // 2. Cálculo prévio das métricas
    const { alunosMetricas, resumoGeral } = calcularMetricasEstudantes(
      estudantes,
      atividades,
      registrosApoio,
      turmaSelecionada,
      dataInicio,
      dataFim
    );

    // 3. Inicialização do documento jsPDF
    const doc = new jsPDF({ 
      orientation: 'portrait', 
      unit: 'mm', 
      format: 'a4',
      compress: true,
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = THEME.margins.x;
    const contentWidth = pageWidth - marginX * 2;
    let currentY: number = THEME.margins.top;

    const ctx: RenderContext = {
      doc,
      pageWidth,
      pageHeight,
      marginX,
      contentWidth,
      escolaConfig,
      turmaSelecionada,
      periodoDescricao,
      currentUser,
      perfisPedagogicos,
      registrosApoio,
    };

    // Mini-cabeçalho compacto para páginas subsequentes (2, 3...)
    const renderMiniCabecalho = () => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(THEME.fonts.heading);
      doc.setTextColor(...THEME.colors.textMuted);
      const nomeEscola = escolaConfig?.nome || I18N.header.defaultSchoolName;
      const turmaLabel = turmaSelecionada === 'todas' ? I18N.auditParams.allClasses : turmaSelecionada;
      doc.text(`${nomeEscola} • Relatório Analítico de Progresso (${turmaLabel})`, marginX, currentY);
      doc.setDrawColor(...THEME.colors.divider);
      doc.setLineWidth(0.2);
      doc.line(marginX, currentY + 2, pageWidth - marginX, currentY + 2);
      currentY += 7;
    };

    /**
     * Ordem determinística: reseta currentY = THEME.margins.top (12) ANTES de invocar renderMiniCabecalho,
     * garantindo que o mini-cabeçalho incremente +7 apenas uma vez por página nova.
     */
    const checkPageBreak = (neededHeight: number) => {
      if (currentY + neededHeight > pageHeight - THEME.margins.bottom) {
        doc.addPage();
        currentY = THEME.margins.top;
        renderMiniCabecalho();
      }
    };

    // 4. Execução da esteira de renderização visual
    currentY = renderHeaderInstitucional(currentY, ctx);
    currentY = renderParametrosAuditoria(currentY, ctx, resumoGeral.totalAlunos);
    currentY = renderKpis(currentY, ctx, resumoGeral, alunosMetricas);

    // Renderiza a tabela analítica dos estudantes (assíncrona)
    currentY = await renderTabelaAlunos(currentY, ctx, alunosMetricas, checkPageBreak, onProgress);

    // Bloco do Parecer Pedagógico
    checkPageBreak(38);
    currentY = renderParecerPedagogico(currentY, ctx, registrosApoio.length, perfisPedagogicos);

    // Bloco de Assinaturas
    checkPageBreak(30);
    renderAssinaturas(currentY, ctx);

    // Rodapés em todas as páginas
    renderRodapes(doc, pageWidth, pageHeight, marginX);

    // 5. Download e Salvamento Seguro
    const fileName = gerarNomeArquivoSeguro(turmaSelecionada);
    try {
      doc.save(fileName);
    } catch (saveErr: unknown) {
      const msg = saveErr instanceof Error ? saveErr.message : 'Falha ao salvar o documento no navegador';
      if (isDev) {
        console.warn('Erro ao invocar doc.save():', saveErr);
      }
      return { success: false, fileName: '', error: msg };
    }

    return { success: true, fileName };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : I18N.errors.renderFailed;
    if (isDev) {
      console.error('Erro crítico na exportação do relatório analítico em PDF:', err);
    }
    return { success: false, fileName: '', error: errorMsg };
  }
}
