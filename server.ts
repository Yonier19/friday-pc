import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import os from 'os';
import http from 'http';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const currentDir = typeof __dirname !== 'undefined'
  ? __dirname
  : process.cwd();

const app = express();
app.use(express.json({ limit: '25mb' }));

// User Data Directory
const userDataDir = process.env.VIERNES_USER_DATA || path.join(os.homedir(), '.viernes_assistant');
if (!fs.existsSync(userDataDir)) {
  try {
    fs.mkdirSync(userDataDir, { recursive: true });
  } catch (e) {
    console.warn('[Viernes System] No se pudo crear userDataDir:', e);
  }
}

const credentialsFile = path.join(userDataDir, 'viernes_credentials.json');
const userStoreFile = path.join(userDataDir, 'viernes_store.json');

// Initialize Gemini Client
let currentApiKey = process.env.GEMINI_API_KEY || '';

if ((!currentApiKey || currentApiKey === 'MY_GEMINI_API_KEY') && fs.existsSync(credentialsFile)) {
  try {
    const creds = JSON.parse(fs.readFileSync(credentialsFile, 'utf-8'));
    if (creds.apiKey) currentApiKey = creds.apiKey;
  } catch {}
}

let aiClient: GoogleGenAI | null = null;
function refreshAiClient(key: string) {
  if (key && key !== 'MY_GEMINI_API_KEY') {
    currentApiKey = key;
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    console.log('[Viernes System] Gemini Client inicializado con éxito.');
  } else {
    currentApiKey = '';
    aiClient = null;
    console.log('[Viernes System] Modo Local Offline activo.');
  }
}

refreshAiClient(currentApiKey);

// 1. Health check & Ping
app.get('/api/assistant/health', (req, res) => {
  res.json({
    status: 'online',
    version: '4.2.0-stark',
    geminiConfigured: !!aiClient,
    model: 'gemini-3.8-flash',
    userDataDir,
    timestamp: Date.now(),
  });
});

// 2. API Key management
app.get('/api/assistant/config/apikey', (req, res) => {
  const isSet = !!currentApiKey && currentApiKey !== 'MY_GEMINI_API_KEY';
  const masked = isSet && currentApiKey.length > 8
    ? currentApiKey.substring(0, 6) + '...' + currentApiKey.substring(currentApiKey.length - 4)
    : '';
  res.json({ isConfigured: isSet, maskedKey: masked });
});

app.post('/api/assistant/config/apikey', (req, res) => {
  const { apiKey } = req.body;
  if (typeof apiKey === 'string') {
    const cleanKey = apiKey.trim();
    try {
      fs.writeFileSync(credentialsFile, JSON.stringify({ apiKey: cleanKey, updatedAt: Date.now() }), 'utf-8');
      refreshAiClient(cleanKey);
      return res.json({ success: true, isConfigured: !!cleanKey });
    } catch (err: any) {
      return res.status(500).json({ error: 'Error guardando clave: ' + err.message });
    }
  }
  res.status(400).json({ error: 'apiKey inválida' });
});

// 3. User Data Store
app.get('/api/assistant/userdata', (req, res) => {
  if (fs.existsSync(userStoreFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(userStoreFile, 'utf-8'));
      return res.json(data);
    } catch {}
  }
  res.json({});
});

app.post('/api/assistant/userdata', (req, res) => {
  try {
    fs.writeFileSync(userStoreFile, JSON.stringify(req.body, null, 2), 'utf-8');
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Audio Transcription
app.post('/api/assistant/transcribe', async (req, res) => {
  const { audioBase64, mimeType = 'audio/webm' } = req.body;

  if (!audioBase64 || typeof audioBase64 !== 'string') {
    return res.status(400).json({ error: 'audioBase64 requerido' });
  }

  if (aiClient) {
    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: audioBase64,
              },
            },
            {
              text: 'Transcribe exactamente en español lo que dice el usuario en este audio. Devuelve ÚNICAMENTE el texto transcrito directo, sin comillas ni aclaraciones.',
            },
          ],
        },
      });

      const transcript = (response.text || '').trim();
      return res.json({ transcript, source: 'gemini_audio' });
    } catch (err: any) {
      console.warn('[Viernes System] Error transcribiendo con Gemini:', err.message);
    }
  }

  res.json({
    transcript: '',
    source: 'offline_notice',
    message: 'Para transcripción de audio nativa en Electron, configura tu clave de Gemini en Ajustes o usa el modo Edge.',
  });
});

