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
  Shield,
  Globe,
  Activity,
  CheckCircle2,
  XCircle,
  MapPin,
  Layers,
  RefreshCw,
  Copy,
  FileText,
  AlertTriangle,
  Network,
  Terminal,
  Wifi,
  WifiOff
} from 'lucide-react';
import { AISettings, OrbThemeColor, ResponseLength } from '../types/assistant';
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
    model: settings.model || 'gemini-3.8-flash',
    fallbackModel: settings.fallbackModel || 'gemini-3.1-flash-lite',
    autoWebSearch: settings.autoWebSearch !== false,
    responseLength: settings.responseLength || 'breve',
    userCity: settings.userCity || 'Madrid',
    voiceEngine: settings.voiceEngine || 'electron_gemini'
  });
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isKeyConfigured, setIsKeyConfigured] = useState(false);
  const [maskedKey, setMaskedKey] = useState('');
  const [keySaveMessage, setKeySaveMessage] = useState('');

  // Estados de diagnóstico de la cadena de respaldo y conectividad
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);
  const [fullDiagnostics, setFullDiagnostics] = useState<any | null>(null);
  const [copiedReport, setCopiedReport] = useState(false);
  const [proxyInput, setProxyInput] = useState(settings.proxyUrl || '');
  const [proxySaveMessage, setProxySaveMessage] = useState('');
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [recentLogs, setRecentLogs] = useState<string[]>([]);
  const [firewallCopied, setFirewallCopied] = useState(false);

  useEffect(() => {
    setFormData({ 
      ...settings,
      model: settings.model || 'gemini-3.8-flash',
      fallbackModel: settings.fallbackModel || 'gemini-3.1-flash-lite',
      autoWebSearch: settings.autoWebSearch !== false,
      responseLength: settings.responseLength || 'breve',
      userCity: settings.userCity || 'Madrid',
      voiceEngine: settings.voiceEngine || 'electron_gemini',
      proxyUrl: settings.proxyUrl || ''
    });
    setProxyInput(settings.proxyUrl || '');

    const loadVoices = () => {
      const voices = audioService.getAvailableVoices();
      setAvailableVoices(voices);
    };
    loadVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    // Cargar información de clave activa desde el servidor
    fetch('/api/assistant/config/apikey')
      .then((res) => res.json())
      .then((data) => {
        setIsKeyConfigured(data.isConfigured);
        if (data.maskedKey) setMaskedKey(data.maskedKey);
      })
      .catch(() => {});

    // Cargar configuración de proxy
    fetch('/api/assistant/config/proxy')
      .then((res) => res.json())
      .then((data) => {
        if (data.proxyUrl) {
          setProxyInput(data.proxyUrl);
          setFormData((prev) => ({ ...prev, proxyUrl: data.proxyUrl }));
        }
      })
      .catch(() => {});
  }, [settings]);

  const handleChange = (key: keyof AISettings, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveApiKey = async () => {
    if (!apiKeyInput.trim()) return;
    try {
      const cleanKey = apiKeyInput.trim();
      const res = await fetch('/api/assistant/config/apikey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: cleanKey }),
      });
      const data = await res.json();
      if (data.success) {
        setIsKeyConfigured(true);
        setMaskedKey('••••••••••••••••' + cleanKey.slice(-4));
        setApiKeyInput('');
        setKeySaveMessage(`¡Clave guardada y recargada en UserData (...${cleanKey.slice(-4)})!`);
        audioService.playActivationSound();
        setTimeout(() => setKeySaveMessage(''), 3000);
      }
    } catch {
      setKeySaveMessage('Error al guardar la clave.');
    }
  };

  const handleTestGeminiConnection = async () => {
    setDiagnosticsLoading(true);
    setFullDiagnostics(null);
    try {
      const p = new URLSearchParams({
        model: formData.model,
        fallbackModel: formData.fallbackModel || 'gemini-3.1-flash-lite',
      });
      const res = await fetch(`/api/assistant/diagnostics/full?${p.toString()}`);
      const data = await res.json();
      setFullDiagnostics(data);
      audioService.playActivationSound();
    } catch {
      setFullDiagnostics({
        timestamp: Date.now(),
        overallSuccess: false,
        totalLatencyMs: 0,
        tests: {
          localServer: {
            passed: false,
            message: 'No se pudo contactar con el servidor local en 127.0.0.1.',
            suggestedFix: 'Verifica que el ejecutable de Viernes tenga permiso en el firewall de Windows.',
          },
        },
      });
    } finally {
      setDiagnosticsLoading(false);
    }
  };

  const handleCopyDiagnostics = async () => {
    let logsText = '';
    try {
      const logsRes = await fetch('/api/assistant/diagnostics/logs');
      if (logsRes.ok) {
        const data = await logsRes.json();
        if (Array.isArray(data.logs)) {
          logsText = data.logs.slice(-20).join('\n');
        }
      }
    } catch {}

    const t = fullDiagnostics?.tests || {};
    const reportText = `========================================================
INFORME DE DIAGNÓSTICO DE CONEXIÓN - VIERNES (FRIDAY)
========================================================
Fecha: ${new Date().toISOString()}
Plataforma: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'Windows .EXE'}
Directorio UserData: ${t.localServer?.userDataDir || '%APPDATA%\\viernes-assistant'}
Proxy de Red: ${formData.proxyUrl || 'Directo / Sistema'}
Estado General: ${fullDiagnostics?.overallSuccess ? '✓ CONECTIVIDAD ÓPTIMA' : '⚠ ATENCIÓN / REVISIÓN REQUERIDA'}
Latencia Total: ${fullDiagnostics?.totalLatencyMs || 0}ms

PRUEBAS REALIZADAS:
1. Internet General (Google 204):
   - Estado: ${t.internet?.passed ? '✓ CORRECTO' : '✗ FALLÓ'}
   - Código: ${t.internet?.code || 'N/A'} (Latencia: ${t.internet?.latencyMs || 0}ms)
   - Detalle: ${t.internet?.message || 'Sin datos'}
   ${t.internet?.suggestedFix ? `   - Solución sugerida: ${t.internet.suggestedFix}` : ''}

2. Alcance API Google Gemini:
   - Estado: ${t.apiReachability?.passed ? '✓ CORRECTO' : '✗ FALLÓ'}
   - Detalle: ${t.apiReachability?.message || 'Sin datos'}
   ${t.apiReachability?.suggestedFix ? `   - Solución sugerida: ${t.apiReachability.suggestedFix}` : ''}

3. Clave de API Gemini:
   - Estado: ${t.apiKey?.passed ? '✓ CORRECTO' : '✗ FALLÓ'}
   - Formato & Valor: ${t.apiKey?.maskedKey || maskedKey || 'No configurada'}
   - Almacenamiento: ${t.apiKey?.storageLocation || 'N/A'}
   - Detalle: ${t.apiKey?.message || 'Sin datos'}
   ${t.apiKey?.suggestedFix ? `   - Solución sugerida: ${t.apiKey.suggestedFix}` : ''}

4. Modelos de Lenguaje:
   - Principal (${formData.model}): ${t.models?.primaryOk ? '✓ OPERATIVO' : '✗ NO RESPONDIÓ'}
   - Respaldo (${formData.fallbackModel || 'gemini-3.1-flash-lite'}): ${t.models?.fallbackOk ? '✓ OPERATIVO' : '✗ NO RESPONDIÓ'}
   - Detalle: ${t.models?.message || 'Sin datos'}
   ${t.models?.suggestedFix ? `   - Solución sugerida: ${t.models.suggestedFix}` : ''}
   ${t.models?.availableModels ? `   - Modelos válidos detectados: ${t.models.availableModels.join(', ')}` : ''}

5. Búsqueda de Google (Grounding):
   - Estado: ${t.grounding?.passed ? '✓ OPERATIVO' : '✗ NO DISPONIBLE'}
   - Detalle: ${t.grounding?.message || 'Sin datos'}
   ${t.grounding?.suggestedFix ? `   - Solución sugerida: ${t.grounding.suggestedFix}` : ''}

6. Servidor Local & Firewall:
   - Estado: ${t.localServer?.passed ? '✓ OPERATIVO' : '✗ ERROR'}
   - Detalle: ${t.localServer?.message || '127.0.0.1'}

REGISTROS RECIENTES (userData/connection.log):
${logsText || 'Sin registros recientes o archivo vacío.'}
========================================================`;

    try {
      await navigator.clipboard.writeText(reportText);
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 3000);
    } catch {
      alert('No se pudo copiar automáticamente.');
    }
  };

  const handleSaveProxy = async () => {
    try {
      const res = await fetch('/api/assistant/config/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proxyUrl: proxyInput.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setFormData((prev) => ({ ...prev, proxyUrl: proxyInput.trim() }));
        const electronAPI = (window as any).electronAPI;
        if (electronAPI && typeof electronAPI.setNetworkProxy === 'function') {
          await electronAPI.setNetworkProxy(proxyInput.trim());
        }
        setProxySaveMessage(proxyInput.trim() ? 'Proxy aplicado con éxito.' : 'Proxy restablecido a modo directo.');
        setTimeout(() => setProxySaveMessage(''), 2500);
      }
    } catch {
      setProxySaveMessage('Error al configurar proxy.');
    }
  };

  const handleViewLogs = async () => {
    try {
      const res = await fetch('/api/assistant/diagnostics/logs');
      if (res.ok) {
        const data = await res.json();
        setRecentLogs(data.logs || []);
        setShowLogsModal(true);
      }
    } catch {}
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
            Ajustes del motor universal de inferencia, cadena de respaldo, modulación vocal y apariencia holográfica.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-lg shadow-cyan-900/40 transition-all cursor-pointer"
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
                title: 'Google Gemini (Híbrido)',
                desc: 'Máxima potencia con razonamiento contextual, búsqueda web y cadena de respaldo.',
              },
              {
                id: 'local',
                title: 'Subsistema Local Puro',
                desc: 'Modo sin conexión. Análisis determinista de intenciones, expresiones y comandos.',
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
                  className="w-full px-3 py-2 pr-10 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
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
                className="px-3.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-xs font-semibold transition-all shrink-0 cursor-pointer"
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

        {/* Section 2: Model Configuration & Universal Fallback Chain (Requirement 6) */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Layers className="w-5 h-5 text-sky-400" />
              <h3 className="text-sm font-orbitron font-semibold text-white tracking-wide">
                CADENA DE RESPALDO UNIVERSAL & PARÁMETROS DE IA
              </h3>
            </div>
            <button
              type="button"
              onClick={handleTestGeminiConnection}
              disabled={diagnosticsLoading}
              className="px-3 py-1 rounded-lg bg-sky-950/80 hover:bg-sky-900/80 border border-sky-500/50 text-sky-200 text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <Activity className={`w-3.5 h-3.5 text-sky-400 ${diagnosticsLoading ? 'animate-spin' : ''}`} />
              <span>{diagnosticsLoading ? 'Diagnosticando...' : 'Probar conexión con Gemini'}</span>
            </button>
          </div>

          <p className="text-xs text-slate-400 mb-4">
            Configuración de los modelos primarios y secundarios, control de búsqueda web automática y longitud de respuesta.
          </p>

          {/* Model Selectors Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Modelo Principal (Tier 1 & Tier 2)
              </label>
              <select
                value={formData.model}
                onChange={(e) => handleChange('model', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
              >
                <option value="gemini-3.8-flash">gemini-3.8-flash (Recomendado - Ultrarrápido & Razonamiento)</option>
                <option value="gemini-3.5-flash">gemini-3.5-flash</option>
                <option value="gemini-3.1-pro">gemini-3.1-pro (Máxima profundidad)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Modelo de Respaldo Ligero (Tier 3)
              </label>
              <select
                value={formData.fallbackModel || 'gemini-3.1-flash-lite'}
                onChange={(e) => handleChange('fallbackModel', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
              >
                <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Recomendado - Baja latencia)</option>
                <option value="gemini-3.8-flash">gemini-3.8-flash</option>
              </select>
            </div>
          </div>

          {/* Search Toggle & Response Length & City */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            {/* Search Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <div>
                <span className="text-xs font-semibold text-white block">Búsqueda Web Automática</span>
                <span className="text-[11px] text-slate-400">Google Search Grounding para noticias y clima</span>
              </div>
              <input
                type="checkbox"
                checked={formData.autoWebSearch !== false}
                onChange={(e) => handleChange('autoWebSearch', e.target.checked)}
                className="w-5 h-5 rounded accent-cyan-500 cursor-pointer"
              />
            </div>

            {/* Response Length */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <label className="text-xs font-semibold text-white block mb-1">Longitud de Respuesta</label>
              <div className="flex gap-1">
                {(['breve', 'normal', 'detallada'] as ResponseLength[]).map((len) => (
                  <button
                    type="button"
                    key={len}
                    onClick={() => handleChange('responseLength', len)}
                    className={`flex-1 py-1 rounded text-[11px] font-semibold border capitalize transition-all ${
                      formData.responseLength === len
                        ? 'bg-cyan-950 border-cyan-400 text-cyan-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {len}
                  </button>
                ))}
              </div>
            </div>

            {/* User City */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <label className="text-xs font-semibold text-white block mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                <span>Ciudad de Operación</span>
              </label>
              <input
                type="text"
                value={formData.userCity || ''}
                onChange={(e) => handleChange('userCity', e.target.value)}
                placeholder="Ej. Madrid, Barcelona..."
                className="w-full px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400 font-rajdhani"
              />
            </div>
          </div>

          {/* Diagnostics Live Panel (Requisito 1) */}
          {fullDiagnostics && (
            <div className="p-4 rounded-xl bg-slate-950/95 border border-sky-800/80 mt-4 animate-fade-in shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-slate-800/80 gap-2">
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-sky-400" />
                  <span className="text-xs font-orbitron font-bold text-white tracking-wide">
                    PANEL DE DIAGNÓSTICO INTEGRAL DE CONEXIÓN
                  </span>
                  <span className={`text-[10px] font-orbitron px-2 py-0.5 rounded ${
                    fullDiagnostics.overallSuccess
                      ? 'bg-emerald-950 border border-emerald-500/50 text-emerald-300'
                      : 'bg-amber-950 border border-amber-500/50 text-amber-300'
                  }`}>
                    {fullDiagnostics.overallSuccess ? '✓ CONEXIÓN ÓPTIMA' : '⚠ REQUIERE ATENCIÓN'}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-mono text-slate-400">Latencia total: {fullDiagnostics.totalLatencyMs}ms</span>
                  <button
                    type="button"
                    onClick={handleCopyDiagnostics}
                    className="px-2.5 py-1 rounded bg-sky-900/60 hover:bg-sky-800/70 border border-sky-600/50 text-sky-200 text-xs font-semibold flex items-center space-x-1 transition-all cursor-pointer"
                  >
                    {copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedReport ? '¡Copiado!' : 'Copiar diagnóstico'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleViewLogs}
                    className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center space-x-1 transition-all cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>Ver Logs</span>
                  </button>
                </div>
              </div>

              {/* Grid de las 6 Pruebas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mb-3">
                {/* 1. Internet General */}
                <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-1.5 mb-1">
                      {fullDiagnostics.tests?.internet?.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                      <span className="text-xs font-orbitron font-semibold text-slate-200">
                        a) Internet General
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight">
                      {fullDiagnostics.tests?.internet?.message}
                    </p>
                    {fullDiagnostics.tests?.internet?.latencyMs !== undefined && (
                      <span className="text-[10px] font-mono text-slate-500 mt-1 block">
                        Ping: {fullDiagnostics.tests?.internet?.latencyMs}ms (https://www.google.com/generate_204)
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. Alcance API Google */}
                <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-1.5 mb-1">
                      {fullDiagnostics.tests?.apiReachability?.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                      <span className="text-xs font-orbitron font-semibold text-slate-200">
                        b) Alcance de la API
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight">
                      {fullDiagnostics.tests?.apiReachability?.message}
                    </p>
                    <span className="text-[10px] font-mono text-slate-500 mt-1 block">
                      Host: generativelanguage.googleapis.com (Puerto 443)
                    </span>
                  </div>
                </div>

                {/* 3. API Key */}
                <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-1.5 mb-1">
                      {fullDiagnostics.tests?.apiKey?.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                      <span className="text-xs font-orbitron font-semibold text-slate-200">
                        c) Clave de API Gemini
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight">
                      {fullDiagnostics.tests?.apiKey?.message}
                    </p>
                    {fullDiagnostics.tests?.apiKey?.maskedKey && (
                      <span className="text-[10px] font-mono text-cyan-400 mt-1 block">
                        Clave: {fullDiagnostics.tests?.apiKey?.maskedKey}
                      </span>
                    )}
                  </div>
                </div>

                {/* 4. Modelos */}
                <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-1.5 mb-1">
                      {fullDiagnostics.tests?.models?.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                      <span className="text-xs font-orbitron font-semibold text-slate-200">
                        d) Comprobación de Modelos
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight">
                      {fullDiagnostics.tests?.models?.message}
                    </p>
                    <div className="flex items-center space-x-3 text-[10px] font-mono mt-1 text-slate-400">
                      <span>Principal ({formData.model}): {fullDiagnostics.tests?.models?.primaryOk ? '✓' : '✗'}</span>
                      <span>Respaldo ({formData.fallbackModel}): {fullDiagnostics.tests?.models?.fallbackOk ? '✓' : '✗'}</span>
                    </div>

                    {/* Si se detectaron modelos válidos tras un 404, permitir elegir uno */}
                    {Array.isArray(fullDiagnostics.tests?.models?.availableModels) && fullDiagnostics.tests?.models?.availableModels.length > 0 && (
                      <div className="mt-2 p-2 rounded bg-slate-950 border border-amber-500/40">
                        <span className="text-[10px] text-amber-300 font-bold block mb-1">
                          Modelos detectados para tu clave (haz clic para seleccionar):
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {fullDiagnostics.tests.models.availableModels.slice(0, 6).map((m: string) => (
                            <button
                              type="button"
                              key={m}
                              onClick={() => {
                                handleChange('model', m);
                                audioService.playActivationSound();
                              }}
                              className={`px-2 py-0.5 rounded text-[10px] font-mono border cursor-pointer ${
                                formData.model === m
                                  ? 'bg-cyan-900 border-cyan-400 text-white'
                                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
                              }`}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 5. Búsqueda de Google (Grounding) */}
                <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-1.5 mb-1">
                      {fullDiagnostics.tests?.grounding?.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-amber-400 shrink-0" />
                      )}
                      <span className="text-xs font-orbitron font-semibold text-slate-200">
                        e) Búsqueda en Google (Grounding)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight">
                      {fullDiagnostics.tests?.grounding?.message}
                    </p>

                    {/* Botón de desactivación táctica de búsqueda si hay cuota agotada */}
                    {fullDiagnostics.tests?.grounding?.autoDisableRecommended && formData.autoWebSearch !== false && (
                      <button
                        type="button"
                        onClick={() => {
                          handleChange('autoWebSearch', false);
                          audioService.playActivationSound();
                        }}
                        className="mt-2 px-2.5 py-1 rounded bg-amber-900/80 hover:bg-amber-800 border border-amber-500 text-amber-200 text-[11px] font-bold transition-all cursor-pointer flex items-center space-x-1"
                      >
                        <span>Desactivar Búsqueda Web (Ahorrar Cuota)</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 6. Servidor Local & Proxy */}
                <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-1.5 mb-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-xs font-orbitron font-semibold text-slate-200">
                        f) Servidor Local & Red Interna
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight">
                      {fullDiagnostics.tests?.localServer?.message}
                    </p>
                    <span className="text-[10px] font-mono text-slate-500 mt-1 block">
                      Proxy actual: {fullDiagnostics.tests?.localServer?.proxy || 'Directo'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tarjeta de Código de Error Real y Solución Sugerida si hubo algún fallo */}
              {(!fullDiagnostics.overallSuccess || fullDiagnostics.tests?.models?.suggestedFix || fullDiagnostics.tests?.internet?.suggestedFix) && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/50 mt-2 text-xs">
                  <div className="flex items-center space-x-2 text-rose-300 font-orbitron font-bold mb-1">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <span>DIAGNÓSTICO TÁCTICO & SOLUCIÓN RECOMENDADA:</span>
                  </div>
                  <p className="text-rose-200 font-rajdhani text-sm mb-1.5">
                    {fullDiagnostics.tests?.models?.suggestedFix ||
                     fullDiagnostics.tests?.apiKey?.suggestedFix ||
                     fullDiagnostics.tests?.internet?.suggestedFix ||
                     fullDiagnostics.tests?.grounding?.suggestedFix ||
                     'Revisa la conectividad de red y la clave de API.'}
                  </p>
                  <p className="text-[11px] text-rose-300/80">
                    Código de diagnóstico: <code className="bg-black/50 px-1.5 py-0.5 rounded font-mono text-rose-300">{fullDiagnostics.tests?.models?.code || fullDiagnostics.tests?.internet?.code || fullDiagnostics.tests?.grounding?.code || 'CHECK_SETTINGS'}</code>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Proxy de Red del Sistema / Manual (Requisito 3) */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 mt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2 text-xs font-orbitron text-slate-300 font-semibold">
                <Network className="w-4 h-4 text-cyan-400" />
                <span>CONFIGURACIÓN DE PROXY DE RED (EMPRESARIAL / VPN)</span>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                formData.proxyUrl ? 'bg-cyan-950 border-cyan-500/50 text-cyan-300' : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}>
                {formData.proxyUrl ? `PROXY: ${formData.proxyUrl}` : 'CONEXIÓN DIRECTA'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mb-2">
              Si tu red de trabajo o centro educativo requiere un servidor proxy para acceder a internet, especifícalo aquí:
            </p>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="http://proxy.empresa.com:8080 (dejar vacío para conexión directa)"
                value={proxyInput}
                onChange={(e) => setProxyInput(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
              />
              <button
                type="button"
                onClick={handleSaveProxy}
                className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white text-xs font-semibold cursor-pointer transition-all shrink-0"
              >
                Aplicar Proxy
              </button>
            </div>
            {proxySaveMessage && (
              <p className="text-[11px] text-emerald-400 mt-1 font-semibold">{proxySaveMessage}</p>
            )}
          </div>

          {/* Aviso de Firewall de Windows y Antivirus (Requisito 4) */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 mt-3">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center space-x-2 text-xs font-orbitron text-amber-300 font-semibold">
                <Shield className="w-4 h-4 text-amber-400" />
                <span>REGLA DE FIREWALL DE WINDOWS DEFENDER</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText('netsh advfirewall firewall add rule name="Viernes Asistente" dir=out action=allow program="%LOCALAPPDATA%\\Programs\\viernes-assistant\\Viernes.exe" enable=yes');
                  setFirewallCopied(true);
                  setTimeout(() => setFirewallCopied(false), 2500);
                }}
                className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:text-white flex items-center space-x-1 cursor-pointer"
              >
                {firewallCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{firewallCopied ? '¡Comando copiado!' : 'Copiar comando CMD'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Si Windows Defender Firewall o un antivirus bloquea las conexiones salientes de Viernes hacia <code className="text-cyan-400">generativelanguage.googleapis.com</code>, ejecuta en una consola de Administrador:
            </p>
            <div className="mt-1.5 p-2 rounded bg-slate-900/90 border border-slate-800 text-[10px] font-mono text-slate-300 overflow-x-auto select-all">
              netsh advfirewall firewall add rule name="Viernes Asistente" dir=out action=allow program="%LOCALAPPDATA%\Programs\viernes-assistant\Viernes.exe" enable=yes
            </div>
          </div>
        </div>

        {/* Section 3: Voice Engine Architecture (Electron Native vs Web Speech vs Edge) */}
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
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Abrir en Edge</span>
            </button>
          </div>
        </div>

        {/* Section 4: Voice & Audio Tuning */}
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
              className="px-3 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs font-semibold hover:bg-emerald-900/60 transition-colors cursor-pointer"
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

        {/* Section 5: Wake Word & Microphones */}
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

        {/* Section 6: Visual Holographic Theme */}
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

        {/* Section 7: Windows Integration & System Tray */}
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

        {/* Section 8: Windows Notifications & Privacy */}
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
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
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
            className="px-3 py-1.5 rounded-lg border border-red-500/40 text-red-300 hover:bg-red-950/40 text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer Parámetros</span>
          </button>

          <button
            type="submit"
            className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center space-x-2 shadow-lg shadow-cyan-900/40 transition-all cursor-pointer"
          >
            {savedSuccess ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
            <span>Guardar Configuración</span>
          </button>
        </div>
      </form>

      {/* Logs Modal (userData/connection.log) */}
      {showLogsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-cyan-800/80 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-orbitron font-bold text-white tracking-wide">
                  REGISTRO DE CONEXIÓN (userData/connection.log)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowLogsModal(false)}
                className="text-slate-400 hover:text-white text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-900 cursor-pointer"
              >
                Cerrar
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto font-mono text-[11px] text-slate-300 space-y-1 bg-black/60 select-all">
              {recentLogs.length > 0 ? (
                recentLogs.map((line, idx) => (
                  <div key={idx} className="leading-relaxed hover:bg-slate-800/40 px-1 rounded">
                    {line}
                  </div>
                ))
              ) : (
                <div className="text-slate-500 py-6 text-center">
                  No hay entradas recientes en connection.log.
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-400">
                Las claves de API están completamente redactadas y protegidas de forma confidencial.
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(recentLogs.join('\n'));
                  alert('Logs copiados al portapapeles.');
                }}
                className="px-3 py-1.5 rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white font-semibold flex items-center space-x-1.5 cursor-pointer transition-all"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Todo</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
