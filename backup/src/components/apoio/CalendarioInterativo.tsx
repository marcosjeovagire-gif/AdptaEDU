import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  XCircle, 
  Ban,
  CalendarDays,
  Check,
  X
} from 'lucide-react';
import { Estudante, RegistroAcompanhamentoApoio } from '../../types';
import { isDiaUtil, formatarDataPtBr } from '../../server/apoioService';

export interface CalendarioInterativoProps {
  aluno?: Estudante | null;
  registros: RegistroAcompanhamentoApoio[];
  onSelectDate: (dataIso: string) => void;
  onSelectData?: (dataIso: string) => void; // alias para compatibilidade
  dataSelecionada?: string;
  anoInicial?: number;
  mesInicial?: number;
  onMesAnoChange?: (ano: number, mes: number) => void;
  className?: string;
}

const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const DIAS_DA_SEMANA = [
  { label: 'Dom', full: 'Domingo', isUtil: false },
  { label: 'Seg', full: 'Segunda-feira', isUtil: true },
  { label: 'Ter', full: 'Terça-feira', isUtil: true },
  { label: 'Qua', full: 'Quarta-feira', isUtil: true },
  { label: 'Qui', full: 'Quinta-feira', isUtil: true },
  { label: 'Sex', full: 'Sexta-feira', isUtil: true },
  { label: 'Sáb', full: 'Sábado', isUtil: false },
];