// 5. Microsoft Edge App Mode Launcher
app.post('/api/assistant/launch-edge', (req, res) => {
  const port = req.body.port || process.env.PORT || 3000;
  const targetUrl = `http://localhost:${port}`;

  try {
    if (process.platform === 'win32') {
      spawn('msedge', [`--app=${targetUrl}`], { detached: true, stdio: 'ignore' }).unref();
    } else if (process.platform === 'darwin') {
      spawn('open', ['-a', 'Microsoft Edge', targetUrl], { detached: true, stdio: 'ignore' }).unref();
    } else {
      spawn('xdg-open', [targetUrl], { detached: true, stdio: 'ignore' }).unref();
    }
    res.json({ success: true, url: targetUrl });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Helper for Exponential Backoff on 429 / 503
async function callWithBackoff(fn: () => Promise<any>, maxRetries = 2) {
  let delay = 1000;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const isRateOrBusy = 
        err?.status === 429 || 
        err?.statusCode === 429 || 
        err?.status === 503 ||
        (err?.message && (err.message.includes('429') || err.message.includes('RESOURCE_EXHAUSTED') || err.message.includes('503')));
      
      if (isRateOrBusy && attempt < maxRetries) {
        console.warn(`[Viernes System] Reintentando tras limitación temporal (intento ${attempt + 1})...`);
        await new Promise((r) => setTimeout(r, delay));
        delay *= 2;
        continue;
      }
      throw err;
    }
  }
}

// Multi-Tier Fallback Chain for Gemini with Google Search Grounding
async function generateGeminiWithSearchFallback(contents: any[], systemInstruction: string) {
  if (!aiClient) return null;

  // Tier 1: Gemini 3.8 Flash with Google Search Grounding
  try {
    const response = await callWithBackoff(() =>
      aiClient!.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
          tools: [{ googleSearch: {} }],
        },
      })
    );

    const rawText = response.text || '';
    const sources: Array<{ title: string; url: string }> = [];
    const metadata = response.candidates?.[0]?.groundingMetadata;

    if (metadata?.groundingChunks) {
      for (const chunk of metadata.groundingChunks) {
        if (chunk.web?.uri) {
          const uri = chunk.web.uri;
          let hostname = uri;
          try { hostname = new URL(uri).hostname.replace(/^www\./, ''); } catch {}
          sources.push({
            title: chunk.web.title || hostname,
            url: uri,
          });
        }
      }
    }

    // Deduplicate sources by URL
    const uniqueSources = sources.filter((v, i, a) => a.findIndex(t => t.url === v.url) === i);

    return {
      text: rawText,
      sources: uniqueSources,
      source: 'gemini_search',
    };
  } catch (err1: any) {
    console.warn('[Viernes System] Tier 1 (Gemini Search Grounding) falló:', err1.message);
  }

  // Tier 2: Gemini 3.8 Flash Standard (without Search tool)
  try {
    const response = await callWithBackoff(() =>
      aiClient!.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      })
    );

    return {
      text: response.text || '',
      sources: [],
      source: 'gemini',
    };
  } catch (err2: any) {
    console.warn('[Viernes System] Tier 2 (Gemini Standard) falló:', err2.message);
  }

  // Tier 3: Lighter Gemini model (gemini-3.1-flash-lite)
  try {
    const response = await callWithBackoff(() =>
      aiClient!.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      })
    );

    return {
      text: response.text || '',
      sources: [],
      source: 'gemini_lite',
    };
  } catch (err3: any) {
    console.warn('[Viernes System] Tier 3 (Gemini Flash Lite) falló:', err3.message);
  }

  return null;
}

