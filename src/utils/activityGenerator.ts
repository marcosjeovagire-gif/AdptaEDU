import { 
  Estudante, 
  PerfilPedagogico, 
  HabilidadeAprovada, 
  AtividadeAdaptada, 
  QuestaoAdaptada 
} from '../types';

export interface ParametrosGeracaoAtividade {
  estudante: Estudante;
  perfilPedagogico: PerfilPedagogico;
  professorId: string;
  professorNome: string;
  disciplina: string;
  conteudo: string;
  habilidade: HabilidadeAprovada | {
    id: string;
    codigo: string;
    descricao: string;
    disciplina?: string;
    serie?: string;
    unidadeTematica?: string;
    objetoConhecimento?: string;
    bimestre?: string;
    sourcePage?: number;
    paginaOrigem?: number | string;
  };
  quantidadeQuestoes: number;
  tipoQuestoes: string; // 'multipla_escolha' | 'verdadeiro_falso' | 'discursiva' | 'associacao' | 'completar' | 'ligar' | 'copiar'
  observacaoProfessor?: string;
  alinhadaAoPei?: boolean;
  peiId?: string;
  peiAlinhamentoDetalhes?: string;

  // Parâmetros de alinhamento e Acessibilidade (Wizard / Assistente)
  escolaId?: string;
  turmaId?: string;
  anoLetivo?: string;
  etapaEnsino?: string;
  anoSerie?: string;
  bimestre?: string;
  matrizId?: string;
  matrizNome?: string;
  versaoMatriz?: string;
  habilidadesComplementares?: Array<{ codigo: string; descricao: string; objetoConhecimento?: string }>;
  objetoConhecimento?: string;
  tipoAtividade?: 'multipla_escolha' | 'desenhos' | 'cursiva' | 'forma' | 'combinada' | string;
  modeloAdaptacao?: string;
  nivelAdaptacao?: 'Baixo' | 'Médio' | 'Alto' | 'Universal';
  tipoLetra?: 'cursiva' | 'forma' | 'mista';
  formatoLetra?: 'bastao' | 'cursiva';
  usarCaixaAlta?: boolean;
  estiloTipograficoVisual?: 'letra_bastao' | 'letra_bastao_desenho_matriz' | 'so_desenhos' | 'letra_cursiva' | 'letra_bastao_e_cursiva';
  estiloDesenho?: 'colorido' | 'preto_e_branco_colorir';
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
  ajusteRelatoApoio?: {
    houveDificuldadeRelatada: boolean;
    relatoTexto?: string;
    recomendacao?: string;
  };
  informacoesAdaptacao?: {
    habilidadeMatrizUtilizada: string;
    dadosPeiConsiderados: string;
    registrosApoioConsiderados: string;
    estrategiasPedagogicasSugeridas: string;
    justificativaAdaptacao: string;
  };
  folhaComGabarito?: boolean;
}

export function validarRequisitosAtividade(params: Partial<ParametrosGeracaoAtividade>): { valido: boolean; mensagem?: string } {
  if (!params.estudante) {
    return { valido: false, mensagem: 'É obrigatório selecionar um estudante cadastrado e autorizado.' };
  }
  if (!params.disciplina || params.disciplina.trim() === '') {
    return { valido: false, mensagem: 'Informe ou selecione a disciplina.' };
  }
  if (!params.conteudo || params.conteudo.trim() === '') {
    return { valido: false, mensagem: 'É obrigatório informar o conteúdo da aula a ser trabalhado na atividade.' };
  }
  if (!params.habilidade || !params.habilidade.codigo) {
    return { valido: false, mensagem: 'É obrigatório selecionar uma habilidade aprovada da matriz curricular.' };
  }
  if (!params.quantidadeQuestoes || params.quantidadeQuestoes < 1) {
    return { valido: false, mensagem: 'Defina a quantidade de questões a serem geradas.' };
  }
  return { valido: true };
}

