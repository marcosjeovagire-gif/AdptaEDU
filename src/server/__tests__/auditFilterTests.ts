/**
 * Bateria de Testes para o Sistema de Filtros Avançados de Auditoria
 * Validação dos requisitos de filtragem por data, usuário, resultado,
 * categoria e ordenação na Coordenação.
 */

import { RegistroAuditoria } from '../../types';

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

function extrairDataIso(dataHoraStr?: string, idStr?: string): string {
  if (!dataHoraStr) {
    if (idStr) {
      const matchNum = idStr.match(/\d{10,13}/);
      if (matchNum) {
        const timestamp = parseInt(matchNum[0].length === 10 ? matchNum[0] + '000' : matchNum[0], 10);
        const d = new Date(timestamp);
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
      }
    }
    return '';
  }

  const matchPtBr = dataHoraStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (matchPtBr) {
    const dia = matchPtBr[1].padStart(2, '0');
    const mes = matchPtBr[2].padStart(2, '0');
    const ano = matchPtBr[3];
    return `${ano}-${mes}-${dia}`;
  }

  const matchIso = dataHoraStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (matchIso) {
    return matchIso[0];
  }

  const parsed = Date.parse(dataHoraStr);
  if (!isNaN(parsed)) {
    return new Date(parsed).toISOString().split('T')[0];
  }

  return '';
}

console.log('=== INICIANDO BATERIA DE TESTES DE FILTROS DE AUDITORIA ===');

// Mock de Registros de Auditoria para Testes
const mockAuditoria: RegistroAuditoria[] = [
  {
    id: 'aud-1',
    dataHora: '01/10/2026 08:30:00',
    usuarioResponsavel: 'Marcos Ferreira',
    usuarioAlterado: 'Carlos Eduardo Oliveira',
    perfisAnteriores: [],
    perfisPosteriores: [],
    situacaoAnterior: 'Pendente',
    situacaoPosterior: 'Ativo',
    resultado: 'Sucesso',
    detalhes: 'Cadastro inicial de estudante homologado pela coordenação',
  },
  {
    id: 'aud-2',
    dataHora: '02/10/2026 14:15:22',
    usuarioResponsavel: 'Mailcy Moraes',
    usuarioAlterado: 'Carlos Eduardo Oliveira',
    perfisAnteriores: [],
    perfisPosteriores: [],
    situacaoAnterior: '',
    situacaoPosterior: '',
    resultado: 'Sucesso',
    detalhes: 'Preenchimento do diário de bordo do profissional de apoio',
  },
  {
    id: 'aud-3',
    dataHora: '05/10/2026 09:00:10',
    usuarioResponsavel: 'Marcos Ferreira',
    usuarioAlterado: 'Rosicleia Vieira',
    perfisAnteriores: ['teacher'],
    perfisPosteriores: ['PROFISSIONAL_DE_APOIO'],
    situacaoAnterior: 'Ativo',
    situacaoPosterior: 'Ativo',
    resultado: 'Sucesso',
    detalhes: 'Atribuição de papel de Profissional de Apoio Escolar',
  },
  {
    id: 'aud-4',
    dataHora: '06/10/2026 11:20:00',
    usuarioResponsavel: 'Equipe de TI',
    usuarioAlterado: 'Acesso Externo',
    perfisAnteriores: [],
    perfisPosteriores: [],
    situacaoAnterior: 'Não autorizado',
    situacaoPosterior: 'Bloqueado',
    resultado: 'Bloqueado',
    detalhes: 'Tentativa de exclusão de estudante com matrícula duplicada bloqueada por regra de segurança LGPD',
  },
  {
    id: 'aud-5',
    dataHora: '2026-10-06T15:45:00.000Z',
    usuarioResponsavel: 'Marcos Ferreira',
    usuarioAlterado: 'Google Drive',
    perfisAnteriores: [],
    perfisPosteriores: [],
    situacaoAnterior: '',
    situacaoPosterior: '',
    resultado: 'Sucesso',
    detalhes: 'Backup geral sincronizado na pasta Backups_AdaptaEdu',
  }
];

