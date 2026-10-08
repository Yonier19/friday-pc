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

export default function App() {
  const [activeTab, setActiveTab] = useState<'assistant' | 'memory' | 'automation' | 'permissions' | 'settings' | 'notifications'>('assistant');
  const [listeningState, setListeningState] = useState<ListeningState>('IDLE');
  const [transcriptInterim, setTranscriptInterim] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isResidentActive, setIsResidentActive] = useState(false);
  const [internetStatus, setInternetStatus] = useState<'ONLINE' | 'OFFLINE' | 'RECONNECTING'>('ONLINE');

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
      text: 'Sistemas en línea, jefe. Protocolos tácticos activos. Soy Viernes, tu interfaz de asistencia e inteligencia personal de Industrias Stark. Conexión satelital y búsqueda web disponibles. ¿En qué puedo asistirte hoy?',
      timestamp: Date.now(),
      intent: 'GREETING',
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
  }, []);

  // Monitor Internet Connection & Health Heartbeat
  useEffect(() => {
    const handleOnline = () => {
      setInternetStatus('RECONNECTING');
      checkServerHealth();
    };
    const handleOffline = () => setInternetStatus('OFFLINE');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const checkServerHealth = async () => {
      try {
        const res = await fetch('/api/assistant/health');
        if (res.ok) {
          setInternetStatus('ONLINE');
        } else {
          setInternetStatus('OFFLINE');
        }
      } catch {
        setInternetStatus('OFFLINE');
      }
    };

    checkServerHealth();
    const pingInterval = setInterval(checkServerHealth, 15000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(pingInterval);
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
    const res = audioService.initSpeechRecognition(
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
    } else if (action.type === 'SAVE_MEMORY') {
      const newMem = memoryStorage.saveMemory({
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

  // Send message to assistant
  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    // Check if user asked to read or summarize notifications directly by voice
    const lower = text.toLowerCase();
    if (lower.includes('léeme las notificaciones') || lower.includes('leeme las notificaciones') || lower.includes('lee mis notificaciones')) {
      if (notifications.length === 0) {
        audioService.speak('No tienes notificaciones pendientes para leer, jefe.');
      } else {
        const textToRead = notifications
          .slice(0, 4)
          .map((n, i) => `Aviso de ${n.app}. ${n.title}. ${n.text}.`)
          .join(' ');
        audioService.speak(`Tienes ${notifications.length} notificaciones. ` + textToRead);
      }
    }

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: text.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setListeningState('THINKING');
    if (settings.soundEffects) audioService.playProcessingSound();

    try {
      const response = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          history: messages.slice(-8),
          memories,
          personality: settings.personality,
          notifications: notifications.slice(0, 20),
          systemContext: {
            currentTime: new Date().toLocaleString(),
            battery: `${telemetry.battery}%`,
            notificationsCount: notifications.length,
            notifications: notifications.slice(0, 20),
          },
        }),
      });

      const data = await response.json();
      const replyText = data.response || 'Comando procesado, jefe.';

      const assistantMsg: ChatMessage = {
        id: `ast-${Date.now()}`,
        sender: 'viernes',
        text: replyText,
        timestamp: Date.now(),
        action: data.action,
        sources: data.sources,
        source: data.source,
      };

      setMessages((prev) => [...prev, assistantMsg]);

      if (data.action) {
        handleExecuteAction(data.action);
      }

      // Voice read-aloud
      if (settings.autoSpeak && !isMuted) {
        setListeningState('SPEAKING');

        // Formulate spoken text (if sources are present, brief vocal mention)
        let spokenText = replyText;
        if (data.sources && data.sources.length > 0) {
          const firstTwo = data.sources.slice(0, 2).map((s: any) => s.title).join(' y ');
          spokenText += ` Datos fundamentados en fuentes como ${firstTwo}.`;
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
    } catch (err) {
      console.error('Error in chat request:', err);
      const fallbackReply = 'Sistemas tácticos en línea. Error momentáneo de enlace exterior, operando con protocolos locales.';
      setMessages((prev) => [
        ...prev,
        {
          id: `ast-${Date.now()}`,
          sender: 'viernes',
          text: fallbackReply,
          timestamp: Date.now(),
        },
      ]);
      setListeningState('IDLE');
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
                  allowedApps: newSettings.notificationAllowedApps,
                  blockedApps: newSettings.notificationBlockedApps,
                });
              }
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
              setMemories(memoryStorage.getMemories());
              if (settings.soundEffects) audioService.playActivationSound();
            }}
          />
        )}
      </main>
    </div>
  );
}
