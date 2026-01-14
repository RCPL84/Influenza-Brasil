
import React, { useState, useEffect } from 'react';
import { generateAppLogo } from '../services/imageService';
import { ShieldCheck, Loader2, RefreshCw } from 'lucide-react';

const GeneratedLogo: React.FC = () => {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLogo = async () => {
    setLoading(true);
    const url = await generateAppLogo();
    setLogoUrl(url);
    setLoading(false);
  };

  useEffect(() => {
    fetchLogo();
  }, []);

  if (loading) {
    return (
      <div className="w-32 h-32 bg-blue-600/10 rounded-full flex flex-col items-center justify-center mb-8 border border-blue-500/20 animate-pulse relative">
        <Loader2 className="text-blue-500 animate-spin mb-2" size={32} />
        <span className="text-[10px] text-blue-400 font-bold uppercase tracking-tighter">Gerando Logo...</span>
      </div>
    );
  }

  if (!logoUrl) {
    return (
      <div className="w-32 h-32 bg-blue-600/20 rounded-full flex flex-col items-center justify-center mb-8 relative group">
        <ShieldCheck size={56} className="text-blue-500" />
        <button 
          onClick={fetchLogo}
          className="absolute -bottom-2 right-0 bg-blue-600 p-2 rounded-full text-white shadow-lg hover:bg-blue-500 transition-colors"
          title="Tentar novamente"
        >
          <RefreshCw size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="w-32 h-32 mb-8 relative group animate-fadeIn">
      <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-10 rounded-full group-hover:opacity-30 transition-opacity"></div>
      <img 
        src={logoUrl} 
        alt="Influenza Care Logo" 
        className="w-full h-full object-cover rounded-full border-2 border-blue-500/30 relative z-10 shadow-2xl"
      />
      <button 
        onClick={fetchLogo}
        className="absolute -bottom-2 -right-2 z-20 bg-[#1A1A1A] border border-gray-800 p-2 rounded-full text-blue-500 shadow-xl hover:text-blue-400 transition-all active:scale-90"
        title="Gerar nova versão"
      >
        <RefreshCw size={14} />
      </button>
    </div>
  );
};

export default GeneratedLogo;
