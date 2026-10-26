import { AtividadeAdaptada, QuestaoAdaptada, PerfilPedagogico, RegistroAcompanhamentoApoio } from './index';

export interface ImagemPedagogica {
  descricao: string;
  base64?: string;
  svgCode?: string;
  alt_text: string;
  tipo: 'diagrama' | 'pictograma' | 'organizador_visual';
}

export interface AtividadeEstruturadaAI {
  atividade: string;
  imagens: ImagemPedagogica[];
  formatoLetra: 'bastao' | 'cursiva';
  recomendacoesApoio: string[];
}

export interface ContextoCalibragem {
  cansacoMedio: 'none' | 'light' | 'moderate' | 'intense';
  tempoFocoMedio: number;
  autonomiaMedia: 'high' | 'medium' | 'low';
  suporteEscrita: 'independent' | 'partial' | 'total';
  necessidades: string[];
}

export interface AtividadeAdaptadaFull extends AtividadeAdaptada {
  imagensPedagogicas?: ImagemPedagogica[];
  calibragemContexto?: ContextoCalibragem;
  recomendacoesApoioAI?: string[];
}
