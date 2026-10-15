import { RegistroImportacaoUsuario, UserRole, AuthorizedUser, ProfissionalApoioIdentificado } from '../types';

export interface RawPdfProfessorRecord {
  nome: string;
  emailEducacional: string;
  sourcePage: number;
  source: string;
}

/**
 * Função central de normalização rigorosa de e-mails educacionais (Seção 3):
 * 1. converter o valor para texto;
 * 2. remover espaços do início;
 * 3. remover espaços do final;
 * 4. remover quebras de linha;
 * 5. remover caracteres invisíveis;
 * 6. converter o endereço para letras minúsculas;
 * 7. preservar pontos;
 * 8. preservar hífens;
 * 9. preservar números;
 * 10. não modificar o domínio;
 * 11. não inventar nenhuma parte ausente.
 */
export function normalizeEmail(email: any): string {
  if (typeof email !== 'string') {
    if (!email) return '';
    email = String(email);
  }
  return email
    .replace(/[\r\n\t]/g, '')
    .replace(/[\u200B-\u200D\uFEFF\u00A0\u2000-\u200A\u202F\u205F\u3000]/g, '')
    .trim()
    .toLowerCase();
}

// DADOS EXTRAÍDOS ESTRITAMENTE DO PDF "Contato dos Professores - Atualizado.pdf"
// Apenas Nome Completo e E-mail Educacional.
// NENHUM CPF, NENHUM TELEFONE, NENHUM E-MAIL PESSOAL/ALTERNATIVO.
export const PDF_PROFESSORES_RAW: RawPdfProfessorRecord[] = [
  // --- PÁGINA 1 ---
  { nome: 'ADEVANIA PEREIRA BATISTA', emailEducacional: 'adevania.batista@educa.go.gov.br', sourcePage: 1, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'ALINE MEIRA MEDEIROS', emailEducacional: 'aline.meira@educa.go.gov.br', sourcePage: 1, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'ANA CAROLINA PERDOMO BORGES', emailEducacional: 'ana.borges6@admin.educa.go.gov.br', sourcePage: 1, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'ANA CLAUDIA DA SILVA LIMA', emailEducacional: 'ana.lima9@educa.go.gov.br', sourcePage: 1, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'ANA CRISTINA DE MORAES OLIVEIRA', emailEducacional: 'ana.oliveira17@admin.educa.go.gov.br', sourcePage: 1, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'ANDREA MESSIAS LIMA', emailEducacional: 'andrea.lima@educa.go.gov.br', sourcePage: 1, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'ANDRESSA FERREIRA NICODEMOS', emailEducacional: 'andressa.nicodemos@educa.go.gov.br', sourcePage: 1, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'ANNA FLUVIA VIEIRA DA SILVA BILIBIO', emailEducacional: 'anna.bilibio@educa.go.gov.br', sourcePage: 1, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'ARTHUR FELIPE FERREIRA DE JESUS', emailEducacional: 'arthur.jesus@admin.educa.go.gov.br', sourcePage: 1, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'AYSLAN ABRANTES PEREIRA', emailEducacional: 'ayslan.pereira@educa.go.gov.br', sourcePage: 1, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'CARLINDA LUIZA DA SILVA', emailEducacional: 'carlinda.silva@admin.educa.go.gov.br', sourcePage: 1, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'CAROLINA PIRES VELOSO GUIMARAES', emailEducacional: 'carolina.pires@educa.go.gov.br', sourcePage: 1, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'CLAUDIA DO ESPIRITO SANTO TOCANTINS ARAUJO', emailEducacional: 'claudia.araujo@admin.educa.go.gov.br', sourcePage: 1, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'CLESIMAR BORGES ARAUJO', emailEducacional: 'clesimar.araujo54@admin.educa.go.gov.br', sourcePage: 1, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'CLEUZA LUIZ DA SILVA CRISOSTOMO', emailEducacional: 'cleuza.crisostomo@admin.educa.go.gov.br', sourcePage: 1, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'CLEZIO AMBROZIO DOS SANTOS', emailEducacional: 'clezio.santos@admin.educa.go.gov.br', sourcePage: 1, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'DANIEL PEREIRA MARTINS', emailEducacional: 'daniel.martins1@educa.go.gov.br', sourcePage: 1, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'DIEGO RODRIGUES PEREIRA', emailEducacional: 'diego.rodrigues@educa.go.gov.br', sourcePage: 1, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'DIRANI MANOELA DAMASCENO SANTOS', emailEducacional: 'dirani.santos@educa.go.gov.br', sourcePage: 1, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'DIVINO SOUZA ALVES', emailEducacional: 'divino.alves@educa.go.gov.br', sourcePage: 1, source: 'Contato dos Professores - Atualizado.pdf' },

  // --- PÁGINA 2 ---
  { nome: 'ELANDIA COSTA DOS SANTOS', emailEducacional: 'elandia.santos@admin.educa.go.gov.br', sourcePage: 2, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'ELBERT WANDER CANTAO', emailEducacional: 'elbert.cantao@educa.go.gov.br', sourcePage: 2, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'ELIANE DOURADO DA SILVA VAZ', emailEducacional: 'eliane.vaz@educa.go.gov.br', sourcePage: 2, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'ELIEL MARTINS SILVA', emailEducacional: 'eliel.silva@educa.go.gov.br', sourcePage: 2, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'ELKE LIMA OLIVEIRA', emailEducacional: 'elke.oliveira@admin.educa.go.gov.br', sourcePage: 2, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'EVERALDO RODRIGUES MOTA JUNIOR', emailEducacional: 'everaldo.junior@educa.go.gov.br', sourcePage: 2, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'FABIANY MENDES NOGUEIRA', emailEducacional: 'fabiany.nogueira@admin.educa.go.gov.br', sourcePage: 2, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'FABRICIO FERREIRA DO VAL', emailEducacional: 'fabricio.val@admin.educa.go.gov.br', sourcePage: 2, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'FERNANDA PEREIRA SILVA', emailEducacional: 'fernanda.silva10@educa.go.gov.br', sourcePage: 2, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'FLAVIA SOUSA ARANTES', emailEducacional: 'flavia.rosa1@educa.go.gov.br', sourcePage: 2, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'FLAVIO SILVA DE OLIVEIRA', emailEducacional: 'flavio.oliveira90@educa.go.gov.br', sourcePage: 2, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'GABRIEL TORQUATO OLIVEIRA', emailEducacional: 'gabriel.oliveira@educa.go.gov.br', sourcePage: 2, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'GERCIANY VINHAL CURTES', emailEducacional: 'gerciany.curtes@educa.go.gov.br', sourcePage: 2, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'GERMANA FURQUIM FERREIRA', emailEducacional: 'germana.ferreira@educa.go.gov.br', sourcePage: 2, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'GILSON ROSA DOS SANTOS', emailEducacional: 'gilson.rosa@admin.educa.go.gov.br', sourcePage: 2, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'GLAUCIA REGINA LEAO', emailEducacional: 'glaucia.leao@admin.educa.go.gov.br', sourcePage: 2, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'GLEIDES ALVES SIQUEIRA DA COSTA', emailEducacional: 'gleides.siqueira@educa.go.gov.br', sourcePage: 2, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'IRANILDO DOS SANTOS NASCIMENTO SILVA', emailEducacional: 'iranildo.nascimento@admin.educa.go.gov.br', sourcePage: 2, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'ITAMAR GONCALVES DA SILVA FILHO', emailEducacional: 'itamar.filho@educa.go.gov.br', sourcePage: 2, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'JAMILE DA SILVA NASCIMENTO', emailEducacional: 'jamile.nascimento@admin.educa.go.gov.br', sourcePage: 2, source: 'Contato dos Professores - Atualizado.pdf' },

  // --- PÁGINA 3 ---
  { nome: 'JANE ANDREA JULIANI DELSIN', emailEducacional: 'jane.delsin@admin.educa.go.gov.br', sourcePage: 3, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'JANETE NASCIMENTO DE CASTRO', emailEducacional: 'janete.nascimento@educa.go.gov.br', sourcePage: 3, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'JANICLEI ALVES PEREIRA', emailEducacional: 'janiclei.pereira@educa.go.gov.br', sourcePage: 3, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'JESSIKA LIMA REZENDE', emailEducacional: 'jessika.rezende84@educa.go.gov.br', sourcePage: 3, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'JESSYKA SILVA CARDOSO', emailEducacional: 'jessyka.cardoso@educa.go.gov.br', sourcePage: 3, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'JOAO PERES MORAES NETO', emailEducacional: 'joao.neto9@educa.go.gov.br', sourcePage: 3, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'JOSE BATISTA FERREIRA FILHO', emailEducacional: 'jose.filho8@admin.educa.go.gov.br', sourcePage: 3, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'JOSIENE MARIA DA SILVA', emailEducacional: 'josiene.silva@admin.educa.go.gov.br', sourcePage: 3, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'LAIS PEREIRA DE MORAES', emailEducacional: 'lais.moraes@educa.go.gov.br', sourcePage: 3, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'LEONARDO PATRIK BORGES REZENDE', emailEducacional: 'leonardo.rezende4@admin.educa.go.gov.br', sourcePage: 3, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'LORENA ROSA DE OLIVEIRA', emailEducacional: 'lorena.oliveira@admin.educa.go.gov.br', sourcePage: 3, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'LUCAS FORTES MULATI', emailEducacional: 'lucas.mulati@admin.educa.go.gov.br', sourcePage: 3, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'LUCIANNE ABREU DA CUNHA', emailEducacional: 'lucianne.cunha@educa.go.gov.br', sourcePage: 3, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'LUDIANE BORGES DE LIMA MUNHOZ', emailEducacional: 'ludiane.munhoz@educa.go.gov.br', sourcePage: 3, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'MAILCY FRANCISCA BATISTA MORAES', emailEducacional: 'mailcy.moraes53@educa.go.gov.br', sourcePage: 3, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'MARCIA FERNANDES BORGES MORAES', emailEducacional: 'marcia.moraes@admin.educa.go.gov.br', sourcePage: 3, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'MARCIA MATIAS DA SILVA', emailEducacional: 'marcia.matias@educa.go.gov.br', sourcePage: 3, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'MARCOS ANTONIO FERREIRA', emailEducacional: 'marcos.ferreira@admin.educa.go.gov.br', sourcePage: 3, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'MARIA JOSE SOUSA DA SILVA', emailEducacional: 'maria.silva206@admin.educa.go.gov.br', sourcePage: 3, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'MARIA RITA DE CASSIA FORTES MULATI', emailEducacional: 'maria.mulati@educa.go.gov.br', sourcePage: 3, source: 'Contato dos Professores - Atualizado.pdf' },

  // --- PÁGINA 4 ---
  { nome: 'MARIA RITA PINHEIRO CAPANEMA', emailEducacional: 'maria.capanema@admin.educa.go.gov.br', sourcePage: 4, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'MIRE SANTOS BUZAIN', emailEducacional: 'mire.buzain@admin.educa.go.gov.br', sourcePage: 4, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'MURIELE DA SILVA BARROS NEVES', emailEducacional: 'muriele.neves@educa.go.gov.br', sourcePage: 4, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'NATHALIA CABRAL DE OLIVEIRA', emailEducacional: 'nathalia.oliveira@educa.go.gov.br', sourcePage: 4, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'PHIDEL KASTRO FRAZAO SILVA', emailEducacional: 'phidel.silva@educa.go.gov.br', sourcePage: 4, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'REGINA FERREIRA DE MESQUITA DIAS', emailEducacional: 'regina.dias@educa.go.gov.br', sourcePage: 4, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'RODOLFO PIMENTEL DE OLIVEIRA', emailEducacional: 'rodolfo.oliveira@educa.go.gov.br', sourcePage: 4, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'ROSICLEIA DA SILVA VIEIRA', emailEducacional: 'rosiclea.vieira@educa.go.gov.br', sourcePage: 4, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'SARAH AMADO RIBEIRO', emailEducacional: 'sarah.ribeiro@educa.go.gov.br', sourcePage: 4, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'SEBASTIANA DIVINA CABRAL OLIVEIRA', emailEducacional: 'sebastiana.divina@admin.educa.go.gov.br', sourcePage: 4, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'SEBASTIAO VIEIRA CABRAL NETO', emailEducacional: 'sebastiao.vieira@educa.go.gov.br', sourcePage: 4, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'SIDILAINE ALVES DE SOUZA', emailEducacional: 'sidilaine.souza@admin.educa.go.gov.br', sourcePage: 4, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'SUELY PORFIRIA DE MORAIS', emailEducacional: 'suely.porfiria@admin.educa.go.gov.br', sourcePage: 4, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'TACIANA SOARES RIBEIRO VIEIRA', emailEducacional: 'taciana.vieira@admin.educa.go.gov.br', sourcePage: 4, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'TAIS LIMA CHAVES', emailEducacional: 'tais.chaves@educa.go.gov.br', sourcePage: 4, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'TAIS MENDES MOREIRA CRUVINEL', emailEducacional: 'tais.cruvinel@educa.go.gov.br', sourcePage: 4, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'TANIERE FERNANDA DE SOUSA CAMPOS', emailEducacional: 'taniere.campos@educa.go.gov.br', sourcePage: 4, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'THALYA CABRAL ARAUJO', emailEducacional: 'thalya.araujo@educa.go.gov.br', sourcePage: 4, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'THIAGO ROMUALDO DA SILVA', emailEducacional: 'thiago.romualdo@admin.educa.go.gov.br', sourcePage: 4, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'TIAGO RODRIGO GONCALVES BARROSO', emailEducacional: 'tiago.barroso@educa.go.gov.br', sourcePage: 4, source: 'Contato dos Professores - Atualizado.pdf' },

  // --- PÁGINA 5 ---
  { nome: 'VALERIA ALVES DA SILVA DIAS', emailEducacional: 'valeria.dias56@admin.educa.go.gov.br', sourcePage: 5, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'VANESSA CATARINE FERREIRA', emailEducacional: 'vanessa.catarine@educa.go.gov.br', sourcePage: 5, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'VANUZA ALVES FURQUIM', emailEducacional: 'vanuza.furquim@educa.go.gov.br', sourcePage: 5, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'VIVIANE PEREIRA CAMPOS DOS SANTOS', emailEducacional: 'viviane.campos@educa.go.gov.br', sourcePage: 5, source: 'Contato dos Professores - Atualizado.pdf' },
  { nome: 'WANDERSON SILVA MIRANDA', emailEducacional: 'wanderson.miranda@educa.go.gov.br', sourcePage: 5, source: 'Contato dos Professores - Atualizado.pdf' },
];

