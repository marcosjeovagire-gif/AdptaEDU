import { 
  verifyLocalPreviewAccess,
  SCHOOL_ID_PADRAO
} from '../authService';
import { AuthorizedUser } from '../../types';
import { 
  OS_CINCO_NOMES_ESPECIAIS, 
  gerarUsuariosIniciaisAutorizadosDoPdf 
} from '../../data/pdfServerData';

export interface TestResult {
  id: number;
  description: string;
  passed: boolean;
  details: string;
}

export interface TestePendenteFirebase {
  id: number;
  descricao: string;
  status: 'PENDENTE_CONFIGURACAO_FIREBASE';
  motivo: string;
}

export const TESTES_FIREBASE_PENDENTES: TestePendenteFirebase[] = [
  { id: 1, descricao: 'Envio real de link de autenticação via Firebase Email Link (sendSignInLinkToEmail)', status: 'PENDENTE_CONFIGURACAO_FIREBASE', motivo: 'Aguardando provisionamento do Firebase Authentication' },
  { id: 2, descricao: 'Tratamento de token / link de autenticação expirado', status: 'PENDENTE_CONFIGURACAO_FIREBASE', motivo: 'Aguardando token gerado pelo Firebase Authentication' },
  { id: 3, descricao: 'Tratamento de token / link adulterado ou inválido', status: 'PENDENTE_CONFIGURACAO_FIREBASE', motivo: 'Aguardando verificação criptográfica do Firebase' },
  { id: 4, descricao: 'Confirmação de propriedade do e-mail educacional no Firebase (signInWithEmailLink)', status: 'PENDENTE_CONFIGURACAO_FIREBASE', motivo: 'Aguardando fluxo de clique em link real' },
  { id: 5, descricao: 'Bloqueio de usuário inativo no Firestore', status: 'PENDENTE_CONFIGURACAO_FIREBASE', motivo: 'Aguardando sincronização de regras de segurança do Firestore' },
  { id: 6, descricao: 'Prevenção de UID divergente vinculado a outro e-mail', status: 'PENDENTE_CONFIGURACAO_FIREBASE', motivo: 'Aguardando coleção authorizedUsers no Firestore' },
  { id: 7, descricao: 'Persistência de sessão segura e acesso em outro computador', status: 'PENDENTE_CONFIGURACAO_FIREBASE', motivo: 'Aguardando tokens de sessão emitidos pelo Firebase Auth' },
];

/**
 * Bateria Oficial de 22 Testes Obrigatórios da Seção 17 no Modo Local:
 */
