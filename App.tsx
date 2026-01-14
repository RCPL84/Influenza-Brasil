
import React, { useState } from 'react';
import { AppPhase, UserData, Symptoms } from './types';
import Registration from './components/Registration';
import Triage from './components/Triage';
import Orientation from './components/Orientation';
import Management from './components/Management';
import ChatAssistant from './components/ChatAssistant';
import GeneratedLogo from './components/GeneratedLogo';
import SystemStatus from './components/SystemStatus';
import { Activity, HeartPulse, ClipboardList, Home, MessageCircle, ArrowLeft, ShieldAlert } from 'lucide-react';

const App: React.FC = () => {
  const [phase, setPhase] = useState<AppPhase>(AppPhase.WELCOME);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [symptoms, setSymptoms] = useState<Symptoms | null>(null);

  const handleFinishRegistration = (data: UserData) => {
    setUserData(data);
    setPhase(AppPhase.TRIAGE);
  };

  const handleFinishTriage = (symptomData: Symptoms) => {
    setSymptoms(symptomData);
    if (symptomData.faltaAr) {
      // Emergency logic handled inside Triage component with a modal
    } else if (symptomData.inicioSubito && (symptomData.febreAlta || symptomData.doresCorpo)) {
      setPhase(AppPhase.PHASE1_ORIENTATION);
    } else {
      // Lower probability handled with message
    }
  };

  const goBack = () => {
    setPhase(prev => {
      switch (prev) {
        case AppPhase.REGISTRATION: return AppPhase.WELCOME;
        case AppPhase.TRIAGE: return AppPhase.REGISTRATION;
        case AppPhase.PHASE1_ORIENTATION: return AppPhase.TRIAGE;
        case AppPhase.PHASE2_MANAGEMENT: return AppPhase.PHASE1_ORIENTATION;
        case AppPhase.CHAT: return AppPhase.PHASE2_MANAGEMENT;
        case AppPhase.DIAGNOSTICS: return AppPhase.WELCOME;
        default: return prev;
      }
    });
  };

  const navigateToManagement = () => setPhase(AppPhase.PHASE2_MANAGEMENT);
  const navigateToChat = () => setPhase(AppPhase.CHAT);

  return (
    <div className="min-h-screen bg-[#121212] flex flex-col items-center p-4">
      <div className="w-full max-w-md bg-[#121212] min-h-screen flex flex-col relative pb-20">
        
        {/* Header (AppBar) */}
        <header className="py-6 px-4 border-b border-gray-800 sticky top-0 bg-[#121212] z-30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {phase !== AppPhase.WELCOME && (
              <button 
                onClick={goBack}
                className="p-2 -ml-2 hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-white"
                aria-label="Voltar"
              >
                <ArrowLeft size={24} />
              </button>
            )}
            <Activity className="text-blue-500 w-8 h-8" />
            <h1 className="text-xl font-bold tracking-tight">Influenza Care</h1>
          </div>
          
          <button 
            onClick={() => setPhase(AppPhase.DIAGNOSTICS)}
            className={`p-2 rounded-xl transition-all ${phase === AppPhase.DIAGNOSTICS ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-800'}`}
            title="Status do Sistema"
          >
            <ShieldAlert size={20} />
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 py-4 overflow-y-auto">
          {phase === AppPhase.WELCOME && (
            <div className="px-4 py-10 flex flex-col items-center text-center animate-fadeIn">
              <GeneratedLogo />
              <h2 className="text-3xl font-extrabold mb-4">Seu Cuidado Inteligente</h2>
              <p className="text-gray-400 mb-10 leading-relaxed">
                Acompanhamento completo desde a triagem até a gestão domiciliar dos seus sintomas de gripe.
              </p>
              <button 
                onClick={() => setPhase(AppPhase.REGISTRATION)}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-5 rounded-2xl transition-all shadow-xl shadow-blue-900/20 active:scale-95"
              >
                Começar Identificação
              </button>
            </div>
          )}

          {phase === AppPhase.REGISTRATION && (
            <Registration onSave={handleFinishRegistration} />
          )}

          {phase === AppPhase.TRIAGE && userData && (
            <Triage 
              userName={userData.nome} 
              onComplete={handleFinishTriage} 
              onSuccess={() => setPhase(AppPhase.PHASE1_ORIENTATION)}
            />
          )}

          {phase === AppPhase.PHASE1_ORIENTATION && (
            <Orientation onNext={navigateToManagement} />
          )}

          {phase === AppPhase.PHASE2_MANAGEMENT && userData && (
            <Management userName={userData.nome} onChat={navigateToChat} />
          )}

          {phase === AppPhase.CHAT && (
            <ChatAssistant onBack={goBack} />
          )}

          {phase === AppPhase.DIAGNOSTICS && (
            <SystemStatus />
          )}
        </main>

        {/* Navigation Bottom Bar (Hidden on Welcome, Registration and Diagnostics) */}
        {![AppPhase.WELCOME, AppPhase.REGISTRATION, AppPhase.DIAGNOSTICS].includes(phase) && (
          <nav className="fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800 flex justify-around py-3 z-20 max-w-md mx-auto">
            <button 
              onClick={() => setPhase(AppPhase.TRIAGE)} 
              className={`flex flex-col items-center ${phase === AppPhase.TRIAGE ? 'text-blue-500' : 'text-gray-500'}`}
            >
              <HeartPulse size={20} />
              <span className="text-[10px] mt-1">Triagem</span>
            </button>
            <button 
              onClick={() => setPhase(AppPhase.PHASE1_ORIENTATION)} 
              className={`flex flex-col items-center ${phase === AppPhase.PHASE1_ORIENTATION ? 'text-blue-500' : 'text-gray-500'}`}
            >
              <ClipboardList size={20} />
              <span className="text-[10px] mt-1">Orienta</span>
            </button>
            <button 
              onClick={() => setPhase(AppPhase.PHASE2_MANAGEMENT)} 
              className={`flex flex-col items-center ${phase === AppPhase.PHASE2_MANAGEMENT ? 'text-blue-500' : 'text-gray-500'}`}
            >
              <Home size={20} />
              <span className="text-[10px] mt-1">Gestão</span>
            </button>
            <button 
              onClick={() => setPhase(AppPhase.CHAT)} 
              className={`flex flex-col items-center ${phase === AppPhase.CHAT ? 'text-blue-500' : 'text-gray-500'}`}
            >
              <MessageCircle size={20} />
              <span className="text-[10px] mt-1">Chat IA</span>
            </button>
          </nav>
        )}
      </div>
    </div>
  );
};

export default App;
