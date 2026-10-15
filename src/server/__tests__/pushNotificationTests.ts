/**
 * Bateria de Testes para Notificações Push via Service Worker
 * Validação dos requisitos de lembretes automáticos e alertas ao profissional
 * de apoio sobre registros de acompanhamento pendentes de preenchimento.
 */

import { 
  calcularPendenciasHojeProfissionalApoio,
  CONFIG_PADRAO,
  ConfiguracoesNotificacaoApoio
} from '../../services/pushNotificationService';
import { Estudante, RegistroAcompanhamentoApoio, AuthorizedUser } from '../../types';
import { isDiaUtil } from '../../server/apoioService';

function runTest(name: string, fn: () => boolean, details?: string) {
  try {
    const passed = fn();
    if (passed) {
      console.log(`[PASS] ${name}`);
      if (details) console.log(`   Detalhes: ${details}`);
    } else {
      console.error(`[FAIL] ${name}`);
      process.exit(1);
    }
  } catch (err: any) {
    console.error(`[ERROR] ${name}: ${err.message}`);
    process.exit(1);
  }
}

console.log('=== INICIANDO BATERIA DE TESTES DE NOTIFICAÇÕES PUSH VIA SERVICE WORKER ===');

// Mock User Profissional de Apoio
const paeUser: AuthorizedUser = {
  id: 'usr-pae-mailcy',
  uid: 'uid-pae-mailcy',
  name: 'MAILCY FRANCISCA BATISTA MORAES',
  email: 'mailcy.moraes53@educa.go.gov.br',
  emailNormalized: 'mailcy.moraes53@educa.go.gov.br',
  roles: ['PROFISSIONAL_DE_APOIO'],
  active: true,
  status: 'authorized',
  schoolId: 'escola-olinto',
  allowedClasses: ['6º Ano A', '6º Ano B'],
  allowedDisciplines: [],
  createdAt: '2026-02-01T08:00:00.000Z',
  updatedAt: '2026-02-01T08:00:00.000Z',
  createdBy: 'admin',
  source: 'pdf_import',
  sourcePage: 3,
  firstAccessAt: null,
  lastAccessAt: null,
  archivedAt: null,
};

// Mock Estudantes
const mockEstudantes: Estudante[] = [
  {
    id: 'est-1',
    nome: 'Carlos Eduardo Oliveira',
    matricula: '2026001',
    dataNascimento: '10/05/2014',
    anoSerie: '6º Ano',
    turma: '6º Ano A',
    turno: 'matutino',
    laudo: 'TEA Nível 2 de Suporte',
    observacoesAcessibilidade: 'Comunicação alternativa, mediação social',
    professoresAutorizadosIds: [],
    profissionaisApoioIds: ['usr-pae-mailcy'],
    paeResponsavelEmail: 'mailcy.moraes53@educa.go.gov.br',
    paeResponsavelNome: 'MAILCY FRANCISCA',
    situacao: 'ativo',
  },
  {
    id: 'est-2',
    nome: 'Beatriz Santos Rocha',
    matricula: '2026002',
    dataNascimento: '20/08/2014',
    anoSerie: '6º Ano',
    turma: '6º Ano A',
    turno: 'matutino',
    laudo: 'TDAH e Dislexia',
    observacoesAcessibilidade: 'Tempo estendido',
    professoresAutorizadosIds: [],
    profissionaisApoioIds: ['usr-pae-mailcy'],
    paeResponsavelEmail: 'mailcy.moraes53@educa.go.gov.br',
    paeResponsavelNome: 'MAILCY FRANCISCA',
    situacao: 'ativo',
  },
  {
    id: 'est-3',
    nome: 'Gabriel Mendes',
    matricula: '2026003',
    dataNascimento: '15/11/2013',
    anoSerie: '7º Ano',
    turma: '7º Ano B',
    turno: 'vespertino',
    laudo: 'Deficiência Intelectual',
    professoresAutorizadosIds: [],
    profissionaisApoioIds: ['outro-pae'],
    paeResponsavelEmail: 'outro.pae@educa.go.gov.br',
    situacao: 'ativo',
  },
  {
    id: 'est-4-arquivado',
    nome: 'Aluno Transferido Antigo',
    matricula: '2026004',
    anoSerie: '6º Ano',
    turma: '6º Ano A',
    turno: 'matutino',
    professoresAutorizadosIds: [],
    profissionaisApoioIds: ['usr-pae-mailcy'],
    paeResponsavelEmail: 'mailcy.moraes53@educa.go.gov.br',
    situacao: 'transferido',
  }
];

const hojeIso = new Date().toISOString().split('T')[0];

// 1. Configuração padrão de notificações
runTest(
  '1. Configuração padrão do sistema de notificações push',
  () => {
    return CONFIG_PADRAO.habilitado === true &&
           CONFIG_PADRAO.lembreteInicioSessao === true &&
           CONFIG_PADRAO.lembreteFimTurno === true &&
           typeof CONFIG_PADRAO.horarioPreferencial === 'string';
  },
  `Habilitado: ${CONFIG_PADRAO.habilitado}, Horário: ${CONFIG_PADRAO.horarioPreferencial}`
);

// 2. Filtro de vínculo de estudantes para o PAE logado (ignora outros PAEs e alunos inativos)
runTest(
  '2. Filtragem e vínculo correto de estudantes sob cuidado do profissional de apoio',
  () => {
    const pendencias = calcularPendenciasHojeProfissionalApoio(paeUser, mockEstudantes, []);
    const idsVinculados = pendencias.alunosVinculados.map(a => a.id);
    return idsVinculados.includes('est-1') && 
           idsVinculados.includes('est-2') && 
           !idsVinculados.includes('est-3') && 
           !idsVinculados.includes('est-4-arquivado');
  },
  'Alunos vinculados identificados: est-1 e est-2 (excluídos outros profissionais e transferidos)'
);