export const CalendarioInterativo: React.FC<CalendarioInterativoProps> = ({
  aluno,
  registros,
  onSelectDate,
  onSelectData,
  dataSelecionada,
  anoInicial,
  mesInicial,
  onMesAnoChange,
  className = '',
}) => {
  const hoje = useMemo(() => new Date(), []);
  const hojeIso = useMemo(() => hoje.toISOString().split('T')[0], [hoje]);

  const [mesAtual, setMesAtual] = useState<number>(() => mesInicial !== undefined ? mesInicial : hoje.getMonth());
  const [anoAtual, setAnoAtual] = useState<number>(() => anoInicial !== undefined ? anoInicial : hoje.getFullYear());

  // Navegação entre meses com tratamento de virada de ano
  const handleMesAnterior = () => {
    let novoMes: number;
    let novoAno = anoAtual;
    if (mesAtual === 0) {
      novoMes = 11;
      novoAno = anoAtual - 1;
    } else {
      novoMes = mesAtual - 1;
    }
    setMesAtual(novoMes);
    setAnoAtual(novoAno);
    if (onMesAnoChange) onMesAnoChange(novoAno, novoMes);
  };

  const handleMesSeguinte = () => {
    let novoMes: number;
    let novoAno = anoAtual;
    if (mesAtual === 11) {
      novoMes = 0;
      novoAno = anoAtual + 1;
    } else {
      novoMes = mesAtual + 1;
    }
    setMesAtual(novoMes);
    setAnoAtual(novoAno);
    if (onMesAnoChange) onMesAnoChange(novoAno, novoMes);
  };

  const handleIrParaHoje = () => {
    const anoH = hoje.getFullYear();
    const mesH = hoje.getMonth();
    setMesAtual(mesH);
    setAnoAtual(anoH);
    if (onMesAnoChange) onMesAnoChange(anoH, mesH);
    if (isDiaUtil(hojeIso)) {
      if (onSelectDate) onSelectDate(hojeIso);
      else if (onSelectData) onSelectData(hojeIso);
    }
  };

  // Disparo ao clicar em um dia
  const handleDayClick = (dataIso: string) => {
    if (!isDiaUtil(dataIso)) return;
    if (onSelectDate) {
      onSelectDate(dataIso);
    }
    if (onSelectData) {
      onSelectData(dataIso);
    }
  };

  // Mapeamento dos registros indexados por data
  const registrosMap = useMemo(() => {
    const map = new Map<string, RegistroAcompanhamentoApoio>();
    registros.forEach(r => {
      if (!aluno || r.studentId === aluno.id) {
        map.set(r.data, r);
      }
    });
    return map;
  }, [registros, aluno]);

  // Cálculos da grade do calendário para o mês corrente
  const calendarioGrid = useMemo(() => {
    const primeiroDiaMes = new Date(anoAtual, mesAtual, 1);
    const ultimoDiaMes = new Date(anoAtual, mesAtual + 1, 0);
    const totalDias = ultimoDiaMes.getDate();
    const offsetInicio = primeiroDiaMes.getDay(); // 0 = Domingo, 1 = Segunda...

    const dias = [];
    let totalUteis = 0;
    let presencasNoMes = 0;
    let ausenciasNoMes = 0;

    for (let d = 1; d <= totalDias; d++) {
      const mesStr = String(mesAtual + 1).padStart(2, '0');
      const diaStr = String(d).padStart(2, '0');
      const dataIso = `${anoAtual}-${mesStr}-${diaStr}`;
      const dataObj = new Date(anoAtual, mesAtual, d);
      const diaSemana = dataObj.getDay();
      const util = diaSemana >= 1 && diaSemana <= 5;
      const isHoje = dataIso === hojeIso;
      const registro = registrosMap.get(dataIso);

      if (util) {
        totalUteis++;
        if (registro) {
          if (registro.presente) presencasNoMes++;
          else ausenciasNoMes++;
        }
      }

      dias.push({
        dia: d,
        dataIso,
        diaSemana,
        isUtil: util,
        isHoje,
        registro,
      });
    }

    const pendentesNoMes = Math.max(0, totalUteis - (presencasNoMes + ausenciasNoMes));

    return {
      offsetInicio,
      dias,
      totalDias,
      totalUteis,
      presencasNoMes,
      ausenciasNoMes,
      pendentesNoMes,
    };
  }, [anoAtual, mesAtual, hojeIso, registrosMap]);

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 sm:p-6 space-y-4 ${className}`}>
      
      {/* 1. CABEÇALHO DO CALENDÁRIO: Navegação de Mês/Ano & Ações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center shrink-0">
            <CalendarIcon className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>{NOMES_MESES[mesAtual]}</span>
              <span className="text-slate-400 font-semibold">{anoAtual}</span>
            </h3>
            {aluno ? (
              <p className="text-[11px] text-slate-500 font-medium">
                Estudante: <strong className="text-slate-700">{aluno.nome}</strong> ({aluno.turma})
              </p>
            ) : (
              <p className="text-[11px] text-slate-500 font-medium">
                Visão mensal dos acompanhamentos escolares
              </p>
            )}
          </div>
        </div>

        {/* Controles de Navegação */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleIrParaHoje}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            title="Ir para a data de hoje"
          >
            Mês Atual
          </button>
          <button
            type="button"
            onClick={handleMesAnterior}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
            title="Mês Anterior"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Anterior</span>
          </button>
          <button
            type="button"
            onClick={handleMesSeguinte}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
            title="Mês Seguinte"
          >
            <span className="hidden sm:inline">Seguinte</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 2. CARDS RESUMO DO MÊS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Dias Letivos Úteis</span>
          <strong className="text-sm font-black text-slate-800">{calendarioGrid.totalUteis} dias</strong>
        </div>
        <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
          <span className="text-[10px] uppercase font-bold text-emerald-700 block tracking-wider">Presenças</span>
          <strong className="text-sm font-black text-emerald-900">{calendarioGrid.presencasNoMes}</strong>
        </div>
        <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200">
          <span className="text-[10px] uppercase font-bold text-amber-700 block tracking-wider">Ausências</span>
          <strong className="text-sm font-black text-amber-900">{calendarioGrid.ausenciasNoMes}</strong>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Dias Pendentes</span>
          <strong className="text-sm font-black text-slate-600">{calendarioGrid.pendentesNoMes}</strong>
        </div>
      </div>

      {/* 3. LEGENDA EXPLICATIVA */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
        <span className="font-bold text-slate-800 flex items-center gap-1">
          <CalendarDays className="h-3.5 w-3.5 text-emerald-700" />
          <span>Legenda:</span>
        </span>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-md bg-emerald-500 inline-flex items-center justify-center text-white">
            <Check className="h-2.5 w-2.5" />
          </span>
          <span className="font-medium text-emerald-900">Presente</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-md bg-amber-500 inline-flex items-center justify-center text-white">
            <X className="h-2.5 w-2.5" />
          </span>
          <span className="font-medium text-amber-900">Ausente</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-md bg-white border border-slate-300 inline-block" />
          <span>Dia Útil (Sem registro)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-md bg-slate-200 border border-slate-300 inline-flex items-center justify-center text-slate-400">
            <Ban className="h-2 w-2" />
          </span>
          <span className="text-slate-400">Fim de Semana (Bloqueado)</span>
        </div>
      </div>

      {/* 4. GRADE MENSAL DE DIAS */}
      <div className="space-y-1.5">
        {/* Nomes dos Dias da Semana */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center">
          {DIAS_DA_SEMANA.map((dia) => (
            <div
              key={dia.label}
              className={`py-2 text-[11px] sm:text-xs font-black uppercase tracking-wider rounded-lg ${
                dia.isUtil 
                  ? 'bg-slate-100/80 text-slate-800' 
                  : 'bg-slate-50 text-slate-300'
              }`}
            >
              <span>{dia.label}</span>
              {dia.isUtil && <span className="hidden md:inline text-[9px] text-emerald-700 block font-medium">útil</span>}
            </div>
          ))}
        </div>

        {/* Células de Dias do Calendário */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          
          {/* Espaçadores vazios do início do mês */}
          {Array.from({ length: calendarioGrid.offsetInicio }).map((_, i) => (
            <div 
              key={`empty-start-${i}`} 
              className="min-h-[58px] sm:min-h-[76px] rounded-xl bg-slate-50/30 border border-transparent"
              aria-hidden="true"
            />
          ))}

          {/* Renderização de Cada Dia */}
          {calendarioGrid.dias.map((item) => {
            const isFimDeSemana = !item.isUtil;
            const temRegistro = Boolean(item.registro);
            const isPresente = item.registro?.presente === true;
            const isAusente = item.registro?.presente === false;
            const isAtivoSelecionado = dataSelecionada === item.dataIso;

            // Estilos visuais distintos conforme estado
            let cellStyle = '';
            if (isFimDeSemana) {
              // FINS DE SEMANA DESABILITADOS
              cellStyle = 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed opacity-60 select-none';
            } else if (temRegistro && isPresente) {
              // DIA COM REGISTRO DE PRESENÇA
              cellStyle = 'bg-emerald-50/90 hover:bg-emerald-100 border-emerald-300 text-emerald-950 shadow-2xs font-bold cursor-pointer';
            } else if (temRegistro && isAusente) {
              // DIA COM REGISTRO DE AUSÊNCIA
              cellStyle = 'bg-amber-50/90 hover:bg-amber-100 border-amber-300 text-amber-950 shadow-2xs font-bold cursor-pointer';
            } else {
              // DIA ÚTIL SEM REGISTRO
              cellStyle = item.isHoje 
                ? 'bg-emerald-50/30 hover:bg-emerald-50/60 border-emerald-300 text-slate-900 cursor-pointer shadow-2xs'
                : 'bg-white hover:bg-emerald-50/40 border-slate-200 hover:border-emerald-300 text-slate-800 cursor-pointer shadow-2xs';
            }

            return (
              <button
                key={item.dataIso}
                type="button"
                disabled={isFimDeSemana}
                onClick={() => handleDayClick(item.dataIso)}
                aria-current={item.isHoje ? 'date' : undefined}
                className={`min-h-[58px] sm:min-h-[76px] p-1.5 sm:p-2 rounded-xl border flex flex-col justify-between transition-all relative outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-600 ${cellStyle} ${
                  item.isHoje ? 'ring-2 ring-emerald-600 ring-offset-2 border-emerald-500 shadow-xs' : ''
                } ${isAtivoSelecionado && !item.isHoje ? 'border-emerald-600 ring-1 ring-emerald-600' : ''}`}
                title={
                  isFimDeSemana
                    ? `${formatarDataPtBr(item.dataIso)} - Fim de semana (desabilitado)`
                    : temRegistro
                    ? `${formatarDataPtBr(item.dataIso)} - ${isPresente ? 'Presente' : 'Ausente'} (Clique para ver/editar)`
                    : `${formatarDataPtBr(item.dataIso)} - Dia útil letivo (Clique para registrar)`
                }
              >
                {/* Linha superior: Dia do Mês + Marcador Distinto do Dia Atual ou Bloqueio */}
                <div className="flex items-center justify-between w-full leading-none">
                  <div className="flex items-center gap-1">
                    <span className={`text-xs sm:text-sm font-black ${
                      item.isHoje 
                        ? 'text-emerald-800 underline decoration-emerald-500 decoration-2 underline-offset-2' 
                        : isFimDeSemana 
                        ? 'text-slate-300' 
                        : 'text-slate-900'
                    }`}>
                      {item.dia}
                    </span>
                    {item.isHoje && (
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 inline-block animate-pulse" />
                    )}
                  </div>

                  {/* Estilo distinto para o dia atual */}
                  {item.isHoje ? (
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-emerald-700 text-white uppercase tracking-tight shadow-2xs">
                      Hoje
                    </span>
                  ) : isFimDeSemana ? (
                    <Ban className="h-3 w-3 text-slate-300 hidden sm:block" />
                  ) : null}
                </div>

                {/* Centro da Célula: Estado Visual de Presença/Ausência/Disponível */}
                <div className="w-full flex items-center justify-center pt-1">
                  {isFimDeSemana ? (
                    <span className="text-[9px] text-slate-300 font-medium">Bloqueado</span>
                  ) : temRegistro ? (
                    isPresente ? (
                      <div className="flex items-center gap-1 text-[10px] text-emerald-800 font-bold">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span className="hidden sm:inline">Presente</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-[10px] text-amber-800 font-bold">
                        <XCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                        <span className="hidden sm:inline">Ausente</span>
                      </div>
                    )
                  ) : (
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium group-hover:text-emerald-700">
                      <span className="hidden sm:inline">Registrar</span>
                      <span className="sm:hidden text-slate-300">•</span>
                    </div>
                  )}
                </div>

                {/* Marcador se contiver fotografia do Diário de Bordo anexada */}
                {item.registro?.fotoDiarioBordoUrl && (
                  <span 
                    className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full bg-sky-500" 
                    title="Fotografia do Diário de Bordo anexada" 
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
};

export default CalendarioInterativo;
