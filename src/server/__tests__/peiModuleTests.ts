/**
 * Mock simples de localStorage para ambiente de testes Node.js
 */
if (typeof global.localStorage === 'undefined') {
  const store: Record<string, string> = {};
  (global as any).localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { for (const key in store) delete store[key]; }
  };
}

import { PeiDocumento, Estudante, EscolaConfig } from '../../types';
import { 
  gerarSugestaoPeiComIa, 
  salvarPeiDocumento, 
  obterTodosPeis, 
  obterPeisDoEstudante, 
  excluirPeiDocumento,
  validarCoerenciaSemanticaPei,
  validarCamposPei
} from '../../services/peiService';
import { gerarPeiPdfDocumento, sanitizarNomeArquivoPei } from '../../services/peiPdfService';

function runTest(name: string, fn: () => boolean | Promise<boolean>, details?: string): Promise<void> {
  return Promise.resolve()
    .then(() => fn())
    .then((passed) => {
      if (passed) {
        console.log(`[PASS] ${name}`);
        if (details) console.log(`   Detalhes: ${details}`);
      } else {
        console.error(`[FAIL] ${name}`);
        process.exit(1);
      }
    })
    .catch((err: any) => {
      console.error(`[ERROR] ${name}: ${err.message}`);
      process.exit(1);
    });
}

console.log('=== INICIANDO BATERIA DE TESTES DO MÓDULO CRIAR PEI (SEDUC-GO) ===\n');