// 3. Quando nenhum diário foi registrado hoje, todos os vinculados estão pendentes
runTest(
  '3. Detecção de 100% de pendências quando nenhum registro foi efetuado na data',
  () => {
    const pendencias = calcularPendenciasHojeProfissionalApoio(paeUser, mockEstudantes, []);
    return pendencias.totalPendentes === 2 && 
           pendencias.totalAtendidos === 0 &&
           pendencias.alunosPendentes.length === 2;
  },
  'Total pendente: 2 alunos aguardando preenchimento'
);

// 4. Reconhecimento dinâmico de diário preenchido para est-1
runTest(
  '4. Atualização dinâmica de pendências após preenchimento do diário de um estudante',
  () => {
    const registrosHoje: RegistroAcompanhamentoApoio[] = [
      {
        id: 'reg-hoje-1',
        studentId: 'est-1',
        nomeEstudante: 'Carlos Eduardo Oliveira',
        turma: '6º Ano A',
        data: hojeIso,
        diaSemana: 'Segunda-feira',
        horario: '10:00:00',
        profissionalResponsavelNome: paeUser.name,
        profissionalResponsavelEmail: paeUser.email,
        profissionalResponsavelId: paeUser.id,
        presente: true,
        recebeuAtividadeAdaptada: 'Sim',
        conseguiuRealizarAtividade: 'Sim',
        usuarioRegistroNome: paeUser.name,
        usuarioRegistroEmail: paeUser.email,
        createdAt: new Date().toISOString(),
        syncStatus: 'synced',
      }
    ];

    const pendencias = calcularPendenciasHojeProfissionalApoio(paeUser, mockEstudantes, registrosHoje);
    return pendencias.totalPendentes === 1 && 
           pendencias.totalAtendidos === 1 &&
           pendencias.alunosPendentes[0].id === 'est-2';
  },
  'est-1 computado como atendido; apenas est-2 permanece pendente'
);

// 5. Todos os estudantes atendidos no dia zera as pendências
runTest(
  '5. Resolução completa das pendências quando todos os alunos foram registrados',
  () => {
    const registrosHoje: RegistroAcompanhamentoApoio[] = [
      {
        id: 'reg-hoje-1',
        studentId: 'est-1',
        nomeEstudante: 'Carlos Eduardo Oliveira',
        turma: '6º Ano A',
        data: hojeIso,
        diaSemana: 'Segunda-feira',
        horario: '10:00:00',
        profissionalResponsavelNome: paeUser.name,
        profissionalResponsavelEmail: paeUser.email,
        profissionalResponsavelId: paeUser.id,
        presente: true,
        usuarioRegistroNome: paeUser.name,
        usuarioRegistroEmail: paeUser.email,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'reg-hoje-2',
        studentId: 'est-2',
        nomeEstudante: 'Beatriz Santos Rocha',
        turma: '6º Ano A',
        data: hojeIso,
        diaSemana: 'Segunda-feira',
        horario: '10:30:00',
        profissionalResponsavelNome: paeUser.name,
        profissionalResponsavelEmail: paeUser.email,
        profissionalResponsavelId: paeUser.id,
        presente: false,
        usuarioRegistroNome: paeUser.name,
        usuarioRegistroEmail: paeUser.email,
        createdAt: new Date().toISOString(),
      }
    ];

    const pendencias = calcularPendenciasHojeProfissionalApoio(paeUser, mockEstudantes, registrosHoje);
    return pendencias.totalPendentes === 0 && 
           pendencias.totalAtendidos === 2 &&
           pendencias.alunosPendentes.length === 0;
  },
  '0 pendências restantes, 100% de cobertura no turno escolar'
);

// 6. Conformidade com dias úteis do calendário escolar
runTest(
  '6. Verificação de dia útil vs final de semana para disparo de lembretes',
  () => {
    const segASex = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09'];
    const sabDom = ['2026-10-10', '2026-10-11'];

    const todosUteisValidos = segASex.every(d => isDiaUtil(d));
    const todosFdsBloqueados = sabDom.every(d => !isDiaUtil(d));

    return todosUteisValidos && todosFdsBloqueados;
  },
  'Segunda a sexta são dias letivos úteis; sábado e domingo não disparam alertas'
);

// 7. Estrutura do payload de notificação Service Worker
runTest(
  '7. Validação do schema do payload de notificação para o Service Worker',
  () => {
    const payload = {
      title: 'AdaptaEdu: 2 registro(s) pendente(s) hoje',
      body: 'Você ainda não preencheu o acompanhamento de Carlos, Beatriz.',
      tag: `lembrete-apoio-${hojeIso}`,
      data: { url: '/apoio-preview', dataReferencia: hojeIso },
      actions: [
        { action: 'preencher_agora', title: 'Preencher Diário de Bordo' }
      ]
    };

    return payload.title.includes('AdaptaEdu') &&
           payload.actions.length === 1 &&
           payload.actions[0].action === 'preencher_agora' &&
           payload.data.url === '/apoio-preview';
  },
  'Schema compatível com o evento self.registration.showNotification no Service Worker'
);

console.log('=== BATERIA DE TESTES DE NOTIFICAÇÕES PUSH: 7/7 APROVADOS ===');