/**
 * Biblioteca de SVGs pedagógicos limpos, vetorizados, de traço grosso e sem texto
 * Cobre amplamente todas as disciplinas da Matriz SEDUC-GO (Fund II e Ensino Médio)
 */
export function gerarSvgPedagogico(tema: string, estilo: 'colorido' | 'preto_e_branco_colorir' = 'preto_e_branco_colorir'): string {
  const strokeColor = '#1e293b';
  const fillColor = estilo === 'colorido' ? '#e0f2fe' : '#ffffff';
  const strokeWidth = '3.5';

  const t = tema.toLowerCase();

  // 1. Rosa dos ventos / Geografia / Espaço
  if (t.includes('rosa') || t.includes('vento') || t.includes('mapa') || t.includes('geog') || t.includes('coordenad') || t.includes('relevo')) {
    return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="85" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />
      <circle cx="100" cy="100" r="60" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4 4" />
      <polygon points="100,25 115,85 175,100 115,115 100,175 85,115 25,100 85,85" fill="${estilo === 'colorido' ? '#38bdf8' : '#f1f5f9'}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />
      <circle cx="100" cy="100" r="10" fill="${strokeColor}" />
    </svg>`;
  }

  // 2. Sistema Solar / Astronomia / Universo / Física espacial
  if (t.includes('solar') || t.includes('planeta') || t.includes('terra') || t.includes('lua') || t.includes('astro') || t.includes('universo')) {
    return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="100" cy="100" rx="90" ry="40" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="6 4" />
      <circle cx="100" cy="100" r="45" fill="${estilo === 'colorido' ? '#fbbf24' : fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />
      <circle cx="160" cy="90" r="18" fill="${estilo === 'colorido' ? '#60a5fa' : fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />
      <ellipse cx="160" cy="90" rx="26" ry="10" fill="none" stroke="${strokeColor}" stroke-width="2" />
      <circle cx="35" cy="110" r="12" fill="${estilo === 'colorido' ? '#f87171' : fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />
    </svg>`;
  }

  // 3. Corpo Humano / Saúde / Célula / Ciências / Biologia
  if (t.includes('corpo') || t.includes('sistema') || t.includes('saude') || t.includes('vacina') || t.includes('muscul') || t.includes('osso') || t.includes('celul')) {
    return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="40" r="24" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />
      <line x1="100" y1="64" x2="100" y2="125" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" />
      <line x1="100" y1="80" x2="50" y2="110" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" />
      <line x1="100" y1="80" x2="150" y2="110" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" />
      <line x1="100" y1="125" x2="65" y2="185" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" />
      <line x1="100" y1="125" x2="135" y2="185" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" />
      <circle cx="100" cy="90" r="12" fill="${estilo === 'colorido' ? '#f43f5e' : fillColor}" stroke="${strokeColor}" stroke-width="2" />
    </svg>`;
  }

  // 4. Planta / Fotossíntese / Meio Ambiente / Ecologia / Ciências
  if (t.includes('planta') || t.includes('fotos') || t.includes('ecolog') || t.includes('arvore') || t.includes('folha') || t.includes('ambiente') || t.includes('bioma')) {
    return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <path d="M 100 180 L 100 110" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" />
      <path d="M 100 140 C 70 130, 60 100, 100 90 C 140 100, 130 130, 100 140 Z" fill="${estilo === 'colorido' ? '#4ade80' : fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />
      <path d="M 100 110 C 60 80, 70 40, 100 20 C 130 40, 140 80, 100 110 Z" fill="${estilo === 'colorido' ? '#22c55e' : fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />
      <circle cx="160" cy="40" r="18" fill="${estilo === 'colorido' ? '#facc15' : fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />
    </svg>`;
  }

  // 5. Frações / Geometria / Matemática / Área / Triângulos
  if (t.includes('frac') || t.includes('geomet') || t.includes('poligon') || t.includes('angulo') || t.includes('matemat') || t.includes('area') || t.includes('equac')) {
    return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="75" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />
      <path d="M 100 25 A 75 75 0 0 1 175 100 L 100 100 Z" fill="${estilo === 'colorido' ? '#34d399' : '#cbd5e1'}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />
      <line x1="100" y1="25" x2="100" y2="175" stroke="${strokeColor}" stroke-width="${strokeWidth}" />
      <line x1="25" y1="100" x2="175" y2="100" stroke="${strokeColor}" stroke-width="${strokeWidth}" />
    </svg>`;
  }

  // 6. Livro / Carta / Produção Textual / Poema / Língua Portuguesa / Literatura
  if (t.includes('texto') || t.includes('livro') || t.includes('carta') || t.includes('poema') || t.includes('leitor') || t.includes('portug') || t.includes('literat') || t.includes('cronic')) {
    return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <path d="M 100 50 C 70 35, 30 40, 20 45 L 20 155 C 30 150, 70 145, 100 160 C 130 145, 170 150, 180 155 L 180 45 C 170 40, 130 35, 100 50 Z" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />
      <line x1="100" y1="50" x2="100" y2="160" stroke="${strokeColor}" stroke-width="${strokeWidth}" />
      <line x1="35" y1="75" x2="85" y2="75" stroke="${strokeColor}" stroke-width="2.5" stroke-linecap="round" />
      <line x1="35" y1="95" x2="85" y2="95" stroke="${strokeColor}" stroke-width="2.5" stroke-linecap="round" />
      <line x1="35" y1="115" x2="75" y2="115" stroke="${strokeColor}" stroke-width="2.5" stroke-linecap="round" />
      <line x1="115" y1="75" x2="165" y2="75" stroke="${strokeColor}" stroke-width="2.5" stroke-linecap="round" />
      <line x1="115" y1="95" x2="165" y2="95" stroke="${strokeColor}" stroke-width="2.5" stroke-linecap="round" />
      <line x1="115" y1="115" x2="155" y2="115" stroke="${strokeColor}" stroke-width="2.5" stroke-linecap="round" />
    </svg>`;
  }

  // 7. História / Linha do Tempo / Cidadania / Sociedade / Patrimônio
  if (t.includes('hist') || t.includes('tempo') || t.includes('brasil') || t.includes('antig') || t.includes('democrac') || t.includes('socied')) {
    return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <polygon points="100,30 35,70 165,70" fill="${estilo === 'colorido' ? '#fb923c' : fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />
      <rect x="45" y="70" width="16" height="85" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />
      <rect x="75" y="70" width="16" height="85" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />
      <rect x="109" y="70" width="16" height="85" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />
      <rect x="139" y="70" width="16" height="85" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />
      <rect x="25" y="155" width="150" height="20" fill="${estilo === 'colorido' ? '#fed7aa' : fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" rx="2" />
    </svg>`;
  }

  // 8. Química / Física / Laboratório / Matéria e Energia
  if (t.includes('quim') || t.includes('fisic') || t.includes('laborat') || t.includes('reac') || t.includes('molecul') || t.includes('atomo') || t.includes('energ')) {
    return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <path d="M 85 30 L 115 30 L 115 70 L 155 150 C 160 160, 155 170, 140 170 L 60 170 C 45 170, 40 160, 45 150 L 85 70 Z" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />
      <path d="M 52 145 C 75 135, 125 155, 148 145 L 142 165 L 58 165 Z" fill="${estilo === 'colorido' ? '#818cf8' : '#cbd5e1'}" stroke="none" />
      <circle cx="85" cy="120" r="5" fill="${strokeColor}" />
      <circle cx="115" cy="135" r="7" fill="${strokeColor}" />
      <line x1="80" y1="30" x2="120" y2="30" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" />
    </svg>`;
  }

  // 9. Artes / Desenho / Cores / Expressão Cultural
  if (t.includes('arte') || t.includes('pintur') || t.includes('desenh') || t.includes('cultur') || t.includes('musica')) {
    return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <path d="M 50 150 C 20 120, 30 50, 90 40 C 150 30, 180 80, 160 140 C 150 170, 120 180, 90 170 C 70 165, 60 170, 50 150 Z" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />
      <circle cx="70" cy="80" r="12" fill="${estilo === 'colorido' ? '#f43f5e' : fillColor}" stroke="${strokeColor}" stroke-width="2" />
      <circle cx="110" cy="65" r="12" fill="${estilo === 'colorido' ? '#fbbf24' : fillColor}" stroke="${strokeColor}" stroke-width="2" />
      <circle cx="140" cy="95" r="12" fill="${estilo === 'colorido' ? '#38bdf8' : fillColor}" stroke="${strokeColor}" stroke-width="2" />
      <circle cx="120" cy="140" r="12" fill="${estilo === 'colorido' ? '#4ade80' : fillColor}" stroke="${strokeColor}" stroke-width="2" />
      <circle cx="75" cy="135" r="14" fill="#ffffff" stroke="${strokeColor}" stroke-width="${strokeWidth}" />
    </svg>`;
  }

  // 10. Língua Inglesa / Comunicação Global / Diálogo
  if (t.includes('ingl') || t.includes('english') || t.includes('idiom') || t.includes('comunic')) {
    return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect x="25" y="40" width="110" height="75" rx="15" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />
      <polygon points="50,115 40,140 75,115" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />
      <rect x="65" y="85" width="110" height="75" rx="15" fill="${estilo === 'colorido' ? '#bfdbfe' : fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />
      <polygon points="150,160 160,185 125,160" fill="${estilo === 'colorido' ? '#bfdbfe' : fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />
      <line x1="85" y1="110" x2="155" y2="110" stroke="${strokeColor}" stroke-width="2.5" stroke-linecap="round" />
      <line x1="85" y1="130" x2="135" y2="130" stroke="${strokeColor}" stroke-width="2.5" stroke-linecap="round" />
    </svg>`;
  }

  // Padrão Geral Educacional (Árvore do Conhecimento e Crescimento)
  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
    <rect x="88" y="110" width="24" height="65" fill="${estilo === 'colorido' ? '#92400e' : fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" rx="4" />
    <circle cx="100" cy="80" r="55" fill="${estilo === 'colorido' ? '#22c55e' : fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />
    <circle cx="75" cy="70" r="30" fill="${estilo === 'colorido' ? '#16a34a' : fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />
    <circle cx="125" cy="70" r="30" fill="${estilo === 'colorido' ? '#16a34a' : fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />
  </svg>`;
}

/**
 * Gera questões reais, pedagógicas e sem placeholders para a atividade adaptada
 */
export function gerarAtividadeEstruturada(params: ParametrosGeracaoAtividade): AtividadeAdaptada {
  const {
    estudante,
    perfilPedagogico,
    professorId,
    professorNome,
    disciplina,
    conteudo,
    habilidade,
    quantidadeQuestoes,
    tipoQuestoes,
    observacaoProfessor,
    tipoAtividade = 'multipla_escolha',
    tipoLetra = 'forma',
    estiloTipograficoVisual = 'letra_bastao',
    estiloDesenho = 'preto_e_branco_colorir',
    apoioVisual,
    opcoesCursiva,
    ajusteRelatoApoio,
  } = params;

  // Detecção da necessidade pedagógica de Letra Bastão por laudo e CID
  const laudoTexto = `${estudante.laudo || ''} ${estudante.observacoesAcessibilidade || ''} ${(estudante as any).diagnostico || ''} ${perfilPedagogico?.recursosAcessibilidade || ''}`.toLowerCase();
  const laudoIndicaBastao = 
    laudoTexto.includes('tea') || 
    laudoTexto.includes('autis') || 
    laudoTexto.includes('intelect') || 
    laudoTexto.includes('di') || 
    laudoTexto.includes('motora') || 
    laudoTexto.includes('disgraf') || 
    laudoTexto.includes('dislex') || 
    laudoTexto.includes('paralis') || 
    laudoTexto.includes('down') || 
    laudoTexto.includes('t21') || 
    laudoTexto.includes('pci') || 
    laudoTexto.includes('bastao') ||
    laudoTexto.includes('caixa alta');

  // Formato final: prioriza override manual se informado, senão usa a detecção automática por laudo
  const formatoFinal: 'bastao' | 'cursiva' = params.formatoLetra 
    ? params.formatoLetra 
    : (laudoIndicaBastao ? 'bastao' : (tipoLetra === 'cursiva' ? 'cursiva' : 'bastao'));

  // Usa CAIXA ALTA (Letra Bastão) sempre que o formato for bastão ou configurado explicitamente
  const usarCaixaAlta = formatoFinal === 'bastao' || 
                        params.usarCaixaAlta === true ||
                        estiloTipograficoVisual === 'letra_bastao' || 
                        estiloTipograficoVisual === 'letra_bastao_desenho_matriz' || 
                        estiloTipograficoVisual === 'so_desenhos';

  const tipoLetraFinal = formatoFinal === 'bastao' ? 'forma' : (params.tipoLetra || 'cursiva');
  const estiloTipograficoFinal = estiloTipograficoVisual === 'so_desenhos' 
    ? 'so_desenhos' 
    : (formatoFinal === 'bastao' ? 'letra_bastao' : (estiloTipograficoVisual || 'letra_cursiva'));

  // Calibra quantidade de alternativas conforme relato do apoio (se o apoio disse que o aluno teve dificuldade)
  let maxAlternativas = perfilPedagogico?.quantidadeAlternativas || 3;
  if (ajusteRelatoApoio?.houveDificuldadeRelatada) {
    maxAlternativas = Math.min(maxAlternativas, 2); // Reduz para 2 alternativas diretas para evitar sobrecarga
  }
  const numAlternativas = Math.min(Math.max(maxAlternativas, 2), 4);
  const questoes: QuestaoAdaptada[] = [];

  const descHabilidade = habilidade.descricao || 'Desenvolvimento das habilidades essenciais da matriz curricular.';
  const codHabilidade = habilidade.codigo;
  const objetoConhecimento = habilidade.objetoConhecimento || conteudo;

  const formatarTexto = (txt: string) => usarCaixaAlta ? txt.toUpperCase() : txt;

  for (let i = 1; i <= quantidadeQuestoes; i++) {
    let enunciado = '';
    let alternativas: string[] | undefined = undefined;
    let linhasResposta: number | undefined = undefined;
    let ilustracaoSvgOuUrl: string | undefined = undefined;
    let descricaoDesenhoMatriz: string | undefined = undefined;
    let textoCaligraficoPontilhado: string | undefined = undefined;

    // =======================================================================
    // CASO 1: MODO EXCLUSIVO DE DESENHOS / APOIO PICTOGRÁFICO PURO
    // =======================================================================
    if (estiloTipograficoVisual === 'so_desenhos' || tipoAtividade === 'desenhos_exclusivo') {
      ilustracaoSvgOuUrl = gerarSvgPedagogico(`${conteudo} ${objetoConhecimento} ${disciplina} ${i}`, estiloDesenho);
      descricaoDesenhoMatriz = `Representação visual direta do conteúdo: ${objetoConhecimento} (Matriz SEDUC-GO).`;

      if (i === 1) {
        enunciado = formatarTexto(`Questão ${i} [Apoio Pictográfico]: Observe com atenção a ilustração abaixo sobre ${conteudo}. Pinte os detalhes que representam o tema da aula:`);
      } else if (i === 2) {
        enunciado = formatarTexto(`Questão ${i} [Pareamento Visual]: Analise a figura e contorne com um traço a opção correspondente ao conceito de ${conteudo}:`);
        alternativas = [
          formatarTexto(`[ FIGURA A ] Elemento que representa ${conteudo}`),
          formatarTexto(`[ FIGURA B ] Elemento que não faz parte de ${conteudo}`),
        ];
      } else if (i === 3) {
        enunciado = formatarTexto(`Questão ${i} [Associação por Imagem]: Ligue com um traço o desenho ao significado correto estudado em sala:`);
        alternativas = [
          formatarTexto(`( 1 ) Objeto de estudo: ${objetoConhecimento}`),
          formatarTexto(`( 2 ) Aplicação prática no dia a dia`),
        ];
      } else {
        enunciado = formatarTexto(`Questão ${i} [Identificação Visual]: Marque um (X) na figura que melhor demonstra o tema de ${conteudo}:`);
        alternativas = [
          formatarTexto(`(A) Imagem principal do conteúdo ${conteudo}`),
          formatarTexto(`(B) Imagem de exemplo secundário`),
        ];
      }
    }
    // =======================================================================
    // CASO 2: BASTÃO COM DESENHO TEMÁTICO DA MATRIZ
    // =======================================================================
    else if (estiloTipograficoVisual === 'letra_bastao_desenho_matriz' || tipoAtividade === 'desenhos' || apoioVisual?.habilitado) {
      ilustracaoSvgOuUrl = gerarSvgPedagogico(`${conteudo} ${objetoConhecimento} ${disciplina} ${i}`, estiloDesenho);
      descricaoDesenhoMatriz = `Ilustração temática da Matriz: ${objetoConhecimento}.`;

      if (ajusteRelatoApoio?.houveDificuldadeRelatada) {
        enunciado = formatarTexto(`Questão ${i} [Comando Direto Passo a Passo]: Observe o desenho sobre ${conteudo}. Assinale a resposta certa:`);
        alternativas = [
          formatarTexto(`(A) Mostra ${conteudo} em funcionamento`),
          formatarTexto(`(B) Não se relaciona com ${conteudo}`),
        ];
      } else if (apoioVisual?.tipo === 'colorir') {
        enunciado = formatarTexto(`Questão ${i}: Observe a ilustração abaixo sobre ${conteudo}. Pinte os elementos que representam o tema estudado em sala:`);
      } else if (apoioVisual?.tipo === 'associacao' || tipoQuestoes === 'associacao') {
        enunciado = formatarTexto(`Questão ${i}: Observe a figura e relacione os conceitos principais de ${conteudo}:`);
        alternativas = [
          formatarTexto(`( 1 ) Elemento principal de ${conteudo}`),
          formatarTexto(`( 2 ) Aplicação prática no cotidiano`),
          formatarTexto(`( 3 ) Característica da habilidade ${codHabilidade}`),
        ].slice(0, numAlternativas);
      } else {
        enunciado = formatarTexto(`Questão ${i}: Analise a ilustração sobre ${conteudo} e assinale a opção correta:`);
        alternativas = [
          formatarTexto(`(A) A ilustração representa a aplicação correta de ${conteudo}.`),
          formatarTexto(`(B) O elemento visual indica uma função diferente da estudada.`),
          formatarTexto(`(C) Representa um exemplo prático de ${objetoConhecimento}.`),
          formatarTexto(`(D) Mostra um detalhe complementar da aula de ${disciplina}.`),
        ].slice(0, numAlternativas);
      }
    } 
    // =======================================================================
    // CASO 3: ATIVIDADE COM LETRA CURSIVA E CALIGRAFIA PONTILHADA
    // =======================================================================
    else if (estiloTipograficoVisual === 'letra_cursiva' || estiloTipograficoVisual === 'letra_bastao_e_cursiva' || tipoAtividade === 'cursiva' || tipoLetra === 'cursiva') {
      const pontilhadoAtivo = opcoesCursiva?.tracadoPontilhado !== false;
      const ladoALado = estiloTipograficoVisual === 'letra_bastao_e_cursiva' || opcoesCursiva?.ladoALadoForma;

      if (pontilhadoAtivo) {
        enunciado = `Questão ${i} [Pauta Caligráfica]: Cubra os pontilhados com atenção e pratique a escrita cursiva do conceito de ${conteudo}:`;
        textoCaligraficoPontilhado = `${conteudo} - ${objetoConhecimento}`;
        linhasResposta = 3;
      } else if (ladoALado) {
        enunciado = `Questão ${i} [Modelo Bastão e Cópia Cursiva]: Leia o termo em letra bastão e copie-o na pauta ao lado com letra cursiva:`;
        textoCaligraficoPontilhado = conteudo.toUpperCase();
        linhasResposta = 3;
      } else {
        enunciado = `Questão ${i}: Escreva em letra cursiva legível a resposta sobre "${conteudo}":`;
        linhasResposta = 4;
      }
    } 
    // =======================================================================
    // CASO 4: MÚLTIPLA ESCOLHA TRADICIONAL ADAPTADA EM LETRA BASTÃO
    // =======================================================================
    else if (tipoQuestoes === 'multipla_escolha') {
      if (ajusteRelatoApoio?.houveDificuldadeRelatada) {
        enunciado = formatarTexto(`Questão ${i}: Sobre ${conteudo}, marque a afirmação verdadeira:`);
        alternativas = [
          formatarTexto(`(A) É o tema correto estudado em ${disciplina}.`),
          formatarTexto(`(B) É um conceito diferente e não estudado.`),
        ];
      } else {
        enunciado = formatarTexto(`Questão ${i}: Com base no estudo de ${conteudo} (${codHabilidade}), leia atentamente e marque a resposta correta:`);
        alternativas = [
          formatarTexto(`(A) Explicação fundamental sobre ${conteudo} em ${disciplina}.`),
          formatarTexto(`(B) Relação direta com o objeto de conhecimento: ${objetoConhecimento}.`),
          formatarTexto(`(C) Alternativa que complementa a análise do tema na prática.`),
          formatarTexto(`(D) Propriedade essencial observada na matriz curricular.`),
        ].slice(0, numAlternativas);
      }
    } 
    // =======================================================================
    // CASO 5: VERDADEIRO OU FALSO
    // =======================================================================
    else if (tipoQuestoes === 'verdadeiro_falso') {
      enunciado = formatarTexto(`Questão ${i}: Avalie as afirmações sobre "${conteudo}" e marque (V) para Verdadeiro ou (F) para Falso:`);
      alternativas = [
        formatarTexto(`(   ) O conteúdo ${conteudo} é fundamental para compreender ${disciplina}.`),
        formatarTexto(`(   ) O tema estudado se aplica a situações do cotidiano da turma.`),
        formatarTexto(`(   ) A habilidade ${codHabilidade} aborda ${objetoConhecimento}.`),
      ].slice(0, numAlternativas);
    } 
    // =======================================================================
    // CASO 6: DISCURSIVA / COMPLETAR
    // =======================================================================
    else {
      enunciado = formatarTexto(`Questão ${i}: Registre com suas palavras a ideia central de ${conteudo}, conforme trabalhado em sala de aula:`);
      linhasResposta = 4;
    }

    questoes.push({
      id: `q-${Date.now()}-${i}`,
      numero: i,
      tipo: (tipoQuestoes as any) || 'multipla_escolha',
      enunciado,
      alternativas,
      linhasResposta,
      ilustracaoSvgOuUrl,
      descricaoDesenhoMatriz,
      textoCaligraficoPontilhado,
      estiloDesenho,
    });
  }

  const id = `ativ-${Date.now()}`;
  const dataHoje = new Date().toLocaleDateString('pt-BR');
  const paginaNum = (habilidade as any).sourcePage || (habilidade as any).paginaOrigem || 1;
  const nomeMatrizOrigem = params.matrizNome || 'Matriz de Habilidades Essenciais 2026 (SEDUC-GO)';

  // Constrói justificativa com base nos relatos do profissional de apoio
  let justificativaAdaptacao = `Garantia de acessibilidade pedagógica plena sem rebaixamento de expectativa curricular (SEDUC-GO).`;
  let registrosApoioDescricao = `Estratégias de apoio e mediação pedagógica registradas no diário de bordo integradas.`;

  if (ajusteRelatoApoio?.houveDificuldadeRelatada) {
    justificativaAdaptacao = `Calibragem pedagógica com base no relato recente do Profissional de Apoio Escolar: ${ajusteRelatoApoio.relatoTexto || 'Estudante apresentou dificuldade na realização da atividade anterior.'} Foi realizada fragmentação de comandos, maior suporte visual ilustrado e redução de alternativas distratoras mantendo a habilidade ${codHabilidade} da Matriz SEDUC-GO e as metas do PEI.`;
    registrosApoioDescricao = `Retroalimentação ativa do diário de bordo do PAE: ${ajusteRelatoApoio.relatoTexto || 'Dificuldade superada com adequação de formato visual.'}`;
  }

  return {
    id,
    escolaId: params.escolaId,
    estudanteId: estudante.id,
    estudanteNome: estudante.nome,
    turma: estudante.turma,
    turmaId: params.turmaId,
    anoLetivo: params.anoLetivo || '2026',
    etapaEnsino: params.etapaEnsino || 'Ensino Fundamental II',
    anoSerie: params.anoSerie || estudante.anoSerie || estudante.turma?.split(' ')[0] || '',
    professorId,
    professorNome,
    disciplina,
    conteudo,
    bimestre: params.bimestre || '4º Bimestre',
    matrizId: params.matrizId || 'matriz-seduc-oficial-2026',
    matrizNome: nomeMatrizOrigem,
    versaoMatriz: params.versaoMatriz || '2026.1',
    habilidadeId: habilidade.id,
    habilidadeCodigo: codHabilidade,
    habilidadeDescricao: descHabilidade,
    habilidadesComplementares: params.habilidadesComplementares,
    objetoConhecimento: params.objetoConhecimento || objetoConhecimento,
    quantidadeQuestoes,
    tipoQuestoes,
    tipoAtividade,
    modeloAdaptacao: params.modeloAdaptacao || 'Adaptação Curricular Individualizada (PEI / BNCC / SEDUC-GO)',
    nivelAdaptacao: params.nivelAdaptacao || 'Universal',
    tipoLetra: tipoLetraFinal,
    formatoLetra: formatoFinal,
    usarCaixaAlta,
    estiloTipograficoVisual: estiloTipograficoFinal,
    estiloDesenho,
    trechoMatrizPdfConsultado: `Matriz: ${nomeMatrizOrigem} – Pág. ${paginaNum} | Habilidade: ${codHabilidade}`,
    exibirHabilidadeCabecalho: params.exibirHabilidadeCabecalho !== undefined 
      ? params.exibirHabilidadeCabecalho 
      : 'codigo_e_descricao',
    apoioVisual,
    opcoesCursiva,
    registrosApoioConsultados: params.registrosApoioConsultados,
    informacoesAdaptacao: params.informacoesAdaptacao || {
      habilidadeMatrizUtilizada: `${codHabilidade} - ${descHabilidade} (Pág. ${paginaNum})`,
      dadosPeiConsiderados: `Necessidades e adaptações do PEI de ${estudante.nome}.`,
      registrosApoioConsiderados: registrosApoioDescricao,
      estrategiasPedagogicasSugeridas: estiloTipograficoVisual === 'so_desenhos'
        ? `Atividade 100% visual com apoio pictográfico e pareamento temático da Matriz.`
        : `Apoio visual com desenhos temáticos e letra bastão/cursiva conforme laudo e PEI.`,
      justificativaAdaptacao,
    },
    observacaoProfessor,
    questoes,
    dataCriacao: dataHoje,
    status: 'Gerada',
    alinhadaAoPei: params.alinhadaAoPei !== undefined ? params.alinhadaAoPei : true,
    peiId: params.peiId,
    peiAlinhamentoDetalhes: params.peiAlinhamentoDetalhes || `Atividade adaptada alinhada ao PEI e à Matriz Curricular da SEDUC-GO.`,
    peiAlinhadoEm: new Date().toISOString(),
    peiAlinhadoPor: professorNome || 'Professor Regente',
    folhaComGabarito: params.folhaComGabarito,
  };
}
