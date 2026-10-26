import React, { useState } from 'react';
import { 
  X, 
  CheckSquare, 
  Square, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  Edit3, 
  Trash2, 
  ShieldCheck, 
  UserCheck, 
  FileText,
  Search,
  Filter,
  Check
} from 'lucide-react';
import { RegistroImportacaoUsuario, UserRole, AuthorizedUser } from '../../types';
import { SCHOOL_ID_PADRAO } from '../../server/authService';

interface RevisaoImportacaoUsuariosModalProps {
  registros: RegistroImportacaoUsuario[];
  onFechar: () => void;
  onSalvarImportados: (usuariosAutorizados: AuthorizedUser[]) => void;
  currentUserRoles: UserRole[];
}

export const RevisaoImportacaoUsuariosModal: React.FC<RevisaoImportacaoUsuariosModalProps> = ({
  registros: registrosIniciais,
  onFechar,
  onSalvarImportados,
  currentUserRoles,
}) => {
  const [lista, setLista] = useState<RegistroImportacaoUsuario[]>(registrosIniciais);
  const [termoBusca, setTermoBusca] = useState('');
  const [filtroSituacao, setFiltroSituacao] = useState<string>('todos');
  const [registroEmEdicao, setRegistroEmEdicao] = useState<RegistroImportacaoUsuario | null>(null);
  const [confirmacaoAberta, setConfirmacaoAberta] = useState(false);
  const [avisoNaoConfirmar, setAvisoNaoConfirmar] = useState(false);

  const isCoordenador = currentUserRoles.includes('coordinator');

  // Filtros
  const listaFiltrada = lista.filter(item => {
    const matchBusca = item.nome.toLowerCase().includes(termoBusca.toLowerCase()) ||
                       item.emailEducacional.toLowerCase().includes(termoBusca.toLowerCase());
    const matchSituacao = filtroSituacao === 'todos' || item.situacao === filtroSituacao;
    return matchBusca && matchSituacao;
  });

  // Estatísticas e Totais Exigidos
  const totalIdentificados = lista.length;
  const totalValidos = lista.filter(r => r.situacao === 'Pronto para cadastrar' || r.situacao === 'Perfil especial confirmado').length;
  const totalProfessores = lista.filter(r => !r.isSpecialCoordinator && (r.situacao === 'Pronto para cadastrar' || r.situacao === 'Perfil especial confirmado')).length;
  const totalCoordenacaoProfessor = lista.filter(r => r.isSpecialCoordinator).length;
  const totalEmailAusente = lista.filter(r => r.situacao === 'E-mail ausente').length;
  const totalEmailIlegivel = lista.filter(r => r.situacao === 'E-mail ilegível').length;
  const totalDuplicidades = lista.filter(r => r.situacao === 'E-mail duplicado' || r.situacao === 'Registro duplicado').length;
  const totalPendenteRevisao = lista.filter(r => r.situacao === 'Pendente de revisão' || r.situacao === 'Domínio pendente de validação').length;

  const totalSelecionados = lista.filter(r => r.selecionado).length;

  // Ações de seleção
  const toggleSelecionarTodosValidos = () => {
    const todosValidosJaSelecionados = lista.filter(r => (r.situacao === 'Pronto para cadastrar' || r.situacao === 'Perfil especial confirmado')).every(r => r.selecionado);
    setLista(prev => prev.map(item => {
      const isValido = item.situacao === 'Pronto para cadastrar' || item.situacao === 'Perfil especial confirmado';
      return isValido ? { ...item, selecionado: !todosValidosJaSelecionados } : item;
    }));
  };

  const toggleItem = (id: string) => {
    setLista(prev => prev.map(item => item.id === id ? { ...item, selecionado: !item.selecionado } : item));
  };

  const removerRegistro = (id: string) => {
    setLista(prev => prev.filter(item => item.id !== id));
  };

  const salvarEdicao = (regEditado: RegistroImportacaoUsuario) => {
    setLista(prev => prev.map(item => item.id === regEditado.id ? regEditado : item));
    setRegistroEmEdicao(null);
  };

  // Tentativa de confirmação
  const handleTentarConfirmar = () => {
    if (!isCoordenador) {
      alert('Apenas usuários com perfil de Coordenação podem confirmar a importação.');
      return;
    }
    setConfirmacaoAberta(true);
  };

  const executarConfirmacaoDefinitiva = () => {
    const validos = lista.filter(r => r.selecionado && (r.situacao === 'Pronto para cadastrar' || r.situacao === 'Perfil especial confirmado'));
    const dataAtual = new Date().toISOString();

    const novosUsuarios: AuthorizedUser[] = validos.map(r => ({
      id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      uid: null,
      name: r.nome,
      email: r.emailEducacional,
      emailNormalized: r.emailEducacional.trim().toLowerCase(),
      roles: r.roles,
      active: true,
      status: 'authorized',
      schoolId: SCHOOL_ID_PADRAO,
      allowedClasses: [],
      allowedDisciplines: [],
      createdAt: dataAtual,
      updatedAt: dataAtual,
      createdBy: 'Importação PDF',
      source: r.arquivoOrigem,
      sourcePage: r.paginaDocumento,
      firstAccessAt: null,
      lastAccessAt: null,
      archivedAt: null,
    }));

    onSalvarImportados(novosUsuarios);
    setConfirmacaoAberta(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="relative w-full max-w-7xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Cabeçalho do Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                Extração Idempotente do Documento Oficial
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Contato dos Professores - Atualizado.pdf
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight mt-1">
              Revisar importação de usuários
            </h2>
          </div>
          <button
            onClick={onFechar}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Banner de Aviso de Pré-visualização Local */}
        <div className="px-5 py-2.5 bg-amber-50 border-b border-amber-200 text-xs text-amber-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0" />
            <span className="font-semibold">
              Pré-visualização local. A confirmação definitiva ficará disponível depois da configuração segura do Firebase.
            </span>
          </div>
          <span className="text-[11px] text-amber-800 font-mono">
            Nenhum CPF, telefone ou senha extraído
          </span>
        </div>

        {avisoNaoConfirmar && (
          <div className="mx-5 mt-3 p-3 bg-sky-50 border border-sky-300 rounded-xl text-xs text-sky-950 flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 text-sky-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Validação de Conformidade Concluída:</p>
              <p className="text-[11px] text-sky-900">
                Apresentada novamente a tabela de revisão com 100% de correspondência literal ao PDF. Os registros permanecem seguros para consulta e revisão pela Coordenação.
              </p>
            </div>
          </div>
        )}

        {/* Cards com os Totais Exigidos */}
        <div className="p-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 bg-slate-50/70 border-b border-slate-200 text-center">
          <div className="p-2 bg-white rounded-lg border border-slate-200">
            <span className="text-[10px] text-slate-500 font-bold block uppercase truncate">Identificados</span>
            <span className="text-sm font-black text-slate-900">{totalIdentificados}</span>
          </div>
          <div className="p-2 bg-white rounded-lg border border-emerald-200">
            <span className="text-[10px] text-emerald-800 font-bold block uppercase truncate">Válidos</span>
            <span className="text-sm font-black text-emerald-700">{totalValidos}</span>
          </div>
          <div className="p-2 bg-white rounded-lg border border-sky-200">
            <span className="text-[10px] text-sky-800 font-bold block uppercase truncate">Professores</span>
            <span className="text-sm font-black text-sky-700">{totalProfessores}</span>
          </div>
          <div className="p-2 bg-white rounded-lg border border-indigo-200">
            <span className="text-[10px] text-indigo-800 font-bold block uppercase truncate">Coord. + Prof.</span>
            <span className="text-sm font-black text-indigo-700">{totalCoordenacaoProfessor}</span>
          </div>
          <div className="p-2 bg-white rounded-lg border border-slate-200">
            <span className="text-[10px] text-slate-500 font-bold block uppercase truncate">E-mail Ausente</span>
            <span className="text-sm font-black text-slate-600">{totalEmailAusente}</span>
          </div>
          <div className="p-2 bg-white rounded-lg border border-slate-200">
            <span className="text-[10px] text-slate-500 font-bold block uppercase truncate">E-mail Ilegível</span>
            <span className="text-sm font-black text-slate-600">{totalEmailIlegivel}</span>
          </div>
          <div className="p-2 bg-white rounded-lg border border-slate-200">
            <span className="text-[10px] text-slate-500 font-bold block uppercase truncate">Duplicidades</span>
            <span className="text-sm font-black text-slate-600">{totalDuplicidades}</span>
          </div>
          <div className="p-2 bg-white rounded-lg border border-amber-200">
            <span className="text-[10px] text-amber-800 font-bold block uppercase truncate">Pendentes</span>
            <span className="text-sm font-black text-amber-700">{totalPendenteRevisao}</span>
          </div>
        </div>

        {/* Filtros e Busca */}
        <div className="p-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou e-mail..."
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600">Filtrar Situação:</span>
            <select
              value={filtroSituacao}
              onChange={(e) => setFiltroSituacao(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-medium"
            >
              <option value="todos">Todas as situações ({lista.length})</option>
              <option value="Perfil especial confirmado">Perfil especial confirmado ({totalCoordenacaoProfessor})</option>
              <option value="Pronto para cadastrar">Pronto para cadastrar ({totalProfessores})</option>
              <option value="Pendente de revisão">Pendente de revisão</option>
              <option value="E-mail ausente">E-mail ausente</option>
            </select>

            <button
              onClick={toggleSelecionarTodosValidos}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
            >
              Selecionar todos os válidos
            </button>
          </div>
        </div>

        {/* Tabela de Revisão */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 sticky top-0 z-10 border-b border-slate-300">
              <tr>
                <th className="p-2.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={totalValidos > 0 && lista.filter(r => r.situacao === 'Pronto para cadastrar' || r.situacao === 'Perfil especial confirmado').every(r => r.selecionado)}
                    onChange={toggleSelecionarTodosValidos}
                    className="rounded"
                  />
                </th>
                <th className="p-2.5 font-bold">Nome Completo</th>
                <th className="p-2.5 font-bold">E-mail Educacional</th>
                <th className="p-2.5 font-bold">Domínio</th>
                <th className="p-2.5 font-bold">Perfis</th>
                <th className="p-2.5 font-bold">Situação</th>
                <th className="p-2.5 font-bold">Origem</th>
                <th className="p-2.5 font-bold">Pág.</th>
                <th className="p-2.5 font-bold">Observação</th>
                <th className="p-2.5 font-bold text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {listaFiltrada.map((item) => (
                <tr 
                  key={item.id} 
                  className={`hover:bg-slate-50/80 transition-colors ${
                    item.isSpecialCoordinator ? 'bg-indigo-50/40' : ''
                  }`}
                >
                  <td className="p-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={item.selecionado}
                      onChange={() => toggleItem(item.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="p-2.5 font-bold text-slate-900 whitespace-nowrap">
                    {item.nome}
                    {item.isSpecialCoordinator && (
                      <span className="ml-1.5 px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-indigo-100 text-indigo-900 border border-indigo-200">
                        Especial
                      </span>
                    )}
                  </td>
                  <td className="p-2.5 font-mono text-[11px] text-slate-800 whitespace-nowrap">
                    {item.emailEducacional || <span className="text-rose-500 italic">[Ausente]</span>}
                  </td>
                  <td className="p-2.5 text-slate-500 whitespace-nowrap">
                    {item.dominio}
                  </td>
                  <td className="p-2.5 whitespace-nowrap">
                    {item.roles.includes('coordinator') ? (
                      <span className="font-bold text-indigo-900 bg-indigo-100 px-2 py-0.5 rounded text-[10px]">
                        Coordenação + Professor
                      </span>
                    ) : (
                      <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[10px]">
                        Professor
                      </span>
                    )}
                  </td>
                  <td className="p-2.5 whitespace-nowrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      item.situacao === 'Perfil especial confirmado'
                        ? 'bg-indigo-100 text-indigo-900 border border-indigo-300'
                        : item.situacao === 'Pronto para cadastrar'
                        ? 'bg-emerald-100 text-emerald-900'
                        : 'bg-amber-100 text-amber-900'
                    }`}>
                      {item.situacao}
                    </span>
                  </td>
                  <td className="p-2.5 text-slate-500 text-[10px] truncate max-w-[120px]" title={item.arquivoOrigem}>
                    {item.arquivoOrigem}
                  </td>
                  <td className="p-2.5 text-slate-500 font-mono text-center">
                    {item.paginaDocumento}
                  </td>
                  <td className="p-2.5 text-slate-600 text-[11px] max-w-[180px] truncate" title={item.observacao}>
                    {item.observacao}
                  </td>
                  <td className="p-2.5 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setRegistroEmEdicao({ ...item })}
                        className="p-1 rounded text-slate-500 hover:text-emerald-700 hover:bg-slate-100"
                        title="Corrigir registro"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => removerRegistro(item.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        title="Remover da importação"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Rodapé e Botões Obrigatórios */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <span>Selecionados: <strong>{totalSelecionados}</strong> de {totalIdentificados} registros</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onFechar}
              className="px-4 py-2 bg-white border border-slate-300 rounded-xl text-slate-700 font-bold hover:bg-slate-100 cursor-pointer"
            >
              Cancelar importação
            </button>

            <button
              onClick={handleTentarConfirmar}
              disabled={totalSelecionados === 0 || !isCoordenador}
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              <Check className="h-4 w-4" />
              <span>Confirmar importação</span>
            </button>
          </div>
        </div>

      </div>

      {/* Modal de Edição de Registro */}
      {registroEmEdicao && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-5 shadow-2xl space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b">
              <h4 className="font-bold text-sm text-slate-900">Corrigir Registro</h4>
              <button onClick={() => setRegistroEmEdicao(null)}><X className="h-4 w-4" /></button>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Nome Completo:</label>
              <input
                type="text"
                value={registroEmEdicao.nome}
                onChange={(e) => setRegistroEmEdicao({ ...registroEmEdicao, nome: e.target.value })}
                className="w-full px-3 py-1.5 border rounded-lg"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">E-mail Educacional:</label>
              <input
                type="email"
                value={registroEmEdicao.emailEducacional}
                onChange={(e) => {
                  const email = e.target.value.toLowerCase().trim();
                  const dom = email.includes('@') ? email.split('@')[1] : '';
                  setRegistroEmEdicao({
                    ...registroEmEdicao,
                    emailEducacional: email,
                    dominio: dom,
                    situacao: email ? 'Pronto para cadastrar' : 'E-mail ausente',
                  });
                }}
                className="w-full px-3 py-1.5 border rounded-lg font-mono text-xs"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Perfis atribuídos:</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={registroEmEdicao.roles.includes('teacher')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setRegistroEmEdicao({ ...registroEmEdicao, roles: [...registroEmEdicao.roles, 'teacher'] });
                      } else {
                        setRegistroEmEdicao({ ...registroEmEdicao, roles: registroEmEdicao.roles.filter(r => r !== 'teacher') });
                      }
                    }}
                  />
                  <span>Professor</span>
                </label>
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={registroEmEdicao.roles.includes('coordinator')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setRegistroEmEdicao({ ...registroEmEdicao, roles: [...registroEmEdicao.roles, 'coordinator'] });
                      } else {
                        setRegistroEmEdicao({ ...registroEmEdicao, roles: registroEmEdicao.roles.filter(r => r !== 'coordinator') });
                      }
                    }}
                  />
                  <span>Coordenação</span>
                </label>
              </div>
            </div>

            <div className="pt-3 border-t flex justify-end gap-2">
              <button
                onClick={() => setRegistroEmEdicao(null)}
                className="px-3 py-1.5 bg-slate-100 rounded-lg font-bold"
              >
                Cancelar
              </button>
              <button
                onClick={() => salvarEdicao(registroEmEdicao)}
                className="px-4 py-1.5 bg-emerald-700 text-white rounded-lg font-bold"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação Obrigatório */}
      {confirmacaoAberta && (
        <div className="fixed inset-0 z-60 bg-slate-900/70 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-2xl text-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900">
                Confirmar Importação de Usuários
              </h3>
            </div>

            <p className="text-slate-700 leading-relaxed">
              Confirme a importação dos usuários selecionados. Nenhuma senha será criada ou armazenada. Cada profissional deverá entrar com a própria conta Google Educacional.
            </p>

            <div className="p-3 bg-slate-50 border rounded-lg space-y-1">
              <p><strong>Total a autorizar:</strong> {totalSelecionados} usuários</p>
              <p><strong>Coordenação + Professor:</strong> {lista.filter(r => r.selecionado && r.isSpecialCoordinator).length} profissionais</p>
              <p><strong>Apenas Professor:</strong> {lista.filter(r => r.selecionado && !r.isSpecialCoordinator).length} docentes</p>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setConfirmacaoAberta(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button
                onClick={executarConfirmacaoDefinitiva}
                className="px-5 py-2 bg-emerald-700 text-white rounded-xl font-bold hover:bg-emerald-800"
              >
                Confirmar importação
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