// 6. Assistant Chat Endpoint with Search Grounding & Memory
app.post('/api/assistant/chat', async (req, res) => {
  const { 
    message, 
    history = [], 
    memories = [], 
    systemContext = {}, 
    personality = 'stark',
    notifications = [] 
  } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Mensaje requerido' });
  }

  // Extract notifications from request body or systemContext
  const notifsList: any[] = Array.isArray(notifications) && notifications.length > 0
    ? notifications
    : Array.isArray(systemContext?.notifications) && systemContext.notifications.length > 0
    ? systemContext.notifications
    : [];

  const notifsSummary = notifsList.length > 0
    ? notifsList.slice(0, 15).map((n: any, idx: number) => {
        const timeStr = n.timestamp ? new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
        return `- [${n.app || 'Sistema'}] (${timeStr}) ${n.title ? n.title + ': ' : ''}${n.text || ''}`;
      }).join('\n')
    : 'No hay notificaciones recientes en la bandeja del sistema de Windows.';

  // Inject user memories as context
  const memorySummaries = Array.isArray(memories) && memories.length > 0
    ? memories.slice(0, 30).map((m: any) => `- [${m.type || 'DATO'}] ${m.title || ''}: ${m.content || ''}`).join('\n')
    : 'No hay memorias previas registradas.';

  const systemInstruction = `Eres "Viernes" (F.R.I.D.A.Y.), la inteligencia artificial y asistente táctica personal inspirada en el sistema de Tony Stark / Industrias Stark.
Tu comunicación es en español, con un tono elegante, táctico, profesional, leal y con personalidad ágil y servicial. Trata al usuario con confianza y cortesía ("jefe", "señor/a" o por su nombre si está en memoria).
Respuestas directas, concisas y naturales para síntesis de voz (evita bloques gigantescos de texto o formato Markdown excesivo en la voz principal).

REGLA DE CONFIANZA:
Nunca respondas "no sé" a secas. Si un dato no es 100% verificable o no tienes certeza absoluta, proporciona la mejor estimación o análisis razonado disponible, indicando tu nivel de confianza y cómo verificarlo.
Utiliza búsqueda web de Google siempre que te pregunten sobre noticias recientes, clima, cotizaciones, eventos actuales, horarios o datos en tiempo real.

BANCO DE MEMORIA DEL USUARIO:
${memorySummaries}

NOTIFICACIONES ACTIVAS DE WINDOWS (WhatsApp, Outlook, Correo, Discord, etc.):
${notifsSummary}
- Si el usuario pregunta "¿tengo algo de WhatsApp?", "¿tengo mensajes?" o por alguna app específica, consulta esta lista exacta y responde con precisión.
- Si pide "léeme las notificaciones" o "resume mis notificaciones", brinda un resumen ordenado y ejecutivo.

ESTADO ACTUAL:
Fecha y hora local: ${systemContext.currentTime || new Date().toLocaleString()}
Batería: ${systemContext.battery || '98%'}
Régimen: En línea y reactivo.

DIRECTRICES DE ACCIÓN:
Si el usuario pide una acción de automatización, responde confirmándola naturalmente y además adjunta al final de tu respuesta (en una línea separada con el prefijo "[[ACTION:") un comando JSON estructurado:
- Abrir aplicación web: [[ACTION:{"type":"OPEN_APP","app":"youtube"|"spotify"|"whatsapp"|"maps"|"calendar"|"gmail"|"notes"|"calculator","query":"..."}]]
- Guardar memoria: [[ACTION:{"type":"SAVE_MEMORY","category":"PREFERENCE"|"CONTACT_ALIAS"|"ROUTINE"|"FACT","title":"...","content":"..."}]]
- Iniciar temporizador/cronómetro: [[ACTION:{"type":"TIMER","seconds":60,"label":"..."}]]
- Activar rutina: [[ACTION:{"type":"ROUTINE","name":"..."}]]
- Si es sólo conversación o respuesta informativa, no incluyas ningún bloque [[ACTION:...]].`;

  // Build conversation history
  const contents: any[] = [];
  if (Array.isArray(history)) {
    for (const item of history.slice(-10)) {
      contents.push({
        role: item.role === 'model' ? 'model' : 'user',
        parts: [{ text: item.text || item.content || '' }],
      });
    }
  }

  contents.push({
    role: 'user',
    parts: [{ text: message }],
  });

  // Execute Fallback Chain
  const geminiResult = await generateGeminiWithSearchFallback(contents, systemInstruction);

  if (geminiResult && geminiResult.text) {
    let cleanedText = geminiResult.text;
    let detectedAction = null;
    const actionMatch = geminiResult.text.match(/\[\[ACTION:(.*?)\]\]/s);

    if (actionMatch) {
      try {
        detectedAction = JSON.parse(actionMatch[1].trim());
        cleanedText = geminiResult.text.replace(actionMatch[0], '').trim();
      } catch {}
    }

    return res.json({
      response: cleanedText,
      sources: geminiResult.sources || [],
      action: detectedAction,
      source: geminiResult.source,
    });
  }

  // Tier 4: Offline / Fallback Intelligent Rule Engine (Viernes Native Subsystem)
  const lower = message.toLowerCase().trim();
  let responseText = '';
  let detectedAction: any = null;

  if (lower.includes('hola') || lower.includes('oye viernes') || lower.includes('viernes')) {
    responseText = 'Sistemas en línea, jefe. Protocolos tácticos activos. ¿En qué puedo asistirte en este momento?';
  } else if (lower.includes('whatsapp') && (lower.includes('tengo') || lower.includes('hay') || lower.includes('mensaje') || lower.includes('algo'))) {
    const waNotifs = notifsList.filter((n: any) => (n.app || '').toLowerCase().includes('whatsapp'));
    if (waNotifs.length > 0) {
      const summaryItems = waNotifs.map((n: any) => `${n.title ? n.title + ': ' : ''}${n.text}`).join(' | ');
      responseText = `Tienes ${waNotifs.length} notificación(es) de WhatsApp en tu sistema: ${summaryItems}`;
    } else {
      responseText = 'No tienes notificaciones pendientes de WhatsApp en este momento, jefe.';
    }
  } else if (lower.includes('léeme las notificaciones') || lower.includes('leeme las notificaciones') || lower.includes('resume mis notificaciones') || lower.includes('notificaciones')) {
    if (notifsList.length > 0) {
      const summaryItems = notifsList.slice(0, 5).map((n: any, idx: number) => `${idx + 1}. [${n.app}] ${n.title ? n.title + ': ' : ''}${n.text}`).join('. ');
      responseText = `Tienes ${notifsList.length} notificación(es) del sistema: ${summaryItems}`;
    } else {
      responseText = 'No hay notificaciones pendientes en la bandeja de Windows.';
    }
  } else if (lower.includes('quién eres') || lower.includes('quien eres') || lower.includes('qué eres')) {
    responseText = 'Soy Viernes, tu asistente de interfaz e inteligencia táctica y personal. Estoy aquí para gestionar tus comunicaciones, memorias, rutinas y consultas con precisión milimétrica.';
  } else if (lower.includes('abre youtube') || lower.includes('abrir youtube')) {
    const query = lower.replace(/.*youtube\s*(y busca|para buscar)?/i, '').trim();
    responseText = query ? `Abriendo YouTube y buscando "${query}".` : 'Iniciando interfaz de YouTube, jefe.';
    detectedAction = { type: 'OPEN_APP', app: 'youtube', query };
  } else if (lower.includes('abre spotify') || lower.includes('reproduce') || lower.includes('pon música')) {
    const query = lower.replace(/.*(spotify|reproduce|pon música)\s*/i, '').trim();
    responseText = query ? `Sintonizando "${query}" en Spotify.` : 'Cargando tu lista de reproducción en Spotify.';
    detectedAction = { type: 'OPEN_APP', app: 'spotify', query };
  } else if (lower.includes('abre whatsapp') || lower.includes('mensaje')) {
    responseText = 'Abriendo WhatsApp para tus comunicaciones directas.';
    detectedAction = { type: 'OPEN_APP', app: 'whatsapp' };
  } else if (lower.includes('mapas') || lower.includes('dónde queda') || lower.includes('cómo llegar a') || lower.includes('abre maps')) {
    const query = lower.replace(/.*(mapas|maps|cómo llegar a|donde queda|dónde queda)\s*/i, '').trim();
    responseText = query ? `Calculando ruta y localización para "${query}".` : 'Desplegando navegación por satélite en Google Maps.';
    detectedAction = { type: 'OPEN_APP', app: 'maps', query };
  } else if (lower.includes('temporizador') || lower.includes('alarma') || lower.includes('cuenta regresiva')) {
    const minutesMatch = lower.match(/(\d+)\s*(minuto|minutos|min)/);
    const secondsMatch = lower.match(/(\d+)\s*(segundo|segundos|seg)/);
    let totalSeconds = 60;
    if (minutesMatch) totalSeconds = parseInt(minutesMatch[1], 10) * 60;
    else if (secondsMatch) totalSeconds = parseInt(secondsMatch[1], 10);
    
    responseText = `Temporizador configurado para ${Math.floor(totalSeconds / 60) > 0 ? Math.floor(totalSeconds / 60) + ' minutos' : totalSeconds + ' segundos'}. Te avisaré al completarse.`;
    detectedAction = { type: 'TIMER', seconds: totalSeconds, label: 'Alarma de Viernes' };
  } else if (lower.includes('recuerda que') || lower.includes('guarda que') || lower.includes('anota que')) {
    const content = message.replace(/.*(recuerda que|guarda que|anota que)\s*/i, '').trim();
    responseText = `Registrado en el núcleo de memoria: "${content}". Lo tendré presente en futuras decisiones.`;
    detectedAction = {
      type: 'SAVE_MEMORY',
      category: 'FACT',
      title: 'Dato recordado',
      content,
    };
  } else if (lower.includes('qué sabes sobre mí') || lower.includes('que sabes sobre mi') || lower.includes('mis memorias') || lower.includes('resumen')) {
    responseText = Array.isArray(memories) && memories.length > 0
      ? `Tengo registrados ${memories.length} datos en tu banco de memoria semántica, incluyendo tus preferencias y rutinas de automatización.`
      : 'Actualmente tu banco de memoria está vacío. Puedes indicarme "Recuerda que..." para comenzar a construir tu perfil personalizado.';
  } else if (lower.includes('rutina de hoy') || lower.includes('activa rutina') || lower.includes('modo trabajo') || lower.includes('buenos días')) {
    responseText = 'Iniciando protocolo de rutina. Preparando herramientas de enfoque y comprobando el estado de todos los subsistemas.';
    detectedAction = { type: 'ROUTINE', name: lower.includes('trabajo') ? 'Modo Trabajo' : 'Rutina Diaria' };
  } else if (lower.includes('calcula') || lower.match(/\d+\s*[\+\-\*\/x]\s*\d+/)) {
    try {
      const cleanExpr = lower.replace(/calcula/i, '').replace(/x/g, '*').replace(/[^0-9\+\-\*\/\.\(\)]/g, '');
      const calcResult = Function(`'use strict'; return (${cleanExpr})`)();
      responseText = `El cálculo de ${cleanExpr} da exactamente ${calcResult}.`;
      detectedAction = { type: 'OPEN_APP', app: 'calculator' };
    } catch {
      responseText = 'Abriendo la calculadora integrada para tu operación.';
      detectedAction = { type: 'OPEN_APP', app: 'calculator' };
    }
  } else {
    // Never say "no sé" bluntly: provide best estimate + confidence
    responseText = `Sin conexión exterior en este momento; procesando con mi banco de memoria local. Respecto a "${message}": estimo con confianza moderada que puedes revisar tus registros en el panel de Memoria o verificar la conexión de red para consultar fuentes satelitales en vivo.`;
  }

  return res.json({
    response: responseText,
    sources: [],
    action: detectedAction,
    source: 'local_subsystem',
  });
});

