import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  UserCheck, 
  Printer, 
  Edit2, 
  Award, 
  FileCheck, 
  GraduationCap, 
  Calendar, 
  School, 
  CheckCircle, 
  Clock, 
  Plus, 
  Trash2,
  Eye,
  FileText,
  AlertCircle,
  Camera,
  Phone,
  HeartHandshake,
  FileDown,
  Loader2
} from 'lucide-react';
import { 
  Estudante, 
  AuthorizedUser, 
  PerfilPedagogico, 
  AtividadeAdaptada, 
  EscolaConfig,
  UserRole,
  PeiDocumento,
  RegistroAcompanhamentoApoio
} from '../../types';
import { vincularProfessoresAoEstudante } from '../../server/studentService';
import { compressImageFile } from '../../utils/imageCompressor';
import { uploadImageToDrive, isGoogleDriveConnected } from '../../services/googleDriveService';
import { obterPeisDoEstudante } from '../../services/peiService';
import { baixarPeiComoPdf } from '../../services/peiPdfService';
import { baixarRelatorioConsolidadoEstudantePdf } from '../../services/relatorioConsolidadoService';

interface FichaEstudanteModalProps {
  estudante: Estudante;
  escolaConfig: EscolaConfig;
  professoresDisponiveis: AuthorizedUser[];
  perfisPedagogicos: PerfilPedagogico[];
  atividades: AtividadeAdaptada[];
  registrosApoio?: RegistroAcompanhamentoApoio[];
  currentUserRoles: UserRole[];
  allStudents: Estudante[];
  onClose: () => void;
  onUpdateEstudante: (atualizado: Estudante) => void;
  onAbrirEdicaoManual: (est: Estudante) => void;
  onCriarPerfilPedagogico: (estudanteId: string) => void;
  onVisualizarAtividadeA4: (atividade: AtividadeAdaptada) => void;
  onGerarRelatorioPdi?: (estudanteId: string) => void;
  onCriarPei?: (estudanteId: string) => void;
}

