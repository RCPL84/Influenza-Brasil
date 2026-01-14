
import React, { useState } from 'react';
import { AlertCircle, MapPin, FileText, Download, CheckCircle2 } from 'lucide-react';

interface Props {
  onNext: () => void;
}

const Orientation: React.FC<Props> = ({ onNext }) => {
  const [vacinou, setVacinou] = useState<boolean | null>(null);
  const [temPlano, setTemPlano] = useState<boolean | null>(null);

  const openMap = () => {
    const query = temPlano ? "hospital plano de saude proximo" : "farmacia teste rapido influenza";
    window.open(`https://www.google.com/maps/search/${encodeURIComponent(query)}`, '_blank');
  };

  return (
    <div className="px-4 animate-fadeIn">
      <div className="bg-amber-900/40 border border-amber-600 p-4 rounded-xl flex gap-3 mb-6">
        <AlertCircle className="text-amber-500 shrink-0" size={24} />
        <div>
          <h4 className="font-bold text-amber-100">Alta probabilidade de Influenza</h4>
          <p className="text-xs text-amber-200/80">Recomendamos realizar um teste rápido o quanto antes para confirmação diagnóstica.</p>
        </div>
      </div>

      <div className="space-y-6">
        <section>
          <p className="text-sm font-semibold mb-3">Vacinou-se contra gripe este ano?</p>
          <div className="flex gap-4">
            <button 
              onClick={() => setVacinou(true)}
              className={`flex-1 py-2 rounded-lg border ${vacinou === true ? 'bg-blue-600 border-blue-500' : 'bg-[#1E1E1E] border-gray-700'}`}
            >
              Sim
            </button>
            <button 
              onClick={() => setVacinou(false)}
              className={`flex-1 py-2 rounded-lg border ${vacinou === false ? 'bg-blue-600 border-blue-500' : 'bg-[#1E1E1E] border-gray-700'}`}
            >
              Não
            </button>
          </div>
          {vacinou === true && (
            <p className="text-[11px] text-blue-400 mt-2 flex items-center gap-1">
              <CheckCircle2 size={12} /> Ótimo! Isso ajuda a prevenir casos graves.
            </p>
          )}
        </section>

        <section>
          <p className="text-sm font-semibold mb-3">Possui Plano de Saúde?</p>
          <div className="flex gap-4">
            <button 
              onClick={() => setTemPlano(true)}
              className={`flex-1 py-2 rounded-lg border ${temPlano === true ? 'bg-blue-600 border-blue-500' : 'bg-[#1E1E1E] border-gray-700'}`}
            >
              Sim
            </button>
            <button 
              onClick={() => setTemPlano(false)}
              className={`flex-1 py-2 rounded-lg border ${temPlano === false ? 'bg-blue-600 border-blue-500' : 'bg-[#1E1E1E] border-gray-700'}`}
            >
              Não
            </button>
          </div>
        </section>

        {temPlano !== null && (
          <div className="space-y-4 animate-slideIn">
            <div className="bg-gray-800/50 p-5 rounded-xl border border-gray-700">
              <h5 className="font-bold flex items-center gap-2 mb-3">
                <MapPin size={18} className="text-blue-500" />
                {temPlano ? "Opções (Convênio):" : "Opções (Particular/SUS):"}
              </h5>
              <ul className="text-sm space-y-2 text-gray-300 ml-6 list-disc">
                {temPlano ? (
                  <>
                    <li>Farmácias Grandes Redes</li>
                    <li>Laboratórios Particulares</li>
                    <li>Hospitais Privados (Pronto Atendimento)</li>
                  </>
                ) : (
                  <>
                    <li>Farmácias (Pago/Rápido)</li>
                    <li>UBS / Posto de Saúde (Gratuito)</li>
                    <li>UPA 24h (Casos que não melhoram)</li>
                  </>
                )}
              </ul>
              <button 
                onClick={openMap}
                className="w-full mt-4 bg-gray-700 hover:bg-gray-600 py-3 rounded-lg text-sm font-medium transition"
              >
                Ver Locais Próximos no Mapa
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-[#1E1E1E] rounded-xl border border-gray-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-800 rounded-lg">
                  <FileText size={20} className="text-blue-400" />
                </div>
                <div>
                  <div className="text-sm font-bold">Protocolo Municipal</div>
                  <div className="text-[10px] text-gray-500">Baseado no Min. da Saúde</div>
                </div>
              </div>
              <Download size={20} className="text-gray-500 cursor-pointer" />
            </div>

            <button
              onClick={onNext}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl mt-4 transition shadow-lg shadow-green-900/20"
            >
              Já fiz o teste / Ir para Casa
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Orientation;
