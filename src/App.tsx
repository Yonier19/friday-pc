/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ViernesTopBar } from './components/ViernesTopBar';
import { MainScreen } from './components/MainScreen';
import { MemoryScreen } from './components/MemoryScreen';
import { AutomationScreen } from './components/AutomationScreen';
import { PermissionsScreen } from './components/PermissionsScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { NotificationsPanel } from './components/NotificationsPanel';
import { TimerWidget } from './components/Widgets/TimerWidget';
import { CalculatorWidget } from './components/Widgets/CalculatorWidget';
import { NotesWidget } from './components/Widgets/NotesWidget';
import { 
  ChatMessage, 
  ListeningState, 
  MemoryItem, 
  RoutineItem, 
  AISettings, 
  SystemTelemetry,
  WindowsNotification 
} from './types/assistant';
import { memoryStorage, DEFAULT_SETTINGS } from './services/memoryStorage';
import { audioService } from './services/audioService';
import { IntentRouter } from './services/intentRouter';
import { AlertTriangle, Settings as SettingsIcon } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'assistant' | 'memory' | 'automation' | 'permissions' | 'settings' | 'notifications'>('assistant');
  const [listeningState, setListeningState] = useState<ListeningState>('IDLE');
  const [transcriptInterim, setTranscriptInterim] = useState('');
  const [thinkingStatus, setThinkingStatus] = useState('Pensando...');
  const [isMuted, setIsMuted] = useState(false);
  const [isResidentActive, setIsResidentActive] = useState(false);
  const [internetStatus, setInternetStatus] = useState<'ONLINE' | 'OFFLINE' | 'RECONNECTING'>('ONLINE');
  const [isKeyConfigured, setIsKeyConfigured] = useState(true);

  // Notifications State
  const [notifications, setNotifications] = useState<WindowsNotification[]>([]);

  // Data States
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [routines, setRoutines] = useState<RoutineItem[]>([]);
  const [settings, setSettings] = useState<AISettings>(DEFAULT_SETTINGS);
  const [telemetry, setTelemetry] = useState<SystemTelemetry>({
    status: 'ONLINE',
    coreVersion: 'v4.2.0-STARK',
    battery: 98,
    quantumSync: 99.4,
    residentService: false,
    internetStatus: 'ONLINE',
  });

  // Active Widgets
  const [activeTimer, setActiveTimer] = useState<{ seconds: number; label: string } | null>(null);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);

  // Chat message history
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-msg',
      sender: 'viernes',
      text: 'Sistemas en línea, jefe. Protocolos tácticos activos. Soy Viernes, tu interfaz de asistencia e inteligencia personal de Industrias Stark. Conexión satelital y motor de respuesta universal listos. ¿En qué puedo asistirte hoy?',
      timestamp: Date.now(),
      intent: 'GREETING',
      confidence: 'alta',
      tier: 'local',
    },
  ]);

  // Load stored data on mount
  useEffect(() => {
    const loadedMemories = memoryStorage.getMemories();
    const loadedRoutines = memoryStorage.getRoutines();
    const loadedSettings = memoryStorage.getSettings();
    const loadedTelemetry = memoryStorage.getTelemetry();

    setMemories(loadedMemories);
    setRoutines(loadedRoutines);
    setSettings(loadedSettings);
    setTelemetry(loadedTelemetry);

    // Verificar si la API key está configurada en UserData o servidor
    fetch('/api/assistant/config/apikey')
      .then((res) => res.json())
      .then((data) => {
        setIsKeyConfigured(!!data.isConfigured);
      })
      .catch(() => {});
  }, []);

  // Monitor Real Outgoing Internet Connection & Reconnection with Backoff (Requisito 3)
  useEffect(() => {
    let isMounted = true;
    let timer: any = null;
    let currentDelay = 15000;

    const probeInternet = async () => {
      try {
        const res = await fetch('/api/assistant/check-internet');
        if (!isMounted) return;
        if (res.ok) {
          const data = await res.json();
          if (data.online) {
            setInternetStatus('ONLINE');
            currentDelay = 15000;
          } else {
            setInternetStatus((prev) => (prev === 'ONLINE' ? 'RECONNECTING' : 'OFFLINE'));
            // Backoff exponencial ante fallos: 4s -> 8s -> 15s máx
            currentDelay = Math.min(currentDelay * 1.5, 20000);
          }
        } else {
          setInternetStatus('OFFLINE');
          currentDelay = 6000;
        }
      } catch {
        if (isMounted) {
          setInternetStatus('OFFLINE');
          currentDelay = 6000;
        }
      } finally {
        if (isMounted) {
          timer = setTimeout(probeInternet, currentDelay);
        }
      }
    };

    const handleOnline = () => {
      setInternetStatus('RECONNECTING');
      if (timer) clearTimeout(timer);
      probeInternet();
    };

    const handleOffline = () => {
      setInternetStatus('OFFLINE');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Ejecución inicial inmediata
    probeInternet();

    return () => {
      isMounted = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (timer) clearTimeout(timer);
    };
  }, []);

  // Listen for Windows Notifications via Electron IPC (or load recent)
  useEffect(() => {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI) {
      if (typeof electronAPI.getRecentNotifications === 'function') {
        electronAPI.getRecentNotifications().then((list: WindowsNotification[]) => {
          if (Array.isArray(list) && list.length > 0) {
            setNotifications(list);
          }
        });
      }

      if (typeof electronAPI.onNotificationReceived === 'function') {
        const unsubscribe = electronAPI.onNotificationReceived((notif: WindowsNotification) => {
          setNotifications((prev) => [notif, ...prev.filter(n => n.id !== notif.id)]);
          
          // Auto-read aloud if app is in notificationAutoReadApps
          const autoReadList = settings.notificationAutoReadApps || ['whatsapp'];
          if (autoReadList.map(a => a.toLowerCase()).includes(notif.app.toLowerCase())) {
            audioService.speak(`Nueva notificación de ${notif.app}. ${notif.title}: ${notif.text}`);
          }
        });
        return () => {
          if (typeof unsubscribe === 'function') unsubscribe();
        };
      }
    }
  }, [settings.notificationAutoReadApps]);

  // Initialize Speech Recognition
  useEffect(() => {
    audioService.initSpeechRecognition(
      {
        onWakeWordDetected: () => {
          if (settings.soundEffects) audioService.playActivationSound();
          setListeningState('LISTENING');
        },
        onTranscript: (text, isFinal) => {
          if (isFinal) {
            setTranscriptInterim('');
            const cleaned = text.replace(/(oye\s+viernes|hola\s+viernes|viernes|friday|aura|jarvis)/i, '').trim();
            if (cleaned) {
              handleSendMessage(cleaned);
            }
          } else {
            setTranscriptInterim(text);
          }
        },
        onError: (err) => {
          console.warn('Speech recognition error:', err);
          if (listeningState === 'LISTENING') setListeningState('IDLE');
        },
        onListeningChange: (active) => {
          if (!active && listeningState === 'LISTENING') {
            setListeningState('IDLE');
          }
        },
      },
      {
        continuous: isResidentActive,
        wakeWordPhrase: settings.wakeWord,
      }
    );

    return () => {
      audioService.stopListening();
    };
  }, [isResidentActive, settings.wakeWord, settings.soundEffects, listeningState]);

  // Toggle voice recognition
  const handleToggleListening = async () => {
    const isElectronEngine = settings.voiceEngine === 'electron_gemini';

    if (listeningState === 'LISTENING') {
      if (isElectronEngine) {
        audioService.stopMediaRecording();
        setListeningState('THINKING');
      } else {
        audioService.stopListening();
        setListeningState('IDLE');
        if (settings.soundEffects) audioService.playDeactivationSound();
      }
    } else {
      if (settings.soundEffects) audioService.playActivationSound();
      setListeningState('LISTENING');

      if (isElectronEngine) {
        setTranscriptInterim('Grabando audio del micrófono...');
        const ok = await audioService.startMediaRecording(async (base64Audio, mimeType) => {
          setTranscriptInterim('Transcribiendo con Viernes AI...');
          setListeningState('THINKING');
          const transcript = await audioService.transcribeAudio(base64Audio, mimeType);
          setTranscriptInterim('');
          if (transcript) {
            handleSendMessage(transcript);
          } else {
            setListeningState('IDLE');
            setMessages((prev) => [
              ...prev,
              {
                id: `ast-${Date.now()}`,
                sender: 'viernes',
                text: 'No logré detectar voz con claridad en el audio. Puedes intentar hablar más cerca del micrófono o configurar tu API Key en Ajustes.',
                timestamp: Date.now(),
              },
            ]);
          }
        });
        if (!ok) {
          setListeningState('IDLE');
          setTranscriptInterim('');
        }
      } else {
        audioService.startListening();
      }
    }
  };

  // Helper to open links (in Electron uses shell.openExternal)
  const openExternalLink = (url: string) => {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI && typeof electronAPI.openExternal === 'function') {
      electronAPI.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  };

  // Execute an automated action (Open App, Routine, Timer, etc.)
  const handleExecuteAction = (action: any) => {
    if (!action) return;

    if (action.type === 'OPEN_APP') {
      const app = action.app?.toLowerCase();
      const query = action.query ? encodeURIComponent(action.query) : '';

      switch (app) {
        case 'youtube':
          openExternalLink(query ? `https://www.youtube.com/results?search_query=${query}` : 'https://www.youtube.com');
          break;
        case 'spotify':
          openExternalLink(query ? `https://open.spotify.com/search/${query}` : 'https://open.spotify.com');
          break;
        case 'whatsapp':
          openExternalLink(query ? `https://web.whatsapp.com/send?text=${query}` : 'https://web.whatsapp.com');
          break;
        case 'maps':
          openExternalLink(query ? `https://www.google.com/maps/search/${query}` : 'https://www.google.com/maps');
          break;
        case 'calendar':
          openExternalLink('https://calendar.google.com');
          break;
        case 'gmail':
          openExternalLink('https://mail.google.com');
          break;
        case 'calculator':
          setIsCalculatorOpen(true);
          break;
        case 'notes':
          setIsNotesOpen(true);
          break;
        default:
          break;
      }
    } else if (action.type === 'TIMER') {
      const secs = action.seconds || 60;
      setActiveTimer({ seconds: secs, label: action.label || 'Temporizador Táctico' });
    } else if (action.type === 'CALCULATOR') {
      setIsCalculatorOpen(true);
    } else if (action.type === 'NOTES') {
      setIsNotesOpen(true);
    } else if (action.type === 'SAVE_MEMORY') {
      memoryStorage.saveMemory({
        title: action.title || 'Dato Registrado',
        content: action.content || '',
        type: action.category || 'FACT',
        category: 'Automatización',
        confidence: 0.98,
      });
      setMemories(memoryStorage.getMemories());
    } else if (action.type === 'ROUTINE') {
      const routineName = action.name || 'Rutina Táctica';
      const foundRoutine = routines.find(r => r.name.toLowerCase().includes(routineName.toLowerCase()));

      if (foundRoutine && Array.isArray(foundRoutine.steps)) {
        foundRoutine.steps.forEach((step, index) => {
          setTimeout(() => {
            if (step.action === 'OPEN_APP') {
              handleExecuteAction({ type: 'OPEN_APP', app: step.target, query: step.payload });
            } else if (step.action === 'TIMER') {
              handleExecuteAction({ type: 'TIMER', seconds: parseInt(step.payload || '60', 10) });
            } else if (step.action === 'SPEAK' && !isMuted) {
              audioService.speak(step.payload || '', {
                voiceName: settings.voiceName,
                rate: settings.voiceRate,
                pitch: settings.voicePitch,
              });
            }
          }, index * 1200);
        });
      }
    }
  };

  // Notification Summarizer
  const handleSummarizeNotifications = () => {
    if (notifications.length === 0) {
      audioService.speak('No tienes notificaciones pendientes en este momento, jefe.');
      return;
    }
    const notifsSummary = notifications
      .slice(0, 10)
      .map((n, i) => `${i + 1}. [${n.app}] ${n.title}: ${n.text}`)
      .join('\n');
    handleSendMessage(`Resume brevemente estas notificaciones de mi PC en un reporte ejecutivo:\n${notifsSummary}`);
    setActiveTab('assistant');
  };

  // Guardar en memoria desde chips de mensajes
  const handleSaveToMemory = (content: string) => {
    memoryStorage.saveMemory({
      title: 'Nota de Conversación',
      content,
      type: 'FACT',
      category: 'Aprendizaje',
      confidence: 0.98,
    });
    setMemories(memoryStorage.getMemories());
    if (settings.soundEffects) audioService.playActivationSound();
  };

  // Send message to assistant con streaming y orquestación universal
  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    // 1. Clasificación previa de la intención
    const intent = IntentRouter.classify(text.trim());
    if (intent.requiresSearch || intent.category === 'CURRENT_INFO') {
      setThinkingStatus('Buscando en la web con Google...');
    } else if (intent.category === 'LOCAL_COMMAND') {
      setThinkingStatus('Ejecutando comando táctico...');
    } else if (intent.category === 'CALCULATION') {
      setThinkingStatus('Calculando valor exacto...');
    } else if (intent.category === 'URL_QUERY') {
      setThinkingStatus('Inspeccionando enlace web...');
    } else {
      setThinkingStatus('Pensando respuesta táctica...');
    }

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: text.trim(),
      timestamp: Date.now(),
    };

    const assistantMsgId = `ast-${Date.now()}`;
    const initialAssistantMsg: ChatMessage = {
      id: assistantMsgId,
      sender: 'viernes',
      text: '',
      timestamp: Date.now(),
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMsg, initialAssistantMsg]);
    setListeningState('THINKING');
    if (settings.soundEffects) audioService.playProcessingSound();

    try {
      // Intentar streaming SSE primero
      const response = await fetch('/api/assistant/chat-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          history: messages.slice(-10),
          memories,
          settings,
          notifications: notifications.slice(0, 20),
          systemContext: {
            currentTime: new Date().toLocaleString(),
            city: settings.userCity || 'Madrid',
            battery: `${telemetry.battery}%`,
            notificationsCount: notifications.length,
          },
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Fallo al abrir canal de streaming');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';
      let finalResultData: any = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const rawChunk = decoder.decode(value, { stream: true });
        const lines = rawChunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(line.slice(6));
              if (parsed.type === 'chunk' && parsed.text) {
                accumulatedText += parsed.text;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId
                      ? { ...m, text: accumulatedText, isStreaming: true }
                      : m
                  )
                );
              } else if (parsed.type === 'done' && parsed.result) {
                finalResultData = parsed.result;
              }
            } catch {}
          }
        }
      }

      const replyText = finalResultData?.response || accumulatedText || 'Protocolo completado con éxito, jefe.';

      // Actualizar mensaje con todos los metadatos finales
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? {
                ...m,
                text: replyText,
                isStreaming: false,
                action: finalResultData?.action,
                sources: finalResultData?.sources,
                source: finalResultData?.source,
                tier: finalResultData?.tier,
                confidence: finalResultData?.confidence,
                disclaimer: finalResultData?.disclaimer,
                clarificationQuestion: finalResultData?.clarificationQuestion,
                isCorrection: finalResultData?.isCorrection,
              }
            : m
        )
      );

      if (finalResultData?.action) {
        handleExecuteAction(finalResultData.action);
      }

      // Voice read-aloud
      if (settings.autoSpeak && !isMuted) {
        setListeningState('SPEAKING');

        let spokenText = replyText;
        if (finalResultData?.sources && finalResultData.sources.length > 0) {
          const firstTwo = finalResultData.sources.slice(0, 2).map((s: any) => s.title).join(' y ');
          spokenText += ` Datos fundamentados según fuentes como ${firstTwo}.`;
        }

        audioService.speak(spokenText, {
          voiceName: settings.voiceName,
          rate: settings.voiceRate,
          pitch: settings.voicePitch,
          volume: settings.voiceVolume,
          onEnd: () => {
            setListeningState(isResidentActive ? 'LISTENING' : 'IDLE');
          },
          onError: () => {
            setListeningState(isResidentActive ? 'LISTENING' : 'IDLE');
          },
        });
      } else {
        setListeningState(isResidentActive ? 'LISTENING' : 'IDLE');
      }
    } catch {
      // Fallback a endpoint estándar no-streaming ante desconexión o fallo de stream
      try {
        const fallbackRes = await fetch('/api/assistant/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text.trim(),
            history: messages.slice(-10),
            memories,
            settings,
            notifications: notifications.slice(0, 20),
            systemContext: {
              currentTime: new Date().toLocaleString(),
              city: settings.userCity || 'Madrid',
              battery: `${telemetry.battery}%`,
            },
          }),
        });
        const fallbackData = await fallbackRes.json();
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  text: fallbackData.response || 'Respuesta generada en modo de contingencia.',
                  isStreaming: false,
                  tier: fallbackData.tier || 'local',
                  confidence: fallbackData.confidence || 'media',
                  sources: fallbackData.sources || [],
                  disclaimer: fallbackData.disclaimer,
                }
              : m
          )
        );
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  text: 'Sistemas en línea bajo base local. No se logró conectar con el servidor central; ejecutando protocolos locales.',
                  isStreaming: false,
                  tier: 'emergency',
                  confidence: 'baja',
                }
              : m
          )
        );
      }
      setListeningState(isResidentActive ? 'LISTENING' : 'IDLE');
    }
  };

  const handleResetFactory = () => {
    if (window.confirm('¿Deseas restablecer todos los parámetros de Viernes al estado de fábrica?')) {
      memoryStorage.clearAll();
      setMemories(memoryStorage.getMemories());
      setRoutines(memoryStorage.getRoutines());
      setSettings(DEFAULT_SETTINGS);
      audioService.playActivationSound();
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-cyber-grid bg-radial-vignette text-slate-100 overflow-hidden font-rajdhani selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top HUD Bar */}
      <ViernesTopBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        telemetry={telemetry}
        theme={settings.orbTheme}
        isMuted={isMuted}
        onToggleMute={() => {
          setIsMuted(!isMuted);
          audioService.stopSpeaking();
        }}
        isResidentActive={isResidentActive}
        onToggleResident={() => {
          setIsResidentActive(!isResidentActive);
          if (!isResidentActive) {
            audioService.playActivationSound();
          }
        }}
        notificationsCount={notifications.length}
        internetStatus={internetStatus}
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden flex flex-col relative">
        {/* Aviso Visible: Falta la API Key (Requisito 2) */}
        {!isKeyConfigured && activeTab !== 'settings' && (
          <div className="mx-4 mt-2.5 mb-1.5 p-3 rounded-xl bg-amber-950/80 border border-amber-500/60 flex items-center justify-between shadow-lg shadow-black/50 z-30 shrink-0 animate-fade-in backdrop-blur-sm">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-amber-900/70 text-amber-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-orbitron font-bold text-amber-200 block">
                  FALTA LA API KEY: ESTÁS OPERANDO EN MODO LOCAL
                </span>
                <span className="text-[11px] text-amber-300/80 font-rajdhani">
                  Viernes mantiene operativas todas las funciones locales (cálculos, notas, temporizadores, rutinas y memorias). Para activar Google Search Grounding y respuestas tácticas avanzadas en la nube, añade tu clave gratuita de Gemini.
                </span>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('settings')}
              className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shrink-0 cursor-pointer transition-all flex items-center space-x-1.5 shadow-md shadow-amber-950 ml-3"
            >
              <SettingsIcon className="w-3.5 h-3.5" />
              <span>Configurar en Ajustes</span>
            </button>
          </div>
        )}
        {activeTab === 'assistant' && (
          <MainScreen
            messages={messages}
            onSendMessage={handleSendMessage}
            listeningState={listeningState}
            onToggleListening={handleToggleListening}
            onClearChat={() => setMessages([])}
            settings={settings}
            onExecuteAction={handleExecuteAction}
            transcriptInterim={transcriptInterim}
            thinkingStatus={thinkingStatus}
            onFollowUpClick={(prompt) => handleSendMessage(prompt)}
            onSaveToMemory={handleSaveToMemory}
          />
        )}

        {activeTab === 'notifications' && (
          <NotificationsPanel
            notifications={notifications}
            onClearNotifications={() => setNotifications([])}
            onDismissNotification={(id) => setNotifications((prev) => prev.filter(n => n.id !== id))}
            onSummarizeNotifications={handleSummarizeNotifications}
            theme={settings.orbTheme}
            isEnabled={settings.windowsNotificationsEnabled !== false}
            onToggleEnabled={() => {
              const updated = {
                ...settings,
                windowsNotificationsEnabled: !(settings.windowsNotificationsEnabled !== false),
              };
              const saved = memoryStorage.saveSettings(updated);
              setSettings(saved);
              const electronAPI = (window as any).electronAPI;
              if (electronAPI && typeof electronAPI.setNotificationReaderConfig === 'function') {
                electronAPI.setNotificationReaderConfig({
                  enabled: saved.windowsNotificationsEnabled,
                });
              }
            }}
          />
        )}

        {activeTab === 'memory' && (
          <MemoryScreen
            memories={memories}
            onMemoriesUpdated={setMemories}
            theme={settings.orbTheme}
          />
        )}

        {activeTab === 'automation' && (
          <AutomationScreen
            routines={routines}
            onRoutinesUpdated={setRoutines}
            onExecuteAction={handleExecuteAction}
            theme={settings.orbTheme}
          />
        )}

        {activeTab === 'permissions' && (
          <PermissionsScreen theme={settings.orbTheme} />
        )}

        {activeTab === 'settings' && (
          <SettingsScreen
            settings={settings}
            onSaveSettings={(newSettings) => {
              const saved = memoryStorage.saveSettings(newSettings);
              setSettings(saved);

              // Update Electron auto-start if changed
              const electronAPI = (window as any).electronAPI;
              if (electronAPI && typeof electronAPI.setAutoStart === 'function' && newSettings.startWithWindows !== undefined) {
                electronAPI.setAutoStart(newSettings.startWithWindows);
              }

              // Update Electron notification reader config
              if (electronAPI && typeof electronAPI.setNotificationReaderConfig === 'function') {
                electronAPI.setNotificationReaderConfig({
                  enabled: newSettings.windowsNotificationsEnabled !== false,
                  allowedApps: newSettings.notificationAutoReadApps || ['whatsapp'],
                  blockedApps: newSettings.notificationBlockedApps || [],
                });
              }

              // Update Electron network proxy if specified
              if (electronAPI && typeof electronAPI.setNetworkProxy === 'function' && newSettings.proxyUrl !== undefined) {
                electronAPI.setNetworkProxy(newSettings.proxyUrl);
              }

              // Re-check API key status to update warning banner immediately
              fetch('/api/assistant/config/apikey')
                .then((res) => res.json())
                .then((data) => setIsKeyConfigured(!!data.isConfigured))
                .catch(() => {});
            }}
            onResetFactory={handleResetFactory}
          />
        )}

        {/* Global HUD Floating Widgets */}
        {activeTimer && (
          <TimerWidget
            initialSeconds={activeTimer.seconds}
            label={activeTimer.label}
            onClose={() => setActiveTimer(null)}
          />
        )}

        {isCalculatorOpen && (
          <CalculatorWidget onClose={() => setIsCalculatorOpen(false)} />
        )}

        {isNotesOpen && (
          <NotesWidget
            onClose={() => setIsNotesOpen(false)}
            onNoteSavedToMemory={(title, text) => {
              memoryStorage.saveMemory({
                title: title || 'Nota Rápida',
                content: text,
                type: 'FACT',
                category: 'Notas',
                confidence: 0.95,
              });
              setMemories(memoryStorage.getMemories());
              if (settings.soundEffects) audioService.playActivationSound();
            }}
          />
        )}
      </main>
    </div>
  );
}
