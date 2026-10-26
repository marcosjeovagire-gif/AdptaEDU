import React, { useState, useEffect, Suspense } from 'react';
import { firestoreSync, ouvirAtividadesDoFirestore, ouvirRegistrosApoioDoFirestore, ouvirPeisDoFirestore } from './services/escolaFirestoreService';
import { auth } from './services/googleDriveService';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  Estudante, 
  AtividadeAdaptada, 
  EscolaConfig, 
  AuthorizedUser, 
  UserRole, 
  PerfilPedagogico, 
  HabilidadeAprovada,
  RegistroAcompanhamentoApoio,
  PeiDocumento
} from './types';
import { LoginView } from './components/LoginView';
import { Header } from './components/Header';
import { ProfessorView } from './components/professor/ProfessorView';
import { CoordenacaoView } from './components/coordenacao/CoordenacaoView';
import { ProfissionalApoioView } from './components/apoio/ProfissionalApoioView';

/**
 * ADAPTAEDU ESCOLAR - APP CORE (REQUISITO 1)
 * Orquestra o roteamento e a sincronização em rede via Firestore.
 */

const ESCOLA_CONFIG_PADRAO: EscolaConfig = {
  id: 'olynto-castro',
  nome: 'Colégio Estadual Olynto Pereira de Castro',
  subtitulo: 'Secretaria de Estado da Educação - SEDUC Goiás',
  endereco: 'Rua Olynto Pereira de Castro, S/N',
  municipio: 'Rio Verde - GO',
  emailInstitucional: 'colegio.olynto@educa.go.gov.br',
  telefone: '(64) 3621-1234',
  textoRodape: 'Secretaria de Estado da Educação - SEDUC Goiás',
  logoUrl: '',
  corPrincipal: '#065f46',
  corSecundaria: '#064e3b',
  corDestaque: '#10b981',
  permitirAcessoEmailSenha: false
};

export default function App() {
  const [user, setUser] = useState<AuthorizedUser | null>(null);
  const [role, setRole] = useState<UserRole>('teacher');
  const [estudantes, setEstudantes] = useState<Estudante[]>([]);
  const [atividades, setAtividades] = useState<AtividadeAdaptada[]>([]);
  const [registrosApoio, setRegistrosApoio] = useState<RegistroAcompanhamentoApoio[]>([]);
  const [perfisPedagogicos, setPerfisPedagogicos] = useState<PerfilPedagogico[]>([]);
  const [peis, setPeis] = useState<PeiDocumento[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDyslexicFont, setIsDyslexicFont] = useState(false);

  // 1. Monitorar Autenticação
  useEffect(() => {
    return onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const mappedUser: AuthorizedUser = {
          id: fbUser.uid,
          uid: fbUser.uid,
          name: fbUser.displayName || 'Usuário',
          email: fbUser.email || '',
          emailNormalized: (fbUser.email || '').toLowerCase(),
          roles: ['teacher'],
          active: true,
          status: 'authorized',
          schoolId: ESCOLA_CONFIG_PADRAO.id!,
          allowedClasses: [],
          allowedDisciplines: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'system',
          source: 'firebase',
          sourcePage: null,
          firstAccessAt: new Date().toISOString(),
          lastAccessAt: new Date().toISOString(),
          archivedAt: null
        };
        setUser(mappedUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
  }, []);

  // 2. Sincronização em Rede Real-time
  useEffect(() => {
    if (!user) return;
    const unsubEstudantes = firestoreSync.ouvirEstudantes((data) => setEstudantes(data));
    const unsubAtividades = ouvirAtividadesDoFirestore((data) => setAtividades(data));
    const unsubApoio = ouvirRegistrosApoioDoFirestore((data) => setRegistrosApoio(data));
    const unsubPeis = ouvirPeisDoFirestore((data) => setPeis(data));
    return () => {
      unsubEstudantes();
      unsubAtividades();
      unsubApoio();
      unsubPeis();
    };
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-pulse flex flex-col items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
          <div className="w-16 h-16 bg-emerald-600 rounded-full"></div>
          <span>Sincronizando Rede AdaptaEdu...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <LoginView 
        escolaConfig={ESCOLA_CONFIG_PADRAO} 
        usuariosAutorizados={[]} 
        onLoginSucesso={(u, r) => {
          setUser(u);
          setRole(r);
        }} 
      />
    );
  }

  return (
    <div className={`min-h-screen bg-slate-50 ${isDyslexicFont ? 'font-lexend' : 'font-sans'}`}>
      <Header 
        currentUser={user} 
        currentActiveRole={role} 
        onRoleChange={(r) => setRole(r)}
        onLogout={() => auth.signOut()}
        isDyslexicFont={isDyslexicFont}
        onToggleDyslexicFont={() => setIsDyslexicFont(!isDyslexicFont)}
      />

      <main className="pt-4 pb-20">
        <Suspense fallback={<div>Carregando Módulo...</div>}>
          {role === 'coordinator' && (
            <CoordenacaoView 
              estudantes={estudantes} 
              atividades={atividades} 
              escolaConfig={ESCOLA_CONFIG_PADRAO} 
              currentUser={user}
              currentUserRoles={user.roles}
              onUpdateEscolaConfig={() => {}}
              onAddEstudante={() => {}}
              onUpdateEstudante={() => {}}
              usuariosAutorizados={[]}
              onUpdateUsuariosAutorizados={() => {}}
              perfisPedagogicos={perfisPedagogicos}
              onAddPerfilPedagogico={() => {}}
              habilidades={[]}
              onAddHabilidade={() => {}}
              onAprovarHabilidade={() => {}}
              documentos={[]}
              onAddDocumento={() => {}}
              historico={[]}
              auditoria={[]}
              onAddAuditoria={() => {}}
              onVisualizarAtividadeA4={() => {}}
              matrizesCurriculares={[]}
              registrosApoio={registrosApoio}
            />
          )}
          
          {role === 'teacher' && (
            <ProfessorView 
              estudantes={estudantes} 
              atividades={atividades}
              escolaConfig={ESCOLA_CONFIG_PADRAO}
              currentUser={user}
              onSalvarAtividade={() => {}}
              onAtualizarAtividade={() => {}}
              perfisPedagogicos={perfisPedagogicos}
              habilidadesAprovadas={[]}
            />
          )}

          {role === 'PROFISSIONAL_DE_APOIO' && (
            <ProfissionalApoioView 
              estudantes={estudantes}
              registrosApoio={registrosApoio}
              escolaConfig={ESCOLA_CONFIG_PADRAO}
              currentUser={user}
              onUpdateEstudante={() => {}}
              onSalvarRegistroApoio={() => {}}
              onAddAuditoria={() => {}}
            />
          )}
        </Suspense>
      </main>
    </div>
  );
}
