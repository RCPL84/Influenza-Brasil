export interface HistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

export const getHealthChatResponse = async (userMessage: string, history?: HistoryItem[]) => {
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMessage, history })
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Chat proxy returned error:', err);
      return 'Erro: falha na comunicação com o serviço de IA.';
    }

    const data = await res.json();
    return data.reply ?? '';
  } catch (error) {
    console.error('getHealthChatResponse error:', error);
    return 'Erro de conexão com o serviço de IA.';
  }
};
