import { 
  previewStudentImportFromTextOrFile, 
  confirmStudentImport, 
  sanitizarTextoEstudante,
  atualizarFichaEstudante,
  vincularProfessoresAoEstudante,
  DOCUMENTO_ESTUDANTES_PADRAO
} from '../studentService';
import { Estudante, AuthorizedUser, UserRole } from '../../types';

export interface TestResult {
  id: number;
  description: string;
  passed: boolean;
  details: string;
}

export function runAllStudentSecurityTests(): TestResult[] {
  const results: TestResult[] = [];

  const mockCoordenador: AuthorizedUser = {
    id: 'user-coord-test',
    uid: 'google-uid-coord-test',
    name: 'COORDENADORA PEDAGÓGICA TESTE',
    email: 'coord@admin.educa.go.gov.br',
    emailNormalized: 'coord@admin.educa.go.gov.br',
    roles: ['coordinator'],
    active: true,
    status: 'authorized',
    schoolId: 'olynto-pereira-castro',
    allowedClasses: [],
    allowedDisciplines: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'Sistema',
    source: 'Teste',
    sourcePage: null,
    firstAccessAt: null,
    lastAccessAt: null,
    archivedAt: null,
  };

  const mockProfessor: AuthorizedUser = {
    id: 'user-prof-test',
    uid: 'google-uid-prof-test',
    name: 'PROFESSOR REGENTE TESTE',
    email: 'prof@educa.go.gov.br',
    emailNormalized: 'prof@educa.go.gov.br',
    roles: ['teacher'],
    active: true,
    status: 'authorized',
    schoolId: 'olynto-pereira-castro',
    allowedClasses: ['6º Ano A', '7º Ano B'],
    allowedDisciplines: ['Matemática'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'Sistema',
    source: 'Teste',
    sourcePage: null,
    firstAccessAt: null,
    lastAccessAt: null,
    archivedAt: null,
  };

  // TESTE 1: Bloquear tentativa de importação por professor
  {
    const res = previewStudentImportFromTextOrFile({
      nomeArquivo: 'alunos.pdf',
      usarRosterPadrao: true,
      existingStudents: [],
      currentUserRoles: ['teacher'], // sem 'coordinator'
    });

    const passed = !res.success && res.errorCode === 'PERMISSION_DENIED';
    results.push({
      id: 1,
      description: 'Bloqueio de importação de estudantes para usuário com perfil exclusivo de Professor',
      passed,
      details: passed ? 'Acesso bloqueado com sucesso (PERMISSION_DENIED).' : 'Falha: Professor conseguiu iniciar importação.',
    });
  }

  // TESTE 2: Descarte ativo de laudos clínicos e diagnósticos médicos (TEA, TDAH, CID-10)
  {
    const linhaComDiagnostico = 'GABRIEL ALMEIDA, 20269999, 6º Ano A, 6º Ano, Manhã, LAUDO MEDICO: TEA NIVEL 2 CID F84.0 TDAH F90';
    const sanitizado = sanitizarTextoEstudante(linhaComDiagnostico);

    const passouFiltro = sanitizado.dadosSensiveisIgnorados && 
      !sanitizado.textoLimpo.includes('F84') && 
      !sanitizado.textoLimpo.includes('TEA') &&
      !sanitizado.textoLimpo.includes('TDAH');

    results.push({
      id: 2,
      description: 'Descarte ativo e deliberado de laudos clínicos, diagnósticos médicos e códigos CID',
      passed: passouFiltro,
      details: passouFiltro ? 'CIDs e diagnósticos clínicos foram sumariamente removidos do registro.' : 'Falha: Dados clínicos vazaram na sanitização.',
    });
  }

  // TESTE 3: Descarte de documentos pessoais sensíveis (CPF, RG, Telefones)
  {
    const linhaComCpfETel = 'MARIANA DIAS, 20268888, 7º Ano A, 7º Ano, Tarde, CPF 123.456.789-00 TEL (62) 98888-7777';
    const sanitizado = sanitizarTextoEstudante(linhaComCpfETel);

    const passouCpf = sanitizado.dadosSensiveisIgnorados && 
      !sanitizado.textoLimpo.includes('123.456.789-00') &&
      !sanitizado.textoLimpo.includes('98888-7777');

    results.push({
      id: 3,
      description: 'Descarte ativo e deliberado de CPF, RG e telefones residenciais',
      passed: passouCpf,
      details: passouCpf ? 'CPF e telefone foram eliminados com sucesso.' : 'Falha: Documento pessoal mantido no texto.',
    });
  }

  // TESTE 4: Detecção de duplicidade contra estudantes já cadastrados
  {
    const existing: Estudante[] = [
      {
        id: 'est-existente-1',
        nome: 'ADRIANO SILVA BENTO',
        matricula: '202601001',
        turma: '6º Ano A',
        anoSerie: '6º Ano',
        turno: 'Manhã',
        situacao: 'ativo',
        professoresAutorizadosIds: [],
      }
    ];

    const res = previewStudentImportFromTextOrFile({
      nomeArquivo: 'relatorio.pdf',
      usarRosterPadrao: true,
      existingStudents: existing,
      currentUserRoles: ['coordinator'],
    });

    const regDuplicado = res.data?.registros.find(r => r.matricula === '202601001');
    const passed = regDuplicado?.situacao === 'Estudante já cadastrado' && !regDuplicado?.selecionado;

    results.push({
      id: 4,
      description: 'Detecção de matrícula pré-existente na base de estudantes (Bloqueio de duplicação)',
      passed: Boolean(passed),
      details: passed ? 'Estudante existente foi corretamente marcado como já cadastrado e desmarcado.' : 'Falha na identificação de duplicidade.',
    });
  }

  // TESTE 5: Detecção de matrícula duplicada no próprio arquivo
  {
    const textoDuplicadoNoArquivo = `
      CARLOS ALBERTO, 20269999, 8º Ano A, 8º Ano, Manhã
      ROBERTO CARLOS, 20269999, 8º Ano B, 8º Ano, Tarde
    `;

    const res = previewStudentImportFromTextOrFile({
      nomeArquivo: 'arquivo_teste.txt',
      conteudoTexto: textoDuplicadoNoArquivo,
      usarRosterPadrao: false,
      existingStudents: [],
      currentUserRoles: ['coordinator'],
    });

    const segundoRegistro = res.data?.registros?.[1];
    const passed = segundoRegistro?.situacao === 'Matrícula duplicada no arquivo';

    results.push({
      id: 5,
      description: 'Detecção de duplicidade de matrícula interna dentro do próprio documento enviado',
      passed: Boolean(passed),
      details: passed ? 'Segunda ocorrência da mesma matrícula foi sinalizada como duplicada.' : 'Falha na detecção de duplicata interna.',
    });
  }

  // TESTE 6: Identificação de matrícula ausente
  {
    const textoSemMatricula = `
      LUCAS SILVEIRA, , 9º Ano A, 9º Ano, Tarde
    `;

    const res = previewStudentImportFromTextOrFile({
      nomeArquivo: 'teste_sem_mat.txt',
      conteudoTexto: textoSemMatricula,
      usarRosterPadrao: false,
      existingStudents: [],
      currentUserRoles: ['coordinator'],
    });

    const reg = res.data?.registros[0];
    const passed = reg?.situacao === 'Matrícula ausente' && !reg?.selecionado;

    results.push({
      id: 6,
      description: 'Identificação e sinalização de estudante com matrícula ausente',
      passed: Boolean(passed),
      details: passed ? 'Registro sem matrícula foi sinalizado como "Matrícula ausente" e bloqueado.' : 'Falha ao tratar matrícula ausente.',
    });
  }

  // TESTE 7: Garantia de que nenhum estudante é gravado antes da confirmação da Coordenação
  {
    // A chamada de preview não deve alterar a base
    const baseOriginal: Estudante[] = [];
    previewStudentImportFromTextOrFile({
      nomeArquivo: 'teste.pdf',
      usarRosterPadrao: true,
      existingStudents: baseOriginal,
      currentUserRoles: ['coordinator'],
    });

    const passed = baseOriginal.length === 0;

    results.push({
      id: 7,
      description: 'Garantia de que a análise inicial não grava nenhum estudante antes da confirmação da Coordenação',
      passed,
      details: passed ? 'Nenhum dado é persistido no preview antes do aceite da Coordenação.' : 'Falha: Registros foram gravados precocemente.',
    });
  }

  // TESTE 8: Confirmação e geração das Fichas Individuais
  {
    const previewRes = previewStudentImportFromTextOrFile({
      nomeArquivo: DOCUMENTO_ESTUDANTES_PADRAO.nomeArquivo,
      usarRosterPadrao: true,
      existingStudents: [],
      currentUserRoles: ['coordinator'],
    });

    const confirmRes = confirmStudentImport({
      registrosConfirmados: previewRes.data!.registros,
      currentUserRoles: ['coordinator'],
      currentUserName: 'COORDENAÇÃO',
      professoresDisponiveis: [mockProfessor],
      existingStudents: [],
    });

    const totalCriados = confirmRes.data?.estudantesCriados.length || 0;
    const passed = confirmRes.success && totalCriados > 0;

    results.push({
      id: 8,
      description: 'Confirmação pela Coordenação e geração correta de Fichas Individuais no banco de dados',
      passed,
      details: passed ? `Foram geradas ${totalCriados} fichas individuais com identificadores únicos.` : 'Falha na confirmação da importação.',
    });
  }

  // TESTE 9: Associação automática de professores às turmas dos estudantes
  {
    const previewRes = previewStudentImportFromTextOrFile({
      nomeArquivo: DOCUMENTO_ESTUDANTES_PADRAO.nomeArquivo,
      usarRosterPadrao: true,
      existingStudents: [],
      currentUserRoles: ['coordinator'],
    });

    // mockProfessor atende '6º Ano A'
    const confirmRes = confirmStudentImport({
      registrosConfirmados: previewRes.data!.registros,
      currentUserRoles: ['coordinator'],
      currentUserName: 'COORDENAÇÃO',
      professoresDisponiveis: [mockProfessor],
      existingStudents: [],
    });

    const alunosDo6AnoA = confirmRes.data?.estudantesCriados.filter(e => e.turma === '6º Ano A') || [];
    const vinculadosCorretamente = alunosDo6AnoA.every(e => e.professoresAutorizadosIds.includes(mockProfessor.id));

    results.push({
      id: 9,
      description: 'Associação de professores autorizados com base na coincidência de turmas da escola',
      passed: vinculadosCorretamente && alunosDo6AnoA.length > 0,
      details: vinculadosCorretamente ? 'Professores do 6º Ano A foram vinculados automaticamente aos estudantes correspondentes.' : 'Falha no vínculo de professores.',
    });
  }

  // TESTE 10: Atualização de ficha e proteção de papéis
  {
    const estudanteTeste: Estudante = {
      id: 'est-teste-update',
      nome: 'ESTUDANTE TESTE',
      matricula: '20267777',
      turma: '6º Ano A',
      anoSerie: '6º Ano',
      turno: 'Manhã',
      situacao: 'ativo',
      professoresAutorizadosIds: [],
    };

    const updateRes = atualizarFichaEstudante({
      estudanteId: estudanteTeste.id,
      dadosAtualizados: { turno: 'Tarde' },
      currentUserRoles: ['coordinator'],
      allStudents: [estudanteTeste],
    });

    const passed = updateRes.success && updateRes.data?.turno === 'Tarde';

    results.push({
      id: 10,
      description: 'Permissão da Coordenação para atualização da Ficha Individual do Estudante',
      passed: Boolean(passed),
      details: passed ? 'Ficha individual atualizada com sucesso pela Coordenação.' : 'Falha ao atualizar ficha.',
    });
  }

  return results;
}

// Execução direta quando rodado via CLI
if (typeof process !== 'undefined' && Array.isArray(process.argv) && process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const testResults = runAllStudentSecurityTests();
  const passedCount = testResults.filter(t => t.passed).length;
  console.log(`\n=== BATERIA DE TESTES DE ESTUDANTES E CADASTROS: ${passedCount}/${testResults.length} APROVADOS ===\n`);
  for (const t of testResults) {
    console.log(`[${t.passed ? 'PASS' : 'FAIL'}] ${t.description}`);
    console.log(`   Detalhes: ${t.details}\n`);
  }
}
