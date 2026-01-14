
import React, { useState, useRef } from 'react';
import { UserData, EmergencyContact } from '../types';
import { Plus, Trash2, Phone, User as UserIcon, AlertCircle, Syringe, Mail } from 'lucide-react';

interface Props {
  onSave: (data: UserData) => void;
}

const Registration: React.FC<Props> = ({ onSave }) => {
  const [nome, setNome] = useState('');
  const [nascimento, setNascimento] = useState('');
  const [cpf, setCpf] = useState('');
  const [vacinado, setVacinado] = useState<boolean | null>(null);
  
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const contactNameRef = useRef<HTMLInputElement>(null);

  // Máscara de telefone (XX) XXXXX-XXXX
  const maskPhone = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = maskPhone(e.target.value);
    setContactPhone(masked);
    if (error) setError(null);
  };

  // Validação rigorosa de telefone (DDD + 8 ou 9 dígitos)
  const isValidPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    const phoneRegex = /^[1-9]{2}9?[2-9][0-9]{7}$/;
    return phoneRegex.test(digits);
  };

  // Validação de e-mail
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const addContact = () => {
    if (!contactName.trim()) {
      setError("Por favor, informe o nome do contato.");
      return;
    }
    
    if (!contactPhone.trim()) {
      setError("Por favor, informe o telefone do contato.");
      return;
    }

    if (!isValidPhone(contactPhone)) {
      setError("Número de telefone inválido. Verifique o DDD e o número.");
      return;
    }

    if (!contactEmail.trim()) {
      setError("Por favor, informe o e-mail do contato.");
      return;
    }

    if (!isValidEmail(contactEmail)) {
      setError("E-mail inválido. Por favor, verifique o formato.");
      return;
    }
    
    const newContact: EmergencyContact = {
      id: Date.now().toString(),
      name: contactName.trim(),
      phone: contactPhone.trim(),
      email: contactEmail.trim().toLowerCase()
    };
    
    // Adiciona o contato à lista
    setEmergencyContacts(prev => [...prev, newContact]);
    
    // LIMPA OS CAMPOS APÓS ADICIONAR COM SUCESSO
    setContactName('');
    setContactPhone('');
    setContactEmail('');
    setError(null);
    
    // Devolve o foco para o campo de nome para facilitar a adição de novos contatos
    if (contactNameRef.current) {
      contactNameRef.current.focus();
    }
  };

  const removeContact = (id: string) => {
    setEmergencyContacts(prev => prev.filter(c => c.id !== id));
  };

  const initiateCall = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    window.location.href = `tel:${digits}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !nascimento.trim()) {
      setError("Seu nome e data de nascimento são obrigatórios.");
      return;
    }
    if (vacinado === null) {
      setError("Informe se você foi vacinado contra a gripe este ano.");
      return;
    }
    if (emergencyContacts.length === 0) {
      setError("Adicione pelo menos um contato de emergência para sua segurança.");
      return;
    }
    
    onSave({
      nome: nome.trim(),
      nascimento: nascimento.trim(),
      cpf: cpf.trim(),
      vacinado,
      emergencyContacts
    });
  };

  return (
    <div className="px-4 animate-fadeIn pb-10">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">Identificação</h2>
        <p className="text-gray-400 text-sm leading-relaxed">
          Para garantir sua segurança durante o acompanhamento, precisamos do seu registro básico e contatos de confiança.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <UserIcon size={14} className="text-blue-500" />
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Seus Dados Pessoais</label>
          </div>
          <div className="space-y-3">
            <input
              type="text"
              value={nome}
              onChange={(e) => { setNome(e.target.value); if (error) setError(null); }}
              placeholder="Nome Completo"
              className="w-full bg-[#1A1A1A] border border-gray-800 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={nascimento}
                onChange={(e) => { setNascimento(e.target.value); if (error) setError(null); }}
                placeholder="Nascimento (DD/MM/AAAA)"
                className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              />
              <input
                type="text"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                placeholder="CPF (opcional)"
                className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Syringe size={14} className="text-blue-500" />
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Vacinado contra a gripe este ano?</label>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setVacinado(true); if (error) setError(null); }}
              className={`flex-1 py-4 rounded-xl border font-semibold transition-all ${
                vacinado === true 
                  ? 'bg-blue-600 border-blue-500 text-white' 
                  : 'bg-[#1A1A1A] border-gray-800 text-gray-400 hover:border-gray-700'
              }`}
            >
              Sim
            </button>
            <button
              type="button"
              onClick={() => { setVacinado(false); if (error) setError(null); }}
              className={`flex-1 py-4 rounded-xl border font-semibold transition-all ${
                vacinado === false 
                  ? 'bg-blue-600 border-blue-500 text-white' 
                  : 'bg-[#1A1A1A] border-gray-800 text-gray-400 hover:border-gray-700'
              }`}
            >
              Não
            </button>
          </div>
        </div>

        <div className="bg-[#1E1E1E]/50 border border-gray-800 p-5 rounded-2xl space-y-4 shadow-inner">
          <div className="flex items-center gap-2 mb-1">
            <Phone size={14} className="text-blue-500" />
            <label className="text-xs font-bold text-blue-500 uppercase tracking-wider">Adicionar Contato de Emergência</label>
          </div>
          <div className="space-y-3">
            <input
              ref={contactNameRef}
              type="text"
              value={contactName}
              onChange={(e) => { setContactName(e.target.value); if (error) setError(null); }}
              placeholder="Nome do Contato (ex: Esposa, Mãe)"
              className="w-full bg-[#252525] border border-gray-700 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-400 transition-all"
            />
            
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => { setContactEmail(e.target.value); if (error) setError(null); }}
              placeholder="E-mail do Contato"
              className="w-full bg-[#252525] border border-gray-700 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-400 transition-all"
            />

            <div className="flex gap-2">
              <input
                type="tel"
                value={contactPhone}
                onChange={handlePhoneChange}
                placeholder="(XX) 9XXXX-XXXX"
                className="flex-1 bg-[#252525] border border-gray-700 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-400 transition-all"
              />
              <button
                type="button"
                onClick={addContact}
                className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-900/20"
                title="Adicionar à lista"
              >
                <Plus size={24} />
              </button>
            </div>
            <p className="text-[9px] text-gray-500 italic px-1">O número deve incluir o DDD e seguir o padrão nacional.</p>
          </div>
        </div>

        {emergencyContacts.length > 0 ? (
          <div className="space-y-3 animate-slideIn">
            <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1 flex justify-between items-center">
              Contatos Registrados
              <span className="bg-blue-900/40 text-blue-400 px-2 py-0.5 rounded-full text-[9px]">{emergencyContacts.length}</span>
            </h4>
            <div className="space-y-2">
              {emergencyContacts.map((contact) => (
                <div 
                  key={contact.id} 
                  className="flex items-center justify-between bg-[#1E1E1E] border border-gray-800 p-4 rounded-2xl group transition-all hover:border-gray-700"
                >
                  <div className="flex items-center gap-4 overflow-hidden">
                    <div className="bg-blue-900/20 p-2.5 rounded-xl shrink-0">
                      <UserIcon size={16} className="text-blue-400" />
                    </div>
                    <div className="overflow-hidden">
                      <div className="text-sm font-semibold text-white truncate">{contact.name}</div>
                      <div className="flex flex-col gap-0.5 mt-0.5">
                        <div className="text-[10px] text-gray-500 flex items-center gap-1.5">
                          <Phone size={10} className="opacity-50" /> {contact.phone}
                        </div>
                        <div className="text-[10px] text-gray-500 flex items-center gap-1.5 truncate">
                          <Mail size={10} className="opacity-50" /> {contact.email}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => initiateCall(contact.phone)}
                      className="text-blue-500 hover:bg-blue-500/10 p-2.5 rounded-xl transition-all"
                      title={`Ligar para ${contact.name}`}
                    >
                      <Phone size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeContact(contact.id)}
                      className="text-gray-600 hover:text-red-500 hover:bg-red-500/10 p-2.5 rounded-xl transition-all shrink-0"
                      title="Remover contato"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-8 text-center border-2 border-dashed border-gray-800 rounded-2xl">
             <p className="text-xs text-gray-600">Nenhum contato adicionado ainda.</p>
          </div>
        )}

        {error && (
          <div className="bg-red-900/20 border border-red-500/30 p-4 rounded-xl text-red-400 text-xs flex items-center gap-3 animate-shake">
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="pt-4">
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-5 rounded-2xl transition-all shadow-xl shadow-blue-900/20 active:scale-[0.98] flex items-center justify-center gap-2 group"
          >
            Finalizar Registro
            <Plus size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
          <p className="text-[10px] text-gray-600 text-center mt-4 uppercase tracking-tighter">
            Seus dados são armazenados localmente e protegidos.
          </p>
        </div>
      </form>
    </div>
  );
};

export default Registration;
