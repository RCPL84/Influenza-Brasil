
import React, { useState, useEffect } from 'react';
import { 
  Timer, 
  Droplets, 
  PlusCircle, 
  Pill, 
  MessageCircle, 
  ChevronRight, 
  Bell, 
  CheckCircle2, 
  AlertCircle, 
  Shield, 
  Wind, 
  Sparkles,
  Info,
  X
} from 'lucide-react';
import { Medication } from '../types';

interface Props {
  userName: string;
  onChat: () => void;
}

// Subcomponente de Gráfico de Hidratação
const HydrationChart: React.FC<{ currentAmount: number, goal: number }> = ({ currentAmount, goal }) => {
  // Dados simulados dos últimos 6 dias + dia atual
  const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Hoje'];
  const historical = [1.8, 2.2, 2.7, 1.5, 2.1, 2.5];
  const allData = [...historical, currentAmount];
  
  return (
    <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl p-4 mb-6">
      <div className="flex justify-between items-center mb-6">
        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Progresso de Hidratação</h4>
        <span className="text-[10px] font-bold text-cyan-500 bg-cyan-500/10 px-2 py-0.5 rounded">META 2.5L</span>
      </div>
      
      <div className="relative h-32 flex items-baseline justify-between gap-2 px-1">
        {/* Linha de Meta */}
        <div 
          className="absolute left-0 right-0 border-t border-dashed border-gray-600 z-0 pointer-events-none"
          style={{ bottom: `${(goal / 3) * 100}%` }}
        >
          <span className="absolute -top-3 right-0 text-[8px] text-gray-500 font-bold uppercase">Meta</span>
        </div>

        {allData.map((val, idx) => {
          const isToday = idx === allData.length - 1;
          const percentage = (val / 3) * 100; // Normalizado para um máximo de 3L no gráfico
          const reachedGoal = val >= goal;

          return (
            <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
              <div className="relative w-full flex justify-center items-end h-full">
                {/* Tooltip simples no hover */}
                <div className="absolute -top-6 bg-gray-800 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity z-20">
                  {val.toFixed(1)}L
                </div>
                
                <div 
                  className={`w-full max-w-[12px] rounded-t-full transition-all duration-700 ease-out ${
                    isToday 
                      ? (reachedGoal ? 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.4)]' : 'bg-cyan-500') 
                      : (reachedGoal ? 'bg-cyan-700/60' : 'bg-gray-700')
                  }`}
                  style={{ height: `${Math.min(percentage, 100)}%` }}
                ></div>
              </div>
              <span className={`text-[8px] font-bold ${isToday ? 'text-cyan-400' : 'text-gray-600'}`}>
                {days[idx]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Management: React.FC<Props> = ({ userName, onChat }) => {
  const GOAL_HYDRATION = 2.5;
  const [hydration, setHydration] = useState(0.8); 
  const [meds, setMeds] = useState<Medication[]>([
    { id: '1', name: 'Dipirona (1g)', dosage: '1 comprimido', time: '08:30', nextTime: '14:30' }
  ]);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [showProtocol, setShowProtocol] = useState(false);

  // Isolation Timer Logic (5 days in seconds)
  const TOTAL_SECONDS = 5 * 24 * 60 * 60;
  const [secondsLeft, setSecondsLeft] = useState(TOTAL_SECONDS);

  useEffect(() => {
    setShowToast(true);
    const toastTimer = setTimeout(() => setShowToast(false), 5000);

    const interval = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(toastTimer);
    };
  }, []);

  useEffect(() => {
    if (lastAddedId) {
      const timer = setTimeout(() => {
        setLastAddedId(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [lastAddedId]);

  const formatTime = (seconds: number) => {
    const d = Math.floor(seconds / (24 * 3600));
    const h = Math.floor((seconds % (24 * 3600)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return {
      days: d,
      hours: h.toString().padStart(2, '0'),
      minutes: m.toString().padStart(2, '0'),
      seconds: s.toString().padStart(2, '0')
    };
  };

  const time = formatTime(secondsLeft);
  const progress = ((TOTAL_SECONDS - secondsLeft) / TOTAL_SECONDS) * 100;

  const addHydration = () => {
    setHydration(prev => Math.min(prev + 0.25, 4));
  };

  const registerMedication = () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const nextTime = new Date(now.getTime() + 6 * 60 * 60 * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    const newMed: Medication = {
      id: Date.now().toString(),
      name: 'Novo Medicamento',
      dosage: 'Dose padrão',
      time: timeStr,
      nextTime: nextTime
    };

    setMeds(prev => [newMed, ...prev]);
    setLastAddedId(newMed.id);
  };

  const getIsolationStatus = () => {
    if (secondsLeft === 0) return { 
      msg: "Isolamento Concluído!", 
      sub: "Verifique se está sem febre por 24h.",
      icon: <CheckCircle2 className="text-green-500" />,
      color: "border-green-500 bg-green-900/20"
    };
    return { 
      msg: "Isolamento Necessário", 
      sub: "Mantenha o protocolo para proteger outros.",
      icon: <AlertCircle className="text-orange-500" />,
      color: "border-orange-500/30 bg-orange-950/20"
    };
  };

  const status = getIsolationStatus();

  return (
    <div className="px-4 animate-fadeIn pb-12 relative">
      
      {/* System Toast Notification */}
      {showToast && (
        <div className="fixed top-4 left-4 right-4 z-50 animate-slideDown">
          <div className="bg-[#1E1E1E]/90 backdrop-blur-md border border-orange-500/50 p-4 rounded-2xl shadow-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-orange-500 p-2 rounded-lg">
                <Shield size={18} className="text-white" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-orange-400 uppercase tracking-tighter">Alerta de Saúde</div>
                <div className="text-sm font-bold text-white">Protocolo de Isolamento Ativado</div>
              </div>
            </div>
            <button onClick={() => setShowToast(false)} className="text-gray-500 p-1">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Olá, {userName.split(' ')[0]}</h2>
          <p className="text-xs text-gray-500">Gestão Domiciliar de Influenza</p>
        </div>
        <div className="bg-blue-600/20 px-3 py-1 rounded-full text-[10px] font-bold text-blue-400">EM RECUPERAÇÃO</div>
      </div>

      {/* Isolation Status Banner */}
      <div className={`mb-6 p-4 rounded-2xl border transition-all duration-500 ${status.color}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {status.icon}
            <div>
              <span className="text-sm font-bold text-gray-100 block">{status.msg}</span>
              <span className="text-[10px] text-gray-400">{status.sub}</span>
            </div>
          </div>
          <button 
            onClick={() => setShowProtocol(!showProtocol)}
            className="text-[10px] font-bold text-orange-400 bg-orange-500/10 px-2 py-1 rounded uppercase"
          >
            {showProtocol ? "Fechar" : "Protocolo"}
          </button>
        </div>

        {showProtocol && (
          <div className="mt-4 pt-4 border-t border-orange-500/20 space-y-3 animate-slideIn">
            <div className="flex items-start gap-3">
              <Shield size={16} className="text-orange-400 mt-0.5 shrink-0" />
              <p className="text-[11px] text-gray-300">Use máscara se precisar sair do quarto ou interagir com alguém.</p>
            </div>
            <div className="flex items-start gap-3">
              <Wind size={16} className="text-blue-400 mt-0.5 shrink-0" />
              <p className="text-[11px] text-gray-300">Mantenha janelas abertas para ventilação constante do ambiente.</p>
            </div>
            <div className="flex items-start gap-3">
              <Sparkles size={16} className="text-green-400 mt-0.5 shrink-0" />
              <p className="text-[11px] text-gray-300">Não compartilhe talheres, toalhas ou objetos de uso pessoal.</p>
            </div>
          </div>
        )}
      </div>

      {/* Isolation Countdown Card */}
      <div className="bg-[#1E1E1E] border border-gray-800 rounded-3xl p-6 mb-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-3 opacity-10">
          <Timer size={80} className="text-blue-500" />
        </div>
        
        <div className="flex justify-between items-center mb-6 relative z-10">
          <div className="flex items-center gap-2">
            <Timer className="text-blue-500" size={20} />
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Tempo de Isolamento</h3>
          </div>
          <span className="text-[10px] font-bold text-blue-500 bg-blue-500/10 px-2 py-1 rounded flex items-center gap-1">
            <Info size={10} /> DIA {5 - time.days}/5
          </span>
        </div>

        <div className="flex justify-center items-center gap-4 mb-6 relative z-10">
          <div className="text-center">
            <div className="text-4xl font-black text-white">{time.days}</div>
            <div className="text-[10px] uppercase text-gray-500 font-bold">Dias</div>
          </div>
          <div className="text-2xl font-bold text-gray-700 mb-4">:</div>
          <div className="text-center">
            <div className="text-4xl font-black text-white">{time.hours}</div>
            <div className="text-[10px] uppercase text-gray-500 font-bold">Horas</div>
          </div>
          <div className="text-2xl font-bold text-gray-700 mb-4">:</div>
          <div className="text-center">
            <div className="text-4xl font-black text-white">{time.minutes}</div>
            <div className="text-[10px] uppercase text-gray-500 font-bold">Min</div>
          </div>
        </div>

        <div className="w-full bg-gray-800 h-2.5 rounded-full overflow-hidden mb-2">
          <div 
            className="h-full bg-gradient-to-r from-blue-700 to-blue-400 transition-all duration-1000 ease-linear" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-[10px] text-gray-500 font-bold uppercase">
          <span>Início</span>
          <span>{progress.toFixed(0)}% Concluído</span>
          <span>Recuperação</span>
        </div>
      </div>

      {/* NOVO: Gráfico de Hidratação Diária */}
      <HydrationChart currentAmount={hydration} goal={GOAL_HYDRATION} />

      {/* Hydration Widget */}
      <div className="mb-6">
        <div 
          onClick={addHydration}
          className="bg-[#1E1E1E] border border-gray-800 p-5 rounded-2xl flex items-center justify-between cursor-pointer active:scale-95 transition group"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-cyan-900/20 rounded-xl group-hover:bg-cyan-900/40 transition">
              <Droplets className="text-cyan-400" size={24} />
            </div>
            <div>
              <span className="text-[10px] text-gray-500 uppercase font-bold block">Registrar Hidratação</span>
              <span className="text-lg font-bold text-white">{hydration.toFixed(2)}L <span className="text-xs text-gray-600">/ {GOAL_HYDRATION.toFixed(2)}L</span></span>
            </div>
          </div>
          <div className="bg-cyan-500/10 p-2 rounded-full">
            <PlusCircle className="text-cyan-500" size={20} />
          </div>
        </div>
        <p className="text-[9px] text-gray-600 text-center mt-2 uppercase tracking-widest">+250ml por clique</p>
      </div>

      <button 
        onClick={registerMedication}
        className="w-full bg-blue-600 hover:bg-blue-700 p-5 rounded-2xl flex items-center justify-center gap-3 font-bold mb-8 shadow-lg shadow-blue-900/20 active:scale-[0.98] transition-all"
      >
        <PlusCircle size={24} />
        REGISTRAR MEDICAMENTO
      </button>

      <div className="mb-8">
        <div className="flex justify-between items-center mb-4 px-1">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em]">Histórico do Dia</h3>
          <button className="text-[11px] text-blue-500 font-bold">HISTÓRICO</button>
        </div>
        <div className="space-y-3">
          {meds.map(med => (
            <div 
              key={med.id} 
              className={`bg-[#1E1E1E] border p-4 rounded-xl flex items-center justify-between transition-all duration-500 ${
                lastAddedId === med.id ? 'border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.15)] scale-[1.01]' : 'border-gray-800'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl transition-colors duration-500 ${
                  lastAddedId === med.id ? 'bg-green-900/40' : 'bg-[#252525]'
                }`}>
                  <Pill className={lastAddedId === med.id ? 'text-green-400' : 'text-gray-400'} size={20} />
                </div>
                <div>
                  <div className="font-bold text-sm flex items-center gap-2">
                    {med.name}
                    {lastAddedId === med.id && (
                      <span className="text-[8px] bg-green-500 text-white px-1.5 py-0.5 rounded font-black tracking-tighter">REGISTRADO</span>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-500 font-medium">Hoje, às {med.time} • Próx: {med.nextTime}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {lastAddedId === med.id ? (
                  <CheckCircle2 size={22} className="text-green-500 animate-bounceIn" />
                ) : (
                  <ChevronRight size={16} className="text-gray-700" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Help / Chat Widget */}
      <div 
        onClick={onChat}
        className="bg-blue-600/10 border border-blue-500/20 p-5 rounded-3xl flex items-center justify-between cursor-pointer hover:bg-blue-600/20 transition group"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg rotate-3 group-hover:rotate-0 transition-transform">
            <MessageCircle size={24} />
          </div>
          <div>
            <div className="font-bold text-sm">Dúvida sobre os sintomas?</div>
            <div className="text-[10px] text-blue-300/70">Consulte nossa IA de saúde agora</div>
          </div>
        </div>
        <ChevronRight className="text-blue-500 group-hover:translate-x-1 transition-transform" />
      </div>
    </div>
  );
};

export default Management;
