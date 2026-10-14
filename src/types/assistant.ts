export type ListeningState = 'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING';

export type MemoryType = 'PREFERENCE' | 'CONTACT_ALIAS' | 'ROUTINE' | 'COMMAND_HISTORY' | 'FACT';

export interface MemoryItem {
  id: string;
  title: string;
  content: string;
  type: MemoryType;
  category?: string;
  confidence: number;
  timestamp: number;
  accessCount: number;
}

export interface RoutineStep {
  id: string;
  action: 'OPEN_APP' | 'SPEAK' | 'TIMER' | 'COMMAND';
  target?: string;
  payload?: string;
}

export interface RoutineItem {
  id: string;
  name: string;
  triggerPhrase: string;
  description: string;
  enabled: boolean;
  steps: RoutineStep[];
}

export interface GroundingSource {
  title: string;
  url: string;
}

export interface WindowsNotification {
  id: string;
  app: string;
  title: string;
  text: string;
  timestamp: number;
  read?: boolean;
}

export type ResponseTier = 'web' | 'gemini' | 'gemini_lite' | 'local' | 'emergency' | 'cache';
export type ConfidenceLevel = 'alta' | 'media' | 'baja';
export type ResponseLength = 'breve' | 'normal' | 'detallada';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'viernes';
  text: string;
  timestamp: number;
  intent?: string;
  action?: {
    type: string;
    app?: string;
    query?: string;
    name?: string;
    seconds?: number;
    title?: string;
    content?: string;
  };
  sources?: GroundingSource[];
  source?: 'gemini' | 'gemini_search' | 'local_subsystem' | 'gemini_lite' | 'emergency';
  tier?: ResponseTier;
  confidence?: ConfidenceLevel;
  disclaimer?: string;
  clarificationQuestion?: string;
  isCorrection?: boolean;
  isStreaming?: boolean;
}

export type OrbThemeColor = 'cyan' | 'amethyst' | 'gold' | 'emerald';

export interface AISettings {
  provider: 'gemini' | 'local' | 'custom';
  model: string;
  fallbackModel?: string;
  autoWebSearch?: boolean;
  responseLength?: ResponseLength;
  userCity?: string;
  userTimezone?: string;
  customApiKey: string;
  customEndpoint: string;
  wakeWord: string;
  wakeWordActive: boolean;
  continuousListening: boolean;
  voiceRate: number;
  voicePitch: number;
  voiceVolume: number;
  voiceName: string;
  autoSpeak: boolean;
  soundEffects: boolean;
  orbTheme: OrbThemeColor;
  personality: 'stark' | 'formal' | 'friendly' | 'concise';
  voiceEngine?: 'electron_gemini' | 'browser_speech' | 'edge_launcher';
  
  // Windows & Desktop Features
  startWithWindows?: boolean;
  minimizeToTray?: boolean;
  windowsNotificationsEnabled?: boolean;
  notificationAutoReadApps?: string[];
  notificationAllowedApps?: string[];
  notificationBlockedApps?: string[];
  privacyNoticeAccepted?: boolean;
  proxyUrl?: string;
}

export interface SystemTelemetry {
  status: 'ONLINE' | 'STANDBY' | 'ENGAGED';
  coreVersion: string;
  battery: number;
  quantumSync: number;
  residentService: boolean;
  internetStatus?: 'ONLINE' | 'OFFLINE' | 'RECONNECTING';
}
