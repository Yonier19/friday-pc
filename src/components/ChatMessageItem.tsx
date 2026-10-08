import React, { useState } from 'react';
import { Volume2, Copy, Check, ExternalLink, Zap, Globe, Sparkles } from 'lucide-react';
import { ChatMessage, OrbThemeColor } from '../types/assistant';
import { AuraAvatar } from './AuraAvatar';
import { audioService } from '../services/audioService';

interface ChatMessageItemProps {
  message: ChatMessage;
  theme: OrbThemeColor;
  onExecuteAction?: (action: any) => void;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  theme,
  onExecuteAction,
}) => {
  const isViernes = message.sender === 'viernes';
  const [copied, setCopied] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePlayVoice = () => {
    setIsPlayingAudio(true);
    let speechText = message.text;
    if (message.sources && message.sources.length > 0) {
      const sourceList = message.sources.slice(0, 2).map((s) => s.title).join(' y ');
      speechText += ` Información fundamentada en fuentes como ${sourceList}.`;
    }

    audioService.speak(speechText, {
      onEnd: () => setIsPlayingAudio(false),
      onError: () => setIsPlayingAudio(false),
    });
  };

  const openSourceLink = (url: string) => {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI && typeof electronAPI.openExternal === 'function') {
      electronAPI.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`flex w-full space-x-3 my-3.5 ${isViernes ? 'justify-start' : 'justify-end'}`}>
      {isViernes && <AuraAvatar sender="viernes" theme={theme} isSpeaking={isPlayingAudio} />}

      <div
        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 transition-all ${
          isViernes
            ? 'bg-slate-900/90 border border-cyan-500/30 text-slate-100 shadow-lg shadow-cyan-950/40 rounded-tl-sm'
            : 'bg-cyan-950/80 border border-cyan-600/40 text-cyan-50 shadow-md shadow-cyan-900/30 rounded-tr-sm ml-auto'
        }`}
      >
        {/* Header line with Sender name & Time */}
        <div className="flex items-center justify-between space-x-4 mb-1.5 text-[11px] font-rajdhani text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="font-orbitron font-semibold text-cyan-300 tracking-wider">
              {isViernes ? 'VIERNES // ASISTENTE' : 'COMANDO USUARIO'}
            </span>
            {message.source === 'gemini_search' && (
              <span className="inline-flex items-center space-x-1 px-1.5 py-0.2 rounded bg-cyan-950/80 border border-cyan-400/40 text-[9px] font-orbitron text-cyan-300">
                <Globe className="w-2.5 h-2.5 text-cyan-400" />
                <span>BÚSQUEDA WEB</span>
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-500">{formattedTime}</span>
        </div>

        {/* Message Content */}
        <div className="text-sm leading-relaxed font-rajdhani font-medium whitespace-pre-wrap break-words">
          {message.text}
        </div>

        {/* Grounding Sources (Google Search) */}
        {message.sources && message.sources.length > 0 && (
          <div className="mt-3 pt-2.5 border-t border-slate-800/80">
            <div className="flex items-center space-x-1.5 text-[11px] font-orbitron text-cyan-400 mb-1.5">
              <Globe className="w-3.5 h-3.5" />
              <span>FUENTES DE INFORMACIÓN EN VIVO:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {message.sources.map((src, i) => (
                <button
                  key={i}
                  onClick={() => openSourceLink(src.url)}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-950/90 hover:bg-cyan-950/80 border border-slate-700/80 hover:border-cyan-400/50 text-[11px] text-slate-300 hover:text-cyan-200 transition-colors"
                  title={src.url}
                >
                  <span className="truncate max-w-[200px]">{src.title}</span>
                  <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-60" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action Badge & Interactive Trigger */}
        {message.action && (
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-cyan-950/80 border border-cyan-500/50 text-[11px] font-orbitron text-cyan-300">
              <Zap className="w-3 h-3 text-cyan-400" />
              <span>
                ACCIÓN: {message.action.type}{' '}
                {message.action.app ? `(${message.action.app.toUpperCase()})` : ''}
              </span>
            </div>

            {onExecuteAction && (
              <button
                onClick={() => onExecuteAction(message.action)}
                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-400/40 text-[11px] font-rajdhani font-semibold text-white transition-colors"
              >
                <span>Desplegar</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {/* Footer Toolbar: Voice Replay & Copy */}
        <div className="mt-2.5 pt-1.5 flex items-center justify-end space-x-3 text-[11px] text-slate-500">
          {isViernes && (
            <button
              onClick={handlePlayVoice}
              className={`flex items-center space-x-1 hover:text-cyan-300 transition-colors ${
                isPlayingAudio ? 'text-cyan-400 animate-pulse font-semibold' : ''
              }`}
              title="Escuchar respuesta"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>{isPlayingAudio ? 'Reproduciendo...' : 'Escuchar'}</span>
            </button>
          )}

          <button
            onClick={handleCopy}
            className="flex items-center space-x-1 hover:text-cyan-300 transition-colors"
            title="Copiar texto"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copiado' : 'Copiar'}</span>
          </button>
        </div>
      </div>

      {!isViernes && <AuraAvatar sender="user" />}
    </div>
  );
};
