
import React, { useState, useEffect } from 'react';
import { checkConnectivity } from '../services/geminiService';
import { 
  Copy,
  Terminal,
  Zap,
  ArrowRight,
  Info,
  ExternalLink,
  Code2,
  Lock,
  Settings,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Monitor,
  Command,
  HelpCircle,
  ShieldAlert,
  Bug,
  FileCode,
  FileJson,
  XCircle,
  Check
} from 'lucide-react';

const SystemStatus: React.FC = () => {
  const [geminiOk, setGeminiOk] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [projectId, setProjectId] = useState('');
  const [region] = useState('us-central1');
  const [repoName] = useState('apps');
  const [appName] = useState('influenza-care');
  const [copied, setCopied] = useState<string | null>(null);

  const runDiagnostics = async () => {
    setChecking(true);
    const result = await checkConnectivity();
    setGeminiOk(result);
    setChecking(false);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const dockerfileContent = `# Imagem base SLIM para evitar erros de syscall (clone3) e locks de /etc/passwd
FROM node:20-slim

# Instala o dumb-init para gerenciamento correto de sinais (SIGTERM)
RUN apt-get update && \\
    apt-get install -y --no-install-recommends dumb-init && \\
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install --only=production
COPY . .

ENV PORT 8080
EXPOSE 8080

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "server.js"]`;

  const fullImagePath = `${region}-docker.pkg.dev/${projectId || '[PROJECT_ID]'}/${repoName}/${appName}:v1`;

  return (
    <div className="px-4 animate-fadeIn pb-32">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tighter italic">OPS CONSOLE</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="bg-red-600 text-[10px] font-black px-2 py-0.5 rounded text-white italic uppercase tracking-widest">Erro Detectado</span>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Lock /etc/passwd Fix</p>
          </div>
        </div>
        <div className="bg-red-600 p-2 rounded-2xl shadow-lg shadow-red-900/40">
          <Bug size={20} className="text-white" />
        </div>
      </div>

      {/* Critical Alert Card */}
      <div className="mb-8 bg-red-950/20 border border-red-500/30 rounded-3xl p-6 shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4 opacity-5">
            <XCircle size={100} />
        </div>
        <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="text-red-500" size={24} />
            <h3 className="font-bold text-red-200">Por que o erro ocorre?</h3>
        </div>
        <p className="text-xs text-red-100/70 leading-relaxed mb-4">
            O instalador tenta usar funções de sistema modernas (<code className="bg-red-900/40 px-1 rounded">clone3</code>) que sua versão do Docker não conhece. Isso trava a edição de usuários no sistema.
        </p>
        <div className="space-y-2">
            <div className="flex items-center gap-2 text-[10px] text-red-400 font-bold uppercase">
                <Check size={12} /> A solução é usar imagens -slim
            </div>
            <div className="flex items-center gap-2 text-[10px] text-red-400 font-bold uppercase">
                <Check size={12} /> Evitar pacotes de sistema desnecessários
            </div>
        </div>
      </div>

      {/* Action 1: Replace Dockerfile */}
      <div className="mb-8 bg-[#1A1A1A] border border-green-500/30 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="p-6 bg-green-600/10 border-b border-green-500/20 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-green-600 p-2 rounded-xl text-white shadow-lg"><FileCode size={18} /></div>
            <h3 className="text-xs font-black text-white uppercase tracking-widest">1. Atualizar Dockerfile</h3>
          </div>
          <button 
            onClick={() => copyToClipboard(dockerfileContent, 'dockerfile')}
            className={`text-[10px] font-bold px-3 py-1 rounded-full transition-all flex items-center gap-1 ${copied === 'dockerfile' ? 'bg-green-600 text-white' : 'text-green-400 border border-green-500/30 hover:bg-green-500/10'}`}
          >
            {copied === 'dockerfile' ? <><Check size={12} /> COPIADO</> : <><Copy size={12} /> COPIAR FIX</>}
          </button>
        </div>
        <div className="p-6">
          <p className="text-[10px] text-gray-400 mb-4 leading-relaxed">
            Abra seu arquivo <code className="text-green-500 font-mono">Dockerfile</code> e cole o código abaixo. Ele já inclui o <code className="text-blue-400">node:20-slim</code> para pular o erro de lock.
          </p>
          <div className="bg-black rounded-xl p-4 border border-gray-800 relative group">
            <pre className="text-[9px] text-gray-300 font-mono leading-tight overflow-x-auto whitespace-pre">
              {dockerfileContent}
            </pre>
          </div>
        </div>
      </div>

      {/* Action 2: Build Command */}
      <div className="mb-8 bg-[#1A1A1A] border border-blue-500/30 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="p-6 bg-blue-600/10 border-b border-blue-500/20">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg"><Terminal size={18} /></div>
            <h3 className="text-xs font-black text-white uppercase tracking-widest">2. Rodar Build Seguro</h3>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-2">
             <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 text-xs">Seu Project ID do GCP</label>
             <input 
              type="text"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              placeholder="influenza-care-440121"
              className="w-full bg-black border border-gray-800 rounded-xl p-4 text-sm font-mono text-blue-400 focus:outline-none focus:border-blue-500 transition-all placeholder:opacity-30"
            />
          </div>

          <div className="bg-black rounded-2xl border border-gray-800 overflow-hidden relative group">
            <div className="p-5 pr-14">
              <code className="text-[10px] text-gray-300 break-all leading-relaxed font-mono">
                docker build <span className="text-blue-500">--platform linux/amd64</span> <span className="text-purple-400">-t</span> {fullImagePath} <span className="text-green-500">.</span>
              </code>
            </div>
            <button 
              disabled={!projectId}
              onClick={() => copyToClipboard(`docker build --platform linux/amd64 -t ${fullImagePath} .`, 'build')}
              className={`absolute top-1/2 -translate-y-1/2 right-3 p-3 rounded-xl transition-all shadow-xl ${projectId ? 'bg-blue-600 text-white hover:bg-blue-500 scale-110' : 'bg-gray-800 text-gray-600 cursor-not-allowed'} ${copied === 'build' ? 'bg-green-600' : ''}`}
            >
              {copied === 'build' ? <Check size={18} /> : <Copy size={18} />}
            </button>
          </div>
        </div>
      </div>

      <div className="text-center pb-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-black/40 rounded-full border border-gray-800">
          <div className={`w-2 h-2 rounded-full ${geminiOk ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
          <span className="text-[9px] font-bold text-gray-500 uppercase tracking-[0.2em]">
             {checking ? 'Checking Connection...' : (geminiOk ? 'Cloud Engine Sync OK' : 'Local Docker Warning')}
          </span>
        </div>
      </div>
    </div>
  );
};

export default SystemStatus;
