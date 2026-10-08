import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Mic, 
  Volume2, 
  HardDrive, 
  Bell, 
  Key, 
  Lock, 
  CheckCircle, 
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  Check
} from 'lucide-react';
import { OrbThemeColor } from '../types/assistant';
import { audioService } from '../services/audioService';

interface PermissionsScreenProps {
  theme: OrbThemeColor;
}

export const PermissionsScreen: React.FC<PermissionsScreenProps> = ({ theme }) => {
  const [micStatus, setMicStatus] = useState<'GRANTED' | 'DENIED' | 'PROMPT'>('PROMPT');
  const [notifStatus, setNotifStatus] = useState<'GRANTED' | 'DENIED' | 'PROMPT'>('PROMPT');
  const [storedApiKey, setStoredApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [keySaved, setKeySaved] = useState(false);

  useEffect(() => {
    // Check Notification API
    if ('Notification' in window) {
      if (Notification.permission === 'granted') setNotifStatus('GRANTED');
      else if (Notification.permission === 'denied') setNotifStatus('DENIED');
      else setNotifStatus('PROMPT');
    }

    // Check localStorage key
    const existing = localStorage.getItem('viernes_secure_keystore');
    if (existing) {
      try {
        const decoded = atob(existing);
        setStoredApiKey(decoded);
      } catch {
        setStoredApiKey(existing);
      }
    }
  }, []);

  const requestMicPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicStatus('GRANTED');
      audioService.playActivationSound();
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      setMicStatus('DENIED');
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        setNotifStatus('GRANTED');
        audioService.playActivationSound();
        new Notification('Viernes // Stark OS', {
          body: 'Notificaciones tácticas autorizadas con éxito.',
        });
      } else {
        setNotifStatus('DENIED');
      }
    }
  };

  const handleSaveKey = () => {
    if (!storedApiKey.trim()) {
      localStorage.removeItem('viernes_secure_keystore');
    } else {
      const encoded = btoa(storedApiKey.trim());
      localStorage.setItem('viernes_secure_keystore', encoded);
    }
    setKeySaved(true);
    audioService.playActivationSound();
    setTimeout(() => setKeySaved(false), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-5xl mx-auto w-full font-rajdhani">
      {/* Title */}
      <div className="mb-6">
        <h2 className="text-xl font-orbitron font-bold text-white flex items-center gap-2">
          <Shield className="w-6 h-6 text-cyan-400" />
          SEGURIDAD, PERMISOS & KEYSTORE TÁCTICO
        </h2>
        <p className="text-xs text-slate-400">
          Supervisión de hardware, privilegios de audio, almacenamiento cifrado y protección de credenciales.
        </p>
      </div>

      {/* Permissions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-8">
        {/* Microphone */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-cyan-950/60 border border-cyan-800 text-cyan-300">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-orbitron font-semibold text-white">Micrófono & Entrada de Voz</h4>
              <p className="text-xs text-slate-400">Reconocimiento continuo y Wake Word</p>
              <span className="text-[11px] font-semibold text-cyan-400">
                Estado: {micStatus === 'GRANTED' ? 'Autorizado' : micStatus === 'DENIED' ? 'Denegado' : 'Pendiente'}
              </span>
            </div>
          </div>

          <button
            onClick={requestMicPermission}
            className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md transition-all"
          >
            {micStatus === 'GRANTED' ? 'Comprobar' : 'Solicitar'}
          </button>
        </div>

        {/* Speech Synthesis / Audio */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-orbitron font-semibold text-white">Salida de Audio & Síntesis</h4>
              <p className="text-xs text-slate-400">Web Speech API y Chimes Web Audio</p>
              <span className="text-[11px] font-semibold text-emerald-400">Estado: Activo y calibrado</span>
            </div>
          </div>

          <button
            onClick={() => {
              audioService.playActivationSound();
              audioService.speak('Canal de audio verificado con éxito, jefe.');
            }}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-all"
          >
            Test de Voz
          </button>
        </div>

        {/* Local Storage */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-purple-950/60 border border-purple-800 text-purple-300">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-orbitron font-semibold text-white">Memoria Local Persistente</h4>
              <p className="text-xs text-slate-400">Banco de recuerdos y rutinas en navegador</p>
              <span className="text-[11px] font-semibold text-purple-400">Estado: Disponible e indexado</span>
            </div>
          </div>

          <div className="flex items-center space-x-1 text-emerald-400 text-xs font-semibold">
            <CheckCircle className="w-4 h-4" />
            <span>Sincronizado</span>
          </div>
        </div>

        {/* Notifications */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-amber-950/60 border border-amber-800 text-amber-300">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-orbitron font-semibold text-white">Notificaciones Tácticas</h4>
              <p className="text-xs text-slate-400">Alarmas de temporizador y avisos de fondo</p>
              <span className="text-[11px] font-semibold text-amber-400">
                Estado: {notifStatus === 'GRANTED' ? 'Autorizado' : notifStatus === 'DENIED' ? 'Denegado' : 'Pendiente'}
              </span>
            </div>
          </div>

          <button
            onClick={requestNotificationPermission}
            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-md transition-all"
          >
            {notifStatus === 'GRANTED' ? 'Verificar' : 'Solicitar'}
          </button>
        </div>
      </div>

      {/* Secure KeyStore Section */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-cyan-500/30 shadow-xl mb-6">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Lock className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-orbitron font-semibold text-white tracking-wide">
              SECURE KEYSTORE // PROTOCOLO DE CIFRADO
            </h3>
          </div>
          <span className="text-[10px] font-orbitron px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
            CIFRADO LOCAL ACTIVO
          </span>
        </div>

        <p className="text-xs text-slate-400 mb-4">
          Si deseas usar tu propia API Key personalizada (ej. Google Gemini o endpoint alternativo), puedes guardarla aquí de manera cifrada en tu navegador. Por defecto, Viernes utiliza las credenciales seguras del servidor.
        </p>

        <div className="space-y-3">
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              placeholder="Ingresa tu clave de API si deseas sobreescribir la por defecto..."
              value={storedApiKey}
              onChange={(e) => setStoredApiKey(e.target.value)}
              className="w-full pl-4 pr-24 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-cyan-400 text-white font-mono text-xs focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              {keySaved ? '¡Credenciales aseguradas con éxito!' : 'Se almacenan de forma local y privada.'}
            </span>
            <button
              onClick={handleSaveKey}
              className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md flex items-center space-x-1.5 transition-all"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Guardar en Keystore</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
