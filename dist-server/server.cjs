var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server.ts
var server_exports = {};
__export(server_exports, {
  app: () => app,
  setupApp: () => setupApp,
  startServer: () => startServer
});
module.exports = __toCommonJS(server_exports);
var import_express = __toESM(require("express"), 1);
var import_vite = require("vite");
var import_dotenv = __toESM(require("dotenv"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_os = __toESM(require("os"), 1);
var import_http = __toESM(require("http"), 1);
var import_child_process = require("child_process");
var import_genai = require("@google/genai");
import_dotenv.default.config();
var currentDir = typeof __dirname !== "undefined" ? __dirname : process.cwd();
var app = (0, import_express.default)();
app.use(import_express.default.json({ limit: "25mb" }));
var userDataDir = process.env.VIERNES_USER_DATA || import_path.default.join(import_os.default.homedir(), ".viernes_assistant");
if (!import_fs.default.existsSync(userDataDir)) {
  try {
    import_fs.default.mkdirSync(userDataDir, { recursive: true });
  } catch (e) {
    console.warn("[Viernes System] No se pudo crear userDataDir:", e);
  }
}
var credentialsFile = import_path.default.join(userDataDir, "viernes_credentials.json");
var userStoreFile = import_path.default.join(userDataDir, "viernes_store.json");
var currentApiKey = process.env.GEMINI_API_KEY || "";
if ((!currentApiKey || currentApiKey === "MY_GEMINI_API_KEY") && import_fs.default.existsSync(credentialsFile)) {
  try {
    const creds = JSON.parse(import_fs.default.readFileSync(credentialsFile, "utf-8"));
    if (creds.apiKey) currentApiKey = creds.apiKey;
  } catch {
  }
}
var aiClient = null;
function refreshAiClient(key) {
  if (key && key !== "MY_GEMINI_API_KEY") {
    currentApiKey = key;
    aiClient = new import_genai.GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
    console.log("[Viernes System] Gemini Client inicializado con \xE9xito.");
  } else {
    currentApiKey = "";
    aiClient = null;
    console.log("[Viernes System] Modo Local Offline activo.");
  }
}
refreshAiClient(currentApiKey);
app.get("/api/assistant/health", (req, res) => {
  res.json({
    status: "online",
    version: "4.2.0-stark",
    geminiConfigured: !!aiClient,
    model: "gemini-3.8-flash",
    userDataDir,
    timestamp: Date.now()
  });
});
app.get("/api/assistant/config/apikey", (req, res) => {
  const isSet = !!currentApiKey && currentApiKey !== "MY_GEMINI_API_KEY";
  const masked = isSet && currentApiKey.length > 8 ? currentApiKey.substring(0, 6) + "..." + currentApiKey.substring(currentApiKey.length - 4) : "";
  res.json({ isConfigured: isSet, maskedKey: masked });
});
app.post("/api/assistant/config/apikey", (req, res) => {
  const { apiKey } = req.body;
  if (typeof apiKey === "string") {
    const cleanKey = apiKey.trim();
    try {
      import_fs.default.writeFileSync(credentialsFile, JSON.stringify({ apiKey: cleanKey, updatedAt: Date.now() }), "utf-8");
      refreshAiClient(cleanKey);
      return res.json({ success: true, isConfigured: !!cleanKey });
    } catch (err) {
      return res.status(500).json({ error: "Error guardando clave: " + err.message });
    }
  }
  res.status(400).json({ error: "apiKey inv\xE1lida" });
});
app.get("/api/assistant/userdata", (req, res) => {
  if (import_fs.default.existsSync(userStoreFile)) {
    try {
      const data = JSON.parse(import_fs.default.readFileSync(userStoreFile, "utf-8"));
      return res.json(data);
    } catch {
    }
  }
  res.json({});
});
app.post("/api/assistant/userdata", (req, res) => {
  try {
    import_fs.default.writeFileSync(userStoreFile, JSON.stringify(req.body, null, 2), "utf-8");
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/assistant/transcribe", async (req, res) => {
  const { audioBase64, mimeType = "audio/webm" } = req.body;
  if (!audioBase64 || typeof audioBase64 !== "string") {
    return res.status(400).json({ error: "audioBase64 requerido" });
  }
  if (aiClient) {
    try {
      const response = await aiClient.models.generateContent({
        model: "gemini-3.8-flash",
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: audioBase64
              }
            },
            {
              text: "Transcribe exactamente en espa\xF1ol lo que dice el usuario en este audio. Devuelve \xDANICAMENTE el texto transcrito directo, sin comillas ni aclaraciones."
            }
          ]
        }
      });
      const transcript = (response.text || "").trim();
      return res.json({ transcript, source: "gemini_audio" });
    } catch (err) {
      console.warn("[Viernes System] Error transcribiendo con Gemini:", err.message);
    }
  }
  res.json({
    transcript: "",
    source: "offline_notice",
    message: "Para transcripci\xF3n de audio nativa en Electron, configura tu clave de Gemini en Ajustes o usa el modo Edge."
  });
});
app.post("/api/assistant/launch-edge", (req, res) => {
  const port = req.body.port || process.env.PORT || 3e3;
  const targetUrl = `http://localhost:${port}`;
  try {
    if (process.platform === "win32") {
      (0, import_child_process.spawn)("msedge", [`--app=${targetUrl}`], { detached: true, stdio: "ignore" }).unref();
    } else if (process.platform === "darwin") {
      (0, import_child_process.spawn)("open", ["-a", "Microsoft Edge", targetUrl], { detached: true, stdio: "ignore" }).unref();
    } else {
      (0, import_child_process.spawn)("xdg-open", [targetUrl], { detached: true, stdio: "ignore" }).unref();
    }
    res.json({ success: true, url: targetUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
async function callWithBackoff(fn, maxRetries = 2) {
  let delay = 1e3;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isRateOrBusy = err?.status === 429 || err?.statusCode === 429 || err?.status === 503 || err?.message && (err.message.includes("429") || err.message.includes("RESOURCE_EXHAUSTED") || err.message.includes("503"));
      if (isRateOrBusy && attempt < maxRetries) {
        console.warn(`[Viernes System] Reintentando tras limitaci\xF3n temporal (intento ${attempt + 1})...`);
        await new Promise((r) => setTimeout(r, delay));
        delay *= 2;
        continue;
      }
      throw err;
    }
  }
}
async function generateGeminiWithSearchFallback(contents, systemInstruction) {
  if (!aiClient) return null;
  try {
    const response = await callWithBackoff(
      () => aiClient.models.generateContent({
        model: "gemini-3.8-flash",
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
          tools: [{ googleSearch: {} }]
        }
      })
    );
    const rawText = response.text || "";
    const sources = [];
    const metadata = response.candidates?.[0]?.groundingMetadata;
    if (metadata?.groundingChunks) {
      for (const chunk of metadata.groundingChunks) {
        if (chunk.web?.uri) {
          const uri = chunk.web.uri;
          let hostname = uri;
          try {
            hostname = new URL(uri).hostname.replace(/^www\./, "");
          } catch {
          }
          sources.push({
            title: chunk.web.title || hostname,
            url: uri
          });
        }
      }
    }
    const uniqueSources = sources.filter((v, i, a) => a.findIndex((t) => t.url === v.url) === i);
    return {
      text: rawText,
      sources: uniqueSources,
      source: "gemini_search"
    };
  } catch (err1) {
    console.warn("[Viernes System] Tier 1 (Gemini Search Grounding) fall\xF3:", err1.message);
  }
  try {
    const response = await callWithBackoff(
      () => aiClient.models.generateContent({
        model: "gemini-3.8-flash",
        contents,
        config: {
          systemInstruction,
          temperature: 0.7
        }
      })
    );
    return {
      text: response.text || "",
      sources: [],
      source: "gemini"
    };
  } catch (err2) {
    console.warn("[Viernes System] Tier 2 (Gemini Standard) fall\xF3:", err2.message);
  }
  try {
    const response = await callWithBackoff(
      () => aiClient.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents,
        config: {
          systemInstruction,
          temperature: 0.7
        }
      })
    );
    return {
      text: response.text || "",
      sources: [],
      source: "gemini_lite"
    };
  } catch (err3) {
    console.warn("[Viernes System] Tier 3 (Gemini Flash Lite) fall\xF3:", err3.message);
  }
  return null;
}
app.post("/api/assistant/chat", async (req, res) => {
  const {
    message,
    history = [],
    memories = [],
    systemContext = {},
    personality = "stark",
    notifications = []
  } = req.body;
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Mensaje requerido" });
  }
  const notifsList = Array.isArray(notifications) && notifications.length > 0 ? notifications : Array.isArray(systemContext?.notifications) && systemContext.notifications.length > 0 ? systemContext.notifications : [];
  const notifsSummary = notifsList.length > 0 ? notifsList.slice(0, 15).map((n, idx) => {
    const timeStr = n.timestamp ? new Date(n.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
    return `- [${n.app || "Sistema"}] (${timeStr}) ${n.title ? n.title + ": " : ""}${n.text || ""}`;
  }).join("\n") : "No hay notificaciones recientes en la bandeja del sistema de Windows.";
  const memorySummaries = Array.isArray(memories) && memories.length > 0 ? memories.slice(0, 30).map((m) => `- [${m.type || "DATO"}] ${m.title || ""}: ${m.content || ""}`).join("\n") : "No hay memorias previas registradas.";
  const systemInstruction = `Eres "Viernes" (F.R.I.D.A.Y.), la inteligencia artificial y asistente t\xE1ctica personal inspirada en el sistema de Tony Stark / Industrias Stark.
Tu comunicaci\xF3n es en espa\xF1ol, con un tono elegante, t\xE1ctico, profesional, leal y con personalidad \xE1gil y servicial. Trata al usuario con confianza y cortes\xEDa ("jefe", "se\xF1or/a" o por su nombre si est\xE1 en memoria).
Respuestas directas, concisas y naturales para s\xEDntesis de voz (evita bloques gigantescos de texto o formato Markdown excesivo en la voz principal).

REGLA DE CONFIANZA:
Nunca respondas "no s\xE9" a secas. Si un dato no es 100% verificable o no tienes certeza absoluta, proporciona la mejor estimaci\xF3n o an\xE1lisis razonado disponible, indicando tu nivel de confianza y c\xF3mo verificarlo.
Utiliza b\xFAsqueda web de Google siempre que te pregunten sobre noticias recientes, clima, cotizaciones, eventos actuales, horarios o datos en tiempo real.

BANCO DE MEMORIA DEL USUARIO:
${memorySummaries}

NOTIFICACIONES ACTIVAS DE WINDOWS (WhatsApp, Outlook, Correo, Discord, etc.):
${notifsSummary}
- Si el usuario pregunta "\xBFtengo algo de WhatsApp?", "\xBFtengo mensajes?" o por alguna app espec\xEDfica, consulta esta lista exacta y responde con precisi\xF3n.
- Si pide "l\xE9eme las notificaciones" o "resume mis notificaciones", brinda un resumen ordenado y ejecutivo.

ESTADO ACTUAL:
Fecha y hora local: ${systemContext.currentTime || (/* @__PURE__ */ new Date()).toLocaleString()}
Bater\xEDa: ${systemContext.battery || "98%"}
R\xE9gimen: En l\xEDnea y reactivo.

DIRECTRICES DE ACCI\xD3N:
Si el usuario pide una acci\xF3n de automatizaci\xF3n, responde confirm\xE1ndola naturalmente y adem\xE1s adjunta al final de tu respuesta (en una l\xEDnea separada con el prefijo "[[ACTION:") un comando JSON estructurado:
- Abrir aplicaci\xF3n web: [[ACTION:{"type":"OPEN_APP","app":"youtube"|"spotify"|"whatsapp"|"maps"|"calendar"|"gmail"|"notes"|"calculator","query":"..."}]]
- Guardar memoria: [[ACTION:{"type":"SAVE_MEMORY","category":"PREFERENCE"|"CONTACT_ALIAS"|"ROUTINE"|"FACT","title":"...","content":"..."}]]
- Iniciar temporizador/cron\xF3metro: [[ACTION:{"type":"TIMER","seconds":60,"label":"..."}]]
- Activar rutina: [[ACTION:{"type":"ROUTINE","name":"..."}]]
- Si es s\xF3lo conversaci\xF3n o respuesta informativa, no incluyas ning\xFAn bloque [[ACTION:...]].`;
  const contents = [];
  if (Array.isArray(history)) {
    for (const item of history.slice(-10)) {
      contents.push({
        role: item.role === "model" ? "model" : "user",
        parts: [{ text: item.text || item.content || "" }]
      });
    }
  }
  contents.push({
    role: "user",
    parts: [{ text: message }]
  });
  const geminiResult = await generateGeminiWithSearchFallback(contents, systemInstruction);
  if (geminiResult && geminiResult.text) {
    let cleanedText = geminiResult.text;
    let detectedAction2 = null;
    const actionMatch = geminiResult.text.match(/\[\[ACTION:(.*?)\]\]/s);
    if (actionMatch) {
      try {
        detectedAction2 = JSON.parse(actionMatch[1].trim());
        cleanedText = geminiResult.text.replace(actionMatch[0], "").trim();
      } catch {
      }
    }
    return res.json({
      response: cleanedText,
      sources: geminiResult.sources || [],
      action: detectedAction2,
      source: geminiResult.source
    });
  }
  const lower = message.toLowerCase().trim();
  let responseText = "";
  let detectedAction = null;
  if (lower.includes("hola") || lower.includes("oye viernes") || lower.includes("viernes")) {
    responseText = "Sistemas en l\xEDnea, jefe. Protocolos t\xE1cticos activos. \xBFEn qu\xE9 puedo asistirte en este momento?";
  } else if (lower.includes("whatsapp") && (lower.includes("tengo") || lower.includes("hay") || lower.includes("mensaje") || lower.includes("algo"))) {
    const waNotifs = notifsList.filter((n) => (n.app || "").toLowerCase().includes("whatsapp"));
    if (waNotifs.length > 0) {
      const summaryItems = waNotifs.map((n) => `${n.title ? n.title + ": " : ""}${n.text}`).join(" | ");
      responseText = `Tienes ${waNotifs.length} notificaci\xF3n(es) de WhatsApp en tu sistema: ${summaryItems}`;
    } else {
      responseText = "No tienes notificaciones pendientes de WhatsApp en este momento, jefe.";
    }
  } else if (lower.includes("l\xE9eme las notificaciones") || lower.includes("leeme las notificaciones") || lower.includes("resume mis notificaciones") || lower.includes("notificaciones")) {
    if (notifsList.length > 0) {
      const summaryItems = notifsList.slice(0, 5).map((n, idx) => `${idx + 1}. [${n.app}] ${n.title ? n.title + ": " : ""}${n.text}`).join(". ");
      responseText = `Tienes ${notifsList.length} notificaci\xF3n(es) del sistema: ${summaryItems}`;
    } else {
      responseText = "No hay notificaciones pendientes en la bandeja de Windows.";
    }
  } else if (lower.includes("qui\xE9n eres") || lower.includes("quien eres") || lower.includes("qu\xE9 eres")) {
    responseText = "Soy Viernes, tu asistente de interfaz e inteligencia t\xE1ctica y personal. Estoy aqu\xED para gestionar tus comunicaciones, memorias, rutinas y consultas con precisi\xF3n milim\xE9trica.";
  } else if (lower.includes("abre youtube") || lower.includes("abrir youtube")) {
    const query = lower.replace(/.*youtube\s*(y busca|para buscar)?/i, "").trim();
    responseText = query ? `Abriendo YouTube y buscando "${query}".` : "Iniciando interfaz de YouTube, jefe.";
    detectedAction = { type: "OPEN_APP", app: "youtube", query };
  } else if (lower.includes("abre spotify") || lower.includes("reproduce") || lower.includes("pon m\xFAsica")) {
    const query = lower.replace(/.*(spotify|reproduce|pon música)\s*/i, "").trim();
    responseText = query ? `Sintonizando "${query}" en Spotify.` : "Cargando tu lista de reproducci\xF3n en Spotify.";
    detectedAction = { type: "OPEN_APP", app: "spotify", query };
  } else if (lower.includes("abre whatsapp") || lower.includes("mensaje")) {
    responseText = "Abriendo WhatsApp para tus comunicaciones directas.";
    detectedAction = { type: "OPEN_APP", app: "whatsapp" };
  } else if (lower.includes("mapas") || lower.includes("d\xF3nde queda") || lower.includes("c\xF3mo llegar a") || lower.includes("abre maps")) {
    const query = lower.replace(/.*(mapas|maps|cómo llegar a|donde queda|dónde queda)\s*/i, "").trim();
    responseText = query ? `Calculando ruta y localizaci\xF3n para "${query}".` : "Desplegando navegaci\xF3n por sat\xE9lite en Google Maps.";
    detectedAction = { type: "OPEN_APP", app: "maps", query };
  } else if (lower.includes("temporizador") || lower.includes("alarma") || lower.includes("cuenta regresiva")) {
    const minutesMatch = lower.match(/(\d+)\s*(minuto|minutos|min)/);
    const secondsMatch = lower.match(/(\d+)\s*(segundo|segundos|seg)/);
    let totalSeconds = 60;
    if (minutesMatch) totalSeconds = parseInt(minutesMatch[1], 10) * 60;
    else if (secondsMatch) totalSeconds = parseInt(secondsMatch[1], 10);
    responseText = `Temporizador configurado para ${Math.floor(totalSeconds / 60) > 0 ? Math.floor(totalSeconds / 60) + " minutos" : totalSeconds + " segundos"}. Te avisar\xE9 al completarse.`;
    detectedAction = { type: "TIMER", seconds: totalSeconds, label: "Alarma de Viernes" };
  } else if (lower.includes("recuerda que") || lower.includes("guarda que") || lower.includes("anota que")) {
    const content = message.replace(/.*(recuerda que|guarda que|anota que)\s*/i, "").trim();
    responseText = `Registrado en el n\xFAcleo de memoria: "${content}". Lo tendr\xE9 presente en futuras decisiones.`;
    detectedAction = {
      type: "SAVE_MEMORY",
      category: "FACT",
      title: "Dato recordado",
      content
    };
  } else if (lower.includes("qu\xE9 sabes sobre m\xED") || lower.includes("que sabes sobre mi") || lower.includes("mis memorias") || lower.includes("resumen")) {
    responseText = Array.isArray(memories) && memories.length > 0 ? `Tengo registrados ${memories.length} datos en tu banco de memoria sem\xE1ntica, incluyendo tus preferencias y rutinas de automatizaci\xF3n.` : 'Actualmente tu banco de memoria est\xE1 vac\xEDo. Puedes indicarme "Recuerda que..." para comenzar a construir tu perfil personalizado.';
  } else if (lower.includes("rutina de hoy") || lower.includes("activa rutina") || lower.includes("modo trabajo") || lower.includes("buenos d\xEDas")) {
    responseText = "Iniciando protocolo de rutina. Preparando herramientas de enfoque y comprobando el estado de todos los subsistemas.";
    detectedAction = { type: "ROUTINE", name: lower.includes("trabajo") ? "Modo Trabajo" : "Rutina Diaria" };
  } else if (lower.includes("calcula") || lower.match(/\d+\s*[\+\-\*\/x]\s*\d+/)) {
    try {
      const cleanExpr = lower.replace(/calcula/i, "").replace(/x/g, "*").replace(/[^0-9\+\-\*\/\.\(\)]/g, "");
      const calcResult = Function(`'use strict'; return (${cleanExpr})`)();
      responseText = `El c\xE1lculo de ${cleanExpr} da exactamente ${calcResult}.`;
      detectedAction = { type: "OPEN_APP", app: "calculator" };
    } catch {
      responseText = "Abriendo la calculadora integrada para tu operaci\xF3n.";
      detectedAction = { type: "OPEN_APP", app: "calculator" };
    }
  } else {
    responseText = `Sin conexi\xF3n exterior en este momento; procesando con mi banco de memoria local. Respecto a "${message}": estimo con confianza moderada que puedes revisar tus registros en el panel de Memoria o verificar la conexi\xF3n de red para consultar fuentes satelitales en vivo.`;
  }
  return res.json({
    response: responseText,
    sources: [],
    action: detectedAction,
    source: "local_subsystem"
  });
});
async function setupApp(serverInstance) {
  const isProduction = process.env.NODE_ENV === "production" || !!process.env.VIERNES_PACKAGED || !!process.env.ELECTRON_RUN_AS_NODE;
  const potentialPaths = [
    process.env.VIERNES_STATIC_PATH,
    import_path.default.resolve(currentDir, "dist"),
    import_path.default.resolve(currentDir, "../dist"),
    import_path.default.resolve(process.cwd(), "dist")
  ].filter(Boolean);
  let staticDir = "";
  for (const p of potentialPaths) {
    if (import_fs.default.existsSync(p) && import_fs.default.existsSync(import_path.default.join(p, "index.html"))) {
      staticDir = p;
      break;
    }
  }
  if (!isProduction && !staticDir) {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
    console.log("[Viernes System] Vite middleware montado en desarrollo.");
  } else {
    if (staticDir) {
      app.use(import_express.default.static(staticDir));
      app.get("*", (req, res, next) => {
        if (req.path.startsWith("/api/")) return next();
        res.sendFile(import_path.default.join(staticDir, "index.html"));
      });
      console.log(`[Viernes System] Sirviendo archivos est\xE1ticos desde: ${staticDir}`);
    } else {
      console.warn("[Viernes System] Directorio est\xE1tico dist no encontrado en rutas previstas.");
    }
  }
}
async function startServer(initialPort = 3e3) {
  await setupApp();
  return new Promise((resolve, reject) => {
    let port = parseInt(process.env.PORT || String(initialPort), 10);
    const server = import_http.default.createServer(app);
    function tryListen(p) {
      server.listen(p, "0.0.0.0", () => {
        console.log(`[Viernes System] Core online on http://0.0.0.0:${p}`);
        try {
          import_fs.default.writeFileSync(import_path.default.join(userDataDir, "viernes_port.json"), JSON.stringify({ port: p, pid: process.pid }), "utf-8");
        } catch {
        }
        resolve({ server, port: p });
      });
      server.on("error", (err) => {
        if (err.code === "EADDRINUSE") {
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
var isMain = process.argv[1] && (process.argv[1].endsWith("server.ts") || process.argv[1].endsWith("server.cjs") || process.argv[1].endsWith("server.js"));
if (isMain) {
  startServer().catch((err) => {
    console.error("[Viernes System] Error al iniciar el servidor:", err);
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  app,
  setupApp,
  startServer
});
