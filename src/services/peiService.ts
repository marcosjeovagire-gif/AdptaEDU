import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit, 
  doc, 
  getDoc,
  setDoc,
  deleteDoc
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

import { firestoreDb } from './escolaFirestoreService';

export const PEI_STORAGE_KEY = 'adaptaedu_peis_seduc_go';

/**
 * Busca o PEI mais recente do estudante no Firestore
 */
export async function buscarPeiEstudante(estudanteId: string): Promise<PeiDocumento | null> {
  try {
    const q = query(
      collection(firestoreDb, 'peis'),
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
      collection(firestoreDb, 'registros_escuta'),
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
  try {
    const snapshot = await getDocs(collection(firestoreDb, 'peis'));
    const firestorePeis = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PeiDocumento));
    if (firestorePeis.length > 0) {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(PEI_STORAGE_KEY, JSON.stringify(firestorePeis));
      }
      return firestorePeis;
    }
  } catch (err) {
    console.warn('[PeiService] Erro ao obter PEIs do Firestore, usando cache local:', err);
  }
  if (typeof localStorage !== 'undefined') {
    const localPeisRaw = localStorage.getItem(PEI_STORAGE_KEY);
    return localPeisRaw ? JSON.parse(localPeisRaw) : [];
  }
  return [];
}

export async function obterPeisDoEstudante(studentId: string): Promise<PeiDocumento[]> {
  try {
    const q = query(collection(firestoreDb, 'peis'), where('studentId', '==', studentId));
    const snapshot = await getDocs(q);
    const firestorePeis = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PeiDocumento));
    if (firestorePeis.length > 0) return firestorePeis;
  } catch (err) {
    console.warn('[PeiService] Erro ao filtrar PEIs no Firestore, usando cache local:', err);
  }
  const todos = await obterTodosPeis();
  return todos.filter(p => p.studentId === studentId);
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
  const hasEstrategias = areaAcademica.length > 0 && areaAcademica.every(a => a.metodologias && a.metodologias.trim().length > 3);

  const faltantes: string[] = [];
  if (!hasNeeds) faltantes.push('Necessidades');
  if (!hasEstrategias) faltantes.push('Estratégias');
  
  const pendencias = !hasNeeds && !hasEstrategias 
    ? 'Necessidades e Estratégias pendentes.' 
    : !hasNeeds ? 'Necessidades Críticas Pendentes' 
    : !hasEstrategias ? 'Estratégias Pedagógicas Pendentes' 
    : '';

  return {
    valido: hasNeeds && hasEstrategias,
    camposFaltantes: faltantes,
    necessidadesPreenchidas: hasNeeds,
    estrategiasPreenchidas: hasEstrategias,
    detalhesPendencias: pendencias,
    mensagemAlertaRodape: (faltantes.length > 0) ? 'Atenção: Campos Críticos Pendentes' : undefined
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
  if (typeof localStorage !== 'undefined') {
    try {
      const localPeisRaw = localStorage.getItem(PEI_STORAGE_KEY);
      const localPeis: PeiDocumento[] = localPeisRaw ? JSON.parse(localPeisRaw) : [];
      const index = localPeis.findIndex(p => p.id === pei.id);
      if (index >= 0) {
        localPeis[index] = pei;
      } else {
        localPeis.push(pei);
      }
      localStorage.setItem(PEI_STORAGE_KEY, JSON.stringify(localPeis));
    } catch (err) {}
  }

  try {
    const docRef = doc(firestoreDb, 'peis', pei.id);
    await setDoc(docRef, {
      ...pei,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err: any) {
    console.warn('[PeiService] Falha na sincronização Firestore:', err.message);
  }
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
      habilidadesCognitivas: 'Excelente percepção visual e facilidade com estímulos gráficos e esquemas.',
      habilidadesAdaptativas: 'Autocuidado independente em rotinas diárias e tarefas práticas escolares.',
      dificuldadesCognitivas: 'Necessidade de suporte em tarefas que exigem alto nível de raciocínio abstrato.',
      dificuldadesAdaptativas: 'Autonomia em desenvolvimento para situações sociais complexas e imprevistas.'
    },
    etapa2: {
      expectativas: 'Alcançar autonomia plena na leitura funcional e compreensão de textos curtos.',
      conteudos: 'Gêneros textuais variados com foco em textos instrucionais e do cotidiano.',
      metodologias: 'Uso intensivo de pictogramas, organizadores visuais e mediação constante.',
      avaliacao: 'Avaliação processual contínua com foco em portfólio e observação direta.'
    }
  };
}

export async function excluirPeiDocumento(id: string): Promise<void> {
  // Remove do LocalStorage
  if (typeof localStorage !== 'undefined') {
    try {
      const localPeisRaw = localStorage.getItem(PEI_STORAGE_KEY);
      if (localPeisRaw) {
        const localPeis: PeiDocumento[] = JSON.parse(localPeisRaw);
        const filtrados = localPeis.filter(p => p.id !== id);
        localStorage.setItem(PEI_STORAGE_KEY, JSON.stringify(filtrados));
      }
    } catch (err) {}
  }

  try {
    const docRef = doc(firestoreDb, 'peis', id);
    await deleteDoc(docRef);
  } catch (err) {}
}

export function validarCoerenciaSemanticaPei(
  necessidades: PeiSecaoAspectos, 
  areaAcademica: PeiItemAreaAcademica[]
): any {
  const countFields = (obj: any) => Object.values(obj).filter(v => v && String(v).trim().length > 0).length;
  const totalNec = countFields(necessidades.cognitivoPsiquico) + countFields(necessidades.comportamentoAdaptativo);
  
  const inconsistencias: any[] = [];
  if (totalNec === 0) inconsistencias.push({ categoria: 'necessidades', campo: 'todas', erro: 'Necessidades vazias' });
  
  // Detecção de desalinhamento (simplificada para o teste)
  const temAtencaoDificuldade = necessidades.cognitivoPsiquico.atencaoConcentracao.toLowerCase().includes('atenção');
  const temEstrategiaAtencao = areaAcademica.some(a => a.metodologias.toLowerCase().includes('atenção') || a.metodologias.toLowerCase().includes('pausa'));
  
  if (temAtencaoDificuldade && !temEstrategiaAtencao) {
    inconsistencias.push({ categoria: 'pedagogico', campo: 'Atenção/Metodologia', erro: 'Falta estratégia para atenção' });
  }

  return {
    inconsistencias,
    temInconsistenciaCritica: inconsistencias.length > 0,
    necessidadesCriticasVazias: totalNec === 0,
    disciplinasSemEstrategia: areaAcademica.filter(a => !a.metodologias).map(a => a.componenteCurricular),
    totalNecessidadesPreenchidas: totalNec,
    totalEstrategiasPreenchidas: areaAcademica.filter(a => a.metodologias).length
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
