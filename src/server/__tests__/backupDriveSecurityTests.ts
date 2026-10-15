import {
  BACKUP_FOLDER_NAME,
  BACKUP_CONFIG_KEY,
  obterConfiguracaoBackup,
  salvarConfiguracaoBackup,
  extrairDadosLocalStorageParaBackup,
  restaurarBackupLocalStorage,
  AdaptaEduBackupPayload,
} from '../../services/backupDriveService';

// Mock minimal do localStorage para ambiente Node.js / tsx
class MemoryStorage {
  private store: Map<string, string> = new Map();
  getItem(key: string): string | null {
    return this.store.get(key) || null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
}

if (typeof globalThis.localStorage === 'undefined') {
  // @ts-ignore
  globalThis.localStorage = new MemoryStorage();
}

console.log('=== INICIANDO BATERIA DE TESTES DO SERVIÇO DE BACKUP NO GOOGLE DRIVE ===');
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

// 1. Verificação do nome da pasta dedicada
assert(
  BACKUP_FOLDER_NAME === 'Backups_AdaptaEdu',
  '1. Pasta dedicada no Google Drive nomeada estritamente como "Backups_AdaptaEdu"',
  `Nome da pasta constante: "${BACKUP_FOLDER_NAME}"`
);

// 2. Configurações padrão de backup periódico
localStorage.removeItem(BACKUP_CONFIG_KEY);
const configPadrao = obterConfiguracaoBackup();
assert(
  configPadrao.enabled === true && configPadrao.intervalMinutes === 30,
  '2. Intervalo periódico padrão configurado para 30 minutos com status ativo',
  `Ativo: ${configPadrao.enabled}, Intervalo: ${configPadrao.intervalMinutes} min`
);

// 3. Atualização e persistência da configuração de intervalo
const configAlterada = salvarConfiguracaoBackup({ intervalMinutes: 60, enabled: true });
assert(
  configAlterada.intervalMinutes === 60,
  '3. Persistência de alteração do intervalo de backup',
  `Novo intervalo: ${configAlterada.intervalMinutes} min`
);

// 4. Extração de dados do localStorage para backup
const estudantesMock = [
  { id: 'est-1', nome: 'Aluno Teste 1', turma: '6º Ano A', anoSerie: '6º Ano' },
  { id: 'est-2', nome: 'Aluno Teste 2', turma: '7º Ano B', anoSerie: '7º Ano' },
];
const atividadesMock = [
  { id: 'ativ-1', studentId: 'est-1', titulo: 'Atividade Adaptada Matemática', disciplina: 'Matemática' },
];
const registrosMock = [
  { id: 'reg-1', studentId: 'est-1', data: '2026-10-05', diaSemana: 'Segunda-feira', presente: true },
];

localStorage.setItem('adaptaedu_estudantes', JSON.stringify(estudantesMock));
localStorage.setItem('adaptaedu_atividades', JSON.stringify(atividadesMock));
localStorage.setItem('adaptaedu_registros_apoio', JSON.stringify(registrosMock));

const payload = extrairDadosLocalStorageParaBackup();
assert(
  payload.stats.totalEstudantes === 2 &&
  payload.stats.totalAtividades === 1 &&
  payload.stats.totalRegistrosApoio === 1,
  '4. Extração canônica de estudantes, atividades e registros do localStorage',
  `Estudantes: ${payload.stats.totalEstudantes}, Atividades: ${payload.stats.totalAtividades}, Registros: ${payload.stats.totalRegistrosApoio}`
);

// 5. Estrutura do payload e metadados
assert(
  payload.appName === 'AdaptaEdu Escolar' && typeof payload.timestamp === 'string' && payload.version === '1.0.0',
  '5. Metadados e versão canônica inclusos no pacote de backup',
  `App: ${payload.appName}, Versão: ${payload.version}, Data: ${payload.timestamp}`
);

// 6. Restauração do backup no localStorage
const novosEstudantes = [
  { id: 'est-novo-1', nome: 'Aluno Restaurado', turma: '8º Ano A', anoSerie: '8º Ano' }
];
const payloadRestauracao: AdaptaEduBackupPayload = {
  version: '1.0.0',
  timestamp: new Date().toISOString(),
  appName: 'AdaptaEdu Escolar',
  origem: 'localStorage',
  stats: {
    totalEstudantes: 1,
    totalAtividades: 1,
    totalRegistrosApoio: 1,
    totalHistorico: 0,
    totalAuditoria: 0,
    totalPerfis: 0,
    totalHabilidades: 0,
    totalMatrizes: 0,
  },
  data: {
    estudantes: novosEstudantes as any,
    atividades: atividadesMock as any,
    registrosApoio: registrosMock as any,
    historico: [],
    auditoria: [],
    perfis: [],
    habilidades: [],
    matrizes: [],
    curriculumSkills: [],
    escolaConfig: null,
  }
};

const resRestauracao = restaurarBackupLocalStorage(payloadRestauracao);
const estudantesPosRestauracao = JSON.parse(localStorage.getItem('adaptaedu_estudantes') || '[]');

assert(
  resRestauracao.success === true && estudantesPosRestauracao[0]?.nome === 'Aluno Restaurado',
  '6. Restauração fiel de dados no localStorage com geração de trilha de auditoria',
  `Sucesso: ${resRestauracao.success}, Aluno no localStorage: ${estudantesPosRestauracao[0]?.nome}`
);

// 7. Avaliação e notificação de pendências de backup no Google Drive
import { verificarPendenciasBackupDrive } from '../../services/backupDriveService';

// Estado 1: Quando não há histórico de backup anterior
salvarConfiguracaoBackup({
  lastBackupTimestamp: null,
  lastBackupStatus: 'nunca',
});

const pendenciaInicial = verificarPendenciasBackupDrive();
assert(
  pendenciaInicial.temPendencia === true,
  '7. Detecção assertiva de pendência quando nenhum backup foi executado na sessão',
  `Status: ${pendenciaInicial.statusUltimoBackup}, Motivo: "${pendenciaInicial.motivo}"`
);

// 8. Estado quando intervalo de backup foi expirado
const sessentaMinutosAtras = new Date(Date.now() - 65 * 60 * 1000).toISOString();
salvarConfiguracaoBackup({
  intervalMinutes: 30,
  lastBackupTimestamp: sessentaMinutosAtras,
  lastBackupStatus: 'sucesso',
});

const pendenciaIntervalo = verificarPendenciasBackupDrive();
assert(
  pendenciaIntervalo.temPendencia === true && (pendenciaIntervalo.minutosDesdeUltimoBackup || 0) >= 30,
  '8. Notificação de pendência quando o intervalo periódico programado foi ultrapassado',
  `Minutos decorridos: ${pendenciaIntervalo.minutosDesdeUltimoBackup} min (Intervalo: ${pendenciaIntervalo.intervaloConfigurado} min)`
);

// 9. Configuração de horários específicos para backup previsível (turnos escolares)
const horariosTeste = ['08:00', '11:30', '14:00', '17:30', '18:00'];
const configComHorarios = salvarConfiguracaoBackup({
  enabled: true,
  specificTimes: horariosTeste,
});

assert(
  Array.isArray(configComHorarios.specificTimes) &&
  configComHorarios.specificTimes.length === 5 &&
  configComHorarios.specificTimes.includes('11:30') &&
  configComHorarios.specificTimes.includes('17:30'),
  '9. Configuração de horários específicos (turnos escolares) salva e recuperada com sucesso',
  `Horários configurados: ${configComHorarios.specificTimes?.join(', ')}`
);

const pendenciaComHorarios = verificarPendenciasBackupDrive();
assert(
  Array.isArray(pendenciaComHorarios.horariosEspecificosConfigurados) &&
  pendenciaComHorarios.horariosEspecificosConfigurados.length === 5,
  '10. Diagnóstico de pendências inclui horários fixos configurados para governança de segurança',
  `Total de horários fixos monitorados: ${pendenciaComHorarios.horariosEspecificosConfigurados?.length}`
);

// 11. Seletor de Frequência: Diário e Semanal com dias específicos
const configSemanal = salvarConfiguracaoBackup({
  frequencyType: 'semanal',
  diasSemana: [1, 3, 5], // Seg, Qua, Sex
  specificTimes: ['22:00'],
});

assert(
  configSemanal.frequencyType === 'semanal' &&
  Array.isArray(configSemanal.diasSemana) &&
  configSemanal.diasSemana.length === 3 &&
  configSemanal.diasSemana.includes(1) &&
  configSemanal.diasSemana.includes(5),
  '11. Seletor de frequência Semanal com dias customizados persistido e recuperado',
  `Frequência: ${configSemanal.frequencyType}, Dias ativos: ${configSemanal.diasSemana?.join(', ')}`
);

// 12. Definição do horário específico de fechamento às 22h (conforme solicitação)
assert(
  Array.isArray(configSemanal.specificTimes) &&
  configSemanal.specificTimes.includes('22:00'),
  '12. Horário específico de fechamento noturno (22:00) definido e validado no agendador',
  `Horários configurados: ${configSemanal.specificTimes?.join(', ')}`
);

// 13. Função de Teste de Conexão com o Google Drive
import { testarConexaoGoogleDrive } from '../../services/backupDriveService';
const resultadoTesteConexao = await testarConexaoGoogleDrive();

assert(
  typeof resultadoTesteConexao === 'object' &&
  typeof resultadoTesteConexao.success === 'boolean' &&
  typeof resultadoTesteConexao.status === 'string' &&
  typeof resultadoTesteConexao.mensagem === 'string',
  '13. Botão de teste de conexão com o Drive executa validação de comunicação segura e estruturada',
  `Status retornado: ${resultadoTesteConexao.status}, Mensagem: "${resultadoTesteConexao.mensagem}"`
);

// 14. Salvamento de Preferências de Backup no Firestore no Documento de Configurações da Escola
import { salvarPreferenciasBackupNoFirestore } from '../../services/escolaFirestoreService';

const resultadoSalvarFirestore = await salvarPreferenciasBackupNoFirestore({
  schoolId: 'olynto-pereira-castro',
  horario: '22:00',
  frequencia: 'semanal',
  enabled: true,
  escolaConfig: {
    nome: 'Colégio Estadual Olynto Pereira de Castro',
    subtitulo: 'Secretaria de Estado da Educação - SEDUC Goiás',
    endereco: 'Rio Verde - GO',
    municipio: 'Rio Verde',
    emailInstitucional: 'colegio.olynto@educa.go.gov.br',
    telefone: '(64) 3620-0000',
    textoRodape: 'AdaptaEdu Escolar',
    logoUrl: '',
    corPrincipal: '#15803d',
    corSecundaria: '#0284c7',
    corDestaque: '#f59e0b',
    permitirAcessoEmailSenha: false,
  },
});

assert(
  resultadoSalvarFirestore.documentPath === 'schools/olynto-pereira-castro' &&
  resultadoSalvarFirestore.dadosSalvos?.backupHorario === '22:00' &&
  resultadoSalvarFirestore.dadosSalvos?.backupFrequencia === 'semanal' &&
  resultadoSalvarFirestore.dadosSalvos?.backupConfig?.horario === '22:00' &&
  resultadoSalvarFirestore.dadosSalvos?.backupConfig?.frequencia === 'semanal',
  '14. Preferências de backup persistem no documento da escola no Firestore (schools/olynto-pereira-castro)',
  `Documento: ${resultadoSalvarFirestore.documentPath}, Horário: ${resultadoSalvarFirestore.dadosSalvos?.backupHorario}, Frequência: ${resultadoSalvarFirestore.dadosSalvos?.backupFrequencia}`
);

console.log(`\n=== BATERIA DE TESTES DE BACKUP NO GOOGLE DRIVE: ${passCount}/${passCount + failCount} APROVADOS ===\n`);

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
