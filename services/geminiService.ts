
import { GoogleGenAI, Type } from "@google/genai";
import { Symptoms } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Fix: Added thinkingConfig: { thinkingBudget: 0 } when setting maxOutputTokens as per SDK guidelines to ensure immediate response for connectivity check.
export const checkConnectivity = async (): Promise<boolean> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: 'Respond with "OK" only.',
      config: { 
        maxOutputTokens: 5,
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return response.text?.trim().includes("OK") || false;
  } catch (error) {
    console.error("Connectivity check failed:", error);
    return false;
  }
};

export const analyzeLogs = async (logs: string) => {
  const prompt = `
    Aja como um Arquiteto Cloud Native Sênior. Analise o erro 'HealthCheckContainerError' no Cloud Run.
    
    CRITÉRIOS DE ANÁLISE:
    1. Bind: Localize indícios de listen em 127.0.0.1 ou localhost.
    2. Port: Verifique se o log menciona portas fixas ignorando a variável PORT.
    3. Architecture: Identifique 'exec format error'.
    
    LOGS:
    ${logs}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Log analysis error:", error);
    return "Erro técnico na análise de logs.";
  }
};

export const generateFixScript = async (logs: string) => {
  const prompt = `
    Gere a solução arquitetural definitiva para HealthCheckContainerError.
    
    VEREDITO OBRIGATÓRIO:
    "Ajustar o Bind para 0.0.0.0 e garantir que a porta lida seja a $PORT resolverá 90% dos casos."

    INCLUA NO CÓDIGO:
    - server.ts: express.listen(PORT, '0.0.0.0') + Graceful Shutdown.
    - Dockerfile: --platform=linux/amd64 + dumb-init.
    - Explicação sobre Isolamento de Namespace de Rede.

    Logs de contexto: ${logs}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Fix script generation error:", error);
    return "Falha ao gerar o blueprint de correção técnica.";
  }
};

export const analyzeSymptoms = async (symptoms: Symptoms, userName: string) => {
  const prompt = `
    Aja como um assistente médico especializado em Influenza. 
    Analise os sintomas de ${userName}:
    - Início súbito: ${symptoms.inicioSubito ? 'Sim' : 'Não'}
    - Febre Alta: ${symptoms.febreAlta ? 'Sim' : 'Não'}
    - Dores no corpo: ${symptoms.doresCorpo ? 'Sim' : 'Não'}
    - Falta de ar: ${symptoms.faltaAr ? 'Sim' : 'Não'}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Symptom analysis error:", error);
    return "Análise de triagem indisponível.";
  }
};

// Fix: Properly typed history to match SDK requirements and passed it to ai.chats.create to maintain conversation context.
export const getHealthChatResponse = async (userMessage: string, history: { role: string, parts: { text: string }[] }[]) => {
  const chat = ai.chats.create({
    model: 'gemini-3-flash-preview',
    // Including history to maintain state in the chat session
    config: {
      systemInstruction: `Você é um Arquiteto Cloud Native Sênior. 
      Sua prioridade máxima é resolver o HealthCheckContainerError.
      Ensine:
      1. Bind em 0.0.0.0 (Obrigatório).
      2. Leitura de process.env.PORT.
      3. Build linux/amd64.
      4. Uso do Logs Explorer.`,
    },
  });

  try {
    const response = await chat.sendMessage({ message: userMessage });
    return response.text;
  } catch (error) {
    console.error("Chat error:", error);
    return "Erro de conexão com o console de IA.";
  }
};
