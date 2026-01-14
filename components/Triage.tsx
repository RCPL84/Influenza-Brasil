
import React, { useState } from 'react';
import { Symptoms } from '../types';
import { analyzeSymptoms } from '../services/geminiService';
import { AlertTriangle, Info, Loader2 } from 'lucide-react';

interface Props {
  userName: string;
  onComplete: (symptoms: Symptoms) => void;
  onSuccess: () => void;
}

const Triage: React.FC<Props> = ({ userName, onComplete, onSuccess }) => {
  const [symptoms, setSymptoms] = useState<Symptoms>({
    inicioSubito: false,
    febreAlta: false,
    doresCorpo: false,
    faltaAr: false,
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [showEmergency, setShowEmergency] = useState(false);

  const toggleSymptom = (key: keyof Symptoms) => {
    setSymptoms(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAnalyze = async () => {
    if (symptoms.faltaAr) {
      setShowEmergency(true);
      return;
    }

    setIsAnalyzing(true);
    const result = await analyzeSymptoms(symptoms, userName);
    setAiAnalysis(result || "Nenhuma análise disponível.");
    setIsAnalyzing(false);
  };

  const handleProceed = () => {
    onComplete(symptoms);
    if (symptoms.inicioSubito && (symptoms.febreAlta || symptoms.doresCorpo)) {
      onSuccess();
    }
  };

  return (
    <div className="px-4 animate-fadeIn pb-10">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-blue-500">Olá, {userName}.</h2>
        <p className="text-gray-400">Responda para avaliarmos a Influenza.</p>
      </div>

      <div className="space-y-4">
        <SymptomToggle 
          label="1. O início dos sintomas foi SÚBITO?" 
          sub="Parece que foi atropelado por um caminhão"
          active={symptoms.inicioSubito} 
          onToggle={() => toggleSymptom('inicioSubito')} 
        />
        <SymptomToggle 
          label="2. Tem febre alta (>38°C)?" 
          active={symptoms.febreAlta} 
          onToggle={() => toggleSymptom('febreAlta')} 
        />
        <SymptomToggle 
          label="3. Tem dores fortes no corpo?" 
          active={symptoms.doresCorpo} 
          onToggle={() => toggleSymptom('doresCorpo')} 
        />
        
        <div className="pt-4 border-t border-red-900/30">
          <SymptomToggle 
            label="4. Sente falta de ar ou cansaço extremo?" 
            active={symptoms.faltaAr} 
            onToggle={() => toggleSymptom('faltaAr')} 
            isWarning
          />
        </div>
      </div>

      {!aiAnalysis ? (
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className="w-full mt-10 bg-white text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 transition"
        >
          {isAnalyzing ? <Loader2 className="animate-spin" /> : "Analisar Sintomas com IA"}
        </button>
      ) : (
        <div className="mt-8 bg-[#1E1E1E] border border-blue-900/40 p-5 rounded-xl animate-slideIn">
          <div className="flex items-center gap-2 mb-3 text-blue-400">
            <Info size={18} />
            <span className="font-semibold">Análise da IA</span>
          </div>
          <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line mb-6">
            {aiAnalysis}
          </p>
          <button
            onClick={handleProceed}
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg"
          >
            Entendido, Continuar
          </button>
        </div>
      )}

      {showEmergency && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-6">
          <div className="bg-red-950 border border-red-500 p-8 rounded-2xl max-w-sm text-center">
            <AlertTriangle className="text-red-500 w-16 h-16 mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-4">EMERGÊNCIA</h3>
            <p className="text-red-100 mb-8">
              Falta de ar é um sinal de gravidade. Procure um Pronto Socorro imediatamente ou ligue para o SAMU (192).
            </p>
            <button 
              onClick={() => setShowEmergency(false)}
              className="w-full bg-white text-red-950 font-bold py-3 rounded-xl"
            >
              Fechar Alerta
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const SymptomToggle: React.FC<{ label: string, sub?: string, active: boolean, onToggle: () => void, isWarning?: boolean }> = ({ label, sub, active, onToggle, isWarning }) => (
  <button 
    onClick={onToggle}
    className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
      active 
        ? (isWarning ? 'bg-red-900/40 border-red-500' : 'bg-blue-900/40 border-blue-500') 
        : 'bg-[#1E1E1E] border-gray-800'
    }`}
  >
    <div className="text-left">
      <div className={`font-medium ${isWarning && active ? 'text-red-400' : 'text-white'}`}>{label}</div>
      {sub && <div className="text-[11px] text-gray-500 mt-1">{sub}</div>}
    </div>
    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${active ? (isWarning ? 'bg-red-500 border-red-500' : 'bg-blue-500 border-blue-500') : 'border-gray-600'}`}>
      {active && <div className="w-2 h-2 bg-white rounded-full"></div>}
    </div>
  </button>
);

export default Triage;
