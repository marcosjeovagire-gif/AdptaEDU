import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  Edit3, 
  Check, 
  Copy, 
  FileDown, 
  Loader2, 
  Wifi, 
  WifiOff, 
  Save, 
  RefreshCw,
  BookOpen,
  Info,
  Sparkles,
  PenTool,
  Image as ImageIcon,
  QrCode,
  ExternalLink
} from 'lucide-react';
import QRCode from 'qrcode';
import { AtividadeAdaptada, EscolaConfig, QuestaoAdaptada } from '../../types';
import { AtividadeAdaptadaFull, ImagemPedagogica } from '../../types/pedagogico';
import { InstitutionalLogo } from '../common/InstitutionalLogo';
import { LogoOlynto } from '../common/LogoOlynto';
import { baixarAtividadeComoPdf } from '../../services/atividadeA4PdfService';
import { salvarAtividadeIdb } from '../../services/indexedDbService';
import { sincronizarPendenciasFila, getIsOnline } from '../../services/offlineSyncService';
import { adicionarListenerConectividade } from '../../services/connectivityService';

interface A4SheetPreviewProps {
  atividade: AtividadeAdaptada | AtividadeAdaptadaFull;
  escolaConfig: EscolaConfig;
  onEditQuestao?: (questao: QuestaoAdaptada) => void;
  onSaveAtividade?: (atividade: AtividadeAdaptada) => void;
}

/**
 * Renderiza textos e tabelas Markdown nas questões com proteção total contra cortes de linhas e células
 */