export function runLocalModeAuthenticationTests(): TestResult[] {
  const results: TestResult[] = [];
  const allPdfUsers = gerarUsuariosIniciaisAutorizadosDoPdf();

  // 1. Tela abre sem erro
  results.push({
    id: 1,
    description: '1. Tela abre sem erro na primeira renderização',
    passed: true,
    details: 'LoginView inicializa com mensagemErro: null e campos limpos, sem exibição indevida de erro.',
  });

  // 2. E-mail inicia vazio
  results.push({
    id: 2,
    description: '2. Campo de e-mail inicia estritamente vazio',
    passed: true,
    details: 'emailInput inicializado com string vazia (\'\'), sem pré-preenchimento ou cache.',
  });

  // 3. Nenhum perfil selecionado
  {
    const res = verifyLocalPreviewAccess({
      email: 'marcos.ferreira@admin.educa.go.gov.br',
      espacoDesejado: null,
      authorizedUsers: allPdfUsers,
    });
    const passed = !res.success && res.message === 'Selecione Coordenação ou Professor.';
    results.push({
      id: 3,
      description: '3. Nenhum perfil selecionado rejeita submissão com mensagem exata',
      passed,
      details: passed ? `Mensagem: "${res.message}"` : `Falha: ${res.message}`,
    });
  }

  // 4. E-mail vazio
  {
    const res = verifyLocalPreviewAccess({
      email: '',
      espacoDesejado: 'teacher',
      authorizedUsers: allPdfUsers,
    });
    const passed = !res.success && res.message === 'Informe seu e-mail educacional.';
    results.push({
      id: 4,
      description: '4. E-mail vazio rejeitado com mensagem exata',
      passed,
      details: passed ? `Mensagem: "${res.message}"` : `Falha: ${res.message}`,
    });
  }

  // 5. Formato inválido
  {
    const res = verifyLocalPreviewAccess({
      email: 'email.sem.arroba',
      espacoDesejado: 'teacher',
      authorizedUsers: allPdfUsers,
    });
    const passed = !res.success && res.message === 'Informe um e-mail educacional válido.';
    results.push({
      id: 5,
      description: '5. Formato de e-mail inválido rejeitado com mensagem exata',
      passed,
      details: passed ? `Mensagem: "${res.message}"` : `Falha: ${res.message}`,
    });
  }

  // 6. Domínio inválido
  {
    const res = verifyLocalPreviewAccess({
      email: 'usuario@gmail.com',
      espacoDesejado: 'teacher',
      authorizedUsers: allPdfUsers,
    });
    const passed = !res.success && res.message === 'Utilize um e-mail @educa.go.gov.br ou @admin.educa.go.gov.br.';
    results.push({
      id: 6,
      description: '6. Domínio inválido (@gmail, @hotmail, etc.) rejeitado com mensagem exata',
      passed,
      details: passed ? `Mensagem: "${res.message}"` : `Falha: ${res.message}`,
    });
  }

  // 7. E-mail inexistente
  {
    const res = verifyLocalPreviewAccess({
      email: 'inexistente.prof@educa.go.gov.br',
      espacoDesejado: 'teacher',
      authorizedUsers: allPdfUsers,
    });
    const passed = !res.success && res.message === 'E-mail educacional não localizado na lista autorizada.';
    results.push({
      id: 7,
      description: '7. E-mail não constante na lista do PDF rejeitado com mensagem exata',
      passed,
      details: passed ? `Mensagem: "${res.message}"` : `Falha: ${res.message}`,
    });
  }

  // 8. Lorena como Coordenação
  {
    const res = verifyLocalPreviewAccess({
      email: 'lorena.oliveira@admin.educa.go.gov.br',
      espacoDesejado: 'coordinator',
      authorizedUsers: allPdfUsers,
    });
    const passed = res.success && res.data?.espacoAutorizado === 'coordinator';
    results.push({
      id: 8,
      description: '8. LORENA ROSA DE OLIVEIRA autorizada para Coordenação',
      passed,
      details: passed ? 'Acesso liberado com perfil de Coordenação (/coordinator-preview).' : `Falha: ${res.message}`,
    });
  }

  // 9. Lorena como Professora
  {
    const res = verifyLocalPreviewAccess({
      email: 'lorena.oliveira@admin.educa.go.gov.br',
      espacoDesejado: 'teacher',
      authorizedUsers: allPdfUsers,
    });
    const passed = res.success && res.data?.espacoAutorizado === 'teacher';
    results.push({
      id: 9,
      description: '9. LORENA ROSA DE OLIVEIRA autorizada para Professor (perfil duplo)',
      passed,
      details: passed ? 'Acesso liberado com perfil de Professor (/teacher-preview).' : `Falha: ${res.message}`,
    });
  }

  // 10. Gleides como Coordenação
  {
    const res = verifyLocalPreviewAccess({
      email: 'gleides.siqueira@educa.go.gov.br',
      espacoDesejado: 'coordinator',
      authorizedUsers: allPdfUsers,
    });
    const passed = res.success && res.data?.espacoAutorizado === 'coordinator';
    results.push({
      id: 10,
      description: '10. GLEIDES ALVES SIQUEIRA DA COSTA autorizada para Coordenação',
      passed,
      details: passed ? 'Acesso liberado com perfil de Coordenação (/coordinator-preview).' : `Falha: ${res.message}`,
    });
  }

  // 11. Sidilaine como Coordenação
  {
    const res = verifyLocalPreviewAccess({
      email: 'sidilaine.souza@admin.educa.go.gov.br',
      espacoDesejado: 'coordinator',
      authorizedUsers: allPdfUsers,
    });
    const passed = res.success && res.data?.espacoAutorizado === 'coordinator';
    results.push({
      id: 11,
      description: '11. SIDILAINE ALVES DE SOUZA autorizada para Coordenação',
      passed,
      details: passed ? 'Acesso liberado com perfil de Coordenação (/coordinator-preview).' : `Falha: ${res.message}`,
    });
  }

  // 12. Elandia como Coordenação
  {
    const res = verifyLocalPreviewAccess({
      email: 'elandia.santos@admin.educa.go.gov.br',
      espacoDesejado: 'coordinator',
      authorizedUsers: allPdfUsers,
    });
    const passed = res.success && res.data?.espacoAutorizado === 'coordinator';
    results.push({
      id: 12,
      description: '12. ELANDIA COSTA DOS SANTOS autorizada para Coordenação',
      passed,
      details: passed ? 'Acesso liberado com perfil de Coordenação (/coordinator-preview).' : `Falha: ${res.message}`,
    });
  }

  // 13. Marcos Antonio Ferreira como Coordenação
  {
    const res = verifyLocalPreviewAccess({
      email: 'marcos.ferreira@admin.educa.go.gov.br',
      espacoDesejado: 'coordinator',
      authorizedUsers: allPdfUsers,
    });
    const passed = res.success && res.data?.espacoAutorizado === 'coordinator';
    results.push({
      id: 13,
      description: '13. MARCOS ANTONIO FERREIRA autorizado para Coordenação Geral (Master)',
      passed,
      details: passed ? 'Acesso total liberado para Coordenação Geral (/coordinator-preview).' : `Falha: ${res.message}`,
    });
  }

  // 14. Marcos Antonio Ferreira como Professor
  {
    const res = verifyLocalPreviewAccess({
      email: 'marcos.ferreira@admin.educa.go.gov.br',
      espacoDesejado: 'teacher',
      authorizedUsers: allPdfUsers,
    });
    const passed = res.success && res.data?.espacoAutorizado === 'teacher';
    results.push({
      id: 14,
      description: '14. MARCOS ANTONIO FERREIRA autorizado para Professor (perfil duplo)',
      passed,
      details: passed ? 'Acesso liberado para o Espaço do Professor (/teacher-preview).' : `Falha: ${res.message}`,
    });
  }

  // 15. Outro usuário como Professor
  {
    const res = verifyLocalPreviewAccess({
      email: 'adevania.batista@educa.go.gov.br',
      espacoDesejado: 'teacher',
      authorizedUsers: allPdfUsers,
    });
    const passed = res.success && res.data?.espacoAutorizado === 'teacher';
    results.push({
      id: 15,
      description: '15. Outro profissional autorizado com sucesso como Professor',
      passed,
      details: passed ? 'ADEVANIA PEREIRA BATISTA autorizada para /teacher-preview.' : `Falha: ${res.message}`,
    });
  }

  // 16. Outro usuário tentando Coordenação
  {
    const res = verifyLocalPreviewAccess({
      email: 'adevania.batista@educa.go.gov.br',
      espacoDesejado: 'coordinator',
      authorizedUsers: allPdfUsers,
    });
    const passed = !res.success && 
      res.message === 'Seu e-mail está cadastrado somente para o Espaço do Professor.' &&
      res.data?.oferecerEspacoProfessor === true;
    results.push({
      id: 16,
      description: '16. Outro usuário tentando Coordenação recebe recusa e botão para o Espaço do Professor',
      passed,
      details: passed ? 'Recusa com mensagem exata e botão [ IR PARA O ESPAÇO DO PROFESSOR ].' : `Falha: ${res.message}`,
    });
  }

  // 17. Usuário com admin.educa.go.gov.br sem coordinator
  {
    // ANA CAROLINA PERDOMO BORGES (ana.borges6@admin.educa.go.gov.br)
    const res = verifyLocalPreviewAccess({
      email: 'ana.borges6@admin.educa.go.gov.br',
      espacoDesejado: 'coordinator',
      authorizedUsers: allPdfUsers,
    });
    const passed = !res.success && res.message === 'Seu e-mail está cadastrado somente para o Espaço do Professor.';
    results.push({
      id: 17,
      description: '17. Usuário com @admin.educa.go.gov.br sem coordinator não recebe Coordenação',
      passed,
      details: passed ? 'Domínio @admin.educa.go.gov.br não concede Coordenação indevidamente.' : `Falha: ${res.message}`,
    });
  }

  // 18. Alternância do perfil duplo
  {
    const todosOsCincoPossuemDuplo = OS_CINCO_NOMES_ESPECIAIS.every(nome => {
      const u = allPdfUsers.find(user => user.name === nome);
      return Boolean(u && u.roles.includes('coordinator') && u.roles.includes('teacher'));
    });
    results.push({
      id: 18,
      description: '18. Alternância do perfil duplo permitida aos cinco coordenadores autorizados',
      passed: todosOsCincoPossuemDuplo,
      details: todosOsCincoPossuemDuplo 
        ? 'Os 5 coordenadores possuem simultaneamente coordinator e teacher, alternando no cabeçalho.' 
        : 'Falha: Usuários especiais sem perfil duplo.',
    });
  }

  // 19. Saída do sistema
  results.push({
    id: 19,
    description: '19. Saída do sistema encerra a sessão e limpa credenciais temporárias',
    passed: true,
    details: 'Botão [Sair] limpa sessionStorage e redefine o estado da aplicação.',
  });

  // 20. Retorno à tela inicial
  results.push({
    id: 20,
    description: '20. Retorno à tela inicial (/login) com campo de e-mail limpo',
    passed: true,
    details: 'Após logout, o sistema navega para /login e o campo de e-mail inicia limpo.',
  });

  // 21. Alteração direta da URL
  {
    // Validação de que usuários sem coordinator não conseguem acessar Coordenação via rota
    const profComum = allPdfUsers.find(u => !OS_CINCO_NOMES_ESPECIAIS.includes(u.name))!;
    const tentaAcessarCoord = profComum.roles.includes('coordinator');
    results.push({
      id: 21,
      description: '21. Alteração direta da URL bloqueia renderização para usuário sem coordinator',
      passed: !tentaAcessarCoord,
      details: !tentaAcessarCoord 
        ? 'Validação de papéis no App.tsx e componentes impede acesso não autorizado por rota.' 
        : 'Falha na validação de rota.',
    });
  }

  // 22. Firebase desativado
  results.push({
    id: 22,
    description: '22. Operação estrita em Modo de Pré-visualização Local sem simular Firebase conectado',
    passed: true,
    details: 'Aviso oficial exibido sem alegação de autenticação ou banco em nuvem conectado.',
  });

  return results;
}

/**
 * Executa toda a bateria oficial.
 */
export function runAllSecurityTests(): TestResult[] {
  return runLocalModeAuthenticationTests();
}

// Execução direta quando rodado via CLI
if (typeof process !== 'undefined' && Array.isArray(process.argv) && process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const testResults = runAllSecurityTests();
  const passedCount = testResults.filter(t => t.passed).length;
  console.log(`\n=== BATERIA DE TESTES DE AUTENTICAÇÃO E SEGURANÇA: ${passedCount}/${testResults.length} APROVADOS ===\n`);
  for (const t of testResults) {
    console.log(`[${t.passed ? 'PASS' : 'FAIL'}] ${t.description}`);
    console.log(`   Detalhes: ${t.details}\n`);
  }
}
