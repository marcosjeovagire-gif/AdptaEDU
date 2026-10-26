import React, { useState, useEffect, Suspense } from 'react';
import { 
  UserRole, 
  AuthorizedUser,
  Estudante, 
  PerfilPedagogico, 
  HabilidadeAprovada, 
  DocumentoImportado, 
  AtividadeAdaptada, 
  RegistroHistorico, 
  RegistroAuditoria,
  EscolaConfig,
  CurriculumMatrix,
  CurriculumSkill,
  RegistroAcompanhamentoApoio,
  PeiDocumento
} from './types';
import { 
  ESCOLA_CONFIG_INICIAL, 
  ESTUDANTES_INICIAIS, 
  PERFIS_PEDAGOGICOS_INICIAIS, 
  ATIVIDADES_INICIAIS,
  REGISTROS_APOIO_INICIAIS
} from './data/mockData';
import { gerarUsuariosIniciaisAutorizadosDoPdf, normalizeEmail } from './data/pdfServerData';
import { MATRIZES_CURRICULARES_INICIAIS, HABILIDADES_CURRICULARES_INICIAIS } from './server/curriculumMatrixService';
import { Header } from './components/Header';
import { LoginView } from './components/LoginView';
import type { AbaCoordenacao } from './components/coordenacao/CoordenacaoView';
import { sanitizarNomeArquivoPei } from './services/peiPdfService';
import { obterTodosPeis } from './services/peiService';
import { isGoogleDriveConnected, initGoogleDriveAuth, iniciarServicoBackupPeriodico } from './services/googleDriveService';

// Code-Splitting e Otimização de Performance via React.lazy & Dynamic Import()
const CoordenacaoView = React.lazy(() => import('./components/coordenacao/CoordenacaoView').then(m => ({ default: m.CoordenacaoView })));
const ProfessorView = React.lazy(() => import('./components/professor/ProfessorView').then(m => ({ default: m.ProfessorView })));
const ProfissionalApoioView = React.lazy(() => import('./components/apoio/ProfissionalApoioView').then(m => ({ default: m.ProfissionalApoioView })));
const MasterDataCenterView = React.lazy(() => import('./components/master/MasterDataCenterView').then(m => ({ default: m.MasterDataCenterView })));
const ImportarMatrizModal = React.lazy(() => import('./components/coordenacao/ImportarMatrizModal').then(m => ({ default: m.ImportarMatrizModal })));
const PeiGeneratorModal = React.lazy(() => import('./components/pei/PeiGeneratorModal').then(m => ({ default: m.PeiGeneratorModal })));
const A4SheetPreview = React.lazy(() => import('./components/a4/A4SheetPreview').then(m => ({ default: m.A4SheetPreview })));
const GoogleDriveManagerModal = React.lazy(() => import('./components/common/GoogleDriveManagerModal').then(m => ({ default: m.GoogleDriveManagerModal })));
import { 
  migrarLocalStorageParaIndexedDbSeNecessario,
  salvarRegistroApoioIdb,
  salvarEstudantesIdb,
  salvarEstudanteIdb,
  salvarAtividadesIdb,
  salvarAtividadeIdb,
  salvarTodosRegistrosApoioIdb,
  obterTodosRegistrosApoioIdb,
  obterEstudantesIdb,
  obterAtividadesIdb,
  zerarLancamentosEAtividadesIdb
} from './services/indexedDbService';
import { 
  iniciarMonitoramentoSincronizacao 
} from './services/offlineSyncService';
import { 
  salvarAtividadeNoFirestore, 
  salvarRegistroApoioNoFirestore, 
  salvarPeiNoFirestore,
  excluirTodasAtividadesDoFirestore,
  excluirTodosRegistrosApoioDoFirestore,
  ouvirAtividadesDoFirestore,
  ouvirRegistrosApoioDoFirestore,
  ouvirPeisDoFirestore 
} from './services/escolaFirestoreService';
import { 
  registrarServiceWorker 
} from './services/pushNotificationService';
import { 
  validateAndSanitizeAuthorizedUser,
  validateAndSanitizeAuthorizedUsers,
  validateAndSanitizeEstudante,
  validateAndSanitizeEstudantes,
  validateAndSanitizeAtividade,
  validateAndSanitizeAtividades,
  validateAndSanitizeRegistroApoio,
  validateAndSanitizeRegistrosApoio,
  validateAndSanitizePerfilPedagogico,
  validateAndSanitizePerfisPedagogicos,
  validateAndSanitizeEscolaConfig
} from './utils/typeValidators';
import { X, ShieldAlert, ArrowLeft } from 'lucide-react';

// Fallback de carregamento visual para Views e Módulos carregados via React.lazy
const ViewLoadingFallback: React.FC<{ message?: string }> = ({ message = 'Carregando módulo pedagógico...' }) => (
  <div className="flex flex-col items-center justify-center min-h-[45vh] p-8 text-center space-y-4">
    <div className="h-10 w-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
    <p className="text-xs font-bold text-slate-700 tracking-wide uppercase">{message}</p>
    <span className="text-[11px] text-slate-400 font-medium">AdaptaEdu Escolar • SEDUC-GO</span>
  </div>
);

// Fallback de carregamento para Modais dinâmicos sob demanda
const ModalLoadingFallback: React.FC<{ title?: string }> = ({ title = 'Carregando recurso...' }) => (
  <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl p-6 shadow-xl flex flex-col items-center space-y-3 max-w-sm w-full border border-slate-200">
      <div className="h-8 w-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">{title}</p>
      <span className="text-[10px] text-slate-400">Carregando módulo sob demanda...</span>
    </div>
  </div>
);