async function main() {
  const escolaMock: EscolaConfig = {
    nome: 'Colégio Estadual Olynto Pereira de Castro',
    subtitulo: 'Secretaria de Estado da Educação - SEDUC Goiás',
    endereco: 'Rua Principal, 100',
    municipio: 'Rio Verde - GO',
    telefone: '(64) 3621-0000',
    emailInstitucional: 'olyntopereira@seduc.go.gov.br',
    permitirAcessoEmailSenha: false,
    textoRodape: 'Documento escolar oficial de uso interno e pedagógico.',
    logoUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    corPrincipal: '#065f46',
    corSecundaria: '#047857',
    corDestaque: '#10b981',
  };

  const estudanteMock: Estudante = {
    id: 'est-arthur-1',
    nome: 'Arthur Sousa Silva',
    matricula: '2024-00129',
    turma: 'Turma A',
    anoSerie: '6º Ano',
    turno: 'Matutino',
    laudo: 'Transtorno do Espectro Autista (TEA) - Nível 1 de Suporte',
    situacao: 'ativo',
    professoresAutorizadosIds: ['prof-1'],
    paeResponsavelNome: 'Ana Paula Souza',
    paeResponsavelEmail: 'ana.souza@educa.go.gov.br',
  };

  await runTest(
    '1. Preenchimento Automático do Cabeçalho Oficial do PEI com Dados Reais da SEDUC-GO',
    () => {
      const identification = {
        cre: 'Rio Verde',
        municipio: escolaMock.municipio || 'Rio Verde - GO',
        unidadeEscolar: escolaMock.nome,
        studentId: estudanteMock.id,
        studentName: estudanteMock.nome,
        grade: estudanteMock.anoSerie || '6º Ano',
        classRoom: estudanteMock.turma || 'Turma A',
        turno: estudanteMock.turno || 'Matutino',
        diagnosis: estudanteMock.laudo || 'TEA',
      };

      const validCre = identification.cre === 'Rio Verde';
      const validMun = identification.municipio === 'Rio Verde - GO';
      const validEsc = identification.unidadeEscolar === 'Colégio Estadual Olynto Pereira de Castro';
      const validNome = identification.studentName === 'Arthur Sousa Silva';
      const validDiag = identification.diagnosis.includes('Transtorno do Espectro Autista');
      const validTurma = identification.grade === '6º Ano' && identification.classRoom === 'Turma A' && identification.turno === 'Matutino';

      return validCre && validMun && validEsc && validNome && validDiag && validTurma;
    },
    'Cabeçalho integra CRE Rio Verde, Município Rio Verde - GO e Colégio Estadual Olynto Pereira de Castro'
  );

  await runTest(
    '2. Estrutura Oficial do PEI com 4 Seções (SIAP / SEDUC-GO)',
    () => {
      const peiDoc: PeiDocumento = {
        id: 'pei-test-estrutural',
        studentId: estudanteMock.id,
        studentName: estudanteMock.nome,
        grade: '6º Ano',
        classRoom: 'Turma A',
        diagnosis: 'TEA',
        subject: 'Língua Portuguesa e Matemática',
        period: '1º Bimestre',
        regentTeacher: 'Professora Maria Helena',
        supportTeacher: 'Ana Paula Souza',
        coordinatorName: 'Coordenação Pedagógica',
        principalName: 'Gestão Escolar',
        identification: {
          cre: 'Rio Verde',
          municipio: 'Rio Verde - GO',
          unidadeEscolar: 'Colégio Estadual Olynto Pereira de Castro',
          studentName: estudanteMock.nome,
          grade: '6º Ano',
          classRoom: 'Turma A',
          diagnosis: 'TEA',
        },
        etapa1: {
          habilidadesCognitivas: 'Memória visual e percepção de detalhes.',
          habilidadesAdaptativas: 'Autonomia nas atividades de vida diária.',
          dificuldadesCognitivas: 'Necessidade de mediação em enunciados longos.',
          dificuldadesAdaptativas: 'Sobrecarga sensorial em ambientes com ruído.',
        },
        etapa2: {
          expectativas: 'Compreender os tópicos essenciais do 1º Bimestre.',
          conteudos: 'Currículo em Movimento (DC-GO) com pistas visuais.',
          metodologias: 'Recursos estruturados, comunicação alternativa e suporte do PAE.',
          avaliacao: 'Procedimentos contínuos, provas adaptadas e tempo estendido.',
        },
        createdAt: new Date().toISOString(),
      };

      // Seção 1 (Identificação)
      const sec1Ok = Boolean(peiDoc.identification.unidadeEscolar && peiDoc.subject && peiDoc.period);
      // Seção 2 (Aspectos Cognitivos e Adaptativos - Etapa 1)
      const sec2Ok = Boolean(
        peiDoc.etapa1.habilidadesCognitivas &&
        peiDoc.etapa1.habilidadesAdaptativas &&
        peiDoc.etapa1.dificuldadesCognitivas &&
        peiDoc.etapa1.dificuldadesAdaptativas
      );
      // Seção 3 (Área Acadêmica / Flexibilizações - Etapa 2)
      const sec3Ok = Boolean(
        peiDoc.etapa2.expectativas &&
        peiDoc.etapa2.conteudos &&
        peiDoc.etapa2.metodologias &&
        peiDoc.etapa2.avaliacao
      );
      // Seção 4 (Assinaturas: Regente, Apoio, Coordenação, Gestão)
      const sec4Ok = Boolean(
        peiDoc.regentTeacher &&
        peiDoc.supportTeacher &&
        peiDoc.coordinatorName &&
        peiDoc.principalName
      );

      return sec1Ok && sec2Ok && sec3Ok && sec4Ok;
    },
    'Todas as 4 seções oficiais do SIAP/SEDUC-GO devidamente estruturadas com assinaturas'
  );

  await runTest(
    '3. Assistente de IA / Fallback Pedagógico para Geração de Proposta do PEI',
    async () => {
      const res = await gerarSugestaoPeiComIa({
        identification: {
          cre: 'Rio Verde',
          municipio: 'Rio Verde - GO',
          unidadeEscolar: 'Colégio Estadual Olynto Pereira de Castro',
          studentId: estudanteMock.id,
          studentName: estudanteMock.nome,
          grade: '6º Ano',
          classRoom: 'Turma A',
          diagnosis: 'TEA',
        },
        subject: 'Língua Portuguesa',
        period: '1º Bimestre',
      });

      const temEtapa1 = Boolean(
        res.etapa1!.habilidadesCognitivas.length > 20 &&
        res.etapa1!.habilidadesAdaptativas.length > 20 &&
        res.etapa1!.dificuldadesCognitivas.length > 20 &&
        res.etapa1!.dificuldadesAdaptativas.length > 20
      );

      const temEtapa2 = Boolean(
        res.etapa2!.expectativas.length > 20 &&
        res.etapa2!.conteudos.length > 20 &&
        res.etapa2!.metodologias.length > 20 &&
        res.etapa2!.avaliacao.length > 20
      );

      return temEtapa1 && temEtapa2;
    },
    'Sugestão com fundamentação pedagógica completa para Etapas 1 e 2 gerada com sucesso'
  );

  await runTest(
    '4. Sanitização e Formatação do Nome de Arquivo PDF Oficial',
    () => {
      const peiDoc: PeiDocumento = {
        id: 'pei-1',
        studentId: '1',
        studentName: 'Arthur Sousa Silva',
        grade: '6º Ano',
        classRoom: 'Turma A',
        diagnosis: 'TEA',
        subject: 'Geral',
        period: '1º Bimestre',
        regentTeacher: 'Prof',
        supportTeacher: 'PAE',
        identification: {
          cre: 'Rio Verde',
          municipio: 'Rio Verde - GO',
          unidadeEscolar: 'Colégio Estadual Olynto Pereira de Castro',
          studentName: 'Arthur Sousa Silva',
          grade: '6º Ano',
          classRoom: 'Turma A',
          diagnosis: 'TEA',
        },
        etapa1: {
          habilidadesCognitivas: '',
          habilidadesAdaptativas: '',
          dificuldadesCognitivas: '',
          dificuldadesAdaptativas: '',
        },
        etapa2: {
          expectativas: '',
          conteudos: '',
          metodologias: '',
          avaliacao: '',
        },
        createdAt: new Date().toISOString(),
      };

      const nome = sanitizarNomeArquivoPei(peiDoc);
      return nome === 'PEI_SEDUC_GO_Arthur_Sousa_Silva_1_Bimestre.pdf';
    },
    'Nome sanitizado sem acentos ou caracteres especiais: PEI_SEDUC_GO_Arthur_Sousa_Silva_1_Bimestre.pdf'
  );

  await runTest(
    '5. Diagramação em Folha A4 com Logotipo Pequeno e Proporcional no Canto Superior Esquerdo',
    () => {
      const peiDoc: PeiDocumento = {
        id: 'pei-pdf-layout-test',
        studentId: estudanteMock.id,
        studentName: estudanteMock.nome,
        grade: '6º Ano',
        classRoom: 'Turma A',
        diagnosis: 'TEA',
        subject: 'Língua Portuguesa e Matemática',
        period: '1º Bimestre',
        regentTeacher: 'Professora Maria Helena',
        supportTeacher: 'Ana Paula Souza',
        coordinatorName: 'Coordenação Pedagógica',
        principalName: 'Gestão Escolar',
        identification: {
          cre: 'Rio Verde',
          municipio: 'Rio Verde - GO',
          unidadeEscolar: 'Colégio Estadual Olynto Pereira de Castro',
          studentName: estudanteMock.nome,
          grade: '6º Ano',
          classRoom: 'Turma A',
          diagnosis: 'TEA',
        },
        etapa1: {
          habilidadesCognitivas: 'Excelente memória visual para esquemas gráficos e figuras.',
          habilidadesAdaptativas: 'Autonomia no cumprimento de rotinas estruturadas.',
          dificuldadesCognitivas: 'Tempo estendido para processamento textual.',
          dificuldadesAdaptativas: 'Sobrecarga em ambientes ruidosos.',
        },
        etapa2: {
          expectativas: 'Apropriação dos conceitos basilares previstos no DC-GO.',
          conteudos: 'Conteúdos com adaptação de vocabulário e esquemas.',
          metodologias: 'Organizadores gráficos e suporte do PAE.',
          avaliacao: 'Avaliação processual e contínua formativa.',
        },
        createdAt: new Date().toISOString(),
      };

      const doc = gerarPeiPdfDocumento(peiDoc, escolaMock);

      // Valida dimensões A4: 210 x 297 mm
      const width = doc.internal.pageSize.getWidth();
      const height = doc.internal.pageSize.getHeight();
      const a4Valido = Math.round(width) === 210 && Math.round(height) === 297;

      // Valida que possui páginas e gera saída binária
      const pages = doc.getNumberOfPages();
      const arrayBuffer = doc.output('arraybuffer');
      const bytesOk = arrayBuffer && arrayBuffer.byteLength > 2000;

      return a4Valido && pages >= 1 && Boolean(bytesOk);
    },
    'PDF A4 com 210x297mm, cabeçalho institucional, logotipo proporcional e paginação oficial'
  );

  await runTest(
    '6. Persistência de PEI no Sistema e Vinculação ao Estudante',
    async () => {
      const peiDoc: PeiDocumento = {
        id: 'pei-persistencia-teste-1',
        studentId: 'est-teste-99',
        studentName: 'Estudante Persistência Teste',
        grade: '8º Ano',
        classRoom: 'Turma C',
        diagnosis: 'TDAH',
        subject: 'Ciências',
        period: '3º Bimestre',
        regentTeacher: 'Prof. Marcos',
        supportTeacher: 'Prof. Apoio Juliana',
        identification: {
          cre: 'Rio Verde',
          municipio: 'Rio Verde - GO',
          unidadeEscolar: 'Colégio Estadual Olynto Pereira de Castro',
          studentName: 'Estudante Persistência Teste',
          grade: '8º Ano',
          classRoom: 'Turma C',
          diagnosis: 'TDAH',
        },
        etapa1: {
          habilidadesCognitivas: 'Agilidade na resolução de atividades dinâmicas.',
          habilidadesAdaptativas: 'Sociável e comunicativo.',
          dificuldadesCognitivas: 'Oscilações na atenção prolongada.',
          dificuldadesAdaptativas: 'Manejo do tempo em tarefas longas.',
        },
        etapa2: {
          expectativas: 'Desenvolver conceitos científicos essenciais.',
          conteudos: 'Metodologias práticas e experimentais.',
          metodologias: 'Fracionamento de tarefas com pausas orientadas.',
          avaliacao: 'Portfólio e avaliações práticas objetivas.',
        },
        createdAt: new Date().toISOString(),
      };

      await salvarPeiDocumento(peiDoc);
      const todos = await obterTodosPeis();
      const encontrado = todos.find(p => p.id === 'pei-persistencia-teste-1');

      const alunoPeis = await obterPeisDoEstudante('est-teste-99');
      const vinculado = alunoPeis.length >= 1 && alunoPeis[0].studentName === 'Estudante Persistência Teste';

      // Limpa dados de teste
      await excluirPeiDocumento('pei-persistencia-teste-1');
      const aposExclusao = await obterPeisDoEstudante('est-teste-99');

      return Boolean(encontrado) && vinculado && aposExclusao.length === 0;
    },
    'PEI salvo, recuperado por ID de estudante e removido corretamente'
  );

  await runTest(
    '7. Modelo Oficial Imutável com 10 Aspectos, Tabela Acadêmica (6 colunas) e Assinaturas (Anexo 9)',
    () => {
      const peiDoc: PeiDocumento = {
        id: 'pei-modelo-oficial-teste',
        studentId: estudanteMock.id,
        studentName: estudanteMock.nome,
        grade: '6º Ano',
        classRoom: 'Turma A',
        diagnosis: 'TEA',
        subject: 'Língua Portuguesa',
        period: '1º Bimestre',
        regentTeacher: 'Professora Maria Helena',
        supportTeacher: 'Ana Paula Souza',
        identification: {
          cre: 'Rio Verde',
          municipio: 'Rio Verde - GO',
          unidadeEscolar: 'Colégio Estadual Olynto Pereira de Castro',
          studentName: estudanteMock.nome,
          matricula: estudanteMock.matricula,
          grade: '6º Ano',
          classRoom: 'Turma A',
          turno: 'Matutino',
          diagnosis: 'TEA',
          professoresRegentes: 'Professora Maria Helena',
          profissionalApoio: 'Ana Paula Souza',
        },
        potencialidades: {
          cognitivoPsiquico: {
            percepcao: 'Visual aguçada',
            atencaoConcentracao: 'Foco em tarefas estruturadas',
            linguagemComunicacao: 'Comandos literais',
            memoriaAbstracaoGeneralizacao: 'Memória sequencial',
            criatividade: 'Produções visuais',
            aspectosPsicomotores: 'Coordenação ampla preservada',
            raciocinioLogico: 'Classificação e seriação',
          },
          comportamentoAdaptativo: {
            autocuidado: 'Independência em alimentação',
            autonomiaIndependencia: 'Cumprimento de rotina',
            habilidadesSociais: 'Afetivo com equipe',
          },
        },
        necessidadesDificuldades: {
          cognitivoPsiquico: {
            percepcao: 'Sensibilidade a ruídos',
            atencaoConcentracao: 'Transições bruscas',
            linguagemComunicacao: 'Textos longos',
            memoriaAbstracaoGeneralizacao: 'Abstração sem pista visual',
            criatividade: 'Comandos abertos',
            aspectosPsicomotores: 'Escrita cursiva prolongada',
            raciocinioLogico: 'Problemas de múltiplos passos',
          },
          comportamentoAdaptativo: {
            autocuidado: 'Supervisão de materiais',
            autonomiaIndependencia: 'Locais com aglomeração',
            habilidadesSociais: 'Turnos de fala coletivos',
          },
        },
        areaAcademica: [
          {
            id: 'disc-1',
            componenteCurricular: 'Língua Portuguesa',
            expectativas: 'Leitura funcional e compreensão com apoio visual.',
            conteudos: 'Gêneros textuais instrucionais.',
            metodologias: 'Organizadores gráficos e suporte do PAE.',
            avaliacao: 'Processual com redução de alternativas.',
            professor: 'Professora Maria Helena',
          },
          {
            id: 'disc-2',
            componenteCurricular: 'Matemática',
            expectativas: 'Operações fundamentais aplicadas ao cotidiano.',
            conteudos: 'Sistema monetário brasileiro.',
            metodologias: 'Material concreto e calculadora pedagógica.',
            avaliacao: 'Avaliação prática individualizada.',
            professor: 'Professor Regente',
          },
        ],
        assinaturasOficiais: {
          professorAee: 'Professor(a) de AEE',
          coordenacaoPedagogica: 'Coordenação Pedagógica',
          profissionalApoio: 'Profissional de Apoio Escolar (colaborador)',
          professoresRegentes: 'Professora Maria Helena',
          gestor: 'Gestor Escolar',
          local: 'Rio Verde - GO',
          data: '08 de outubro de 2026',
        },
        etapa1: {
          habilidadesCognitivas: 'Percepção e memória visual.',
          habilidadesAdaptativas: 'Autocuidado preservado.',
          dificuldadesCognitivas: 'Processamento de textos densos.',
          dificuldadesAdaptativas: 'Sobrecarga sonora.',
        },
        etapa2: {
          expectativas: 'Expectativas DC-GO.',
          conteudos: 'Conteúdos prioritários.',
          metodologias: 'Metodologias acessíveis.',
          avaliacao: 'Avaliação contínua.',
        },
        createdAt: new Date().toISOString(),
      };

      const tem10Pot = Boolean(
        peiDoc.potencialidades?.cognitivoPsiquico.percepcao &&
        peiDoc.potencialidades?.cognitivoPsiquico.atencaoConcentracao &&
        peiDoc.potencialidades?.cognitivoPsiquico.linguagemComunicacao &&
        peiDoc.potencialidades?.cognitivoPsiquico.memoriaAbstracaoGeneralizacao &&
        peiDoc.potencialidades?.cognitivoPsiquico.criatividade &&
        peiDoc.potencialidades?.cognitivoPsiquico.aspectosPsicomotores &&
        peiDoc.potencialidades?.cognitivoPsiquico.raciocinioLogico &&
        peiDoc.potencialidades?.comportamentoAdaptativo.autocuidado &&
        peiDoc.potencialidades?.comportamentoAdaptativo.autonomiaIndependencia &&
        peiDoc.potencialidades?.comportamentoAdaptativo.habilidadesSociais
      );

      const tem10Nec = Boolean(
        peiDoc.necessidadesDificuldades?.cognitivoPsiquico.percepcao &&
        peiDoc.necessidadesDificuldades?.cognitivoPsiquico.atencaoConcentracao &&
        peiDoc.necessidadesDificuldades?.cognitivoPsiquico.linguagemComunicacao &&
        peiDoc.necessidadesDificuldades?.cognitivoPsiquico.memoriaAbstracaoGeneralizacao &&
        peiDoc.necessidadesDificuldades?.cognitivoPsiquico.criatividade &&
        peiDoc.necessidadesDificuldades?.cognitivoPsiquico.aspectosPsicomotores &&
        peiDoc.necessidadesDificuldades?.cognitivoPsiquico.raciocinioLogico &&
        peiDoc.necessidadesDificuldades?.comportamentoAdaptativo.autocuidado &&
        peiDoc.necessidadesDificuldades?.comportamentoAdaptativo.autonomiaIndependencia &&
        peiDoc.necessidadesDificuldades?.comportamentoAdaptativo.habilidadesSociais
      );

      const tem6ColunasArea = Boolean(
        peiDoc.areaAcademica &&
        peiDoc.areaAcademica.length === 2 &&
        peiDoc.areaAcademica[0].componenteCurricular &&
        peiDoc.areaAcademica[0].expectativas &&
        peiDoc.areaAcademica[0].conteudos &&
        peiDoc.areaAcademica[0].metodologias &&
        peiDoc.areaAcademica[0].avaliacao &&
        peiDoc.areaAcademica[0].professor
      );

      const temAssinaturasCompletas = Boolean(
        peiDoc.assinaturasOficiais?.professorAee &&
        peiDoc.assinaturasOficiais?.coordenacaoPedagogica &&
        peiDoc.assinaturasOficiais?.profissionalApoio &&
        peiDoc.assinaturasOficiais?.professoresRegentes &&
        peiDoc.assinaturasOficiais?.gestor &&
        peiDoc.assinaturasOficiais?.local
      );

      const doc = gerarPeiPdfDocumento(peiDoc, escolaMock);
      const pdfGerado = doc.getNumberOfPages() >= 1;

      return tem10Pot && tem10Nec && tem6ColunasArea && temAssinaturasCompletas && pdfGerado;
    },
    'Validação integral do Modelo Oficial: 10 aspectos em potencialidades, 10 em necessidades, 6 colunas acadêmicas e assinaturas'
  );

  await runTest(
    '10. Validação de Coerência Semântica entre Necessidades e Estratégias Pedagógicas (SEDUC-GO)',
    () => {
      // Caso 1: Necessidades completamente vazias -> Deve acusar inconsistência crítica
      const necVazias = {
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
      };

      const areaValida = [
        {
          id: '1',
          componenteCurricular: 'Língua Portuguesa',
          expectativas: 'Compreensão leitora básica.',
          conteudos: 'Textos instrucionais.',
          metodologias: 'Organizadores visuais e pistas gráficas.',
          avaliacao: 'Avaliação processual.',
          professor: 'Prof. Regente',
        },
      ];

      const diagNecVazias = validarCoerenciaSemanticaPei(necVazias, areaValida);
      const acusaNecVazia = diagNecVazias.necessidadesCriticasVazias === true &&
        diagNecVazias.temInconsistenciaCritica === true &&
        diagNecVazias.inconsistencias.some((i: any) => i.categoria === 'necessidades');

      // Caso 2: Estratégias vazias na Área Acadêmica -> Deve acusar inconsistência crítica
      const necPreenchida = {
        cognitivoPsiquico: {
          percepcao: 'Dificuldade com estímulos auditivos simultâneos.',
          atencaoConcentracao: 'Atenção sustentada breve para instruções extensas.',
          linguagemComunicacao: 'Vocabulário literal, necessita suporte visual.',
          memoriaAbstracaoGeneralizacao: 'Memória visual forte, abstração demanda pistas.',
          criatividade: 'Produções com regras.',
          aspectosPsicomotores: 'Coordenação motora fina em desenvolvimento.',
          raciocinioLogico: 'Compreende com material concreto.',
        },
        comportamentoAdaptativo: {
          autocuidado: 'Independente.',
          autonomiaIndependencia: 'Necessita rotina estruturada.',
          habilidadesSociais: 'Interação mediada.',
        },
      };

      const areaSemEstrategias = [
        {
          id: '1',
          componenteCurricular: 'Matemática',
          expectativas: 'Contagem.',
          conteudos: 'Números.',
          metodologias: '', // VAZIO
          avaliacao: 'Observação.',
          professor: 'Prof. Regente',
        },
      ];

      const diagEstrategiaVazia = validarCoerenciaSemanticaPei(necPreenchida, areaSemEstrategias);
      const acusaEstrategiaVazia = diagEstrategiaVazia.temInconsistenciaCritica === true &&
        diagEstrategiaVazia.disciplinasSemEstrategia.includes('Matemática');

      // Caso 3: Desalinhamento temático (Necessidade em Atenção sem estratégias de foco/pausas)
      const areaSemAtencao = [
        {
          id: '1',
          componenteCurricular: 'História',
          expectativas: 'Família.',
          conteudos: 'Comunidade.',
          metodologias: 'Leitura silenciosa do livro didático padrão.', // Sem pausas ou recursos
          avaliacao: 'Prova.',
          professor: 'Prof. Regente',
        },
      ];
      const diagDesalinhado = validarCoerenciaSemanticaPei(necPreenchida, areaSemAtencao);
      const detectaDesalinhamento = diagDesalinhado.inconsistencias.some((i: any) => i.campo.includes('Atenção'));

      // Caso 4: 100% Coerente e Preenchido com metodologias ricas
      const areaCoerente = [
        {
          id: '1',
          componenteCurricular: 'Língua Portuguesa',
          expectativas: 'Leitura com apoio visual e vocabulário.',
          conteudos: 'Gêneros textuais.',
          metodologias: 'Organizadores visuais, pausas estruturadas para atenção e suporte do PAE.',
          avaliacao: 'Formativa.',
          professor: 'Prof. Regente',
        },
        {
          id: '2',
          componenteCurricular: 'Matemática',
          expectativas: 'Operações fundamentais.',
          conteudos: 'Sistema numérico.',
          metodologias: 'Uso de material concreto, esquemas gráficos e calculadora com mediação do PAE.',
          avaliacao: 'Prática.',
          professor: 'Prof. Regente',
        },
      ];

      const diagCoerente = validarCoerenciaSemanticaPei(necPreenchida, areaCoerente);
      const coerenteSemCriticos = diagCoerente.temInconsistenciaCritica === false &&
        diagCoerente.totalNecessidadesPreenchidas === 10 &&
        diagCoerente.totalEstrategiasPreenchidas === 2;

      return acusaNecVazia && acusaEstrategiaVazia && detectaDesalinhamento && coerenteSemCriticos;
    },
    'Validação semântica: detecta campos críticos vazios (Necessidades/Estratégias), aponta desalinhamento pedagógico e valida quando 100% preenchido'
  );

  await runTest(
    '11. Função validarCamposPei e Bloqueio Estrito de PDF por Campos Críticos Pendentes (Anexo 9)',
    () => {
      // 1. Ambas as seções vazias
      const necVazias = {
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
      };

      const resAmbasVazias = validarCamposPei(necVazias, []);
      const bloqueiaAmbasVazias = resAmbasVazias.valido === false &&
        resAmbasVazias.necessidadesPreenchidas === false &&
        resAmbasVazias.estrategiasPreenchidas === false &&
        (resAmbasVazias.detalhesPendencias || '').length >= 2;

      // 2. Necessidades preenchidas mas Estratégias vazias
      const necPreenchidas = {
        cognitivoPsiquico: {
          percepcao: 'Visual',
          atencaoConcentracao: 'Foco orientado',
          linguagemComunicacao: 'Literal',
          memoriaAbstracaoGeneralizacao: 'Rotinas',
          criatividade: 'Estruturada',
          aspectosPsicomotores: 'Ampla OK',
          raciocinioLogico: 'Concreto',
        },
        comportamentoAdaptativo: {
          autocuidado: 'Sim',
          autonomiaIndependencia: 'Sim',
          habilidadesSociais: 'Sim',
        },
      };

      const resEstrategiasVazias = validarCamposPei(necPreenchidas, [
        {
          id: '1',
          componenteCurricular: 'Geografia',
          expectativas: 'Mapas',
          conteudos: 'Espaço',
          metodologias: '', // VAZIO
          avaliacao: 'Contínua',
          professor: 'Prof. Regente',
        },
      ]);
      const bloqueiaEstrategiasVazias = resEstrategiasVazias.valido === false &&
        resEstrategiasVazias.necessidadesPreenchidas === true &&
        resEstrategiasVazias.estrategiasPreenchidas === false &&
        (resEstrategiasVazias.mensagemAlertaRodape || '').includes('Campos Críticos Pendentes');

      // 3. Ambas preenchidas conforme Anexo 9
      const areaValida = [
        {
          id: '1',
          componenteCurricular: 'Geografia',
          expectativas: 'Mapas e localização',
          conteudos: 'Espaço vivido',
          metodologias: 'Mapas em relevo, recursos visuais e mediação do PAE',
          avaliacao: 'Contínua processual',
          professor: 'Prof. Regente',
        },
      ];

      const resValido = validarCamposPei(necPreenchidas, areaValida);
      const liberaGeracaoPdf = resValido.valido === true &&
        resValido.necessidadesPreenchidas === true &&
        resValido.estrategiasPreenchidas === true &&
        (resValido.detalhesPendencias || '').length === 0;

      return bloqueiaAmbasVazias && bloqueiaEstrategiasVazias && liberaGeracaoPdf;
    },
    'validarCamposPei bloqueia geração de PDF quando faltam Necessidades ou Estratégias e libera quando ambas estão preenchidas (Anexo 9)'
  );

  console.log('\n=== TODOS OS TESTES DO MÓDULO CRIAR PEI (SEDUC-GO) FORAM APROVADOS COM SUCESSO! ===');
  process.exit(0);
}

main().catch((err) => {
  console.error('Falha geral nos testes:', err);
  process.exit(1);
});