export const OS_CINCO_NOMES_ESPECIAIS = [
  'MARCOS ANTONIO FERREIRA',
  'LORENA ROSA DE OLIVEIRA',
  'GLEIDES ALVES SIQUEIRA DA COSTA',
  'SIDILAINE ALVES DE SOUZA',
  'ELANDIA COSTA DOS SANTOS',
];

export const OS_QUATRO_NOMES_ESPECIAIS = OS_CINCO_NOMES_ESPECIAIS; // Compatibilidade com referências existentes

export const DOMINIOS_PERMITIDOS = ['educa.go.gov.br', 'admin.educa.go.gov.br'];

/**
 * Profissionais de Apoio identificados no documento oficial "Contato dos Professores - Atualizado.pdf"
 * Extração estrita conforme Seção 2: apenas Nome Completo e E-mail Educacional.
 */
export const PROFISSIONAIS_APOIO_IDENTIFICADOS_PDF: ProfissionalApoioIdentificado[] = [
  {
    busca: 'Mailcy',
    nomeCompleto: 'MAILCY FRANCISCA BATISTA MORAES',
    emailEducacional: 'mailcy.moraes53@educa.go.gov.br',
    sourcePage: 3,
    statusValidacao: 'confirmado',
    observacao: 'Registro oficial do PDF (pág. 3). Nome e e-mail validados sem ambiguidades.'
  },
  {
    busca: 'Rosicleia',
    nomeCompleto: 'ROSICLEIA DA SILVA VIEIRA',
    emailEducacional: 'rosiclea.vieira@educa.go.gov.br',
    sourcePage: 4,
    statusValidacao: 'confirmado',
    observacao: 'Registro oficial do PDF (pág. 4). Nome e e-mail institucional validados.'
  },
  {
    busca: 'Thais/Tais',
    nomeCompleto: 'TAIS LIMA CHAVES',
    emailEducacional: 'tais.chaves@educa.go.gov.br',
    sourcePage: 4,
    statusValidacao: 'pendente_validacao_homonimia',
    observacao: 'Homonímia no PDF: existem duas profissionais com o nome Tais. Apresentado para validação administrativa.'
  },
  {
    busca: 'Thais/Tais',
    nomeCompleto: 'TAIS MENDES MOREIRA CRUVINEL',
    emailEducacional: 'tais.cruvinel@educa.go.gov.br',
    sourcePage: 4,
    statusValidacao: 'pendente_validacao_homonimia',
    observacao: 'Homonímia no PDF: existem duas profissionais com o nome Tais. Apresentado para validação administrativa.'
  },
  {
    busca: 'Viviane',
    nomeCompleto: 'VIVIANE PEREIRA CAMPOS DOS SANTOS',
    emailEducacional: 'viviane.campos@educa.go.gov.br',
    sourcePage: 5,
    statusValidacao: 'confirmado',
    observacao: 'Registro oficial do PDF (pág. 5). Nome e e-mail institucional validados.'
  },
  {
    busca: 'Eliane',
    nomeCompleto: 'ELIANE DOURADO DA SILVA VAZ',
    emailEducacional: 'eliane.vaz@educa.go.gov.br',
    sourcePage: 2,
    statusValidacao: 'confirmado',
    observacao: 'Registro oficial do PDF (pág. 2). Nome e e-mail institucional validados.'
  },
  {
    busca: 'Natalia/Nathalia',
    nomeCompleto: 'NATHALIA CABRAL DE OLIVEIRA',
    emailEducacional: 'nathalia.oliveira@educa.go.gov.br',
    sourcePage: 4,
    statusValidacao: 'confirmado',
    observacao: 'Registro oficial do PDF (pág. 4). Grafia Nathalia validada.'
  },
  {
    busca: 'Taniere',
    nomeCompleto: 'TANIERE FERNANDA DE SOUSA CAMPOS',
    emailEducacional: 'taniere.campos@educa.go.gov.br',
    sourcePage: 4,
    statusValidacao: 'confirmado',
    observacao: 'Registro oficial do PDF (pág. 4). Nome e e-mail institucional validados.'
  },
];