export default function App() {
  // 1. Sessão Local Controlada (não guarda permanentemente no localStorage)
  const [currentUser, setCurrentUser] = useState<AuthorizedUser | null>(() => {
    try {
      const session = sessionStorage.getItem('adaptaedu_session_user');
      if (!session) return null;
      const parsed = JSON.parse(session);
      return validateAndSanitizeAuthorizedUser(parsed);
    } catch {
      return null;
    }
  });

  const [currentActiveRole, setCurrentActiveRole] = useState<UserRole>(() => {
    if (currentUser?.roles?.includes('coordinator')) return 'coordinator';
    if (currentUser?.roles?.includes('PROFISSIONAL_DE_APOIO')) return 'PROFISSIONAL_DE_APOIO';
    return 'teacher';
  });

  // 2. Roteamento sincronizado de URL
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const p = window.location.pathname;
      if (p && p !== '/') return p;
    }
    return currentUser 
      ? (currentUser.roles.includes('coordinator') 
          ? '/coordinator-preview' 
          : currentUser.roles.includes('PROFISSIONAL_DE_APOIO') 
          ? '/apoio-preview' 
          : '/teacher-preview') 
      : '/login';
  });

  // Sincroniza navegação do histórico do navegador
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname || '/login';
      setCurrentPath(path);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Configurações da Escola (Colégio Estadual Olynto Pereira de Castro)
  const [escolaConfig, setEscolaConfig] = useState<EscolaConfig>(() => {
    const fallback: EscolaConfig = {
      ...ESCOLA_CONFIG_INICIAL,
      nome: 'Colégio Estadual Olynto Pereira de Castro',
      subtitulo: 'Secretaria de Estado da Educação - SEDUC Goiás',
      permitirAcessoEmailSenha: false,
    };
    try {
      const saved = localStorage.getItem('adaptaedu_escola_config');
      if (saved) return validateAndSanitizeEscolaConfig(JSON.parse(saved), fallback);
    } catch (e) {
      console.warn('Erro ao carregar escolaConfig:', e);
    }
    return fallback;
  });

  // Coleção authorizedUsers (inicia com os 87 profissionais oficiais do PDF e reconcilia cache)
  const [usuariosAutorizados, setUsuariosAutorizados] = useState<AuthorizedUser[]>(() => {
    const canonical = validateAndSanitizeAuthorizedUsers(gerarUsuariosIniciaisAutorizadosDoPdf());
    const saved = localStorage.getItem('adaptaedu_authorized_users');
    if (!saved) return canonical;

    try {
      const parsed = JSON.parse(saved);
      const sanitizedParsed = validateAndSanitizeAuthorizedUsers(parsed);
      if (sanitizedParsed.length === 0) return canonical;

      // Reconcilia com os 87 oficiais do PDF garantindo que nenhum e-mail seja perdido
      const map = new Map<string, AuthorizedUser>();
      for (const u of canonical) {
        map.set(u.emailNormalized, u);
      }
      for (const u of sanitizedParsed) {
        const norm = normalizeEmail(u.emailNormalized || u.email);
        if (norm) {
          const canon = map.get(norm);
          if (canon) {
            // Marcos Antonio Ferreira sempre mantém superadmin, coordinator, teacher
            if (norm === 'marcos.ferreira@admin.educa.go.gov.br') {
              map.set(norm, {
                ...canon,
                ...u,
                roles: ['superadmin', 'coordinator', 'teacher'],
                active: true,
                status: 'authorized',
              });
            } else {
              map.set(norm, { ...canon, ...u });
            }
          } else {
            map.set(norm, u);
          }
        }
      }
      return Array.from(map.values());
    } catch {
      return canonical;
    }
  });

  // Estudantes
  const [estudantes, setEstudantes] = useState<Estudante[]>(() => {
    const saved = localStorage.getItem('adaptaedu_estudantes');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const sanitized = validateAndSanitizeEstudantes(parsed);
        if (sanitized.length > 0) return sanitized;
      } catch (e) {
        console.error('Erro ao ler estudantes do localStorage', e);
      }
    }
    return validateAndSanitizeEstudantes(ESTUDANTES_INICIAIS);
  });

  // Perfis Pedagógicos
  const [perfisPedagogicos, setPerfisPedagogicos] = useState<PerfilPedagogico[]>(() => {
    const saved = localStorage.getItem('adaptaedu_perfis');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const sanitized = validateAndSanitizePerfisPedagogicos(parsed);
        if (sanitized.length > 0) return sanitized;
      } catch (e) {
        console.error('Erro ao ler perfis pedagógicos:', e);
      }
    }
    return validateAndSanitizePerfisPedagogicos(PERFIS_PEDAGOGICOS_INICIAIS);
  });

  // Habilidades Aprovadas
  const [habilidades, setHabilidades] = useState<HabilidadeAprovada[]>(() => {
    const saved = localStorage.getItem('adaptaedu_habilidades');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error('Erro ao ler habilidades:', e);
      }
    }
    return [];
  });

  // Documentos
  const [documentos, setDocumentos] = useState<DocumentoImportado[]>(() => {
    const saved = localStorage.getItem('adaptaedu_documentos');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error('Erro ao ler documentos:', e);
      }
    }
    return [];
  });

  // Atividades
  const [atividades, setAtividades] = useState<AtividadeAdaptada[]>(() => {
    const saved = localStorage.getItem('adaptaedu_atividades');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const sanitized = validateAndSanitizeAtividades(parsed);
        if (sanitized.length > 0) return sanitized;
      } catch (e) {
        console.error('Erro ao ler atividades:', e);
      }
    }
    return validateAndSanitizeAtividades(ATIVIDADES_INICIAIS);
  });

  // Histórico
  const [historico, setHistorico] = useState<RegistroHistorico[]>(() => {
    const saved = localStorage.getItem('adaptaedu_historico');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error('Erro ao ler historico:', e);
      }
    }
    return [];
  });

  // Auditoria Administrativa
  const [auditoria, setAuditoria] = useState<RegistroAuditoria[]>(() => {
    const saved = localStorage.getItem('adaptaedu_auditoria');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error('Erro ao ler auditoria:', e);
      }
    }
    return [];
  });

  // Matrizes Curriculares e Habilidades
  const [matrizesCurriculares, setMatrizesCurriculares] = useState<CurriculumMatrix[]>(() => {
    const saved = localStorage.getItem('adaptaedu_matrizes');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error('Erro ao ler matrizes:', e);
      }
    }
    return MATRIZES_CURRICULARES_INICIAIS;
  });

  const [curriculumSkills, setCurriculumSkills] = useState<CurriculumSkill[]>(() => {
    const saved = localStorage.getItem('adaptaedu_curriculum_skills');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error('Erro ao ler habilidades curriculares:', e);
      }
    }
    return HABILIDADES_CURRICULARES_INICIAIS;
  });

  // Registros de Acompanhamento Diário do Profissional de Apoio
  const [registrosApoio, setRegistrosApoio] = useState<RegistroAcompanhamentoApoio[]>(() => {
    const saved = localStorage.getItem('adaptaedu_registros_apoio');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const sanitized = validateAndSanitizeRegistrosApoio(parsed);
        if (sanitized.length > 0) return sanitized;
      } catch (e) {
        console.error('Erro ao ler registros de apoio:', e);
      }
    }
    return validateAndSanitizeRegistrosApoio(REGISTROS_APOIO_INICIAIS);
  });

  const [peisArmazenados, setPeisArmazenados] = useState<PeiDocumento[]>([]);

  // Modais e Visão Central Master
  const [isMasterDataCenterActive, setIsMasterDataCenterActive] = useState<boolean>(false);
  const [modalImportarMatrizAberto, setModalImportarMatrizAberto] = useState<boolean>(false);
  const [modalGoogleDriveAberto, setModalGoogleDriveAberto] = useState<boolean>(false);
  const [isDriveConnected, setIsDriveConnected] = useState<boolean>(() => isGoogleDriveConnected());

  // Estados e sincronização de dados compartilhados via link (deep-linking de aba, estudante e atividade)
  const [sharedTab, setSharedTab] = useState<AbaCoordenacao | undefined>(undefined);
  const [sharedEstudanteId, setSharedEstudanteId] = useState<string | undefined>(undefined);
  const [sharedAtividadeId, setSharedAtividadeId] = useState<string | undefined>(undefined);

  // Estados e controle do Módulo Oficial: Criar PEI (SEDUC-GO / SIAP)
  const [modalPeiAberto, setModalPeiAberto] = useState<boolean>(false);
  const [peiEstudanteSelecionadoId, setPeiEstudanteSelecionadoId] = useState<string | undefined>(undefined);

  const handleOpenCriarPei = (estudanteId?: string) => {
    setPeiEstudanteSelecionadoId(estudanteId);
    setModalPeiAberto(true);
  };

  const handleSavePei = (novoPei: PeiDocumento) => {
    // 1. Cria o documento correspondente na aba Documentos vinculado ao estudante
    const novoDoc: DocumentoImportado = {
      id: `doc-pei-${novoPei.id}`,
      tipo: 'pei',
      nomeArquivo: sanitizarNomeArquivoPei(novoPei),
      formato: 'PDF',
      tamanho: '24 KB',
      dataEnvio: new Date().toLocaleDateString('pt-BR'),
      status: 'aprovado',
      camposExtraidos: [
        { campo: 'Estudante', valor: novoPei.studentName, confianca: 'identificado' },
        { campo: 'Diagnóstico', valor: novoPei.diagnosis, confianca: 'identificado' },
        { campo: 'Ano/Série', valor: `${novoPei.grade} - ${novoPei.classRoom}`, confianca: 'identificado' },
        { campo: 'Período', valor: novoPei.period, confianca: 'identificado' },
        { campo: 'Componente Curricular', valor: novoPei.subject, confianca: 'identificado' },
      ],
      peiDados: novoPei,
    };

    setDocumentos(prev => {
      const semDuplicata = prev.filter(d => d.id !== novoDoc.id && d.peiDados?.id !== novoPei.id);
      return [novoDoc, ...semDuplicata];
    });

    registrarHistorico(
      'Criação de PEI',
      `PEI oficial SEDUC-GO homologado para o estudante ${novoPei.studentName} (${novoPei.period}).`
    );

    handleAddAuditoria({
      id: `aud-${Date.now()}`,
      dataHora: new Date().toLocaleString('pt-BR'),
      usuarioResponsavel: currentUser?.name || 'Coordenação Pedagógica',
      usuarioAlterado: novoPei.studentName,
      perfisAnteriores: currentUser?.roles || [],
      perfisPosteriores: currentUser?.roles || [],
      situacaoAnterior: 'Não iniciado',
      situacaoPosterior: 'PEI Homologado',
      resultado: 'Sucesso',
      detalhes: `Criação e homologação do PEI oficial (SEDUC-GO / SIAP) para o estudante ${novoPei.studentName} (${novoPei.period}).`,
    });

    // Sincronização em Nuvem (Cloud Firestore) com tolerância a offline
    salvarPeiNoFirestore(novoPei).catch(e => {
      console.warn('Falha na sincronização do PEI no Firestore (armazenado localmente):', e);
    });
  };

  // Monitora conexão com o Google Drive
  useEffect(() => {
    const unsub = initGoogleDriveAuth(
      (user, token) => {
        setIsDriveConnected(Boolean(user && token));
      },
      () => {
        setIsDriveConnected(false);
      }
    );
    return () => unsub();
  }, []);

  // Serviço de Backup Periódico dos dados do localStorage (estudantes, atividades e registros) para o Google Drive na pasta 'Backups_AdaptaEdu'
  useEffect(() => {
    const pararBackup = iniciarServicoBackupPeriodico();
    return () => pararBackup();
  }, []);

  // Inicialização e Migração Robusta do IndexedDB + Monitoramento de Sincronização Offline
  useEffect(() => {
    // 1. Migra automaticamente dados existentes do localStorage para o IndexedDB na primeira carga
    migrarLocalStorageParaIndexedDbSeNecessario().then(res => {
      if (res.migrado) {
        console.info(`IndexedDB inicializado com sucesso! (${res.estudantesCount} alunos, ${res.registrosApoioCount} registros de apoio).`);
      }
      // Reconcilia dados mais recentes do IndexedDB
      obterTodosRegistrosApoioIdb().then(regs => {
        if (regs && regs.length > 0) setRegistrosApoio(regs);
      });
      obterEstudantesIdb().then(ests => {
        if (ests && ests.length > 0) setEstudantes(ests);
      });
      obterAtividadesIdb().then(ativs => {
        if (ativs && ativs.length > 0) setAtividades(ativs);
      });
    }).catch(err => {
      console.warn('Falha na inicialização do IndexedDB:', err);
    });

    // 2. Inicia monitoramento de conectividade online/offline e auto-sync
    const pararMonitoramentoSync = iniciarMonitoramentoSincronizacao();

    // 3. Listener para atualizar em tempo real a coleção quando um registro ou atividade for sincronizada
    const handleRegistroSincronizado = (e: Event) => {
      const customEvent = e as CustomEvent<{ registroId: string }>;
      const regId = customEvent.detail?.registroId;
      if (regId) {
        setRegistrosApoio(prev => prev.map(r => r.id === regId ? { ...r, syncStatus: 'synced' } : r));
      }
    };
    const handleAtividadeSincronizada = (e: Event) => {
      const customEvent = e as CustomEvent<{ atividadeId: string }>;
      const ativId = customEvent.detail?.atividadeId;
      if (ativId) {
        setAtividades(prev => prev.map(a => a.id === ativId ? { ...a, syncStatus: 'synced' } : a));
      }
    };
    window.addEventListener('adaptaedu:registro_sincronizado', handleRegistroSincronizado);
    window.addEventListener('adaptaedu:atividade_sincronizada', handleAtividadeSincronizada);

    return () => {
      pararMonitoramentoSync();
      window.removeEventListener('adaptaedu:registro_sincronizado', handleRegistroSincronizado);
      window.removeEventListener('adaptaedu:atividade_sincronizada', handleAtividadeSincronizada);
    };
  }, []);

  // Sincronização em Tempo Real com Cloud Firestore para múltiplos dispositivos e celulares
  useEffect(() => {
    const unsubAtiv = ouvirAtividadesDoFirestore((novasAtivs) => {
      setAtividades(prev => {
        const mapa = new Map(prev.map(a => [a.id, a]));
        novasAtivs.forEach(a => mapa.set(a.id, a));
        return Array.from(mapa.values());
      });
    });

    const unsubApoio = ouvirRegistrosApoioDoFirestore((novosRegs) => {
      setRegistrosApoio(prev => {
        const mapa = new Map(prev.map(r => [r.id, r]));
        novosRegs.forEach(r => mapa.set(r.id, r));
        return Array.from(mapa.values());
      });
    });

    const unsubPeis = ouvirPeisDoFirestore((novosPeis) => {
      setPeisArmazenados(prev => {
        const mapa = new Map(prev.map(p => [p.id, p]));
        novosPeis.forEach(p => mapa.set(p.id, p));
        return Array.from(mapa.values());
      });
    });

    return () => {
      unsubAtiv();
      unsubApoio();
      unsubPeis();
    };
  }, []);

  // Registra Service Worker para suporte a Notificações Push e funcionamento offline
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      registrarServiceWorker().catch(() => {});
    }
  }, []);

  // Suporte avançado a links compartilhados com parâmetro de rota, aba, estudante e atividade (?role=...&tab=...&estudanteId=...&atividadeId=...)
  useEffect(() => {
    if (typeof window !== 'undefined' && currentUser) {
      const urlParams = new URLSearchParams(window.location.search);
      const requestedRoleParam = urlParams.get('role')?.toLowerCase();
      const hash = window.location.hash.replace('#', '').toLowerCase();
      const userRoles = currentUser.roles || [];

      const isCoordAuth = userRoles.includes('coordinator') || userRoles.includes('superadmin') || userRoles.includes('developer');
      const isApoioAuth = userRoles.includes('PROFISSIONAL_DE_APOIO') || isCoordAuth;
      const isTeacherAuth = userRoles.includes('teacher') || isCoordAuth;

      // 1. Roteamento por papel do link
      if ((requestedRoleParam === 'coordinator' || requestedRoleParam === 'coordenacao' || requestedRoleParam === 'coord' || hash === 'coordinator' || hash === 'coordenacao') && isCoordAuth) {
        setCurrentActiveRole('coordinator');
        setCurrentPath('/coordinator-preview');
      } else if ((requestedRoleParam === 'apoio' || requestedRoleParam === 'profissional_de_apoio' || hash === 'apoio') && isApoioAuth) {
        setCurrentActiveRole('PROFISSIONAL_DE_APOIO');
        setCurrentPath('/apoio-preview');
      } else if ((requestedRoleParam === 'teacher' || requestedRoleParam === 'professor' || requestedRoleParam === 'prof' || hash === 'teacher' || hash === 'professor') && isTeacherAuth) {
        setCurrentActiveRole('teacher');
        setCurrentPath('/teacher-preview');
      }

      // 2. Parâmetro de aba da Coordenação (?tab=... ou ?aba=...)
      const tabParam = urlParams.get('tab') || urlParams.get('aba');
      const validTabs: AbaCoordenacao[] = [
        'inicio', 'estudantes', 'professores', 'apoio', 'perfis', 
        'documentos', 'matriz', 'habilidades', 'atividades', 'historico', 'configuracoes'
      ];
      if (tabParam && validTabs.includes(tabParam as AbaCoordenacao)) {
        setSharedTab(tabParam as AbaCoordenacao);
      }

      // 3. Parâmetro de estudante (?estudanteId=... ou ?alunoId=... ou ?aluno=...)
      const studentParam = urlParams.get('estudanteId') || urlParams.get('alunoId') || urlParams.get('aluno');
      if (studentParam) {
        setSharedEstudanteId(studentParam);
      }

      // 4. Parâmetro de atividade (?atividadeId=... ou ?atividade=...)
      const ativParam = urlParams.get('atividadeId') || urlParams.get('atividade');
      if (ativParam) {
        setSharedAtividadeId(ativParam);
        const ativEncontrada = atividades.find(a => a.id === ativParam);
        if (ativEncontrada) {
          setAtividadeModalA4(ativEncontrada);
        }
      }
    }
  }, [currentUser, atividades]);

  // Acessibilidade e Folha A4 Modal
  const [isDyslexicFont, setIsDyslexicFont] = useState<boolean>(false);
  const [atividadeModalA4, setAtividadeModalA4] = useState<AtividadeAdaptada | null>(null);

  // Persistência local transparente dos dados cadastrais (excluindo credenciais)
  useEffect(() => {
    localStorage.setItem('adaptaedu_escola_config', JSON.stringify(escolaConfig));
  }, [escolaConfig]);

  useEffect(() => {
    localStorage.setItem('adaptaedu_authorized_users', JSON.stringify(usuariosAutorizados));
  }, [usuariosAutorizados]);

  useEffect(() => {
    localStorage.setItem('adaptaedu_estudantes', JSON.stringify(estudantes));
    salvarEstudantesIdb(estudantes).catch(() => {});
  }, [estudantes]);

  useEffect(() => {
    localStorage.setItem('adaptaedu_perfis', JSON.stringify(perfisPedagogicos));
  }, [perfisPedagogicos]);

  useEffect(() => {
    localStorage.setItem('adaptaedu_habilidades', JSON.stringify(habilidades));
  }, [habilidades]);

  useEffect(() => {
    localStorage.setItem('adaptaedu_documentos', JSON.stringify(documentos));
  }, [documentos]);

  useEffect(() => {
    localStorage.setItem('adaptaedu_atividades', JSON.stringify(atividades));
    salvarAtividadesIdb(atividades).catch(() => {});
  }, [atividades]);

  useEffect(() => {
    localStorage.setItem('adaptaedu_registros_apoio', JSON.stringify(registrosApoio));
    salvarTodosRegistrosApoioIdb(registrosApoio).catch(() => {});
  }, [registrosApoio]);

  useEffect(() => {
    localStorage.setItem('adaptaedu_historico', JSON.stringify(historico));
  }, [historico]);

  useEffect(() => {
    localStorage.setItem('adaptaedu_auditoria', JSON.stringify(auditoria));
  }, [auditoria]);

  useEffect(() => {
    localStorage.setItem('adaptaedu_matrizes', JSON.stringify(matrizesCurriculares));
  }, [matrizesCurriculares]);

  useEffect(() => {
    localStorage.setItem('adaptaedu_curriculum_skills', JSON.stringify(curriculumSkills));
  }, [curriculumSkills]);

  // Handlers
  const registrarHistorico = (tipo: string, descricao: string) => {
    const novo: RegistroHistorico = {
      id: `hist-${Date.now()}`,
      data: new Date().toLocaleString('pt-BR'),
      tipo,
      usuario: currentUser ? currentUser.name : 'Coordenação',
      descricao,
    };
    setHistorico(prev => [novo, ...prev]);
  };

  const handleAddAuditoria = (novoReg: RegistroAuditoria) => {
    setAuditoria(prev => [novoReg, ...prev]);
  };

  const handleSalvarRegistroApoio = (novoOuAtualizado: RegistroAcompanhamentoApoio) => {
    const validado = validateAndSanitizeRegistroApoio(novoOuAtualizado);
    if (!validado) return;

    // Atualização otimista no estado da UI
    setRegistrosApoio(prev => {
      const idx = prev.findIndex(r => r.id === validado.id || (r.studentId === validado.studentId && r.data === validado.data));
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = validado;
        return copy;
      }
      return [validado, ...prev];
    });

    // Salva no IndexedDB imediatamente com suporte a status offline/online
    salvarRegistroApoioIdb(validado, typeof navigator !== 'undefined' && !navigator.onLine).catch(e => {
      console.warn('Erro ao salvar registro de apoio no IndexedDB:', e);
    });

    // Sincroniza no Cloud Firestore
    salvarRegistroApoioNoFirestore(validado).catch(e => {
      console.warn('Falha ao salvar registro de apoio no Firestore (mantido localmente):', e);
    });
  };

  const handleUpdateUsuariosAutorizados = (novos: AuthorizedUser[]) => {
    const validados = validateAndSanitizeAuthorizedUsers(novos);
    setUsuariosAutorizados(validados);
  };

  const handleLoginSucesso = (user: AuthorizedUser, requestedRole?: UserRole, targetRoute?: string) => {
    const validUser = validateAndSanitizeAuthorizedUser(user);
    if (!validUser) return;
    setCurrentUser(validUser);
    sessionStorage.setItem('adaptaedu_session_user', JSON.stringify(validUser));

    const isCoordinator = validUser.roles.includes('coordinator') || validUser.roles.includes('superadmin') || validUser.roles.includes('developer');
    const isApoio = validUser.roles.includes('PROFISSIONAL_DE_APOIO') || isCoordinator;

    let activeRole: UserRole = 'teacher';
    if (requestedRole === 'coordinator' && isCoordinator) {
      activeRole = 'coordinator';
    } else if (requestedRole === 'PROFISSIONAL_DE_APOIO' && isApoio) {
      activeRole = 'PROFISSIONAL_DE_APOIO';
    } else if (isApoio && validUser.roles.includes('PROFISSIONAL_DE_APOIO') && !isCoordinator) {
      activeRole = 'PROFISSIONAL_DE_APOIO';
    } else if (isCoordinator && requestedRole !== 'teacher') {
      activeRole = 'coordinator';
    } else {
      activeRole = 'teacher';
    }
    setCurrentActiveRole(activeRole);

    const defaultRoute = activeRole === 'coordinator' 
      ? '/coordinator-preview' 
      : activeRole === 'PROFISSIONAL_DE_APOIO' 
      ? '/apoio-preview' 
      : '/teacher-preview';
    const newPath = targetRoute || defaultRoute;
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', newPath);
    }
    setCurrentPath(newPath);

    registrarHistorico(
      'Acesso Local', 
      `Profissional ${validUser.name} acessou o espaço ${
        activeRole === 'coordinator' 
          ? 'Coordenação' 
          : activeRole === 'PROFISSIONAL_DE_APOIO' 
          ? 'Profissional de Apoio' 
          : 'Professor'
      }.`
    );
  };

  // Botão [Sair]: limpa o e-mail, perfil selecionado, estado temporário e retorna à tela inicial
  const handleLogout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem('adaptaedu_session_user');
    localStorage.removeItem('adaptaedu_current_user'); // limpeza preventiva
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/login');
    }
    setCurrentPath('/login');
    setCurrentActiveRole('teacher');
  };

  const handleRoleChange = (role: UserRole) => {
    setIsMasterDataCenterActive(false);
    // Validação estrita: somente usuários autorizados podem acessar Coordenação ou Apoio
    const isCoordinator = Boolean(currentUser?.roles?.includes('coordinator') || currentUser?.roles?.includes('superadmin') || currentUser?.roles?.includes('developer'));
    const isApoio = Boolean(currentUser?.roles?.includes('PROFISSIONAL_DE_APOIO')) || isCoordinator;

    if (role === 'coordinator' && !isCoordinator) {
      alert('Seu e-mail está cadastrado somente para o Espaço do Professor.');
      return;
    }
    if (role === 'PROFISSIONAL_DE_APOIO' && !isApoio) {
      alert('Acesso negado: seu perfil não possui autorização para o Espaço do Profissional de Apoio.');
      return;
    }

    setCurrentActiveRole(role);
    const newPath = role === 'coordinator' 
      ? '/coordinator-preview' 
      : role === 'PROFISSIONAL_DE_APOIO' 
      ? '/apoio-preview' 
      : '/teacher-preview';
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', newPath);
    }
    setCurrentPath(newPath);
  };

  const handleAddEstudante = (novo: Estudante) => {
    const validado = validateAndSanitizeEstudante(novo);
    if (!validado) return;
    setEstudantes(prev => [validado, ...prev]);
    registrarHistorico('Cadastro de Estudante', `Estudante ${validado.nome} matriculado.`);
  };

  const handleBatchAddEstudantes = (novos: Estudante[]) => {
    const validados = validateAndSanitizeEstudantes(novos);
    setEstudantes(prev => [...validados, ...prev]);
    registrarHistorico('Importação de Estudantes', `Importação de ${validados.length} estudantes confirmada pela Coordenação.`);
  };

  const handleResetarEstudantesParaPadrao = () => {
    const oficiais = validateAndSanitizeEstudantes(ESTUDANTES_INICIAIS);
    setEstudantes(oficiais);
    localStorage.setItem('adaptaedu_estudantes', JSON.stringify(oficiais));
    registrarHistorico('Restauração de Estudantes', `Relação oficial de ${oficiais.length} estudantes e 18 salas restaurada a partir do documento PDF.`);
  };

  /**
   * Zera estritamente os lançamentos diários do apoio e as atividades geradas,
   * reiniciando a contagem do apoio para um novo ciclo letivo.
   * PRESERVA RIGOROSAMENTE: Alunos, Professores, Profissionais de Apoio, Matrizes e Configurações.
   */
  const handleZerarLancamentosEAtividades = async () => {
    const qtdAtividades = atividades.length;
    const qtdRegistrosApoio = registrosApoio.length;
    const agoraTs = Date.now();

    // 1. Zera atividades geradas em memória e no localStorage
    setAtividades([]);
    localStorage.setItem('adaptaedu_atividades', JSON.stringify([]));

    // 2. Zera lançamentos diários do apoio e reinicia a contagem em memória e no localStorage
    setRegistrosApoio([]);
    localStorage.setItem('adaptaedu_registros_apoio', JSON.stringify([]));

    // 3. Marca timestamp do novo ciclo de contagem e limpa avisos de pendência
    localStorage.setItem('adaptaedu_ciclo_apoio_iniciado', agoraTs.toString());
    localStorage.setItem('adaptaedu_lembretes_limpos_em', agoraTs.toString());

    // 4. Limpa IndexedDB para atividades e registros de apoio
    await zerarLancamentosEAtividadesIdb().catch(err => {
      console.warn('Aviso ao zerar IndexedDB:', err);
    });

    // 5. Limpa Firestore em nuvem para atividades e registros de apoio
    excluirTodasAtividadesDoFirestore().catch(() => {});
    excluirTodosRegistrosApoioDoFirestore().catch(() => {});

    // 6. Registra no histórico e na auditoria oficial da Coordenação
    registrarHistorico(
      'Ciclo Reiniciado',
      `Coordenação zerou ${qtdAtividades} atividades geradas e ${qtdRegistrosApoio} lançamentos diários do apoio. Cadastro de estudantes, professores e equipe de apoio foi 100% preservado.`
    );

    handleAddAuditoria({
      id: `aud-zerar-ciclo-${agoraTs}`,
      dataHora: new Date().toLocaleString('pt-BR'),
      usuarioResponsavel: currentUser?.name || 'Coordenação Pedagógica',
      usuarioAlterado: 'Lançamentos & Atividades',
      perfisAnteriores: currentUser?.roles || [],
      perfisPosteriores: currentUser?.roles || [],
      situacaoAnterior: `${qtdAtividades} atividades, ${qtdRegistrosApoio} diários`,
      situacaoPosterior: '0 atividades, 0 diários (Ciclo Zerado)',
      resultado: 'Sucesso',
      detalhes: 'Zerar lançamentos diários e atividades geradas para início de novo ciclo de contagem do apoio. Alunos, professores e profissionais de apoio foram estritamente preservados.',
    });

    // 7. Notifica outros componentes via evento global
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('adaptaedu:lancamentos_zerados', {
        detail: { timestamp: agoraTs }
      }));
    }
  };

  const handleUpdateEstudante = (atualizado: Estudante) => {
    const validado = validateAndSanitizeEstudante(atualizado);
    if (!validado) return;
    setEstudantes(prev => prev.map(e => e.id === validado.id ? validado : e));
    registrarHistorico('Atualização de Estudante', `Estudante ${validado.nome} atualizado.`);
  };

  const handleAddPerfilPedagogico = (novo: PerfilPedagogico) => {
    const validado = validateAndSanitizePerfilPedagogico(novo);
    if (!validado) return;
    setPerfisPedagogicos(prev => [validado, ...prev]);
    registrarHistorico('Perfil Pedagógico', `Perfil de ${validado.estudanteNome} aprovado.`);
  };

  const handleAddHabilidade = (nova: HabilidadeAprovada) => {
    setHabilidades(prev => [nova, ...prev]);
    registrarHistorico('Cadastro de Habilidade', `Habilidade ${nova.codigo} cadastrada.`);
  };

  const handleAprovarHabilidade = (id: string) => {
    setHabilidades(prev => prev.map(h => h.id === id ? { ...h, status: 'aprovada' as const } : h));
    registrarHistorico('Aprovação de Habilidade', `Habilidade aprovada.`);
  };

  const handleAddDocumento = (doc: DocumentoImportado) => {
    setDocumentos(prev => [doc, ...prev]);
    registrarHistorico('Importação de Documento', `Documento ${doc.nomeArquivo} salvo.`);
  };

  const handleSalvarAtividade = (nova: AtividadeAdaptada) => {
    const validada = validateAndSanitizeAtividade(nova);
    if (!validada) return;

    // 1. Atualização Otimista no Estado
    setAtividades(prev => [validada, ...prev]);

    // 2. Persistência Offline-First garantida no IndexedDB
    salvarAtividadeIdb(validada, typeof navigator !== 'undefined' && !navigator.onLine).catch(e => {
      console.warn('Erro ao salvar atividade no IndexedDB:', e);
    });

    // 3. Sincronização em Nuvem no Cloud Firestore (/activities)
    salvarAtividadeNoFirestore(validada).catch(e => {
      console.warn('Falha na sincronização imediata no Firestore (mantida em cache local):', e);
    });

    registrarHistorico('Geração de Atividade', `Atividade ${validada.conteudo} gerada.`);
  };

  const handleAtualizarAtividade = (atualizada: AtividadeAdaptada) => {
    const validada = validateAndSanitizeAtividade(atualizada);
    if (!validada) return;

    // 1. Atualização Otimista no Estado
    setAtividades(prev => prev.map(a => a.id === validada.id ? validada : a));

    // 2. Persistência Offline-First no IndexedDB
    salvarAtividadeIdb(validada, typeof navigator !== 'undefined' && !navigator.onLine).catch(e => {
      console.warn('Erro ao atualizar atividade no IndexedDB:', e);
    });

    // 3. Sincronização em Nuvem no Cloud Firestore
    salvarAtividadeNoFirestore(validada).catch(e => {
      console.warn('Falha na sincronização de atualização no Firestore:', e);
    });

    registrarHistorico('Revisão de Atividade', `Atividade ${validada.id} revisada.`);
  };

  // Homologação e Salvamento de Matriz Curricular e Habilidades
  const handleSaveMatrixAndSkills = (newMatrix: CurriculumMatrix, newSkills: CurriculumSkill[]) => {
    setMatrizesCurriculares(prev => [newMatrix, ...prev]);
    setCurriculumSkills(prev => [...newSkills, ...prev]);

    // Sincroniza com as habilidades aprovadas do sistema para exibição na aba 'Habilidades' e no espaço do professor
    const novasHabilidadesAprovadas: HabilidadeAprovada[] = newSkills.map(s => ({
      id: s.id,
      disciplina: s.subject,
      serie: s.grade,
      unidadeTematica: s.thematicUnit,
      objetoConhecimento: s.knowledgeObject,
      codigo: s.skillCode,
      descricao: s.skillDescription,
      documentoOrigem: s.sourceFileName || newMatrix.sourceFileName || 'Matriz Curricular Oficial',
      paginaOrigem: s.sourcePage ? `Pág. ${s.sourcePage}` : 'Pág. 1',
      status: 'aprovada',
    }));
    setHabilidades(prev => [...novasHabilidadesAprovadas, ...prev]);

    handleAddAuditoria({
      id: `aud-${Date.now()}`,
      dataHora: new Date().toLocaleString('pt-BR'),
      usuarioResponsavel: currentUser?.name || 'Coordenação',
      usuarioAlterado: newMatrix.title,
      perfisAnteriores: currentUser?.roles || [],
      perfisPosteriores: currentUser?.roles || [],
      situacaoAnterior: 'Pendente de importação',
      situacaoPosterior: 'Matriz e habilidades importadas e aprovadas',
      resultado: 'Sucesso',
      detalhes: `Importação de matriz concluída: ${newMatrix.title} com ${newSkills.length} habilidades aprovadas vinculadas.`,
    });

    registrarHistorico('Importação de Matriz Curricular', `Matriz "${newMatrix.title}" homologada com ${newSkills.length} habilidades oficiais.`);
    setModalImportarMatrizAberto(false);
    alert(`Matriz "${newMatrix.title}" homologada com sucesso!\n${newSkills.length} habilidades foram salvas e aprovadas.\nAbra a aba "Habilidades" para conferir o resultado.`);
  };

  // Homologação em Lote Geral da Escola (Todas as Séries e Disciplinas)
  const handleBatchSaveMatricesAndSkills = (newMatrices: CurriculumMatrix[], newSkills: CurriculumSkill[]) => {
    setMatrizesCurriculares(prev => {
      const idsExistentes = new Set(prev.map(m => m.id));
      const novas = newMatrices.filter(m => !idsExistentes.has(m.id));
      return [...novas, ...prev];
    });

    setCurriculumSkills(prev => {
      const idsExistentes = new Set(prev.map(s => s.id));
      const novas = newSkills.filter(s => !idsExistentes.has(s.id));
      return [...novas, ...prev];
    });

    const novasHabilidadesAprovadas: HabilidadeAprovada[] = newSkills.map(s => ({
      id: s.id,
      disciplina: s.subject,
      serie: s.grade,
      unidadeTematica: s.thematicUnit,
      objetoConhecimento: s.knowledgeObject,
      codigo: s.skillCode,
      descricao: s.skillDescription,
      documentoOrigem: s.sourceFileName || 'Matriz Geral da Escola 2026',
      paginaOrigem: s.sourcePage ? `Pág. ${s.sourcePage}` : 'Pág. 1',
      status: 'aprovada',
    }));

    setHabilidades(prev => {
      const idsExistentes = new Set(prev.map(h => h.id));
      const novas = novasHabilidadesAprovadas.filter(h => !idsExistentes.has(h.id));
      return [...novas, ...prev];
    });

    handleAddAuditoria({
      id: `aud-geral-${Date.now()}`,
      dataHora: new Date().toLocaleString('pt-BR'),
      usuarioResponsavel: currentUser?.name || 'Coordenação',
      usuarioAlterado: 'Matriz Geral Escolar (Todas as Turmas)',
      perfisAnteriores: currentUser?.roles || [],
      perfisPosteriores: currentUser?.roles || [],
      situacaoAnterior: 'Pendente de importação geral',
      situacaoPosterior: 'Matrizes gerais e habilidades homologadas',
      resultado: 'Sucesso',
      detalhes: `Importação geral escolar concluída: ${newMatrices.length} matrizes e ${newSkills.length} objetivos de aprendizagem salvos no Firestore e distribuídos para todo o sistema.`,
    });

    registrarHistorico('Importação Geral de Matrizes', `Matriz Geral com ${newMatrices.length} matrizes e ${newSkills.length} habilidades homologada para toda a escola.`);
    setModalImportarMatrizAberto(false);
  };

  // Rota de Produção Preparada: /verify-email
  if (currentPath === '/verify-email') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-lg text-center space-y-4">
          <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h2 className="text-base font-extrabold text-slate-900">Confirmação de Acesso por E-mail</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Esta rota foi preparada para receber a validação criptografada do Firebase Authentication Email Link quando a integração estiver configurada.
          </p>
          <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-500 font-mono">
            Rota ativa: /verify-email (Ambiente de Produção)
          </div>
          <button
            onClick={() => {
              if (typeof window !== 'undefined') window.history.pushState({}, '', '/login');
              setCurrentPath('/login');
            }}
            className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Retornar ao Acesso do Sistema</span>
          </button>
        </div>
      </div>
    );
  }

  // Se o usuário não estiver autenticado na sessão, exibe a tela de login estrita
  if (!currentUser) {
    return (
      <LoginView
        escolaConfig={escolaConfig}
        usuariosAutorizados={usuariosAutorizados}
        onLoginSucesso={handleLoginSucesso}
        isFirebaseConfigured={true}
      />
    );
  }

  // PROTEÇÃO DE ROTA E PERFIL (Seção 15):
  // Não confia somente na rota. Valida novamente o perfil em cada módulo protegido.
  const isCoordinatorActive = currentActiveRole === 'coordinator' && 
    Boolean(currentUser?.roles?.includes('coordinator') || currentUser?.roles?.includes('superadmin') || currentUser?.roles?.includes('developer'));

  const isProfissionalApoioActive = currentActiveRole === 'PROFISSIONAL_DE_APOIO' && 
    Boolean(currentUser?.roles?.includes('PROFISSIONAL_DE_APOIO') || currentUser?.roles?.includes('coordinator') || currentUser?.roles?.includes('superadmin') || currentUser?.roles?.includes('developer'));

  return (
    <div className={`min-h-screen bg-slate-50 text-slate-900 ${isDyslexicFont ? 'font-accessible' : ''}`}>
      
      {/* Header com Switcher de Perfil e Informação do Usuário */}
      <Header
        currentUser={currentUser}
        currentActiveRole={currentActiveRole}
        onRoleChange={handleRoleChange}
        onLogout={handleLogout}
        isDyslexicFont={isDyslexicFont}
        onToggleDyslexicFont={() => setIsDyslexicFont(!isDyslexicFont)}
        hasActiveActivity={atividades.length > 0}
        onOpenPrintPreview={() => {
          if (atividades.length > 0) {
            setAtividadeModalA4(atividades[0]);
          }
        }}
        onNavigateToMasterDataCenter={() => setIsMasterDataCenterActive(true)}
        isMasterDataCenterActive={isMasterDataCenterActive}
        onOpenGoogleDrive={() => setModalGoogleDriveAberto(true)}
        isGoogleDriveConnected={isDriveConnected}
        onOpenCriarPei={() => handleOpenCriarPei()}
        atividades={Array.isArray(atividades) ? atividades : []}
        estudantes={Array.isArray(estudantes) ? estudantes : []}
        perfisPedagogicos={Array.isArray(perfisPedagogicos) ? perfisPedagogicos : []}
        onVisualizarAtividadeA4={(ativ) => setAtividadeModalA4(ativ)}
        onNavigateToCoordenacaoTab={(tab, estId) => {
          setCurrentActiveRole('coordinator');
          if (typeof window !== 'undefined') {
            window.history.pushState({}, '', '/coordinator-preview');
          }
          setCurrentPath('/coordinator-preview');
          setSharedTab(tab as any);
          if (estId) setSharedEstudanteId(estId);
        }}
      />

      {/* Roteamento Seguro baseado nos Papéis Reais */}
      <main className="pb-16">
        <Suspense fallback={<ViewLoadingFallback message="Carregando módulo do sistema..." />}>
          {isMasterDataCenterActive && Boolean(currentUser?.roles?.includes('superadmin') || currentUser?.roles?.includes('developer')) ? (
            <MasterDataCenterView
              currentUser={currentUser}
              usuariosAutorizados={Array.isArray(usuariosAutorizados) ? usuariosAutorizados : []}
              onUpdateUsuarios={setUsuariosAutorizados}
              estudantes={Array.isArray(estudantes) ? estudantes : []}
              onUpdateEstudantes={(novos) => setEstudantes(novos)}
              matrizes={Array.isArray(matrizesCurriculares) ? matrizesCurriculares : []}
              habilidades={Array.isArray(curriculumSkills) ? curriculumSkills : []}
              perfis={Array.isArray(perfisPedagogicos) ? perfisPedagogicos : []}
              documentos={Array.isArray(documentos) ? documentos : []}
              atividades={Array.isArray(atividades) ? atividades : []}
              auditoria={Array.isArray(auditoria) ? auditoria : []}
              escolaConfig={escolaConfig}
              onUpdateEscolaConfig={setEscolaConfig}
              onVoltarParaCoordenacao={() => setIsMasterDataCenterActive(false)}
              onAddAuditoria={handleAddAuditoria}
            />
          ) : isCoordinatorActive ? (
            <CoordenacaoView
              currentUser={currentUser}
              escolaConfig={escolaConfig}
              onUpdateEscolaConfig={setEscolaConfig}
              estudantes={Array.isArray(estudantes) ? estudantes : []}
              onAddEstudante={handleAddEstudante}
              onBatchAddEstudantes={handleBatchAddEstudantes}
              onResetarEstudantesParaPadrao={handleResetarEstudantesParaPadrao}
              onUpdateEstudante={handleUpdateEstudante}
              usuariosAutorizados={Array.isArray(usuariosAutorizados) ? usuariosAutorizados : []}
              onUpdateUsuariosAutorizados={setUsuariosAutorizados}
              currentUserRoles={(currentUser?.roles || []) as UserRole[]}
              currentUserName={currentUser?.name || 'Coordenação Pedagógica'}
              perfisPedagogicos={Array.isArray(perfisPedagogicos) ? perfisPedagogicos : []}
              onAddPerfilPedagogico={handleAddPerfilPedagogico}
              habilidades={Array.isArray(habilidades) ? habilidades : []}
              onAddHabilidade={handleAddHabilidade}
              onAprovarHabilidade={handleAprovarHabilidade}
              documentos={Array.isArray(documentos) ? documentos : []}
              onAddDocumento={handleAddDocumento}
              atividades={Array.isArray(atividades) ? atividades : []}
              historico={Array.isArray(historico) ? historico : []}
              auditoria={Array.isArray(auditoria) ? auditoria : []}
              onAddAuditoria={handleAddAuditoria}
              onVisualizarAtividadeA4={(ativ) => setAtividadeModalA4(ativ)}
              matrizesCurriculares={Array.isArray(matrizesCurriculares) ? matrizesCurriculares : []}
              onOpenImportarMatriz={() => setModalImportarMatrizAberto(true)}
              onOpenCentralMaster={() => setIsMasterDataCenterActive(true)}
              registrosApoio={Array.isArray(registrosApoio) ? registrosApoio : []}
              onSalvarRegistroApoio={handleSalvarRegistroApoio}
              onNavigateToApoio={() => {
                setCurrentActiveRole('PROFISSIONAL_DE_APOIO');
                if (typeof window !== 'undefined') {
                  window.history.pushState({}, '', '/apoio-preview');
                }
                setCurrentPath('/apoio-preview');
              }}
              onOpenGoogleDrive={() => setModalGoogleDriveAberto(true)}
              isGoogleDriveConnected={isDriveConnected}
              onOpenCriarPei={handleOpenCriarPei}
              initialTab={sharedTab}
              initialEstudanteId={sharedEstudanteId}
              onZerarLancamentosEAtividades={handleZerarLancamentosEAtividades}
            />
          ) : isProfissionalApoioActive ? (
            <ProfissionalApoioView
              currentUser={currentUser}
              escolaConfig={escolaConfig}
              estudantes={Array.isArray(estudantes) ? estudantes : []}
              onUpdateEstudante={handleUpdateEstudante}
              registrosApoio={Array.isArray(registrosApoio) ? registrosApoio : []}
              onSalvarRegistroApoio={handleSalvarRegistroApoio}
              onAddAuditoria={handleAddAuditoria}
              matrizesCurriculares={Array.isArray(matrizesCurriculares) ? matrizesCurriculares : []}
              atividades={Array.isArray(atividades) ? atividades : []}
              onOpenCriarPei={handleOpenCriarPei}
              onVoltarParaCoordenacao={
                Boolean(currentUser?.roles?.includes('coordinator') || currentUser?.roles?.includes('superadmin') || currentUser?.roles?.includes('developer'))
                  ? () => {
                      setCurrentActiveRole('coordinator');
                      if (typeof window !== 'undefined') {
                        window.history.pushState({}, '', '/coordinator-preview');
                      }
                      setCurrentPath('/coordinator-preview');
                    }
                  : undefined
              }
            />
          ) : (
            <ProfessorView
              currentUser={currentUser}
              escolaConfig={escolaConfig}
              estudantes={Array.isArray(estudantes) ? estudantes : []}
              perfisPedagogicos={Array.isArray(perfisPedagogicos) ? perfisPedagogicos : []}
              habilidadesAprovadas={(Array.isArray(habilidades) ? habilidades : []).filter(h => h && h.status === 'aprovada')}
              matrizesCurriculares={Array.isArray(matrizesCurriculares) ? matrizesCurriculares : []}
              habilidadesCurriculares={Array.isArray(curriculumSkills) ? curriculumSkills : []}
              atividades={Array.isArray(atividades) ? atividades : []}
              registrosApoio={Array.isArray(registrosApoio) ? registrosApoio : []}
              peisArmazenados={peisArmazenados}
              onSalvarAtividade={handleSalvarAtividade}
              onAtualizarAtividade={handleAtualizarAtividade}
              onVisualizarAtividadeA4={(ativ) => setAtividadeModalA4(ativ)}
              initialEstudanteId={sharedEstudanteId}
              initialAtividadeId={sharedAtividadeId}
              onOpenCriarPei={handleOpenCriarPei}
            />
          )}
        </Suspense>
      </main>

      {/* Modal de Importação de Matriz Curricular */}
      {modalImportarMatrizAberto && (
        <Suspense fallback={<ModalLoadingFallback title="Carregando Matriz Curricular..." />}>
          <ImportarMatrizModal
            isOpen={modalImportarMatrizAberto}
            onClose={() => setModalImportarMatrizAberto(false)}
            onSaveMatrixAndSkills={handleSaveMatrixAndSkills}
            onBatchSaveMatricesAndSkills={handleBatchSaveMatricesAndSkills}
            currentUserName={currentUser?.name || 'Coordenação'}
          />
        </Suspense>
      )}

      {/* Modal de Folha A4 */}
      {atividadeModalA4 && (
        <Suspense fallback={<ModalLoadingFallback title="Carregando Folha A4..." />}>
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-6">
            <div className="relative w-full max-w-5xl bg-slate-100 rounded-2xl shadow-xl p-4 sm:p-6 my-auto">
              <div className="no-print flex items-center justify-between pb-3 mb-4 border-b border-slate-300">
                <span className="font-extrabold text-slate-800 text-sm sm:text-base">
                  Folha A4 da Atividade Adaptada
                </span>
                <button
                  onClick={() => setAtividadeModalA4(null)}
                  className="p-1.5 rounded-lg bg-white border text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="max-h-[85vh] overflow-y-auto px-1 py-2 flex justify-center">
                <A4SheetPreview
                  atividade={atividadeModalA4}
                  escolaConfig={escolaConfig}
                  onEditQuestao={(questaoAtualizada) => {
                    const novas = atividadeModalA4.questoes.map(q => q.id === questaoAtualizada.id ? questaoAtualizada : q);
                    const atualizada: AtividadeAdaptada = { ...atividadeModalA4, questoes: novas, status: 'Revisada' };
                    setAtividadeModalA4(atualizada);
                    handleAtualizarAtividade(atualizada);
                  }}
                />
              </div>
            </div>
          </div>
        </Suspense>
      )}

      {/* Modal de Gerenciamento do Google Drive (Pastas por Série e Uploads) */}
      {modalGoogleDriveAberto && (
        <Suspense fallback={<ModalLoadingFallback title="Carregando Google Drive..." />}>
          <GoogleDriveManagerModal
            isOpen={modalGoogleDriveAberto}
            onClose={() => setModalGoogleDriveAberto(false)}
            estudantes={estudantes}
            registrosApoio={registrosApoio}
          />
        </Suspense>
      )}

      {/* Modal Oficial do Módulo: Criar PEI (SEDUC-GO / SIAP) */}
      {modalPeiAberto && (
        <Suspense fallback={<ModalLoadingFallback title="Carregando Gerador de PEI..." />}>
          <PeiGeneratorModal
            isOpen={modalPeiAberto}
            onClose={() => {
              setModalPeiAberto(false);
              setPeiEstudanteSelecionadoId(undefined);
            }}
            students={estudantes}
            staffMembers={usuariosAutorizados}
            escolaConfig={escolaConfig}
            initialStudentId={peiEstudanteSelecionadoId}
            onSavePei={handleSavePei}
          />
        </Suspense>
      )}

    </div>
  );
}
