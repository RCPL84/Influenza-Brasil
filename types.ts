
export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  email: string;
}

export interface UserData {
  nome: string;
  nascimento: string;
  cpf: string;
  vacinado: boolean;
  emergencyContacts: EmergencyContact[];
}

export interface Symptoms {
  inicioSubito: boolean;
  febreAlta: boolean;
  doresCorpo: boolean;
  faltaAr: boolean;
}

export enum AppPhase {
  WELCOME = 'welcome',
  REGISTRATION = 'registration',
  TRIAGE = 'triage',
  PHASE1_ORIENTATION = 'phase1_orientation',
  PHASE2_MANAGEMENT = 'phase2_management',
  CHAT = 'chat',
  DIAGNOSTICS = 'diagnostics'
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  time: string;
  nextTime: string;
}