// 7. Setup Static Serving / Vite Mode
export async function setupApp(serverInstance?: http.Server) {
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    !!process.env.VIERNES_PACKAGED ||
    !!process.env.ELECTRON_RUN_AS_NODE;

  const potentialPaths = [
    process.env.VIERNES_STATIC_PATH,
    path.resolve(currentDir, 'dist'),
    path.resolve(currentDir, '../dist'),
    path.resolve(process.cwd(), 'dist'),
  ].filter(Boolean) as string[];

  let staticDir = '';
  for (const p of potentialPaths) {
    if (fs.existsSync(p) && fs.existsSync(path.join(p, 'index.html'))) {
      staticDir = p;
      break;
    }
  }

  if (!isProduction && !staticDir) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('[Viernes System] Vite middleware montado en desarrollo.');
  } else {
    if (staticDir) {
      app.use(express.static(staticDir));
      app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api/')) return next();
        res.sendFile(path.join(staticDir, 'index.html'));
      });
      console.log(`[Viernes System] Sirviendo archivos estáticos desde: ${staticDir}`);
    } else {
      console.warn('[Viernes System] Directorio estático dist no encontrado en rutas previstas.');
    }
  }
}

// 8. Server Lifecycle & Dynamic Port
export async function startServer(initialPort = 3000): Promise<{ server: http.Server; port: number }> {
  await setupApp();

  return new Promise((resolve, reject) => {
    let port = parseInt(process.env.PORT || String(initialPort), 10);
    const server = http.createServer(app);

    function tryListen(p: number) {
      server.listen(p, '0.0.0.0', () => {
        console.log(`[Viernes System] Core online on http://0.0.0.0:${p}`);
        try {
          fs.writeFileSync(path.join(userDataDir, 'viernes_port.json'), JSON.stringify({ port: p, pid: process.pid }), 'utf-8');
        } catch {}
        resolve({ server, port: p });
      });

      server.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          console.warn(`[Viernes System] Puerto ${p} en uso, intentando ${p + 1}...`);
          tryListen(p + 1);
        } else {
          reject(err);
        }
      });
    }

    tryListen(port);
  });
}

// Auto-start when executed directly
const isMain = process.argv[1] && (
  process.argv[1].endsWith('server.ts') ||
  process.argv[1].endsWith('server.cjs') ||
  process.argv[1].endsWith('server.js')
);

if (isMain) {
  startServer().catch((err) => {
    console.error('[Viernes System] Error al iniciar el servidor:', err);
  });
}

export { app };