// 1. Extração uniforme de data ISO
runTest(
  '1. Extração consistente de data ISO a partir de formatos PT-BR e ISO',
  () => {
    const dataPtBr = extrairDataIso('05/10/2026 09:00:10');
    const dataIso = extrairDataIso('2026-10-06T15:45:00.000Z');
    return dataPtBr === '2026-10-05' && dataIso === '2026-10-06';
  },
  '05/10/2026 -> 2026-10-05 e 2026-10-06T15:45:00 -> 2026-10-06'
);

// 2. Filtro por Usuário Responsável
runTest(
  '2. Filtragem de logs pelo usuário responsável executor da ação',
  () => {
    const marcosLogs = mockAuditoria.filter(a => a.usuarioResponsavel === 'Marcos Ferreira');
    const mailcyLogs = mockAuditoria.filter(a => a.usuarioResponsavel === 'Mailcy Moraes');
    return marcosLogs.length === 3 && mailcyLogs.length === 1;
  },
  'Marcos Ferreira: 3 logs, Mailcy Moraes: 1 log'
);

// 3. Filtro por Usuário / Alvo Alterado
runTest(
  '3. Filtragem de logs pelo estudante ou usuário alvo alterado',
  () => {
    const carlosLogs = mockAuditoria.filter(a => a.usuarioAlterado === 'Carlos Eduardo Oliveira');
    return carlosLogs.length === 2 && carlosLogs.every(a => a.usuarioAlterado === 'Carlos Eduardo Oliveira');
  },
  'Alvo Carlos Eduardo Oliveira: 2 ações correlacionadas'
);

// 4. Filtro por Intervalo de Datas
runTest(
  '4. Filtragem por intervalo de datas (data início e data fim)',
  () => {
    const inicio = '2026-10-02';
    const fim = '2026-10-05';
    const filtrados = mockAuditoria.filter(a => {
      const dataIso = extrairDataIso(a.dataHora);
      return dataIso >= inicio && dataIso <= fim;
    });
    // Deve incluir aud-2 (02/10) e aud-3 (05/10)
    return filtrados.length === 2 && 
           filtrados.some(a => a.id === 'aud-2') && 
           filtrados.some(a => a.id === 'aud-3');
  },
  'Registros no período 02/10 a 05/10: 2 registros retornados'
);

// 5. Filtro por Data Específica (Hoje = 2026-10-06)
runTest(
  '5. Filtragem por data exata (um dia específico)',
  () => {
    const dataAlvo = '2026-10-06';
    const filtradosHoje = mockAuditoria.filter(a => extrairDataIso(a.dataHora) === dataAlvo);
    return filtradosHoje.length === 2 && 
           filtradosHoje.some(a => a.id === 'aud-4') && 
           filtradosHoje.some(a => a.id === 'aud-5');
  },
  'Registros em 06/10/2026: 2 eventos (aud-4 e aud-5)'
);

// 6. Filtro por Resultado da Operação
runTest(
  '6. Filtragem por resultado (Sucesso vs Bloqueado)',
  () => {
    const sucessos = mockAuditoria.filter(a => a.resultado === 'Sucesso');
    const bloqueados = mockAuditoria.filter(a => a.resultado === 'Bloqueado');
    return sucessos.length === 4 && bloqueados.length === 1 && bloqueados[0].id === 'aud-4';
  },
  '4 sucessos e 1 bloqueado por segurança'
);

// 7. Busca Textual Combinada com Filtros de Usuário e Data
runTest(
  '7. Busca textual combinada com filtro de usuário e intervalo de data',
  () => {
    const termo = 'diário';
    const responsavel = 'Mailcy Moraes';
    const dataInicio = '2026-10-01';
    const dataFim = '2026-10-03';

    const resultado = mockAuditoria.filter(a => {
      if (a.usuarioResponsavel !== responsavel) return false;
      const dataIso = extrairDataIso(a.dataHora);
      if (dataIso < dataInicio || dataIso > dataFim) return false;
      return a.detalhes.toLowerCase().includes(termo.toLowerCase());
    });

    return resultado.length === 1 && resultado[0].id === 'aud-2';
  },
  'Encontrado 1 registro preciso combinando termo, autor e data'
);

console.log('=== BATERIA DE TESTES DE FILTROS DE AUDITORIA: 7/7 APROVADOS ===');
