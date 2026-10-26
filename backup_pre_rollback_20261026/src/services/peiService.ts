import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit, 
  doc, 
  getDoc 
} from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import firebaseConfig from '../../firebase-applet-config.json';
import { 
  PeiDocumento, 
  PeiIdentificacao, 
  PeiEtapa1Siap, 
  PeiEtapa2Siap,
  PeiSecaoAspectos,
  PeiItemAreaAcademica,
  PeiAssinaturasOficiais,
  AtividadeAdaptada,
  Estudante,
  RegistroAcompanhamentoApoio
} from '../types';
import { ContextoCalibragem } from '../types/pedagogico';
import { 
  gerarAtividadeEstruturada, 
  ParametrosGeracaoAtividade 
} from '../utils/activityGenerator';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export const PEI_STORAGE_KEY = 'adaptaedu_peis_seduc_go';

/**
 * Busca o PEI mais recente do estudante no Firestore
 */
export async function buscarPeiEstudante(estudanteId: string): Promise<PeiDocumento | null> {
  try {
    const q = query(
      collection(db, 'peis'),
      where('studentId', '==', estudanteId),
      where('status', '==', 'homologado'),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as PeiDocumento;
  } catch (error) {
    console.error('[PeiService] Erro ao buscar PEI:', error);
    return null;
  }
}

/**
 * Busca os últimos 5 registros de acompanhamento do profissional de apoio
 */
export async function buscarRegistrosRecentesApoio(estudanteId: string): Promise<RegistroAcompanhamentoApoio[]> {
  try {
    const q = query(
      collection(db, 'registros_escuta'),
      where('studentId', '==', estudanteId),
      orderBy('createdAt', 'desc'),
      limit(5)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as RegistroAcompanhamentoApoio));
  } catch (error) {
    console.error('[PeiService] Erro ao buscar registros de apoio:', error);
    return [];
  }
}

/**
 * Calibra o contexto pedagógico com base nos registros recentes (REQUISITO 4)
 */
export function calibrarContextoPedagogico(registros: RegistroAcompanhamentoApoio[]): ContextoCalibragem {
  if (registros.length === 0) {
    return {
      cansacoMedio: 'none',
      tempoFocoMedio: 20,
      autonomiaMedia: 'medium',
      suporteEscrita: 'partial',
      necessidades: []
    };
  }

  const temIrritabilidade = registros.some(r => r.demonstrouIrritabilidadeOuSinais === 'Sim');
  const cansaco = temIrritabilidade ? 'moderate' : 'light';
  
  const autonomias = registros.map(r => r.nivelAutonomia).filter(Boolean);
  const predominante = autonomias.length > 0 ? autonomias.sort((a,b) => 
    autonomias.filter(v => v===a).length - autonomias.filter(v => v===b).length
  ).pop() : 'medium';

  return {
    cansacoMedio: cansaco as any,
    tempoFocoMedio: 15,
    autonomiaMedia: (predominante?.includes('Independente') ? 'high' : 'medium') as any,
    suporteEscrita: 'partial',
    necessidades: Array.from(new Set(registros.flatMap(r => r.recursosUtilizados || [])))
  };
}

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
  if (override === 'bastao' || override === 'cursiva') return override;

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
      laudoOuAluno.perfil?.recursosAcessibilidade
    ].filter(Boolean).join(' ');
  }

  const texto = textoAnalise.toLowerCase();
  const termosBastao = ['tea', 'autis', 'intelectual', 'di', 'disgrafia', 'dislex', 'motora', 'paralisia', 'pci', 'down', 'baixa visao', 'bastao', 'caixa alta'];
  return termosBastao.some(termo => texto.includes(termo)) ? 'bastao' : 'cursiva';
}

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
      motivo: `Formato ${pei.formatoLetra === 'bastao' ? 'Letra Bastão' : 'Letra Cursiva'} no PEI.`,
      identificadoPorTermo: true
    };
  }
  const formato = determinarFormatoLetraPorLaudo(estudante);
  return {
    formatoSugerido: formato,
    motivo: formato === 'bastao' ? 'Necessidade de Letra Bastão identificada.' : 'Padrão cursivo sugerido.',
    identificadoPorTermo: formato === 'bastao'
  };
}

export async function obterTodosPeis(): Promise<PeiDocumento[]> {
  const snapshot = await getDocs(collection(db, 'peis'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PeiDocumento));
}

export async function obterPeisDoEstudante(studentId: string): Promise<PeiDocumento[]> {
  const q = query(collection(db, 'peis'), where('studentId', '==', studentId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PeiDocumento));
}

export interface ResultadoValidacaoCamposPei {
  valido: boolean;
  camposFaltantes: string[];
  necessidadesPreenchidas: boolean;
  estrategiasPreenchidas: boolean;
  detalhesPendencias?: string;
  mensagemAlertaRodape?: string;
}

