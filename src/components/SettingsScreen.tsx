import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Volume2, 
  Sparkles, 
  Mic, 
  Cpu, 
  Palette, 
  RotateCcw, 
  Save, 
  Check, 
  Sliders,
  Radio,
  ExternalLink,
  Key,
  ShieldCheck,
  Eye,
  EyeOff,
  Bell,
  Monitor,
  Shield
} from 'lucide-react';
import { AISettings, OrbThemeColor } from '../types/assistant';
import { audioService } from '../services/audioService';

interface SettingsScreenProps {
  settings: AISettings;
  onSaveSettings: (settings: AISettings) => void;
  onResetFactory: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  onSaveSettings,
  onResetFactory,
}) => {
  const [formData, setFormData] = useState<AISettings>({ 
    ...settings,
    voiceEngine: settings.voiceEngine || 'electron_gemini'
  });
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isKeyConfigured, setIsKeyConfigured] = useState(false);
  const [maskedKey, setMaskedKey] = useState('');
  const [keySaveMessage, setKeySaveMessage] = useState('');

  useEffect(() => {
    setFormData({ 
      ...settings,
      voiceEngine: settings.voiceEngine || 'electron_gemini'
    });
    const loadVoices = () => {
      const voices = audioService.getAvailableVoices();
      setAvailableVoices(voices);
    };
    loadVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    // Load active key info from server
    fetch('/api/assistant/config/apikey')
      .then((res) => res.json())
      .then((data) => {
        setIsKeyConfigured(data.isConfigured);
        if (data.maskedKey) setMaskedKey(data.maskedKey);
      })
      .catch(() => {});
  }, [settings]);

  const handleChange = (key: keyof AISettings, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveApiKey = async () => {
    if (!apiKeyInput.trim()) return;
    try {
      const res = await fetch('/api/assistant/config/apikey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKeyInput.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setIsKeyConfigured(true);
        setMaskedKey(apiKeyInput.trim().substring(0, 6) + '...' + apiKeyInput.trim().substring(apiKeyInput.trim().length - 4));
        setApiKeyInput('');
        setKeySaveMessage('¡API Key guardada con éxito en UserData!');
        audioService.playActivationSound();
        setTimeout(() => setKeySaveMessage(''), 2500);
      }
    } catch {
      setKeySaveMessage('Error al guardar la clave.');
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    audioService.playActivationSound();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const testVoice = () => {
    audioService.speak('Calibración acústica completada. Sistemas de voz de Viernes operando al cien por cien.', {
      voiceName: formData.voiceName,
      rate: formData.voiceRate,
      pitch: formData.voicePitch,
      volume: formData.voiceVolume,
    });
  };

  const handleLaunchEdgeApp = async () => {
    const success = await audioService.launchEdgeApp();
    if (success) {
      audioService.playActivationSound();
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-5xl mx-auto w-full font-rajdhani">
      {/* Title */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-orbitron font-bold text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-cyan-400" />
            CONFIGURACIÓN DEL SISTEMA VIERNES
          </h2>
          <p className="text-xs text-slate-400">
            Ajustes de motor de inferencia, modulación vocal, wake-word y apariencia holográfica.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-lg shadow-cyan-900/40 transition-all"
        >
          {savedSuccess ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
          <span>{savedSuccess ? 'Guardado' : 'Guardar Cambios'}</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: AI Provider & Gemini Key in UserData */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md">
          <div className="flex items-center space-x-2 mb-3 pb-2 border-b border-slate-800">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-orbitron font-semibold text-white tracking-wide">
              MOTOR DE INTELIGENCIA ARTIFICIAL & API KEY
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            {[
              {
                id: 'gemini',
                title: 'Google Gemini 3.8 Flash',
                desc: 'Máxima potencia de razonamiento contextual y velocidad ultrarrápida.',
              },
              {
                id: 'local',
                title: 'Subsistema Local',
                desc: 'Modo sin conexión. Análisis determinista de intenciones y comandos.',
              },
              {
                id: 'custom',
                title: 'Personalizado',
                desc: 'Endpoint o credencial externa configurada por el usuario.',
              },
            ].map((prov) => (
              <div
                key={prov.id}
                onClick={() => handleChange('provider', prov.id)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  formData.provider === prov.id
                    ? 'bg-cyan-950/60 border-cyan-500 text-white shadow-md shadow-cyan-950'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-xs font-orbitron font-bold text-cyan-300">{prov.title}</h4>
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      formData.provider === prov.id ? 'bg-cyan-400 animate-ping' : 'bg-slate-700'
                    }`}
                  />
                </div>
                <p className="text-[11px] leading-tight text-slate-400">{prov.desc}</p>
              </div>
            ))}
          </div>

          {/* Gemini API Key Management Box */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-cyan-900/40 mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2 text-xs font-orbitron text-cyan-300 font-semibold">
                <Key className="w-4 h-4 text-cyan-400" />
                <span>CLAVE DE API GOOGLE GEMINI (Guardada en almacenamiento de usuario)</span>
              </div>
              <span className={`text-[10px] font-orbitron px-2 py-0.5 rounded ${
                isKeyConfigured
                  ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-300'
                  : 'bg-amber-950/80 border border-amber-500/40 text-amber-300'
              }`}>
                {isKeyConfigured ? `CONECTADO: ${maskedKey || 'Activo'}` : 'MODO LOCAL OFFLINE ACTIVO'}
              </span>
            </div>

            <p className="text-[11px] text-slate-400 mb-2">
              Esta clave se guarda de manera segura en tu perfil de usuario (UserData) y sobrevive a actualizaciones del instalador.
            </p>

            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  placeholder="Pega tu GEMINI_API_KEY aquí (ej. AIzaSy...)"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="w-full px-3 py-2 pr-10 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <button
                type="button"
                onClick={handleSaveApiKey}
                disabled={!apiKeyInput.trim()}
                className="px-3.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-xs font-semibold transition-all shrink-0"
              >
                Guardar Clave
              </button>
            </div>
            {keySaveMessage && (
              <p className="text-[11px] text-emerald-400 mt-1 font-semibold">{keySaveMessage}</p>
            )}
          </div>

          {/* Personality selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Personalidad de Interacción
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'stark', label: 'Táctica Stark (Leal & F.R.I.D.A.Y.)' },
                { id: 'formal', label: 'Formal y Mayordomo' },
                { id: 'friendly', label: 'Cálida y Amigable' },
                { id: 'concise', label: 'Concisa y Ultrarrápida' },
              ].map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => handleChange('personality', p.id)}
                  className={`p-2 rounded-lg text-xs font-semibold border transition-all ${
                    formData.personality === p.id
                      ? 'bg-cyan-900/50 border-cyan-500 text-cyan-200'
                      : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Section 2: Voice Engine Architecture (Electron Native vs Web Speech vs Edge) */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Mic className="w-5 h-5 text-purple-400" />
              <h3 className="text-sm font-orbitron font-semibold text-white tracking-wide">
                MOTOR DE RECONOCIMIENTO DE VOZ (ESCRITORIO & PC)
              </h3>
            </div>
          </div>

          <p className="text-xs text-slate-400 mb-3">
            Chromium en Electron no incluye las claves propietarias de Google para webkitSpeechRecognition. Por ello, Viernes incorpora tres alternativas de alta fidelidad:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            {[
              {
                id: 'electron_gemini',
                title: 'Nativo Electron (MediaRecorder + Gemini)',
                badge: 'RECOMENDADO .EXE',
                desc: 'Captura el micrófono directamente con MediaRecorder y transcribe mediante la API de Gemini.',
              },
              {
                id: 'browser_speech',
                title: 'Web Speech API',
                badge: 'NAVEGADOR',
                desc: 'Usa el reconocimiento estándar del navegador (Google Chrome o MS Edge).',
              },
              {
                id: 'edge_launcher',
                title: 'Modo Lanzador Edge',
                badge: 'RESPALDO',
                desc: 'Abre la interfaz como ventana de aplicación en Microsoft Edge (soporte nativo de voz de Windows).',
              },
            ].map((engine) => (
              <div
                key={engine.id}
                onClick={() => handleChange('voiceEngine', engine.id)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                  formData.voiceEngine === engine.id
                    ? 'bg-purple-950/60 border-purple-500 text-white shadow-md shadow-purple-950'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-xs font-orbitron font-bold text-purple-300">{engine.title}</h4>
                    <span className="text-[9px] font-orbitron px-1.5 py-0.5 rounded bg-purple-900/60 text-purple-300 border border-purple-700/50">
                      {engine.badge}
                    </span>
                  </div>
                  <p className="text-[11px] leading-tight text-slate-400">{engine.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div>
              <span className="text-xs font-semibold text-white block">Ejecutar en Microsoft Edge (Modo App)</span>
              <span className="text-[11px] text-slate-400">Inicia una ventana sin bordes en Edge con reconocimiento vocal garantizado</span>
            </div>
            <button
              type="button"
              onClick={handleLaunchEdgeApp}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Abrir en Edge</span>
            </button>
          </div>
        </div>

        {/* Section 3: Voice & Audio Tuning */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Volume2 className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-orbitron font-semibold text-white tracking-wide">
                CALIBRACIÓN DE VOZ & SÍNTESIS
              </h3>
            </div>
            <button
              type="button"
              onClick={testVoice}
              className="px-3 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs font-semibold hover:bg-emerald-900/60 transition-colors"
            >
              Probar Audio
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Voz Seleccionada (Web Speech)
              </label>
              <select
                value={formData.voiceName}
                onChange={(e) => handleChange('voiceName', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="">Voz automática en Español (Recomendado)</option>
                {availableVoices.map((v) => (
                  <option key={v.name} value={v.name}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div>
                <span className="text-xs font-semibold text-white block">Auto-lectura Vocal</span>
                <span className="text-[11px] text-slate-400">Viernes habla sus respuestas en voz alta</span>
              </div>
              <input
                type="checkbox"
                checked={formData.autoSpeak}
                onChange={(e) => handleChange('autoSpeak', e.target.checked)}
                className="w-5 h-5 rounded accent-cyan-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                <span>Velocidad de Lectura</span>
                <span className="font-mono text-cyan-400">{formData.voiceRate}x</span>
              </div>
              <input
                type="range"
                min="0.8"
                max="1.4"
                step="0.05"
                value={formData.voiceRate}
                onChange={(e) => handleChange('voiceRate', parseFloat(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                <span>Tono Vocal</span>
                <span className="font-mono text-cyan-400">{formData.voicePitch}x</span>
              </div>
              <input
                type="range"
                min="0.8"
                max="1.3"
                step="0.05"
                value={formData.voicePitch}
                onChange={(e) => handleChange('voicePitch', parseFloat(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Wake Word & Microphones */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md">
          <div className="flex items-center space-x-2 mb-3 pb-2 border-b border-slate-800">
            <Mic className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-orbitron font-semibold text-white tracking-wide">
              PALABRA CLAVE DE ACTIVACIÓN (WAKE WORD)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Frase Clave de Invocación
              </label>
              <select
                value={formData.wakeWord}
                onChange={(e) => handleChange('wakeWord', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="oye viernes">&quot;Oye Viernes&quot; (F.R.I.D.A.Y.)</option>
                <option value="viernes">&quot;Viernes&quot;</option>
                <option value="hola viernes">&quot;Hola Viernes&quot;</option>
                <option value="aura">&quot;Aura&quot;</option>
                <option value="jarvis">&quot;Jarvis&quot;</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div>
                <span className="text-xs font-semibold text-white block">Efectos Sonoros Tácticos</span>
                <span className="text-[11px] text-slate-400">Sonidos futuristas de activación Stark</span>
              </div>
              <input
                type="checkbox"
                checked={formData.soundEffects}
                onChange={(e) => handleChange('soundEffects', e.target.checked)}
                className="w-5 h-5 rounded accent-cyan-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Section 5: Visual Holographic Theme */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md">
          <div className="flex items-center space-x-2 mb-3 pb-2 border-b border-slate-800">
            <Palette className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-orbitron font-semibold text-white tracking-wide">
              APARIENCIA HOLOGRÁFICA DEL ORBE
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { id: 'cyan', name: 'Arc Reactor Cyan', color: 'bg-cyan-400', border: 'border-cyan-500' },
              { id: 'amethyst', name: 'Celestial Amethyst', color: 'bg-purple-500', border: 'border-purple-500' },
              { id: 'gold', name: 'Jarvis Gold', color: 'bg-amber-400', border: 'border-amber-500' },
              { id: 'emerald', name: 'Cyber Emerald', color: 'bg-emerald-400', border: 'border-emerald-500' },
            ].map((th) => (
              <div
                key={th.id}
                onClick={() => handleChange('orbTheme', th.id as OrbThemeColor)}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col items-center text-center ${
                  formData.orbTheme === th.id
                    ? `${th.border} bg-slate-800 shadow-md scale-102`
                    : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
                }`}
              >
                <div className={`w-8 h-8 rounded-full ${th.color} mb-2 shadow-lg animate-pulse`} />
                <span className="text-xs font-orbitron font-semibold text-white">{th.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Section 6: Windows Integration & System Tray */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md">
          <div className="flex items-center space-x-2 mb-3 pb-2 border-b border-slate-800">
            <Monitor className="w-5 h-5 text-sky-400" />
            <h3 className="text-sm font-orbitron font-semibold text-white tracking-wide">
              INTEGRACIÓN CON WINDOWS & BANDEJA DEL SISTEMA (TRAY)
            </h3>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <div>
                <span className="text-xs font-semibold text-white block">Iniciar Viernes con Windows</span>
                <span className="text-[11px] text-slate-400">
                  Ejecuta el asistente automáticamente en segundo plano al iniciar sesión en el equipo.
                </span>
              </div>
              <input
                type="checkbox"
                checked={!!formData.startWithWindows}
                onChange={(e) => handleChange('startWithWindows', e.target.checked)}
                className="w-5 h-5 rounded accent-cyan-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <div>
                <span className="text-xs font-semibold text-white block">Minimizar a la Bandeja del Sistema</span>
                <span className="text-[11px] text-slate-400">
                  Al cerrar la ventana [X], Viernes sigue activo en la bandeja de tareas junto al reloj para responder comandos.
                </span>
              </div>
              <input
                type="checkbox"
                checked={formData.minimizeToTray !== false}
                onChange={(e) => handleChange('minimizeToTray', e.target.checked)}
                className="w-5 h-5 rounded accent-cyan-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Section 7: Windows Notifications & Privacy */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Bell className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-orbitron font-semibold text-white tracking-wide">
                LECTOR DE NOTIFICACIONES DE WINDOWS 10/11
              </h3>
            </div>
            <span className="text-[10px] font-orbitron px-2 py-0.5 rounded bg-amber-950/80 border border-amber-500/40 text-amber-300">
              wpndatabase.db (Local)
            </span>
          </div>

          <p className="text-xs text-slate-400 mb-3">
            Viernes puede supervisar en segundo plano las notificaciones entrantes de Windows (WhatsApp, correos, alertas) para leértelas en voz alta o resumirlas.
          </p>

          <div className="space-y-3 mb-4">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <div>
                <span className="text-xs font-semibold text-white block">Monitoreo de Notificaciones Activo</span>
                <span className="text-[11px] text-slate-400">
                  Inspecciona de forma segura la base de datos de avisos sin bloquear archivos del sistema.
                </span>
              </div>
              <input
                type="checkbox"
                checked={formData.windowsNotificationsEnabled !== false}
                onChange={(e) => handleChange('windowsNotificationsEnabled', e.target.checked)}
                className="w-5 h-5 rounded accent-amber-500 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Lectura Automática por Voz (Solo para Apps Seleccionadas)
              </label>
              <p className="text-[11px] text-slate-400 mb-2">
                Haz clic en las aplicaciones que deseas que Viernes anuncie automáticamente por voz al recibir un mensaje:
              </p>

              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'whatsapp', label: 'WhatsApp' },
                  { id: 'outlook', label: 'Outlook / Correo' },
                  { id: 'telegram', label: 'Telegram' },
                  { id: 'discord', label: 'Discord' },
                  { id: 'chrome', label: 'Google Chrome' },
                  { id: 'calendar', label: 'Calendario' },
                ].map((app) => {
                  const currentList = formData.notificationAutoReadApps || ['whatsapp'];
                  const isSelected = currentList.map(a => a.toLowerCase()).includes(app.id);

                  return (
                    <button
                      type="button"
                      key={app.id}
                      onClick={() => {
                        const updated = isSelected
                          ? currentList.filter(a => a.toLowerCase() !== app.id)
                          : [...currentList, app.id];
                        handleChange('notificationAutoReadApps', updated);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        isSelected
                          ? 'bg-amber-950/70 border-amber-400 text-amber-200 shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {isSelected ? '✓ ' : '+ '} {app.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Privacy Notice Box */}
          <div className="p-3.5 rounded-xl bg-slate-950/90 border border-emerald-900/50 flex items-start space-x-3 text-xs text-slate-300">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold text-white block mb-0.5">Privacidad y Procesamiento Estrictamente Local:</span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Todas las notificaciones se procesan en tu propia máquina. Jamás se transmiten a servidores externos ni a Gemini automáticamente; únicamente se envían cuando pides explícitamente a Viernes un resumen (&quot;resume mis notificaciones&quot;).
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onResetFactory}
            className="px-3 py-1.5 rounded-lg border border-red-500/40 text-red-300 hover:bg-red-950/40 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer Parámetros</span>
          </button>

          <button
            type="submit"
            className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center space-x-2 shadow-lg shadow-cyan-900/40 transition-all"
          >
            {savedSuccess ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
            <span>Guardar Configuración</span>
          </button>
        </div>
      </form>
    </div>
  );
};