export const PROFISSIONAIS_APOIO_EMAILS = PROFISSIONAIS_APOIO_IDENTIFICADOS_PDF.map(p => p.emailEducacional.toLowerCase());

/**
 * Função idempotente e rigorosa para converter os registros brutos do PDF
 * na estrutura de revisão de importação de usuários.
 */
export function processarRegistrosDoPdf(): RegistroImportacaoUsuario[] {
  const emailsProcessados = new Set<string>();

  return PDF_PROFESSORES_RAW.map((item, index) => {
    const nomeLimpo = item.nome.trim();
    const emailLimpo = normalizeEmail(item.emailEducacional);
    const dominio = emailLimpo.includes('@') ? emailLimpo.split('@')[1] : '';

    const isMaster = emailLimpo === 'marcos.ferreira@admin.educa.go.gov.br' || nomeLimpo === 'MARCOS ANTONIO FERREIRA';
    const isSpecial = OS_CINCO_NOMES_ESPECIAIS.includes(nomeLimpo) || isMaster;
    const isApoio = PROFISSIONAIS_APOIO_EMAILS.includes(emailLimpo);
    
    // Configurações exatas conforme especificações:
    // Marcos Antonio Ferreira: superadmin, coordinator, teacher
    // Demais 4 coordenadores: coordinator, teacher
    // Demais profissionais: teacher
    // Profissionais de Apoio recebem adicionalmente PROFISSIONAL_DE_APOIO
    let roles: UserRole[] = ['teacher'];
    if (isMaster) {
      roles = ['superadmin', 'coordinator', 'teacher'];
    } else if (isSpecial) {
      roles = ['coordinator', 'teacher'];
    }

    if (isApoio && !roles.includes('PROFISSIONAL_DE_APOIO')) {
      roles.push('PROFISSIONAL_DE_APOIO');
    }

    let situacao: RegistroImportacaoUsuario['situacao'] = 'Pronto para cadastrar';
    let observacao = isApoio ? 'Profissional de Apoio Autorizado' : 'Registro válido';

    if (isMaster) {
      situacao = 'Perfil especial confirmado';
      observacao = 'Administrador Principal (Superadmin + Coordenação + Professor)';
    } else if (isSpecial) {
      situacao = 'Perfil especial confirmado';
      observacao = 'Perfil duplo (Coordenação + Professor) confirmado conforme instrução';
    }

    if (!emailLimpo) {
      situacao = 'E-mail ausente';
      observacao = 'E-mail educacional não localizado no PDF';
    } else if (!DOMINIOS_PERMITIDOS.includes(dominio)) {
      situacao = 'Domínio pendente de validação';
      observacao = `Domínio ${dominio} não homologado inicialmente`;
    } else if (emailsProcessados.has(emailLimpo)) {
      situacao = 'E-mail duplicado';
      observacao = 'E-mail já listado anteriormente no documento';
    }

    if (emailLimpo) {
      emailsProcessados.add(emailLimpo);
    }

    return {
      id: `rev-${index + 1}`,
      nome: nomeLimpo,
      emailEducacional: emailLimpo,
      dominio,
      roles,
      situacao,
      arquivoOrigem: item.source,
      paginaDocumento: item.sourcePage,
      observacao,
      selecionado: situacao === 'Pronto para cadastrar' || situacao === 'Perfil especial confirmado',
      isSpecialCoordinator: isSpecial,
    };
  });
}