export const FichaEstudanteModal: React.FC<FichaEstudanteModalProps> = ({
  estudante,
  escolaConfig,
  professoresDisponiveis,
  perfisPedagogicos,
  atividades,
  registrosApoio = [],
  currentUserRoles,
  allStudents,
  onClose,
  onUpdateEstudante,
  onAbrirEdicaoManual,
  onCriarPerfilPedagogico,
  onVisualizarAtividadeA4,
  onGerarRelatorioPdi,
  onCriarPei,
}) => {
  const [abaAtiva, setAbaAtiva] = useState<'geral' | 'professores' | 'perfil' | 'atividades' | 'peis' | 'diario_apoio'>('geral');
  const [modoVincularProfessores, setModoVincularProfessores] = useState<boolean>(false);
  const [professoresSelecionados, setProfessoresSelecionados] = useState<string[]>(
    estudante.professoresAutorizadosIds || []
  );
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [peisEstudante, setPeisEstudante] = useState<PeiDocumento[]>([]);
  const [baixandoPeiId, setBaixandoPeiId] = useState<string | null>(null);
  const [isBaixandoConsolidado, setIsBaixandoConsolidado] = useState<boolean>(false);

  useEffect(() => {
    let cancel = false;
    obterPeisDoEstudante(estudante.id).then((list) => {
      if (!cancel) setPeisEstudante(list);
    });
    const handleUpdate = () => {
      obterPeisDoEstudante(estudante.id).then((list) => {
        if (!cancel) setPeisEstudante(list);
      });
    };
    window.addEventListener('adaptaedu:pei_atualizado', handleUpdate);
    window.addEventListener('adaptaedu:pei_excluido', handleUpdate);
    return () => {
      cancel = true;
      window.removeEventListener('adaptaedu:pei_atualizado', handleUpdate);
      window.removeEventListener('adaptaedu:pei_excluido', handleUpdate);
    };
  }, [estudante.id]);

  // Perfil pedagógico deste estudante (se houver)
  const perfil = perfisPedagogicos.find(p => p.estudanteId === estudante.id);

  // Atividades geradas especificamente para este estudante
  const atividadesDoEstudante = atividades.filter(a => a.estudanteId === estudante.id);

  // Registros de diário de bordo do apoio deste estudante
  const registrosEstudante = registrosApoio.filter(r => r.studentId === estudante.id || r.nomeEstudante === estudante.nome);

  // Professores vinculados atualmente
  const professoresVinculados = professoresDisponiveis.filter(p => 
    (estudante.professoresAutorizadosIds || []).includes(p.id)
  );

  // Salvar alteração de vínculos
  const handleSalvarVinculos = () => {
    const res = vincularProfessoresAoEstudante({
      estudanteId: estudante.id,
      professoresIds: professoresSelecionados,
      currentUserRoles,
      allStudents,
    });

    if (res.success && res.data) {
      onUpdateEstudante(res.data);
      setModoVincularProfessores(false);
      setMensagemSucesso('Vínculos de professores atualizados com sucesso.');
      setTimeout(() => setMensagemSucesso(null), 3000);
    }
  };

  const handleToggleProfessor = (profId: string) => {
    if (professoresSelecionados.includes(profId)) {
      setProfessoresSelecionados(prev => prev.filter(id => id !== profId));
    } else {
      setProfessoresSelecionados(prev => [...prev, profId]);
    }
  };

  const handleImprimirFicha = () => {
    window.print();
  };

  const handleBaixarConsolidado = () => {
    try {
      setIsBaixandoConsolidado(true);
      const { fileName } = baixarRelatorioConsolidadoEstudantePdf(
        estudante,
        atividades,
        registrosApoio,
        peisEstudante,
        perfil,
        escolaConfig,
        'Coordenação de Educação Especial'
      );
      setMensagemSucesso(`Relatório Pedagógico Consolidado (${fileName}) compilado e baixado com sucesso!`);
      setTimeout(() => setMensagemSucesso(null), 4000);
    } catch (err) {
      console.error('Erro ao gerar relatório consolidado:', err);
      alert('Não foi possível gerar o relatório consolidado.');
    } finally {
      setIsBaixandoConsolidado(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await compressImageFile(file, { maxWidth: 600, maxHeight: 600, quality: 0.75 });
      const atualizado = { ...estudante, fotoUrl: base64 };
      onUpdateEstudante(atualizado);

      if (isGoogleDriveConnected()) {
        const serie = estudante.anoSerie || estudante.turma;
        const cleanName = estudante.nome.replace(/[^a-zA-Z0-9]/g, '_');
        const driveRes = await uploadImageToDrive({
          dataUrl: base64,
          fileName: `Foto_Aluno_${estudante.matricula || 'MAT'}_${cleanName}.jpg`,
          serie,
          studentName: estudante.nome,
          tipo: 'foto_estudante',
        });

        if (driveRes.success) {
          setMensagemSucesso(`Fotografia atualizada e salva na pasta "${driveRes.folderName}" no Google Drive.`);
        } else {
          setMensagemSucesso('Fotografia do estudante atualizada com sucesso.');
        }
      } else {
        setMensagemSucesso('Fotografia do estudante atualizada com sucesso.');
      }
      setTimeout(() => setMensagemSucesso(null), 3500);
    } catch {
      alert('Não foi possível processar a fotografia selecionada.');
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden text-slate-800">
        
        {/* Cabeçalho Oficial da Ficha Individual com Uso do Nome no Cabeçalho */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-emerald-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative group w-14 h-14 shrink-0">
              {estudante.fotoUrl ? (
                <img 
                  src={estudante.fotoUrl} 
                  alt={estudante.nome} 
                  className="w-14 h-14 rounded-2xl object-cover ring-2 ring-emerald-600 shadow-xs" 
                />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-emerald-700 text-white flex items-center justify-center font-black text-xl shadow-xs">
                  {estudante.nome.charAt(0)}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/50 text-white rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                title="Trocar fotografia do estudante"
              >
                <Camera className="h-4 w-4" />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileFotoChange} 
                accept="image/*" 
                className="hidden" 
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                  Ficha Individual do Estudante
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  estudante.situacao === 'ativo' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                }`}>
                  {estudante.situacao.toUpperCase()}
                </span>
              </div>
              
              {/* USO DO NOME NO CABEÇALHO */}
              <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-tight mt-1">
                {estudante.nome}
              </h2>
              <p className="text-xs text-slate-500">
                Matrícula: <strong className="font-mono text-slate-700">{estudante.matricula}</strong> • Turma: <strong>{estudante.turma} ({estudante.anoSerie})</strong> • Turno: <strong>{estudante.turno}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {onCriarPei && (
              <button
                onClick={() => onCriarPei(estudante.id)}
                className="px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer shadow-xs"
                title="Criar Plano Educacional Individualizado (PEI / SIAP - SEDUC-GO)"
              >
                <GraduationCap className="h-4 w-4 text-emerald-200" />
                <span>Criar PEI (SEDUC-GO)</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleBaixarConsolidado}
              disabled={isBaixandoConsolidado}
              className="px-3.5 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer shadow-xs disabled:opacity-60"
              title="Gerar Relatório PDF: Compila todo o histórico de acompanhamento, registros do diário de bordo e planos de ensino adaptados (PEI) em documento formatado segundo as normas da SEDUC-GO"
            >
              {isBaixandoConsolidado ? (
                <Loader2 className="h-4 w-4 animate-spin text-sky-200" />
              ) : (
                <FileDown className="h-4 w-4 text-sky-200" />
              )}
              <span>Gerar Relatório PDF</span>
            </button>
            {onGerarRelatorioPdi && (
              <button
                onClick={() => onGerarRelatorioPdi(estudante.id)}
                className="px-3 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer shadow-xs"
                title="Gerar Relatório de Desempenho do PDI com exportação em PDF"
              >
                <Award className="h-4 w-4" />
                <span>Relatório PDI</span>
              </button>
            )}
            <button
              onClick={handleImprimirFicha}
              className="p-2 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
              title="Imprimir ficha oficial"
            >
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">Imprimir Ficha</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Mensagem de sucesso */}
        {mensagemSucesso && (
          <div className="mx-5 mt-3 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold rounded-xl flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-700" />
            <span>{mensagemSucesso}</span>
          </div>
        )}

        {/* Abas de Navegação da Ficha */}
        <div className="px-5 border-b border-slate-200 bg-white flex items-center gap-2 pt-2 overflow-x-auto">
          {[
            { id: 'geral', label: '1. Identificação Geral', icon: School },
            { id: 'professores', label: `2. Professores (${professoresVinculados.length})`, icon: GraduationCap },
            { id: 'perfil', label: '3. Perfil Pedagógico', icon: Award },
            { id: 'atividades', label: `4. Atividades (${atividadesDoEstudante.length})`, icon: FileCheck },
            { id: 'peis', label: `5. PEI SEDUC (${peisEstudante.length})`, icon: GraduationCap },
            { id: 'diario_apoio', label: `6. Diário do Apoio (${registrosEstudante.length})`, icon: HeartHandshake },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = abaAtiva === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setAbaAtiva(tab.id as any)}
                className={`pb-2.5 px-2 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'border-emerald-700 text-emerald-800'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Corpo da Ficha */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs">

          {/* ================================================================= */}
          {/* SEÇÃO 1: IDENTIFICAÇÃO GERAL */}
          {/* ================================================================= */}
          {abaAtiva === 'geral' && (
            <div className="space-y-4">
              {/* Banner de Dossiê Pedagógico Consolidado SEDUC-GO */}
              <div className="p-3.5 bg-gradient-to-r from-sky-50 via-teal-50 to-emerald-50 rounded-xl border border-sky-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-sky-600 text-white shrink-0 mt-0.5">
                    <FileDown className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-sky-950 flex items-center gap-1.5">
                      <span>Dossiê Pedagógico Consolidado (Diretrizes SEDUC-GO)</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-200/70 text-sky-900">
                        PDF Completo
                      </span>
                    </h4>
                    <p className="text-[11px] text-sky-900 mt-0.5 leading-relaxed">
                      Compila em documento oficial único todo o histórico de acompanhamento, registros do diário de bordo (PAE) e planos PEI vigentes com assinaturas formais.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleBaixarConsolidado}
                  disabled={isBaixandoConsolidado}
                  className="px-3.5 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-60 shrink-0"
                  title="Gerar e baixar relatório pedagógico consolidado em PDF"
                >
                  {isBaixandoConsolidado ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-200" />
                  ) : (
                    <FileDown className="h-3.5 w-3.5 text-sky-200" />
                  )}
                  <span>Gerar Relatório PDF</span>
                </button>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Nome Completo Oficial</span>
                  <span className="font-bold text-slate-900 text-sm">{estudante.nome}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Matrícula / Código Escolar</span>
                  <span className="font-mono text-slate-900 font-bold">{estudante.matricula}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Turma & Ano/Série</span>
                  <span className="font-bold text-slate-900">{estudante.turma} • {estudante.anoSerie}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Turno de Estudo</span>
                  <span className="font-bold text-slate-900">{estudante.turno}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Data de Nascimento</span>
                  <span className="font-bold text-slate-900">{estudante.dataNascimento || 'Não informada'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Situação Cadastral</span>
                  <span className="font-bold text-emerald-800 capitalize">{estudante.situacao}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Profissional de Apoio (PAE)</span>
                  <span className="font-bold text-emerald-900 block">{estudante.paeResponsavelNome || 'Pendente de designação'}</span>
                  {estudante.paeResponsavelEmail && (
                    <span className="text-[10px] text-slate-500 font-mono block">{estudante.paeResponsavelEmail}</span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Responsáveis Legais</span>
                  <span className="font-medium text-slate-800 block">{estudante.responsaveis || 'Não informado'}</span>
                  {estudante.telefones && (
                    <span className="text-[10px] text-slate-600 block mt-0.5">{estudante.telefones}</span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Origem do Cadastro</span>
                  <span className="text-slate-700">{estudante.arquivoOrigem || 'Colégio Estadual Olynto Pereira de Castro'}</span>
                </div>
              </div>

              {/* Bloco de Diagnóstico / AEE (quando disponível no documento oficial) */}
              {estudante.laudo && (
                <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                      <HeartHandshake className="h-4 w-4 text-emerald-700" />
                      <span>Diagnóstico Oficial / Atendimento Educacional Especializado (AEE)</span>
                    </span>
                    {estudante.statusLaudo && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        estudante.statusLaudo === 'aprovado' 
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' 
                          : 'bg-amber-100 text-amber-900 border border-amber-300'
                      }`}>
                        Laudo: {estudante.statusLaudo.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-800 font-medium leading-relaxed bg-white p-2.5 rounded-lg border border-emerald-100">
                    {estudante.laudo}
                  </p>
                </div>
              )}

              {/* Informações Institucionais e Diretrizes de Privacidade */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                  <School className="h-4 w-4 text-emerald-700" />
                  <span>Unidade Escolar & Diretriz de Inclusão</span>
                </h4>
                <p className="text-slate-600 leading-relaxed">
                  Estudante matriculado regularmente no <strong>{escolaConfig.nome || 'Colégio Estadual Olynto Pereira de Castro'}</strong>.
                  Todas as adaptações curriculares devem ser elaboradas com fundamentação na BNCC e estratégias pedagógicas individualizadas autorizadas pela Coordenação.
                </p>
                <div className="p-2.5 bg-slate-50 rounded-lg text-[11px] text-slate-500">
                  <strong>Privacidade Médica Assegurada:</strong> Por determinação ética e legal, dados de diagnóstico clínico ou laudos médicos não compõem a ficha pública do estudante. O acompanhamento se dá estritamente por meio de estratégias de aprendizagem e recursos pedagógicos.
                </div>
              </div>

              {/* Ações da Ficha */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  onClick={() => onAbrirEdicaoManual(estudante)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span>Editar Dados do Estudante</span>
                </button>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* SEÇÃO 2: VÍNCULO COM PROFESSORES */}
          {/* ================================================================= */}
          {abaAtiva === 'professores' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Professores Autorizados Vinculados</h4>
                  <p className="text-slate-500 text-[11px]">
                    Apenas os professores vinculados podem selecionar este estudante para gerar atividades adaptadas.
                  </p>
                </div>
                {!modoVincularProfessores && (
                  <button
                    onClick={() => {
                      setProfessoresSelecionados(estudante.professoresAutorizadosIds || []);
                      setModoVincularProfessores(true);
                    }}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Gerenciar Vínculos</span>
                  </button>
                )}
              </div>

              {modoVincularProfessores ? (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <span className="font-bold text-slate-800 block">Selecione os professores que lecionam para este estudante:</span>
                  <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                    {professoresDisponiveis.filter(p => p.roles.includes('teacher')).map(prof => {
                      const selecionado = professoresSelecionados.includes(prof.id);
                      return (
                        <label 
                          key={prof.id} 
                          className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-colors ${
                            selecionado ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selecionado}
                              onChange={() => handleToggleProfessor(prof.id)}
                              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <div>
                              <span className="font-bold text-slate-900 block">{prof.name}</span>
                              <span className="text-[11px] text-slate-500 font-mono">{prof.email}</span>
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-500">
                            {prof.allowedClasses.join(', ') || 'Todas as turmas'}
                          </span>
                        </label>
                      );
                    })}
                  </div>

                  <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setModoVincularProfessores(false)}
                      className="px-3 py-1.5 bg-slate-200 rounded-lg font-bold text-slate-700"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSalvarVinculos}
                      className="px-4 py-1.5 bg-emerald-700 text-white rounded-lg font-bold"
                    >
                      Salvar Vínculos ({professoresSelecionados.length})
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {professoresVinculados.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <GraduationCap className="h-8 w-8 text-slate-400 mx-auto" />
                      <p className="text-slate-700 font-semibold">Nenhum professor vinculado a este estudante.</p>
                      <p className="text-slate-500 text-[11px]">
                        Clique no botão acima para vincular os professores que lecionam para a turma {estudante.turma}.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {professoresVinculados.map(prof => (
                        <div key={prof.id} className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                          <div>
                            <span className="font-bold text-slate-900 block">{prof.name}</span>
                            <span className="text-slate-500 font-mono text-[11px]">{prof.email}</span>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            Autorizado
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* SEÇÃO 3: PERFIL PEDAGÓGICO */}
          {/* ================================================================= */}
          {abaAtiva === 'perfil' && (
            <div className="space-y-4">
              {perfil ? (
                <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-bold text-slate-900 text-sm">Perfil Pedagógico Aprovado</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Cadastrado em {perfil.dataCadastro}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-slate-500 font-bold block">Nível de Leitura:</span>
                      <span className="text-slate-900">{perfil.nivelLeitura || 'Padrão'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block">Extensão de Enunciados:</span>
                      <span className="text-slate-900">{perfil.extensaoEnunciados || 'Curto e direto'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block">Quantidade de Alternativas:</span>
                      <span className="text-slate-900">{perfil.quantidadeAlternativas} opções</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block">Tempo Adicional Autorizado:</span>
                      <span className="text-slate-900">{perfil.tempoAdicionalAutorizado || '50% adicional'}</span>
                    </div>
                  </div>

                  {perfil.estrategiasRecomendadas && (
                    <div className="pt-2 border-t">
                      <span className="text-slate-500 font-bold block mb-1">Estratégias Pedagógicas Recomendadas:</span>
                      <p className="p-2.5 bg-slate-50 rounded-lg text-slate-700 leading-relaxed">
                        {perfil.estrategiasRecomendadas}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <Award className="h-8 w-8 text-slate-400 mx-auto" />
                  <p className="text-slate-700 font-semibold">Nenhum perfil pedagógico cadastrado para este estudante.</p>
                  <p className="text-slate-500 text-[11px] max-w-md mx-auto">
                    O perfil pedagógico define parâmetros como extensão de enunciados, apoio visual e quantidade de alternativas para a geração de atividades adaptadas.
                  </p>
                  <div>
                    <button
                      onClick={() => onCriarPerfilPedagogico(estudante.id)}
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Cadastrar Perfil Pedagógico</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* SEÇÃO 4: ATIVIDADES ADAPTADAS GERADAS */}
          {/* ================================================================= */}
          {abaAtiva === 'atividades' && (
            <div className="space-y-4">
              {atividadesDoEstudante.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <FileText className="h-8 w-8 text-slate-400 mx-auto" />
                  <p className="text-slate-700 font-semibold">Nenhuma atividade adaptada gerada para este estudante.</p>
                  <p className="text-slate-500 text-[11px]">
                    Os professores vinculados poderão criar atividades adaptadas fundamentadas nas habilidades aprovadas da BNCC.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {atividadesDoEstudante.map(ativ => (
                    <div key={ativ.id} className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900 block text-sm">{ativ.conteudo}</span>
                        <div className="text-slate-500 text-[11px] space-x-2 mt-0.5">
                          <span>{ativ.disciplina}</span>
                          <span>•</span>
                          <span>Habilidade: <strong>{ativ.habilidadeCodigo}</strong></span>
                          <span>•</span>
                          <span>Professor: {ativ.professorNome}</span>
                          <span>•</span>
                          <span>{ativ.dataCriacao}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => onVisualizarAtividadeA4(ativ)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Ver Folha A4</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* SEÇÃO 5: PLANOS EDUCACIONAIS INDIVIDUALIZADOS (PEI / SEDUC-GO)   */}
          {/* ================================================================= */}
          {abaAtiva === 'peis' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50/60 p-4 rounded-xl border border-emerald-200">
                <div>
                  <h3 className="font-bold text-sm text-emerald-950 flex items-center gap-1.5">
                    <GraduationCap className="h-4 w-4 text-emerald-800" />
                    <span>Planos Educacionais Individualizados (PEI / SIAP)</span>
                  </h3>
                  <p className="text-[11px] text-emerald-800">
                    Diretrizes pedagógicas da Educação Especial da SEDUC-GO para {estudante.nome}.
                  </p>
                </div>
                {onCriarPei && (
                  <button
                    onClick={() => onCriarPei(estudante.id)}
                    className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Novo PEI para {estudante.nome.split(' ')[0]}</span>
                  </button>
                )}
              </div>

              {peisEstudante.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <GraduationCap className="h-10 w-10 text-slate-400 mx-auto" />
                  <p className="text-slate-700 font-semibold text-sm">Nenhum PEI cadastrado para este estudante.</p>
                  <p className="text-slate-500 text-xs max-w-md mx-auto">
                    O módulo "Criar PEI (SEDUC-GO)" permite gerar automaticamente com IA e preencher todas as etapas 1 e 2 do SIAP com diagramação A4 oficial.
                  </p>
                  {onCriarPei && (
                    <button
                      onClick={() => onCriarPei(estudante.id)}
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-extrabold text-xs inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Criar Primeiro PEI do Estudante</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {peisEstudante.map((pei) => (
                    <div
                      key={pei.id}
                      className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-emerald-300 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-slate-900 text-sm">
                            {pei.subject} • {pei.period}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                            PEI SEDUC-GO
                          </span>
                          {pei.origemIa && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                              IA Gem
                            </span>
                          )}
                        </div>
                        <div className="text-slate-500 text-[11px] space-x-2">
                          <span>Prof. Regente: <strong>{pei.regentTeacher}</strong></span>
                          <span>•</span>
                          <span>PAE: <strong>{pei.supportTeacher}</strong></span>
                          <span>•</span>
                          <span>Criado em: {new Date(pei.createdAt).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        <button
                          onClick={async () => {
                            setBaixandoPeiId(pei.id);
                            try {
                              await baixarPeiComoPdf(pei, escolaConfig);
                            } catch (e) {
                              console.error('Erro ao baixar PEI PDF:', e);
                            } finally {
                              setBaixandoPeiId(null);
                            }
                          }}
                          disabled={baixandoPeiId === pei.id}
                          className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                          title="Exportar PDF oficial diagramado em folha A4 com logotipo da escola"
                        >
                          {baixandoPeiId === pei.id ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              <span>Baixando...</span>
                            </>
                          ) : (
                            <>
                              <FileDown className="h-3.5 w-3.5" />
                              <span>Baixar PDF (A4)</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* SEÇÃO 6: REGISTROS DO DIÁRIO DE BORDO DO APOIO (PAE)            */}
          {/* ================================================================= */}
          {abaAtiva === 'diario_apoio' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-sky-50/70 p-4 rounded-xl border border-sky-200">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-sky-700 text-white shrink-0 mt-0.5">
                    <HeartHandshake className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-sky-950 flex items-center gap-1.5">
                      <span>Diário de Bordo do Apoio Escolar (PAE / Cuidador)</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-200/80 text-sky-900">
                        {registrosEstudante.length} registro(s)
                      </span>
                    </h3>
                    <p className="text-[11px] text-sky-900 mt-0.5">
                      Acompanhamento diário de rotina, mediação pedagógica e conduta de {estudante.nome}.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleBaixarConsolidado}
                  disabled={isBaixandoConsolidado}
                  className="px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-60 shrink-0"
                  title="Gerar e Baixar Relatório PDF consolidando todo o histórico do estudante (SEDUC-GO)"
                >
                  {isBaixandoConsolidado ? (
                    <Loader2 className="h-4 w-4 animate-spin text-sky-200" />
                  ) : (
                    <FileDown className="h-4 w-4 text-sky-200" />
                  )}
                  <span>Gerar Relatório PDF</span>
                </button>
              </div>

              {/* Quadro de Indicadores Rápidos do Apoio */}
              {registrosEstudante.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Total de Atendimentos</span>
                    <span className="text-lg font-black text-slate-900 font-mono">{registrosEstudante.length}</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Taxa de Presença</span>
                    <span className="text-lg font-black text-sky-700 font-mono">
                      {Math.round((registrosEstudante.filter(r => r.presente).length / registrosEstudante.length) * 100)}%
                    </span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Execução de Atividades</span>
                    <span className="text-lg font-black text-emerald-700 font-mono">
                      {registrosEstudante.filter(r => r.conseguiuRealizarAtividade === 'Sim').length} autônomas
                    </span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Estabilidade Emocional</span>
                    <span className="text-lg font-black text-purple-700 font-mono">
                      {Math.round((registrosEstudante.filter(r => r.demonstrouIrritabilidadeOuSinais === 'Não').length / Math.max(registrosEstudante.length, 1)) * 100)}%
                    </span>
                  </div>
                </div>
              )}

              {registrosEstudante.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <HeartHandshake className="h-8 w-8 text-slate-400 mx-auto" />
                  <p className="text-slate-700 font-semibold">Nenhum diário de bordo lançado para este estudante até o momento.</p>
                  <p className="text-slate-500 text-[11px] max-w-md mx-auto">
                    Os registros lançados pelo Profissional de Apoio Escolar (PAE) na aba de Apoio serão automaticamente integrados aqui e compilados no Relatório Pedagógico Consolidado em PDF.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {registrosEstudante.map((reg) => (
                    <div key={reg.id} className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2 hover:border-sky-300 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-slate-900 text-xs">
                            {reg.data ? new Date(reg.data).toLocaleDateString('pt-BR') : 'Data não informada'}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            reg.presente ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {reg.presente ? 'Presente' : 'Ausente'}
                          </span>
                          {reg.conseguiuRealizarAtividade && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                              Atividade: {reg.conseguiuRealizarAtividade}
                            </span>
                          )}
                          {reg.nivelAutonomia && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                              Autonomia: {reg.nivelAutonomia}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500">
                          PAE: <strong className="text-slate-800">{reg.profissionalResponsavelNome || 'Profissional de Apoio'}</strong>
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-700">
                        {reg.observacaoAtividade && (
                          <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                            <strong className="block text-[10px] text-slate-500 uppercase">Observações da Atividade:</strong>
                            <p className="mt-0.5">{reg.observacaoAtividade}</p>
                          </div>
                        )}
                        {reg.observacaoComportamental && (
                          <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                            <strong className="block text-[10px] text-slate-500 uppercase">Comportamento & Humor:</strong>
                            <p className="mt-0.5">{reg.observacaoComportamental}</p>
                          </div>
                        )}
                      </div>

                      {reg.avancosObservados && (
                        <div className="p-2 bg-emerald-50/60 rounded-lg border border-emerald-100 text-[11px] text-emerald-900">
                          <strong className="block text-[10px] text-emerald-800 uppercase">Avanços & Conquistas:</strong>
                          <p className="mt-0.5">{reg.avancosObservados}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Rodapé do Modal */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            {escolaConfig.nome || 'Colégio Estadual Olynto Pereira de Castro'} • SEDUC Goiás
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl cursor-pointer"
          >
            Fechar Ficha
          </button>
        </div>

      </div>
    </div>
  );
};
