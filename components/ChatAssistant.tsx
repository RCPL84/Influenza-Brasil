
import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2 } from 'lucide-react';
import { getHealthChatResponse } from '../services/geminiService';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  onBack: () => void;
}

const ChatAssistant: React.FC<Props> = ({ onBack }) => {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', content: 'Olá! Sou seu assistente de saúde Influenza Care. Como posso ajudar você hoje com seus sintomas ou cuidados?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Fix: Format history correctly for the SDK (parts must be an array of objects with 'text')
    const history = messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    }));

    const response = await getHealthChatResponse(input, history);
    
    setMessages(prev => [...prev, { 
      id: (Date.now() + 1).toString(), 
      role: 'assistant', 
      content: response 
    }]);
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-full animate-fadeIn max-h-[75vh]">
      <div className="mb-4">
        <h3 className="font-bold text-lg text-blue-500">Assistente de Saúde</h3>
        <p className="text-xs text-gray-500 tracking-tight">Respostas baseadas em protocolos médicos de Influenza.</p>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 scroll-smooth"
      >
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-2xl flex gap-3 ${
              m.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-none shadow-md shadow-blue-900/10' 
                : 'bg-[#1E1E1E] text-gray-200 border border-gray-800 rounded-tl-none'
            }`}>
              <div className="shrink-0 mt-1">
                {m.role === 'user' ? <User size={14} /> : <Bot size={14} className="text-blue-400" />}
              </div>
              <div className="text-sm leading-relaxed whitespace-pre-line">{m.content}</div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-[#1E1E1E] p-4 rounded-2xl rounded-tl-none border border-gray-800">
              <Loader2 className="animate-spin text-blue-400" size={20} />
            </div>
          </div>
        )}
      </div>

      <div className="relative mt-auto">
        <input 
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Tire suas dúvidas..."
          className="w-full bg-[#1E1E1E] border border-gray-800 rounded-2xl py-4 pl-6 pr-14 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
        />
        <button 
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className="absolute right-2 top-2 p-2 bg-blue-600 rounded-xl text-white hover:bg-blue-500 disabled:opacity-50 transition-all active:scale-90"
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
};

export default ChatAssistant;