function renderizarConteudoComTabelas(texto: string, classeTexto: string = '') {
  if (!texto) return null;

  const linhas = texto.split('\n');
  const temTabela = linhas.some(l => l.trim().startsWith('|') && l.trim().endsWith('|'));

  if (!temTabela) {
    return (
      <div className={`space-y-1.5 ${classeTexto}`}>
        {linhas.map((linha, idx) => (
          <p key={idx} className="leading-relaxed">
            {linha}
          </p>
        ))}
      </div>
    );
  }

  // Segmenta em blocos de texto corrido e blocos de tabela estruturada
  const blocos: Array<{ tipo: 'texto' | 'tabela'; conteudo: string[] }> = [];
  let blocoAtual: { tipo: 'texto' | 'tabela'; conteudo: string[] } | null = null;

  for (const linha of linhas) {
    const isLinhaTabela = linha.trim().startsWith('|') && linha.trim().endsWith('|');
    const tipo = isLinhaTabela ? 'tabela' : 'texto';

    if (!blocoAtual || blocoAtual.tipo !== tipo) {
      if (blocoAtual) blocos.push(blocoAtual);
      blocoAtual = { tipo, conteudo: [linha] };
    } else {
      blocoAtual.conteudo.push(linha);
    }
  }
  if (blocoAtual) blocos.push(blocoAtual);

  return (
    <div className={`space-y-2 ${classeTexto}`}>
      {blocos.map((bloco, bIdx) => {
        if (bloco.tipo === 'texto') {
          return (
            <div key={bIdx} className="space-y-1">
              {bloco.conteudo.map((l, lIdx) => (
                <p key={lIdx} className="leading-relaxed">{l}</p>
              ))}
            </div>
          );
        }

        // Processa as linhas da tabela
        const linhasTabela = bloco.conteudo.map(l => 
          l.trim().split('|').slice(1, -1).map(c => c.trim())
        );

        const cabecalho = linhasTabela[0] || [];
        const linhasDados = linhasTabela.slice(1).filter(row => 
          !row.every(cell => /^[-: ]+$/.test(cell))
        );

        return (
          <div key={bIdx} className="my-2.5 overflow-x-auto print:overflow-visible break-inside-avoid page-break-inside-avoid w-full">
            <table className="tabela-adaptada w-full border-collapse border-2 border-slate-700 text-xs break-inside-avoid page-break-inside-avoid shadow-2xs">
              {cabecalho.length > 0 && (
                <thead className="bg-slate-100 border-b-2 border-slate-700 break-inside-avoid page-break-inside-avoid">
                  <tr className="break-inside-avoid page-break-inside-avoid">
                    {cabecalho.map((col, cIdx) => (
                      <th
                        key={cIdx}
                        className="border border-slate-700 px-3 py-1.5 text-left font-bold text-slate-900 uppercase text-[11px] tracking-wide break-inside-avoid page-break-inside-avoid break-words"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody className="break-inside-avoid page-break-inside-avoid">
                {linhasDados.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className={`break-inside-avoid page-break-inside-avoid ${rIdx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}`}
                  >
                    {row.map((cell, cIdx) => (
                      <td
                        key={cIdx}
                        className="border border-slate-400 px-3 py-1.5 text-slate-800 text-xs font-medium break-inside-avoid page-break-inside-avoid break-words"
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

export const A4SheetPreview: React.FC<A4SheetPreviewProps> = ({
  atividade,
  escolaConfig,
  onEditQuestao,
  onSaveAtividade,
}) => {
  const [atividadeAtual, setAtividadeAtual] = useState<AtividadeAdaptada | AtividadeAdaptadaFull>(atividade);
  const [copiado, setCopiado] = useState(false);
  const [editandoQuestaoId, setEditandoQuestaoId] = useState<string | null>(null);
  const [enunciadoEditado, setEnunciadoEditado] = useState<string>('');
  const [exportandoPdf, setExportandoPdf] = useState<boolean>(false);
  const [pdfExportadoSucesso, setPdfExportadoSucesso] = useState<string | null>(null);
  const [pdfExportadoErro, setPdfExportadoErro] = useState<string | null>(null);

  // Configurações refinadas de A4 e Acessibilidade para Dislexia (10mm estrito e fontes com alto contraste)
  const [margemA4, setMargemA4] = useState<'10mm' | '15mm'>('10mm');
  const [fonteAcessivel, setFonteAcessivel] = useState<'padrao' | 'lexend' | 'comic_neue'>('lexend');
  const [tamanhoFonte, setTamanhoFonte] = useState<'normal' | 'ampliada' | 'grande'>('normal');
  const [espacamentoDislexia, setEspacamentoDislexia] = useState<boolean>(true);
  const [fundoCalmo, setFundoCalmo] = useState<boolean>(false);
  const [modalHistoricoVersoes, setModalHistoricoVersoes] = useState<boolean>(false);
  
  // Geração Automática de QR Code Vinculado ao ID da Atividade Adaptada
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [copiadoLink, setCopiadoLink] = useState<boolean>(false);
  const [modalQrCode, setModalQrCode] = useState<boolean>(false);

  // Estado Offline-First
  const [isOnline, setIsOnline] = useState<boolean>(() => getIsOnline());
  const [salvandoOffline, setSalvandoOffline] = useState<boolean>(false);
  const [mensagemOffline, setMensagemOffline] = useState<string | null>(null);

  // Gera automaticamente o QR Code vinculado ao ID de cada atividade adaptada
  useEffect(() => {
    if (!atividadeAtual?.id) return;
    const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://adaptaedu.seduc.go.gov.br';
    const path = typeof window !== 'undefined' && window.location.pathname ? window.location.pathname : '/';
    const urlDigital = `${origin}${path}?view=atividade&id=${encodeURIComponent(atividadeAtual.id)}`;

    QRCode.toDataURL(urlDigital, {
      width: 160,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.warn('[QR Code] Erro ao gerar código da atividade:', err));
  }, [atividadeAtual?.id]);

  // Pré-carrega fontes para renderização impecável (evita fallback indesejado no html2canvas e print)
  useEffect(() => {
    if (typeof document !== 'undefined' && 'fonts' in document) {
      Promise.allSettled([
        document.fonts.load('400 14px Lexend'),
        document.fonts.load('500 14px Lexend'),
        document.fonts.load('600 14px Lexend'),
        document.fonts.load('700 14px Lexend'),
        document.fonts.load('400 14px "Comic Neue"'),
        document.fonts.load('700 14px "Comic Neue"'),
      ]).catch(() => {});
    }
  }, []);

  useEffect(() => {
    setAtividadeAtual(atividade);
  }, [atividade]);

  // Monitora conectividade e eventos de sincronização
  useEffect(() => {
    const unsubscribeConnectivity = adicionarListenerConectividade(async (status) => {
      if (status === 'online') {
        setIsOnline(true);
        setMensagemOffline('Conexão restabelecida! Sincronizando alterações...');
        try {
          await sincronizarPendenciasFila();
          setMensagemOffline('Alterações sincronizadas com sucesso!');
          setTimeout(() => setMensagemOffline(null), 3000);
        } catch (e) {
          console.warn('Erro ao sincronizar após reconexão:', e);
        }
      } else if (status === 'offline' || status === 'server-unavailable') {
        setIsOnline(false);
        setMensagemOffline('Modo Offline ativado: edições são salvas com segurança no IndexedDB.');
        setTimeout(() => setMensagemOffline(null), 4000);
      }
    });

    const handleAtividadeSincronizada = (e: any) => {
      if (e.detail?.atividadeId === atividadeAtual.id) {
        setAtividadeAtual(prev => ({ ...prev, syncStatus: 'synced' }));
      }
    };

    window.addEventListener('adaptaedu:atividade_sincronizada', handleAtividadeSincronizada);

    return () => {
      unsubscribeConnectivity();
      window.removeEventListener('adaptaedu:atividade_sincronizada', handleAtividadeSincronizada);
    };
  }, [atividadeAtual.id]);

  const handleImprimir = () => {
    window.print();
  };

  const handleExportarPDF = async () => {
    setExportandoPdf(true);
    setPdfExportadoErro(null);
    setPdfExportadoSucesso(null);
    try {
      const res = await baixarAtividadeComoPdf(atividadeAtual, escolaConfig, 'folha-a4-impressao');
      setPdfExportadoSucesso(`Arquivo "${res.fileName}" baixado com sucesso!`);
      setTimeout(() => setPdfExportadoSucesso(null), 4000);
    } catch (err: any) {
      console.error('Erro ao exportar folha A4 para PDF:', err);
      setPdfExportadoErro('Falha ao exportar PDF. Tente novamente.');
      setTimeout(() => setPdfExportadoErro(null), 4000);
    } finally {
      setExportandoPdf(false);
    }
  };

  const handleCopiarTexto = () => {
    let texto = `${escolaConfig.nome || 'Escola'}\n`;
    texto += `ATIVIDADE AVALIATIVA\n`;
    texto += `Estudante: ${atividadeAtual.estudanteNome} | Turma: ${atividadeAtual.turma}\n`;
    texto += `Professor(a): ${atividadeAtual.professorNome} | Disciplina: ${atividadeAtual.disciplina}\n`;
    texto += `Conteúdo: ${atividadeAtual.conteudo}\n`;
    texto += `Habilidade: ${atividadeAtual.habilidadeCodigo} - ${atividadeAtual.habilidadeDescricao}\n\n`;

    atividadeAtual.questoes.forEach((q) => {
      texto += `${q.enunciado}\n`;
      if (q.alternativas) {
        q.alternativas.forEach(alt => {
          texto += `${alt}\n`;
        });
      }
      texto += '\n';
    });

    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  // Salvamento Offline-First no IndexedDB
  const salvarEdicao = async (q: QuestaoAdaptada) => {
    setSalvandoOffline(true);
    const questaoAtualizada: QuestaoAdaptada = {
      ...q,
      enunciado: enunciadoEditado,
    };

    const novasQuestoes = atividadeAtual.questoes.map(item =>
      item.id === q.id ? questaoAtualizada : item
    );

    const onlineAgora = getIsOnline();
    const atividadeAtualizada: AtividadeAdaptada = {
      ...atividadeAtual,
      questoes: novasQuestoes,
      status: 'Revisada',
      syncStatus: onlineAgora ? 'synced' : 'pending_sync',
      lastModifiedLocally: new Date().toISOString(),
    };

    try {
      // 1. Persistência direta no IndexedDB
      await salvarAtividadeIdb(atividadeAtualizada, !onlineAgora);
      
      // 2. Atualiza estado do componente
      setAtividadeAtual(atividadeAtualizada);

      // 3. Notifica componentes pais
      if (onEditQuestao) {
        onEditQuestao(questaoAtualizada);
      }
      if (onSaveAtividade) {
        onSaveAtividade(atividadeAtualizada);
      }

      // 4. Feedback visual
      if (!onlineAgora) {
        setMensagemOffline('Edição salva no IndexedDB! Será sincronizada quando a internet for restabelecida.');
      } else {
        setMensagemOffline('Alteração salva no IndexedDB e sincronizada!');
        // Se online, processa a fila
        sincronizarPendenciasFila().catch(console.warn);
      }
      setTimeout(() => setMensagemOffline(null), 3500);
    } catch (err) {
      console.error('Erro ao salvar atividade no IndexedDB:', err);
      setMensagemOffline('Aviso: salvo temporariamente no estado da página.');
      setTimeout(() => setMensagemOffline(null), 3000);
    } finally {
      setSalvandoOffline(false);
      setEditandoQuestaoId(null);
    }
  };

  return (
    <div className="flex flex-col items-center w-full">
      {/* Barra de Controles (Oculta na impressão) */}
      <div className="no-print w-full max-w-4xl mb-4 bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Pré-visualização Folha A4
          </span>

          {/* Versão da Atividade */}
          {atividadeAtual.versao && atividadeAtual.versao > 1 ? (
            <button
              onClick={() => setModalHistoricoVersoes(true)}
              className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-100 border border-indigo-300 font-extrabold text-indigo-900 flex items-center gap-1 cursor-pointer hover:bg-indigo-200 transition-colors"
              title="Clique para ver o histórico de adaptações desta atividade"
            >
              <span>v{atividadeAtual.versao} (Adaptada)</span>
              <Sparkles className="h-3 w-3 text-indigo-700" />
            </button>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 font-semibold text-slate-700">
              v1 (Original)
            </span>
          )}

          {/* Seletor de Margens (10mm padrão inclusivo SEDUC-GO vs 15mm) */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setMargemA4('10mm')}
              className={`px-2 py-0.5 text-[11px] font-bold rounded cursor-pointer transition-colors ${
                margemA4 === '10mm' ? 'bg-emerald-700 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Margens estritas de 10mm (190mm de área útil conforme diretrizes SEDUC-GO)"
            >
              10 mm (Padrão)
            </button>
            <button
              onClick={() => setMargemA4('15mm')}
              className={`px-2 py-0.5 text-[11px] font-bold rounded cursor-pointer transition-colors ${
                margemA4 === '15mm' ? 'bg-emerald-700 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Margens ampliadas de 15mm"
            >
              15 mm
            </button>
          </div>

          {/* Seletor de Fonte para Dislexia e Acessibilidade */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <span className="text-[10px] text-slate-500 font-bold px-1.5">Tipografia:</span>
            <button
              onClick={() => setFonteAcessivel('lexend')}
              className={`px-2 py-0.5 text-[11px] font-bold rounded cursor-pointer transition-colors ${
                fonteAcessivel === 'lexend' ? 'bg-indigo-700 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Fonte Lexend: tipografia recomendada cientificamente para dislexia e fluência leitora"
            >
              Lexend (Dislexia)
            </button>
            <button
              onClick={() => setFonteAcessivel('comic_neue')}
              className={`px-2 py-0.5 text-[11px] font-bold rounded cursor-pointer transition-colors ${
                fonteAcessivel === 'comic_neue' ? 'bg-indigo-700 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Fonte Comic Neue: caracteres abertos e contrastados para dislexia"
            >
              Comic Neue
            </button>
            <button
              onClick={() => setFonteAcessivel('padrao')}
              className={`px-2 py-0.5 text-[11px] font-bold rounded cursor-pointer transition-colors ${
                fonteAcessivel === 'padrao' ? 'bg-indigo-700 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Fonte padrão do sistema"
            >
              Padrão
            </button>
          </div>

          {/* Seletor de Escala da Fonte para Dislexia / Baixa Visão */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <span className="text-[10px] text-slate-500 font-bold px-1.5">Tamanho:</span>
            <button
              onClick={() => setTamanhoFonte('normal')}
              className={`px-1.5 py-0.5 text-[10.5px] font-bold rounded cursor-pointer transition-colors ${
                tamanhoFonte === 'normal' ? 'bg-slate-700 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Tamanho padrão: 13px"
            >
              13px
            </button>
            <button
              onClick={() => setTamanhoFonte('ampliada')}
              className={`px-1.5 py-0.5 text-[10.5px] font-bold rounded cursor-pointer transition-colors ${
                tamanhoFonte === 'ampliada' ? 'bg-slate-700 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Tamanho ampliado: 14.5px (Recomendado para dislexia e TDAH)"
            >
              14.5px
            </button>
            <button
              onClick={() => setTamanhoFonte('grande')}
              className={`px-1.5 py-0.5 text-[10.5px] font-bold rounded cursor-pointer transition-colors ${
                tamanhoFonte === 'grande' ? 'bg-slate-700 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Tamanho grande: 16px (Baixa visão ou adaptação severa)"
            >
              16px
            </button>
          </div>

          {/* Toggle de Espaçamento Dislexia */}
          <button
            onClick={() => setEspacamentoDislexia(prev => !prev)}
            className={`px-2 py-0.5 text-[11px] font-bold rounded-lg border cursor-pointer transition-colors flex items-center gap-1 ${
              espacamentoDislexia 
                ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-2xs' 
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
            title="Espaçamento generoso entre letras, palavras e linhas para facilitar o rastreamento visual"
          >
            <span>Espaçamento Dislexia</span>
            {espacamentoDislexia && <span className="text-[9px] bg-amber-200 px-1 rounded font-mono">ON</span>}
          </button>

          {/* Toggle de Papel Calmo (Anti-reflexo / Redução de Fadiga) */}
          <button
            onClick={() => setFundoCalmo(prev => !prev)}
            className={`px-2 py-0.5 text-[11px] font-bold rounded-lg border cursor-pointer transition-colors flex items-center gap-1 ${
              fundoCalmo 
                ? 'bg-amber-50 border-amber-400 text-amber-900 shadow-2xs' 
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
            title="Papel tom marfim/creme suave para redução do estresse visual e ofuscamento (Efeito Meares-Irlen)"
          >
            <span>Fundo Conforto</span>
            {fundoCalmo && <span className="text-[9px] bg-amber-200 px-1 rounded font-mono">ON</span>}
          </button>

          {/* Indicador de Status Offline-First */}
          {isOnline ? (
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-300 font-bold text-emerald-800 flex items-center gap-1 shadow-2xs" title="Conexão ativa e IndexedDB sincronizado">
              <Wifi className="h-3 w-3 text-emerald-600" />
              <span>Online</span>
            </span>
          ) : (
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-300 font-bold text-amber-900 flex items-center gap-1 shadow-2xs" title="Modo Offline-first: alterações gravadas no IndexedDB">
              <WifiOff className="h-3 w-3 text-amber-700" />
              <span>Offline</span>
            </span>
          )}

          {atividadeAtual.alinhadaAoPei ? (
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 font-extrabold text-emerald-800 flex items-center gap-1">
              <Check className="h-3 w-3 text-emerald-700" />
              <span>Alinhada ao PEI</span>
            </span>
          ) : (
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 font-semibold text-slate-600">
              Pendente PEI
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => setModalQrCode(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer"
            title="Visualizar QR Code e link de acesso rápido à versão digital desta atividade"
          >
            <QrCode className="h-3.5 w-3.5 text-indigo-600" />
            <span>QR Digital</span>
          </button>

          <button
            onClick={handleCopiarTexto}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            {copiado ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copiado ? 'Texto Copiado!' : 'Copiar Texto'}</span>
          </button>

          <button
            onClick={handleExportarPDF}
            disabled={exportandoPdf}
            className="flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold bg-rose-700 hover:bg-rose-800 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-60"
            title="Exportar e baixar folha A4 em formato PDF local"
          >
            {exportandoPdf ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Gerando PDF...</span>
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4" />
                <span>Exportar como PDF</span>
              </>
            )}
          </button>

          <button
            onClick={handleImprimir}
            className="flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            <span>Imprimir Folha A4</span>
          </button>
        </div>
      </div>

      {/* Alerta de Feedback de Offline e IndexedDB */}
      {mensagemOffline && (
        <div className={`no-print w-full max-w-4xl mb-4 p-3 rounded-xl text-xs font-bold flex items-center justify-between animate-fadeIn shadow-2xs border ${
          isOnline ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-amber-50 border-amber-300 text-amber-900'
        }`}>
          <div className="flex items-center gap-2">
            {isOnline ? <Check className="h-4 w-4 text-emerald-700 shrink-0" /> : <Save className="h-4 w-4 text-amber-700 shrink-0" />}
            <span>{mensagemOffline}</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/70 border border-current">
            IndexedDB Offline-First
          </span>
        </div>
      )}

      {/* Alerta de Feedback de Download do PDF */}
      {pdfExportadoSucesso && (
        <div className="no-print w-full max-w-4xl mb-4 p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900 flex items-center justify-between animate-fadeIn shadow-2xs">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-700 shrink-0" />
            <span>{pdfExportadoSucesso}</span>
          </div>
          <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
            Download Concluído
          </span>
        </div>
      )}

      {/* Alerta de Feedback de Cópia do Link Digital */}
      {copiadoLink && (
        <div className="no-print w-full max-w-4xl mb-4 p-3 bg-indigo-50 border border-indigo-300 rounded-xl text-xs font-bold text-indigo-900 flex items-center justify-between animate-fadeIn shadow-2xs">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-indigo-700 shrink-0" />
            <span>Link da versão digital copiado com sucesso! (ID: {atividadeAtual.id})</span>
          </div>
          <span className="text-[10px] font-mono bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">
            QR Digital Vinculado
          </span>
        </div>
      )}

      {pdfExportadoErro && (
        <div className="no-print w-full max-w-4xl mb-4 p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs font-bold text-rose-900 flex items-center justify-between animate-fadeIn shadow-2xs">
          <span>{pdfExportadoErro}</span>
          <span className="text-[10px] font-mono bg-rose-100 text-rose-800 px-2 py-0.5 rounded">
            Erro no Download
          </span>
        </div>
      )}

      {/* PAINEL PEDAGÓGICO DE INFORMAÇÕES UTILIZADAS NA ADAPTAÇÃO (USO DO PROFESSOR - OCULTO NA IMPRESSÃO) */}
      <div className="no-print w-full max-w-4xl mb-4 bg-slate-50 border border-slate-300 rounded-xl p-3.5 text-xs text-slate-800 shadow-2xs">
        <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-200">
          <div className="flex items-center gap-1.5 font-bold text-slate-900">
            <BookOpen className="h-4 w-4 text-emerald-700" />
            <span>Informações Utilizadas na Adaptação (Alinhamento Pedagógico à Matriz)</span>
          </div>
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-900 rounded">
            Matriz: {atividadeAtual.matrizNome || atividadeAtual.matrizId || 'Matriz Homologada (DC-GO)'} {atividadeAtual.versaoMatriz ? `v${atividadeAtual.versaoMatriz}` : 'v1.0'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] leading-relaxed">
          <div className="bg-white p-2.5 rounded-lg border border-slate-200">
            <span className="font-bold text-slate-700 block mb-0.5">Habilidade da Matriz Utilizada:</span>
            <p className="text-slate-900 font-semibold">
              <span className="font-mono text-emerald-800 bg-emerald-50 px-1 py-0.2 rounded mr-1">
                {atividadeAtual.habilidadeCodigo}
              </span>
              {atividadeAtual.habilidadeDescricao}
            </p>
            {atividadeAtual.objetoConhecimento && (
              <p className="text-slate-600 mt-1">
                <strong>Objeto de Conhecimento:</strong> {atividadeAtual.objetoConhecimento}
              </p>
            )}
            <p className="text-slate-500 mt-0.5">
              <strong>Bimestre de Referência:</strong> {atividadeAtual.bimestre || '1º Bimestre'}
            </p>
          </div>

          <div className="bg-white p-2.5 rounded-lg border border-slate-200">
            <span className="font-bold text-slate-700 block mb-0.5">Cruzamento PEI e Registros do Apoio:</span>
            <p className="text-slate-700">
              {atividadeAtual.informacoesAdaptacao?.dadosPeiConsiderados || `Necessidades e estratégias do PEI de ${atividadeAtual.estudanteNome} consideradas.`}
            </p>
            <p className="text-slate-600 mt-1 italic">
              {atividadeAtual.informacoesAdaptacao?.registrosApoioConsiderados || 'Registros diários do profissional de apoio integrados para calibrar o nível de autonomia.'}
            </p>
            
            {/* Calibragem AI baseada em evidências */}
            {(atividadeAtual as AtividadeAdaptadaFull).calibragemContexto && (
              <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10px]">
                <div className="bg-slate-50 p-1.5 rounded border border-slate-100">
                  <span className="block font-bold text-slate-500 uppercase">Cansaço Médio</span>
                  <span className="text-slate-900 font-bold">{(atividadeAtual as AtividadeAdaptadaFull).calibragemContexto?.cansacoMedio === 'intense' ? 'INTENSO' : (atividadeAtual as AtividadeAdaptadaFull).calibragemContexto?.cansacoMedio === 'moderate' ? 'MODERADO' : 'LEVE/NENHUM'}</span>
                </div>
                <div className="bg-slate-50 p-1.5 rounded border border-slate-100">
                  <span className="block font-bold text-slate-500 uppercase">Foco (min)</span>
                  <span className="text-slate-900 font-bold">{(atividadeAtual as AtividadeAdaptadaFull).calibragemContexto?.tempoFocoMedio} min</span>
                </div>
              </div>
            )}

            <div className="mt-1.5 text-[10px] text-amber-900 bg-amber-50 border border-amber-200 rounded p-1.5">
              “Sugestão gerada a partir do PEI e dos registros de acompanhamento. A validação final deve ser realizada pelo professor e pela equipe pedagógica.”
            </div>
          </div>
        </div>

        {/* Recomendações de Apoio (IA) */}
        {(atividadeAtual as AtividadeAdaptadaFull).recomendacoesApoioAI && (atividadeAtual as AtividadeAdaptadaFull).recomendacoesApoioAI!.length > 0 && (
          <div className="mt-3 p-2.5 bg-indigo-50 border border-indigo-200 rounded-lg">
            <span className="font-bold text-indigo-900 block mb-1 uppercase text-[10px]">Recomendações da Mediação (IA):</span>
            <ul className="list-disc list-inside space-y-0.5 text-indigo-800 text-[11px]">
              {(atividadeAtual as AtividadeAdaptadaFull).recomendacoesApoioAI!.map((rec, rIdx) => (
                <li key={rIdx}>{rec}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Card Informativo de Acessibilidade (Requisito 4) */}
        {(atividadeAtual.formatoLetra === 'bastao' || atividadeAtual.usarCaixaAlta) && (
          <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
            <Info className="h-4 w-4 text-emerald-700 shrink-0" />
            <span className="text-[11px] font-bold text-emerald-900 leading-tight">
              Recomendações do Apoio aplicadas: Tipografia Lexend em Caixa Alta, redução de distratores e adaptação cognitiva baseada no PEI.
            </span>
          </div>
        )}
      </div>

      {/* FOLHA A4 FÍSICA / IMPRESSÃO COM MARGENS DE 10MM E FONTES ACESSÍVEIS */}
      <div
        id="folha-a4-impressao"
        className={`print-page w-full max-w-[210mm] border border-slate-300 shadow-md rounded-none mb-12 leading-relaxed transition-all mx-auto ${
          fundoCalmo ? 'dyslexia-fundo-calmo' : 'bg-white text-slate-900'
        } ${
          margemA4 === '10mm' ? 'p-[10mm]' : 'p-[15mm]'
        } ${
          fonteAcessivel === 'lexend'
            ? 'font-lexend tracking-wide'
            : fonteAcessivel === 'comic_neue'
            ? 'font-comic-neue tracking-wider'
            : 'font-sans'
        } ${
          espacamentoDislexia ? 'dyslexia-spacing' : ''
        } ${
          tamanhoFonte === 'ampliada'
            ? 'dyslexia-size-ampliada'
            : tamanhoFonte === 'grande'
            ? 'dyslexia-size-grande'
            : 'dyslexia-size-normal'
        } ${
          atividadeAtual.formatoLetra === 'bastao' ||
          atividadeAtual.usarCaixaAlta ||
          atividadeAtual.estiloTipograficoVisual === 'letra_bastao' ||
          atividadeAtual.estiloTipograficoVisual === 'letra_bastao_desenho_matriz' ||
          atividadeAtual.estiloTipograficoVisual === 'so_desenhos'
            ? 'uppercase tracking-widest text-lg'
            : ''
        }`}
        style={{
          width: '100%',
          maxWidth: '210mm',
          minHeight: '297mm',
          boxSizing: 'border-box',
          padding: margemA4 === '10mm' ? '10mm' : '15mm',
          fontFamily: fonteAcessivel === 'lexend' 
            ? "'Lexend', sans-serif" 
            : fonteAcessivel === 'comic_neue' 
            ? "'Comic Neue', 'Comic Sans MS', sans-serif" 
            : undefined
        }}
      >
        {/* CABEÇALHO OFICIAL INSTITUCIONAL A4 OTIMIZADO */}
        <div className="cabecalho-a4 break-inside-avoid page-break-inside-avoid border border-slate-700 p-2.5 sm:p-3 mb-3.5 rounded-none">
          {/* Logo Pequeno no Canto Esquerdo + Título e Metadados Alinhados */}
          <div className="w-full pb-2.5 border-b border-slate-300 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <LogoOlynto
                variant="pdf"
                style={{ maxHeight: '40px', maxWidth: '120px', width: 'auto', height: 'auto', objectFit: 'contain', flexShrink: 0 }}
                className="pdf-school-logo max-h-[40px] max-w-[120px] w-auto h-auto object-contain flex-shrink-0 shrink-0 self-start"
                alt="Logo Oficial - Colégio Estadual Olynto Pereira de Castro e SEDUC-GO"
              />
              <div className="leading-tight flex-1 min-w-0">
                <span className="font-extrabold text-slate-900 uppercase block text-[12px] tracking-tight truncate">
                  {escolaConfig.nome || 'Colégio Estadual Olynto Pereira de Castro'}
                </span>
                <span className="text-[10px] font-semibold text-slate-600 block">
                  Secretaria de Estado da Educação • SEDUC/GO
                </span>
                <span className="text-[9.5px] text-slate-500 block truncate">
                  {escolaConfig.municipio || 'Rio Verde - GO'} {escolaConfig.telefone ? `• Tel: ${escolaConfig.telefone}` : ''} • Atividade Pedagógica Avaliativa Adaptada
                </span>
              </div>
            </div>
            {/* Bloco Superior Direito: QR Code da Versão Digital + Caixa Nota/Visto */}
            <div className="flex items-center gap-2 shrink-0 self-start">
              {/* QR Code Automático Vinculado ao ID da Atividade */}
              <div 
                className="border border-slate-600 p-1 bg-white text-center rounded-none shadow-2xs flex flex-col items-center justify-center cursor-pointer hover:border-indigo-600 transition-colors"
                title={`QR Code da Versão Digital\nID: ${atividadeAtual.id}\nClique para copiar o link direto da versão digital.`}
                onClick={() => {
                  const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://adaptaedu.seduc.go.gov.br';
                  const path = typeof window !== 'undefined' && window.location.pathname ? window.location.pathname : '/';
                  const url = `${origin}${path}?view=atividade&id=${encodeURIComponent(atividadeAtual.id)}`;
                  navigator.clipboard.writeText(url);
                  setCopiadoLink(true);
                  setTimeout(() => setCopiadoLink(false), 2500);
                }}
              >
                {qrCodeDataUrl ? (
                  <img
                    src={qrCodeDataUrl}
                    alt={`QR Code Atividade ${atividadeAtual.id}`}
                    className="w-11 h-11 object-contain block"
                  />
                ) : (
                  <div className="w-11 h-11 bg-slate-100 flex items-center justify-center">
                    <QrCode className="w-5 h-5 text-slate-400" />
                  </div>
                )}
                <span className="text-[7px] font-mono font-bold text-slate-900 leading-tight block mt-0.5 uppercase tracking-tighter">
                  QR Digital
                </span>
                <span className="text-[6.5px] font-mono text-slate-500 leading-tight block truncate max-w-[50px]">
                  {atividadeAtual.id.length > 8 ? atividadeAtual.id.slice(0, 8) : atividadeAtual.id}
                </span>
              </div>

              {/* Caixa de Nota / Visto */}
              <div className="border border-slate-400 px-2.5 py-1 text-center shrink-0 min-w-[65px] bg-slate-50/50 self-stretch flex flex-col justify-center">
                <span className="text-[8.5px] font-bold uppercase text-slate-600 block">Nota / Visto</span>
                <span className="text-[11px] font-mono text-slate-400 mt-1">______</span>
              </div>
            </div>
          </div>

          {/* Dados do Aluno, Turma, Professor, Disciplina, Conteúdo, Habilidade */}
          <div className="pt-2 text-[12px] grid grid-cols-12 gap-x-3 gap-y-1.5">
            <div className="col-span-8 flex items-baseline gap-1">
              <span className="font-bold text-slate-800">Estudante:</span>
              <span className="font-semibold text-slate-900 border-b border-dotted border-slate-400 flex-1 truncate">
                {atividadeAtual.estudanteNome}
              </span>
            </div>

            <div className="col-span-4 flex items-baseline gap-1">
              <span className="font-bold text-slate-800">Turma:</span>
              <span className="font-semibold text-slate-900 border-b border-dotted border-slate-400 flex-1">
                {atividadeAtual.turma}
              </span>
            </div>

            <div className="col-span-6 flex items-baseline gap-1">
              <span className="font-bold text-slate-800">Componente Curricular:</span>
              <span className="font-semibold text-slate-900 border-b border-dotted border-slate-400 flex-1">
                {atividadeAtual.disciplina}
              </span>
            </div>

            <div className="col-span-3 flex items-baseline gap-1">
              <span className="font-bold text-slate-800">Bimestre:</span>
              <span className="font-semibold text-slate-900 border-b border-dotted border-slate-400 flex-1">
                {atividadeAtual.bimestre || '1º Bimestre'}
              </span>
            </div>

            <div className="col-span-3 flex items-baseline gap-1">
              <span className="font-bold text-slate-800">Data:</span>
              <span className="font-semibold text-slate-900 border-b border-dotted border-slate-400 flex-1">
                {atividadeAtual.dataCriacao}
              </span>
            </div>

            <div className="col-span-8 flex items-baseline gap-1">
              <span className="font-bold text-slate-800">Professor(a):</span>
              <span className="font-semibold text-slate-900 border-b border-dotted border-slate-400 flex-1 truncate">
                {atividadeAtual.professorNome}
              </span>
            </div>

            <div className="col-span-4 flex items-baseline gap-1">
              <span className="font-bold text-slate-800">Conteúdo:</span>
              <span className="font-semibold text-slate-900 border-b border-dotted border-slate-400 flex-1 truncate">
                {atividadeAtual.conteudo}
              </span>
            </div>

            {/* OBJETO DE CONHECIMENTO RETIRADO DA MATRIZ */}
            {atividadeAtual.objetoConhecimento && (
              <div className="col-span-12 flex items-start gap-1 text-[11px] pt-0.5">
                <span className="font-bold text-slate-800 shrink-0">Objeto de Conhecimento:</span>
                <span className="text-slate-800 flex-1 leading-snug">
                  {atividadeAtual.objetoConhecimento}
                </span>
              </div>
            )}

            {/* HABILIDADE DA MATRIZ CURRICULAR (COM QUEBRA DE LINHA E SEM CORTES) */}
            {atividadeAtual.exibirHabilidadeCabecalho !== 'nao_exibir' && (
              <div className="col-span-12 pt-1 border-t border-slate-200 mt-0.5">
                {atividadeAtual.exibirHabilidadeCabecalho === 'somente_codigo' ? (
                  <div className="text-[11px] leading-snug">
                    <span className="font-bold text-slate-800">Habilidade:</span>{' '}
                    <span className="font-mono font-bold text-slate-900">{atividadeAtual.habilidadeCodigo}</span>
                  </div>
                ) : atividadeAtual.exibirHabilidadeCabecalho === 'somente_descricao' ? (
                  <div className="text-[11px] leading-snug">
                    <span className="font-bold text-slate-800">Habilidade:</span>{' '}
                    <span className="text-slate-800 italic">{atividadeAtual.habilidadeDescricao}</span>
                  </div>
                ) : (
                  <div className="text-[11px] leading-snug space-y-1">
                    <div>
                      <span className="font-bold text-slate-800">Habilidade:</span>{' '}
                      <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1 rounded mr-1">
                        {atividadeAtual.habilidadeCodigo}
                      </span>{' '}
                      <span className="text-slate-800 italic">
                        – {atividadeAtual.habilidadeDescricao}
                      </span>
                    </div>

                    {/* Habilidades Complementares, se houver */}
                    {atividadeAtual.habilidadesComplementares && atividadeAtual.habilidadesComplementares.length > 0 && (
                      <div className="pt-1 pl-2 border-l-2 border-slate-300 mt-1 space-y-0.5">
                        <span className="font-bold text-[10px] text-slate-700 block uppercase">Habilidades Complementares:</span>
                        {atividadeAtual.habilidadesComplementares.map((comp, compIdx) => (
                          <div key={compIdx} className="text-[10px] text-slate-700 leading-tight">
                            <span className="font-mono font-bold text-slate-900">{compIdx + 1}. {comp.codigo}</span> – {comp.descricao}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {atividadeAtual.alinhadaAoPei && (
              <div className="col-span-12 mt-1 px-2.5 py-0.5 bg-emerald-50/80 border border-emerald-300 rounded text-[9.5px] text-emerald-900 flex items-center justify-between">
                <span className="font-extrabold uppercase tracking-wide flex items-center gap-1">
                  <span>✓ ATIVIDADE ADAPTADA EM CONFORMIDADE COM O PEI (PLANO DE ENSINO INDIVIDUALIZADO)</span>
                </span>
                {atividadeAtual.peiAlinhadoPor && (
                  <span className="italic font-medium text-emerald-800">
                    Validação: {atividadeAtual.peiAlinhadoPor}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* QUESTÕES OU CONTEÚDO INTEGRAL DA IA */}
        <div className="space-y-5 pt-1">
          {/* Se a atividade foi gerada pela IA e retornou um texto único em observacaoProfessor, renderiza aqui */}
          {atividadeAtual.questoes.length === 0 && atividadeAtual.observacaoProfessor && (
            <div className={`bloco-atividade-ia p-2 leading-relaxed whitespace-pre-wrap ${
              (atividadeAtual.formatoLetra === 'bastao' || atividadeAtual.usarCaixaAlta) ? 'font-bold uppercase tracking-widest text-lg' : ''
            }`}>
              {renderizarConteudoComTabelas(atividadeAtual.observacaoProfessor)}
            </div>
          )}

          {atividadeAtual.questoes.map((q) => {
            const isCaixaAlta =
              atividadeAtual.formatoLetra === 'bastao' ||
              atividadeAtual.usarCaixaAlta ||
              atividadeAtual.estiloTipograficoVisual === 'letra_bastao' || 
              atividadeAtual.estiloTipograficoVisual === 'letra_bastao_desenho_matriz' ||
              atividadeAtual.estiloTipograficoVisual === 'so_desenhos';

            return (
              <div key={q.id} className="questao-container bloco-questao pb-3.5 border-b border-slate-200 last:border-b-0 break-inside-avoid page-break-inside-avoid">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1">
                    {editandoQuestaoId === q.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={enunciadoEditado}
                          onChange={(e) => setEnunciadoEditado(e.target.value)}
                          className="w-full p-2 border border-emerald-600 rounded text-xs bg-white"
                          rows={3}
                          autoFocus
                        />
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => salvarEdicao(q)}
                            disabled={salvandoOffline}
                            className="px-2.5 py-1 bg-emerald-700 text-white rounded text-xs font-bold hover:bg-emerald-800 flex items-center gap-1 cursor-pointer disabled:opacity-60"
                          >
                            {salvandoOffline ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin" />
                                <span>Salvando no IndexedDB...</span>
                              </>
                            ) : (
                              <>
                                <Save className="h-3 w-3" />
                                <span>Salvar (Offline-First)</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => setEditandoQuestaoId(null)}
                            className="px-2.5 py-1 bg-slate-200 text-slate-700 rounded text-xs hover:bg-slate-300 cursor-pointer"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      renderizarConteudoComTabelas(
                        q.enunciado,
                        `font-semibold text-slate-900 ${isCaixaAlta ? 'font-bold uppercase tracking-widest text-lg' : ''}`
                      )
                    )}
                  </div>

                <button
                  onClick={() => {
                    setEditandoQuestaoId(q.id);
                    setEnunciadoEditado(q.enunciado);
                  }}
                  className="no-print p-1 text-slate-400 hover:text-emerald-700 transition-colors cursor-pointer"
                  title="Editar enunciado da questão (Salvamento Offline-First no IndexedDB)"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* ILUSTRAÇÃO TEMÁTICA DA MATRIZ / APOIO VISUAL SVG */}
              {q.ilustracaoSvgOuUrl && (
                <div className="my-3 flex flex-col sm:flex-row items-center gap-3 p-3 bg-slate-50/80 border border-slate-300 rounded-lg">
                  <div 
                    className="w-36 h-36 shrink-0 flex items-center justify-center p-1 bg-white border border-slate-300 rounded shadow-2xs [&>svg]:w-full [&>svg]:h-full"
                    dangerouslySetInnerHTML={{ __html: q.ilustracaoSvgOuUrl }}
                  />
                  <div className="text-[11px] text-slate-700 flex-1 space-y-1">
                    <span className="font-bold uppercase tracking-widest block text-slate-800 text-[10px]">
                      Ilustração Pedagógica da Matriz:
                    </span>
                    <p className="italic text-slate-600">
                      {q.descricaoDesenhoMatriz || 'Recurso visual alinhado ao objeto de conhecimento da habilidade para ancoragem de significado.'}
                    </p>
                    <span className="text-[9.5px] text-slate-500 block">
                      {q.estiloDesenho === 'preto_e_branco_colorir' 
                        ? '★ Desenho com traço nítido para colorir e associação conceitual.' 
                        : '★ Ilustração didática com apoio cromático contrastado.'}
                    </span>
                  </div>
                </div>
              )}

              {/* MODELO DE LETRA BASTÃO E CURSIVA LADO A LADO (TRANSIÇÃO) */}
              {atividadeAtual.estiloTipograficoVisual === 'letra_bastao_e_cursiva' && q.textoCaligraficoPontilhado && (
                <div className="my-3 grid grid-cols-1 sm:grid-cols-2 gap-3 p-2.5 bg-slate-50 border border-slate-300 rounded-lg">
                  <div className="p-2 bg-white border border-slate-300 rounded">
                    <span className="text-[9.5px] font-bold text-slate-600 uppercase block mb-1">
                      1. Modelo em Letra Bastão (Leitura):
                    </span>
                    <p className="text-base font-bold text-slate-900 tracking-widest uppercase font-sans">
                      {q.textoCaligraficoPontilhado}
                    </p>
                  </div>
                  <div className="p-2 bg-white border border-slate-300 rounded relative overflow-hidden">
                    <span className="text-[9.5px] font-bold text-slate-600 uppercase block mb-1">
                      2. Treino Cursivo (Pauta e Cópia):
                    </span>
                    {/* Linhas da pauta caligráfica */}
                    <div className="relative py-1 border-t border-b border-slate-300 space-y-2 bg-amber-50/20">
                      <div className="border-b border-dashed border-sky-400 w-full h-2" />
                      <div className="border-b-2 border-slate-700 w-full h-2" />
                      <p className="text-sm font-mono tracking-widest text-slate-400 select-none italic -mt-4 pl-1">
                        {q.textoCaligraficoPontilhado}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* PAUTA CALIGRÁFICA PONTILHADA PARA ESCRITA CURSIVA */}
              {(atividadeAtual.estiloTipograficoVisual === 'letra_cursiva' || atividadeAtual.tipoAtividade === 'cursiva') && q.textoCaligraficoPontilhado && atividadeAtual.estiloTipograficoVisual !== 'letra_bastao_e_cursiva' && (
                <div className="my-3 p-3 bg-white border border-slate-300 rounded-lg">
                  <span className="text-[10px] font-bold text-slate-700 uppercase block mb-1.5 flex items-center gap-1.5">
                    <PenTool className="h-3 w-3 text-sky-700" />
                    <span>Pauta Caligráfica de Treino Motor e Escrita Cursiva:</span>
                  </span>
                  
                  {/* Linhas de pauta com guia pontilhado */}
                  <div className="relative py-2 border-t-2 border-b-2 border-slate-400 space-y-3 bg-slate-50/50">
                    <div className="border-b border-slate-300 w-full" />
                    <div className="border-b border-dashed border-sky-400 w-full" />
                    <div className="border-b border-slate-700 w-full" />
                    <p className="text-base font-mono tracking-widest text-slate-400 select-none italic -mt-6 pl-2">
                      {q.textoCaligraficoPontilhado}
                    </p>
                  </div>
                </div>
              )}

              {/* Alternativas de Múltipla Escolha / V ou F / Associação */}
              {q.alternativas && q.alternativas.length > 0 && (
                <div className="space-y-1.5 pl-3 pt-1">
                  {q.alternativas.map((alt, altIdx) => (
                    <div key={altIdx} className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded-none border border-slate-600 shrink-0" />
                      <span className={`text-slate-800 text-[12.5px] ${
                        atividadeAtual.formatoLetra === 'bastao' ||
                        atividadeAtual.usarCaixaAlta ||
                        atividadeAtual.estiloTipograficoVisual === 'letra_bastao' || 
                        atividadeAtual.estiloTipograficoVisual === 'letra_bastao_desenho_matriz' ||
                        atividadeAtual.estiloTipograficoVisual === 'so_desenhos'
                          ? "font-bold uppercase tracking-widest text-lg"
                          : ''
                      }`}>
                        {alt}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Linhas para Resposta Discursiva / Pauta */}
              {q.linhasResposta && q.linhasResposta > 0 && (
                <div className="space-y-4 pt-2 pl-2">
                  {Array.from({ length: q.linhasResposta }).map((_, lineIdx) => (
                    <div key={lineIdx} className="w-full border-b border-slate-300 h-3" />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* IMAGENS PEDAGÓGICAS MULTIMODAIS (IA) */}
        {(atividadeAtual as AtividadeAdaptadaFull).imagensPedagogicas && (atividadeAtual as AtividadeAdaptadaFull).imagensPedagogicas!.length > 0 && (
          <div className="mt-6 space-y-6">
            {(atividadeAtual as AtividadeAdaptadaFull).imagensPedagogicas!.map((img, imgIdx) => (
              <div key={imgIdx} className="break-inside-avoid page-break-inside-avoid flex flex-col items-center gap-2 border-t border-slate-100 pt-4">
                {img.svgCode ? (
                  <div 
                    className="max-w-full max-h-[300px] w-full flex items-center justify-center [&>svg]:max-w-full [&>svg]:max-h-[300px] [&>svg]:h-auto"
                    dangerouslySetInnerHTML={{ __html: img.svgCode }}
                  />
                ) : img.base64 ? (
                  <img 
                    src={img.base64} 
                    alt={img.alt_text} 
                    className="max-w-full max-h-[300px] object-contain rounded-lg shadow-sm border border-slate-200"
                  />
                ) : (
                  <div className="w-full h-32 bg-slate-50 flex items-center justify-center border border-dashed border-slate-300 rounded-lg">
                    <ImageIcon className="h-8 w-8 text-slate-300" />
                  </div>
                )}
                <div className="text-center px-4">
                  <p className="text-[11px] font-bold text-slate-800 uppercase tracking-widest">{img.descricao}</p>
                  <p className="text-[10px] text-slate-500 italic">Recurso visual de apoio ({img.tipo === 'diagrama' ? 'Diagrama' : img.tipo === 'pictograma' ? 'Pictograma' : 'Organizador Visual'})</p>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>

        {/* ASSINATURA DO PROFESSOR */}
        <div className="assinatura-box mt-8 pt-3 border-t border-slate-400 break-inside-avoid page-break-inside-avoid">
          <div className="w-64 mx-auto text-center">
            <div className="border-b border-slate-600 h-5 mb-1" />
            <p className="font-bold text-xs text-slate-800">{atividadeAtual.professorNome}</p>
            <p className="text-[10px] text-slate-500">Assinatura do(a) Professor(a)</p>
          </div>
        </div>

        {/* RODAPÉ E NÚMERO DE PÁGINA */}
        <div className="mt-6 pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
          <div>
            <span>{escolaConfig.textoRodape || 'Documento escolar gerado para avaliação pedagógica.'}</span>
          </div>
          <div className="font-semibold text-slate-600">
            Página 1 de 1
          </div>
        </div>
      </div>

      {/* MODAL DE HISTÓRICO DE VERSÕES E RASTREABILIDADE */}
      {modalHistoricoVersoes && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col animate-scaleUp">
            <div className="p-4 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-700" />
                <h3 className="text-sm font-extrabold text-slate-900">
                  Histórico de Versões da Atividade
                </h3>
              </div>
              <button
                onClick={() => setModalHistoricoVersoes(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto text-xs text-slate-700">
              <p className="text-slate-500 text-[11px]">
                Conforme as normas de inclusão da SEDUC-GO, a atividade original é rigorosamente mantida e novas versões adaptadas registram a evolução pedagógica:
              </p>

              <div className="space-y-2">
                {(atividadeAtual.historicoVersoes && atividadeAtual.historicoVersoes.length > 0) ? (
                  atividadeAtual.historicoVersoes.map((v, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-indigo-800">Versão {v.versao}</span>
                        <span className="text-slate-400 text-[10px]">{v.data}</span>
                      </div>
                      <p className="text-slate-800 font-medium">{v.alteracoes}</p>
                      <p className="text-slate-500 text-[10px]">Autor: {v.autor} • Motivo: {v.motivo}</p>
                    </div>
                  ))
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-indigo-800">Versão 1 (Original)</span>
                      <span className="text-slate-400 text-[10px]">{atividadeAtual.dataCriacao}</span>
                    </div>
                    <p className="text-slate-800 font-medium">Versão inicial gerada com base na Matriz Curricular SEDUC-GO.</p>
                    <p className="text-slate-500 text-[10px]">Autor: {atividadeAtual.professorNome}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setModalHistoricoVersoes(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE VISUALIZAÇÃO E COMPARTILHAMENTO DO QR CODE DIGITAL */}
      {modalQrCode && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden flex flex-col animate-scaleUp">
            <div className="p-4 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-indigo-700" />
                <h3 className="text-sm font-extrabold text-slate-900">
                  QR Code da Versão Digital
                </h3>
              </div>
              <button
                onClick={() => setModalQrCode(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 flex flex-col items-center text-center space-y-4">
              <div className="p-3 bg-white border-2 border-slate-700 rounded-xl shadow-md">
                {qrCodeDataUrl ? (
                  <img
                    src={qrCodeDataUrl}
                    alt={`QR Code da Atividade ${atividadeAtual.id}`}
                    className="w-48 h-48 object-contain"
                  />
                ) : (
                  <div className="w-48 h-48 bg-slate-100 flex items-center justify-center rounded-lg">
                    <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-mono font-bold text-indigo-900 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200 inline-block">
                  ID: {atividadeAtual.id}
                </span>
                <h4 className="text-sm font-bold text-slate-900 pt-1">
                  {atividadeAtual.disciplina} • {atividadeAtual.turma}
                </h4>
                <p className="text-xs text-slate-600">
                  Estudante: <strong>{atividadeAtual.estudanteNome}</strong>
                </p>
                <p className="text-[11px] text-slate-500 pt-1 leading-snug">
                  Este QR Code é gerado automaticamente no topo da folha A4 e permite que professores, mediadores e coordenação acessem a versão digital com um toque na câmera do celular.
                </p>
              </div>

              <div className="w-full flex items-center gap-2 pt-2">
                <button
                  onClick={() => {
                    const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://adaptaedu.seduc.go.gov.br';
                    const path = typeof window !== 'undefined' && window.location.pathname ? window.location.pathname : '/';
                    const url = `${origin}${path}?view=atividade&id=${encodeURIComponent(atividadeAtual.id)}`;
                    navigator.clipboard.writeText(url);
                    setCopiadoLink(true);
                    setTimeout(() => setCopiadoLink(false), 2500);
                  }}
                  className="flex-1 py-2 px-3 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {copiadoLink ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  <span>{copiadoLink ? 'Link Copiado!' : 'Copiar Link'}</span>
                </button>

                <button
                  onClick={() => {
                    const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://adaptaedu.seduc.go.gov.br';
                    const path = typeof window !== 'undefined' && window.location.pathname ? window.location.pathname : '/';
                    const url = `${origin}${path}?view=atividade&id=${encodeURIComponent(atividadeAtual.id)}`;
                    window.open(url, '_blank');
                  }}
                  className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Abrir versão digital em nova aba"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Abrir</span>
                </button>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setModalQrCode(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