/**
 * Gera a base oficial inicial de AuthorizedUser a partir do PDF oficial da escola.
 * Rigor de segurança:
 * - Marcos Antonio Ferreira recebe ['superadmin', 'coordinator', 'teacher']
 * - Os outros 4 nomes especiais recebem ['coordinator', 'teacher'].
 * - Todos os demais profissionais recebem exclusivamente ['teacher'].
 * - Nenhum CPF, nenhum telefone, nenhuma senha.
 */
export function gerarUsuariosIniciaisAutorizadosDoPdf(): AuthorizedUser[] {
  const dataAtual = new Date().toISOString();

  return PDF_PROFESSORES_RAW.map((item, index) => {
    const nomeLimpo = item.nome.trim();
    const emailLimpo = normalizeEmail(item.emailEducacional);
    const isMaster = emailLimpo === 'marcos.ferreira@admin.educa.go.gov.br' || nomeLimpo === 'MARCOS ANTONIO FERREIRA';
    const isSpecial = OS_CINCO_NOMES_ESPECIAIS.includes(nomeLimpo) || isMaster;
    const isApoio = PROFISSIONAIS_APOIO_EMAILS.includes(emailLimpo);

    const roles: UserRole[] = isMaster
      ? ['superadmin', 'coordinator', 'teacher']
      : (isSpecial ? ['coordinator', 'teacher'] : ['teacher']);

    if (isApoio && !roles.includes('PROFISSIONAL_DE_APOIO')) {
      roles.push('PROFISSIONAL_DE_APOIO');
    }

    return {
      id: `user-pdf-${index + 1}`,
      uid: null,
      name: nomeLimpo,
      email: emailLimpo,
      emailNormalized: emailLimpo,
      roles,
      active: true,
      status: 'authorized',
      schoolId: 'olynto-pereira-castro',
      allowedClasses: [],
      allowedDisciplines: [],
      createdAt: dataAtual,
      updatedAt: dataAtual,
      createdBy: isMaster ? 'Super Administrador Principal' : (isSpecial ? 'Coordenação Autorizada (Perfil Especial)' : 'Importação Oficial do PDF de Contatos'),
      source: item.source,
      sourcePage: item.sourcePage,
      firstAccessAt: null,
      lastAccessAt: null,
      archivedAt: null,
    };
  });
}