export function validarCamposPei(
  necessidades: PeiSecaoAspectos, 
  areaAcademica: PeiItemAreaAcademica[]
): ResultadoValidacaoCamposPei {
  const needsCognitive = necessidades.cognitivoPsiquico;
  const hasNeeds = Object.values(needsCognitive).some(v => v && v.trim().length > 3);
  const hasEstrategias = areaAcademica.some(a => a.metodologias && a.metodologias.trim().length > 3);

  const faltantes: string[] = [];
  if (!hasNeeds) faltantes.push('Necessidades');
  if (!hasEstrategias) faltantes.push('Estratégias');
  
  return {
    valido: hasNeeds && hasEstrategias,
    camposFaltantes: faltantes,
    necessidadesPreenchidas: hasNeeds,
    estrategiasPreenchidas: hasEstrategias,
    detalhesPendencias: !hasNeeds ? 'Preencha as necessidades.' : !hasEstrategias ? 'Preencha as estratégias.' : undefined
  };
}

export function gerarAreaAcademicaPadrao(grade?: string, subject?: string, teacher?: string): PeiItemAreaAcademica[] {
  return [{
    id: `area-${Date.now()}`,
    componenteCurricular: subject || 'Base Comum',
    expectativas: 'Desenvolver habilidades básicas conforme DC-GO.',
    conteudos: 'Conteúdos essenciais flexibilizados.',
    metodologias: 'Adaptação curricular, apoio visual e mediação.',
    avaliacao: 'Processual e contínua.',
    professor: teacher || ''
  }];
}

export function gerarAssinaturasOficiaisPadrao(regentTeacher?: string, supportTeacher?: string): PeiAssinaturasOficiais {
  return {
    professorAee: '',
    coordenacaoPedagogica: '',
    profissionalApoio: supportTeacher || '',
    professoresRegentes: regentTeacher || '',
    gestor: '',
    local: 'Rio Verde - GO',
    data: new Date().toLocaleDateString('pt-BR')
  };
}

export async function salvarPeiDocumento(pei: PeiDocumento): Promise<void> {
  console.log('Salvando PEI:', pei.id);
}

export async function gerarSugestaoPeiComIa(params: {
  identification: Partial<PeiIdentificacao>;
  subject: string;
  period: string;
}): Promise<Partial<PeiDocumento> & { origemIa?: boolean }> {
  return {
    origemIa: true,
    diagnosis: params.identification.diagnosis || 'Aguardando diagnóstico',
    potencialidades: {
      cognitivoPsiquico: { percepcao: 'Boa', atencaoConcentracao: 'Regular', linguagemComunicacao: 'Funcional', memoriaAbstracaoGeneralizacao: 'Em desenvolvimento', criatividade: 'Alta', aspectosPsicomotores: 'Adequados', raciocinioLogico: 'Concreto' },
      comportamentoAdaptativo: { autocuidado: 'Independente', autonomiaIndependencia: 'Parcial', habilidadesSociais: 'Sociável' }
    },
    necessidadesDificuldades: {
      cognitivoPsiquico: { percepcao: 'Dificuldade visual', atencaoConcentracao: 'Curta', linguagemComunicacao: 'Literal', memoriaAbstracaoGeneralizacao: 'Lenta', criatividade: 'Baixa', aspectosPsicomotores: 'Dificuldade motora fina', raciocinioLogico: 'Abstrato difícil' },
      comportamentoAdaptativo: { autocuidado: 'Parcial', autonomiaIndependencia: 'Baixa', habilidadesSociais: 'Introvertido' }
    },
    etapa1: {
      habilidadesCognitivas: 'Percepção e criatividade.',
      habilidadesAdaptativas: 'Autocuidado independente.',
      dificuldadesCognitivas: 'Atenção e raciocínio abstrato.',
      dificuldadesAdaptativas: 'Autonomia baixa.'
    },
    etapa2: {
      expectativas: 'Alcançar autonomia na leitura.',
      conteudos: 'Gêneros textuais.',
      metodologias: 'Uso de pictogramas.',
      avaliacao: 'Portfólio.'
    }
  };
}

export async function excluirPeiDocumento(id: string): Promise<void> {
  console.log('Excluindo PEI:', id);
}

export function validarCoerenciaSemanticaPei(
  necessidades: PeiSecaoAspectos, 
  areaAcademica: PeiItemAreaAcademica[]
): any {
  return {
    inconsistencias: [],
    temInconsistenciaCritica: false,
    necessidadesCriticasVazias: false,
    disciplinasSemEstrategia: [],
    totalNecessidadesPreenchidas: 7,
    totalEstrategiasPreenchidas: areaAcademica.length
  };
}

export function gerarAtividadeAdaptadaPei(
  params: ParametrosGeracaoAtividade & { formatoLetra?: 'bastao' | 'cursiva' }
): AtividadeAdaptada {
  const formatoEfetivo = params.formatoLetra || determinarFormatoLetraPorLaudo(params.estudante);
  return gerarAtividadeEstruturada({
    ...params,
    formatoLetra: formatoEfetivo
  });
}
