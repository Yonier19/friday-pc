import React, { useState, useRef, useEffect } from 'react';
import { 
  Mic, 
  MicOff, 
  Send, 
  Sparkles, 
  Trash2, 
  Flame, 
  ExternalLink,
  HelpCircle,
  Clock,
  Compass
} from 'lucide-react';
import { ChatMessage, ListeningState, OrbThemeColor, AISettings } from '../types/assistant';
import { ViernesOrb } from './ViernesOrb';
import { ChatMessageItem } from './ChatMessageItem';
import { audioService } from '../services/audioService';

interface MainScreenProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  listeningState: ListeningState;
  onToggleListening: () => void;
  onClearChat: () => void;
  settings: AISettings;
  onExecuteAction: (action: any) => void;
  transcriptInterim: string;
}

export const MainScreen: React.FC<MainScreenProps> = ({
  messages,
  onSendMessage,
  listeningState,
  onToggleListening,
  onClearChat,
  settings,
  onExecuteAction,
  transcriptInterim,
}) => {
  const [inputText, setInputText] = useState('');
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, transcriptInterim]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const sampleSuggestions = [
    'Oye Viernes, ¿cuál es el clima de hoy?',
    '¿Cuáles son las noticias más recientes del mundo?',
    'Léeme las notificaciones pendientes',
    'Abre YouTube y busca música lofi',
    'Pon un temporizador de 5 minutos',
    'Recuerda que mi comida favorita es sushi',
    'Abre Spotify',
    '¿Cuál es el valor del dólar y bitcoin hoy?',
    'Calcula 350 * 1.21',
    '¿Quién eres y qué puedes hacer?',
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative">
      {/* Upper Section: Holographic Viernes Orb & Command Hub */}
      <div className="flex flex-col items-center justify-center pt-3 pb-2 px-4 shrink-0 relative">
        <ViernesOrb
          state={listeningState}
          theme={settings.orbTheme}
          size={190}
          onClick={onToggleListening}
        />

        {/* Live speech transcription badge when speaking */}
        {listeningState === 'LISTENING' && transcriptInterim && (
          <div className="mt-2 px-4 py-1.5 rounded-full bg-red-950/70 border border-red-500/50 text-red-200 text-xs font-rajdhani flex items-center space-x-2 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
            <span>Escuchando: &quot;{transcriptInterim}&quot;</span>
          </div>
        )}

        {/* Quick action chips */}
        <div className="w-full max-w-3xl mt-3 flex items-center space-x-2 overflow-x-auto scrollbar-none py-1 px-2">
          {sampleSuggestions.map((sugg, idx) => (
            <button
              key={idx}
              onClick={() => onSendMessage(sugg)}
              className="shrink-0 px-3 py-1 rounded-full bg-slate-900/80 hover:bg-cyan-950/80 border border-slate-700/80 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-200 text-xs font-rajdhani transition-all flex items-center space-x-1.5 backdrop-blur-sm"
            >
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>{sugg}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Middle Section: Chat Logs */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-2 max-w-4xl w-full mx-auto" ref={chatScrollRef}>
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 font-rajdhani">
            <div className="w-14 h-14 rounded-full bg-cyan-950/30 border border-cyan-800/40 flex items-center justify-center mb-3 text-cyan-400">
              <Sparkles className="w-7 h-7" />
            </div>
            <h3 className="font-orbitron font-semibold text-white text-base mb-1">
              PROTOCOLOS DE ASISTENCIA LISTOS
            </h3>
            <p className="text-xs max-w-md text-slate-400 mb-4">
              Puedes hablar diciendo &quot;Oye Viernes&quot;, tocar el orbe central, o escribir tu comando en la consola inferior.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/60 text-xs font-rajdhani text-slate-400">
              <span>Registro de Sesión Activa</span>
              <button
                onClick={onClearChat}
                className="flex items-center space-x-1 text-slate-500 hover:text-red-400 transition-colors"
                title="Limpiar registro"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpiar</span>
              </button>
            </div>

            {messages.map((msg) => (
              <ChatMessageItem
                key={msg.id}
                message={msg}
                theme={settings.orbTheme}
                onExecuteAction={onExecuteAction}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom Command Prompt Input Bar */}
      <div className="p-3 sm:p-4 bg-slate-950/90 border-t border-cyan-900/40 backdrop-blur-md shrink-0">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex items-center space-x-2">
          {/* Mic Toggle Button */}
          <button
            type="button"
            onClick={onToggleListening}
            className={`p-3 rounded-xl border transition-all flex items-center justify-center shrink-0 ${
              listeningState === 'LISTENING'
                ? 'bg-red-600 text-white border-red-400 shadow-lg shadow-red-500/40 animate-pulse'
                : 'bg-slate-900 hover:bg-cyan-950 text-cyan-300 border-cyan-700/50 hover:border-cyan-400 shadow-md'
            }`}
            title={listeningState === 'LISTENING' ? 'Detener micrófono' : 'Hablar con Viernes'}
          >
            {listeningState === 'LISTENING' ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Text Input */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder='Instruye a Viernes... ej: "Oye Viernes, recuérdame..." o "Abre Spotify"'
              className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-slate-700 focus:border-cyan-400 text-white placeholder-slate-500 text-sm font-rajdhani font-medium tracking-wide focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all"
            />
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:hover:bg-cyan-600 text-white font-rajdhani font-semibold border border-cyan-400/40 transition-all flex items-center justify-center shadow-lg shadow-cyan-900/30"
            title="Enviar comando"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};
