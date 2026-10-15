import {
  sanitizarNomeArquivo,
  gerarNomeArquivoAtividadePdf,
  gerarAtividadePdfProgramatico,
  gerarMultiplasAtividadesPdfProgramatico,
  exportarMultiplasAtividadesPdf,
} from '../../services/atividadeA4PdfService';
import { AtividadeAdaptada } from '../../types';

console.log('=== INICIANDO BATERIA DE TESTES DE EXPORTAÇÃO DE ATIVIDADE A4 PARA PDF ===');
let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, details: string) {
  if (condition) {
    console.log(`[PASS] ${testName}\n   Detalhes: ${details}`);
    passCount++;
  } else {
    console.error(`[FAIL] ${testName}\n   Detalhes: ${details}`);
    failCount++;
  }
}

// 1. Sanitização de nomes de arquivo
const nomeSanitizado = sanitizarNomeArquivo('6º Ano - A / Matemática & Expressão!');
assert(
  nomeSanitizado === '6_Ano_A_Matematica_Expressao',
  '1. Sanitização adequada para nomes de arquivo seguros sem caracteres especiais',
  `Resultado: "${nomeSanitizado}"`
);

// 2. Formato canônico do nome do arquivo PDF
const atividadeMock: AtividadeAdaptada = {
  id: 'ativ-teste-1',
  estudanteId: 'est-1',
  estudanteNome: 'Lucas Gabriel Silva',
  turma: '7º Ano B',
  professorId: 'prof-1',
  professorNome: 'Profª. Juliana Alves',
  disciplina: 'Ciências',
  conteudo: 'Células e Tecidos',
  habilidadeCodigo: 'EF07CI01',
  habilidadeDescricao: 'Discutir a estrutura básica da célula vegetal e animal.',
  quantidadeQuestoes: 2,
  tipoQuestoes: 'Mista',
  alinhadaAoPei: true,
  peiAlinhadoPor: 'Coordenação Pedagógica',
  dataCriacao: '06/10/2026',
  status: 'Revisada',
  questoes: [
    {
      id: 'q1',
      numero: 1,
      tipo: 'multipla_escolha',
      enunciado: 'Identifique a organela responsável pela respiração celular:',
      alternativas: [
        'A) Mitocôndria',
        'B) Ribossomo',
        'C) Cloroplasto',
      ],
    },
    {
      id: 'q2',
      numero: 2,
      tipo: 'discursiva',
      enunciado: 'Descreva a principal diferença entre uma célula animal e uma vegetal:',
      linhasResposta: 4,
    },
  ],
};

const nomeArquivoGerado = gerarNomeArquivoAtividadePdf(atividadeMock);
assert(
  nomeArquivoGerado === 'Atividade_Adaptada_7_Ano_B_Lucas_Gabriel_Silva_Ciencias.pdf',
  '2. Nome padrão do arquivo reflete Turma, Estudante e Disciplina com extensão .pdf',
  `Nome: "${nomeArquivoGerado}"`
);

// 3. Geração programática do documento jsPDF
const doc = gerarAtividadePdfProgramatico(atividadeMock, {
  nome: 'Colégio Estadual Olynto Pereira de Castro',
  municipio: 'Rio Verde - GO',
  textoRodape: 'Avaliação adaptada oficial.',
});

assert(
  doc !== null && doc !== undefined,
  '3. Criação com sucesso da instância jsPDF configurada em padrão A4',
  `Largura: ${doc.internal.pageSize.getWidth()}mm, Altura: ${doc.internal.pageSize.getHeight()}mm`
);

// 4. Verificação de páginas e buffer
const totalPaginas = doc.getNumberOfPages();
assert(
  totalPaginas >= 1,
  '4. Documento PDF possui paginação válida',
  `Total de páginas geradas: ${totalPaginas}`
);

// 5. Geração do Blob PDF
const blob = doc.output('blob');
assert(
  blob instanceof Blob && blob.size > 0 && blob.type === 'application/pdf',
  '5. Exportação de Blob válido do tipo application/pdf com tamanho consistente',
  `Tipo: ${blob.type}, Tamanho: ${blob.size} bytes`
);

// 6. Geração de PDF contínuo para múltiplas atividades selecionadas
const atividadeMock2: AtividadeAdaptada = {
  ...atividadeMock,
  id: 'ativ-teste-2',
  estudanteNome: 'Carlos Eduardo Oliveira',
  turma: '6º Ano A',
  disciplina: 'Matemática',
  conteudo: 'Frações e Porcentagem',
  habilidadeCodigo: 'EF06MA08',
  habilidadeDescricao: 'Reconhecer que as frações representam partes de um todo.',
};

const atividadeMock3: AtividadeAdaptada = {
  ...atividadeMock,
  id: 'ativ-teste-3',
  estudanteNome: 'Mariana Souza Santos',
  turma: '8º Ano C',
  disciplina: 'História',
  conteudo: 'Revolução Industrial',
  habilidadeCodigo: 'EF08HI03',
  habilidadeDescricao: 'Analisar os impactos da Revolução Industrial na sociedade moderna.',
};

const docContinuo = gerarMultiplasAtividadesPdfProgramatico(
  [atividadeMock, atividadeMock2, atividadeMock3],
  {
    nome: 'Colégio Estadual Olynto Pereira de Castro',
    municipio: 'Rio Verde - GO',
    textoRodape: 'Documento escolar gerado para avaliação pedagógica individualizada adaptada.',
  }
);

assert(
  docContinuo.getNumberOfPages() >= 3,
  '6. PDF contínuo de lote compila todas as atividades selecionadas em páginas sequenciais',
  `Total de páginas compiladas: ${docContinuo.getNumberOfPages()} páginas para 3 atividades`
);

// 7. Teste da função assíncrona de exportação em lote
const resultadoLote = await exportarMultiplasAtividadesPdf(
  [atividadeMock, atividadeMock2, atividadeMock3],
  { nome: 'Colégio Estadual Olynto Pereira de Castro' }
);

assert(
  resultadoLote.fileName.startsWith('Coletanea_Atividades_Adaptadas_3_itens_') &&
  resultadoLote.fileName.endsWith('.pdf'),
  '7. Nome do arquivo em lote segue padrão descritivo canônico com contagem de itens e data',
  `Nome do arquivo: "${resultadoLote.fileName}"`
);

assert(
  resultadoLote.blob instanceof Blob && resultadoLote.blob.size > blob.size,
  '8. Blob compilado contínuo contém payload proporcional ao volume das atividades',
  `Tamanho do PDF contínuo: ${resultadoLote.blob.size} bytes (vs ${blob.size} bytes individual)`
);

console.log(`\n=== BATERIA DE TESTES DE EXPORTAÇÃO PDF: ${passCount}/${passCount + failCount} APROVADOS ===\n`);

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
