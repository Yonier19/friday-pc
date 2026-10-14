/**
 * Enrutador de Intenciones de Viernes (FRIDAY)
 * Clasifica cada mensaje antes de la inferencia para optimizar la ruta de respuesta:
 * - Comando local (temporizador, calculadora, notas, apps, rutinas, memorias)
 * - Información actual (requiere Google Search Grounding)
 * - Consulta con URL (requiere lectura de enlace / urlContext)
 * - Corrección de usuario (reactiva búsqueda y ofrece guardar en memoria)
 * - Pregunta ambigua (interpreta y añade pregunta de aclaración)
 * - Conocimiento general, código o conversación
 */

import { evaluate } from 'mathjs';

export type IntentCategory = 
  | 'LOCAL_COMMAND'
  | 'CURRENT_INFO'
  | 'URL_QUERY'
  | 'CORRECTION'
  | 'CALCULATION'
  | 'AMBIGUOUS'
  | 'GENERAL_KNOWLEDGE';

export interface LocalActionPayload {
  type: 'OPEN_APP' | 'TIMER' | 'SAVE_MEMORY' | 'ROUTINE' | 'CALCULATOR' | 'NOTES' | 'LOCAL_ANSWER';
  app?: string;
  query?: string;
  seconds?: number;
  label?: string;
  category?: string;
  title?: string;
  content?: string;
  routineName?: string;
  directAnswer?: string;
}

export interface IntentClassification {
  category: IntentCategory;
  confidence: 'alta' | 'media' | 'baja';
  requiresSearch: boolean;
  requiresUrlContext: boolean;
  urls: string[];
  localAction?: LocalActionPayload;
  suggestedClarification?: string;
  explanation?: string;
}

const CURRENT_INFO_PATTERNS = [
  /\b(clima|tiempo|temperatura|pron[oó]stico|lluvia)\b/i,
  /\b(noticia|noticias|titulares|novedades|actualidad)\b/i,
  /\b(precio|precios|cu[aá]nto cuesta|cotizaci[oó]n|valor del|d[oó]lar|bitcoin|crypto|euro)\b/i,
  /\b(deporte|deportes|partido|marcador|resultado|liga|f[uú]tbol|champions|campeonato)\b/i,
  /\b(horario|horarios|cu[aá]ndo juega|cu[aá]ndo estrena|fecha de estreno)\b/i,
  /\b(hoy|ahora|en este momento|en vivo|actualmente|[uú]ltim[oa]s?|reciente)\b/i,
  /\b(qui[eé]n gan[oó]|qui[eé]n es el actual|presidente actual|qui[eé]n lidera)\b/i,
];

const CORRECTION_PATTERNS = [
  /\b(no,? eso es incorrecto|te equivocaste|est[aá]s equivocado|eso est[aá] mal|eso no es verdad)\b/i,
  /\b(no es as[ií]|eso es falso|corrige eso|informaci[oó]n incorrecta|error en tu respuesta)\b/i,
];

const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;

export class IntentRouter {
  /**
   * Extrae todas las URLs presentes en el mensaje
   */
  public static extractUrls(text: string): string[] {
    const matches = text.match(URL_REGEX);
    return matches ? Array.from(new Set(matches)) : [];
  }

  /**
   * Evalúa de forma segura expresiones matemáticas
   */
  public static safeEvaluateMath(expr: string): { success: boolean; result?: string; error?: string } {
    try {
      // Limpiar texto para aislar la expresión
      let cleaned = expr
        .replace(/calcula|cu[aá]nto es|cuanto es|resultado de|\?/gi, '')
        .replace(/x/g, '*')
        .replace(/%/g, '/100')
        .trim();

      if (!cleaned || !/[\d]/.test(cleaned)) {
        return { success: false, error: 'Sin expresión numérica' };
      }

      // Evaluar con mathjs
      const mathResult = evaluate(cleaned);
      if (typeof mathResult === 'number' || typeof mathResult === 'bigint') {
        return { success: true, result: String(mathResult) };
      }
      if (mathResult && typeof mathResult.toString === 'function') {
        return { success: true, result: mathResult.toString() };
      }
      return { success: false, error: 'Resultado no numérico' };
    } catch {
      return { success: false, error: 'Sintaxis matemática inválida' };
    }
  }

  /**
   * Clasifica la intención del mensaje antes de la consulta a la IA
   */
  public static classify(message: string): IntentClassification {
    const trimmed = (message || '').trim();
    const lower = trimmed.toLowerCase();

    // 1. Detección de URLs
    const urls = this.extractUrls(trimmed);
    if (urls.length > 0) {
      return {
        category: 'URL_QUERY',
        confidence: 'alta',
        requiresSearch: false,
        requiresUrlContext: true,
        urls,
        explanation: 'Consulta orientada a inspeccionar contenido web vía URL.',
      };
    }

    // 2. Detección de Correcciones del usuario
    for (const pat of CORRECTION_PATTERNS) {
      if (pat.test(lower)) {
        return {
          category: 'CORRECTION',
          confidence: 'alta',
          requiresSearch: true,
          requiresUrlContext: false,
          urls: [],
          explanation: 'El usuario señaló una discrepancia. Se activará búsqueda web para corroborar datos precisos.',
        };
      }
    }

    // 3. Comandos Locales Inmediatos
    const localCmd = this.detectLocalCommand(trimmed, lower);
    if (localCmd) {
      return {
        category: 'LOCAL_COMMAND',
        confidence: 'alta',
        requiresSearch: false,
        requiresUrlContext: false,
        urls: [],
        localAction: localCmd,
        explanation: `Ejecución inmediata de comando local (${localCmd.type}).`,
      };
    }

    // 4. Cálculos Matemáticos directos
    if (/^(calcula|cu[aá]nto es|resuelve)\s+[\d\s\+\-\*\/\^\(\)\.\,\%]+$/i.test(trimmed) || 
        (/^[\d\s\+\-\*\/\^\(\)\.\,\%]+$/.test(trimmed) && /[\+\-\*\/\^]/.test(trimmed))) {
      const mathEval = this.safeEvaluateMath(trimmed);
      if (mathEval.success && mathEval.result) {
        return {
          category: 'CALCULATION',
          confidence: 'alta',
          requiresSearch: false,
          requiresUrlContext: false,
          urls: [],
          localAction: {
            type: 'LOCAL_ANSWER',
            directAnswer: `El cálculo exacto es: ${mathEval.result}.`,
          },
          explanation: 'Cálculo matemático resuelto por el motor determinista local.',
        };
      }
    }

    // 5. Consultas de Información en Tiempo Real / Actualidad
    for (const pat of CURRENT_INFO_PATTERNS) {
      if (pat.test(lower)) {
        return {
          category: 'CURRENT_INFO',
          confidence: 'alta',
          requiresSearch: true,
          requiresUrlContext: false,
          urls: [],
          explanation: 'La consulta requiere fuentes actualizadas en vivo (clima, noticias, cotizaciones, eventos).',
        };
      }
    }

    // 6. Detección de Mensajes Ambiguos o Incompletos
    if (this.isAmbiguous(trimmed, lower)) {
      return {
        category: 'AMBIGUOUS',
        confidence: 'media',
        requiresSearch: false,
        requiresUrlContext: false,
        urls: [],
        suggestedClarification: this.generateClarification(trimmed),
        explanation: 'Mensaje con contexto elíptico o incompleto. Se responde asumiendo la interpretación más factible.',
      };
    }

    // 7. Pregunta General / Conocimiento / Código / Creatividad
    return {
      category: 'GENERAL_KNOWLEDGE',
      confidence: 'alta',
      requiresSearch: false,
      requiresUrlContext: false,
      urls: [],
      explanation: 'Consulta estándar de conocimiento general, programación o razonamiento.',
    };
  }

  /**
   * Identifica comandos de sistema local Stark
   */
  private static detectLocalCommand(raw: string, lower: string): LocalActionPayload | null {
    // Temporizador / Alarma
    if (/\b(temporizador|alarma|cuenta regresiva|cron[oó]metro)\b/i.test(lower)) {
      let totalSeconds = 60;
      const minMatch = lower.match(/(\d+)\s*(minutos?|mins?|m)/i);
      const secMatch = lower.match(/(\d+)\s*(segundos?|segs?|s)/i);
      const hourMatch = lower.match(/(\d+)\s*(horas?|hrs?|h)/i);

      if (hourMatch) totalSeconds += parseInt(hourMatch[1], 10) * 3600;
      if (minMatch) totalSeconds = (hourMatch ? totalSeconds : 0) + parseInt(minMatch[1], 10) * 60;
      if (secMatch) totalSeconds = (minMatch || hourMatch ? totalSeconds : 0) + parseInt(secMatch[1], 10);

      const labelMatch = raw.match(/para\s+([^,.;]+)/i);
      const label = labelMatch ? labelMatch[1].trim() : 'Temporizador de Viernes';

      return {
        type: 'TIMER',
        seconds: totalSeconds || 60,
        label,
        directAnswer: `Temporizador activado para ${Math.floor(totalSeconds / 60) > 0 ? Math.floor(totalSeconds / 60) + ' minutos' : totalSeconds + ' segundos'} (${label}). Te avisaré en cuanto concluya.`,
      };
    }

    // Calculadora HUD
    if (/\b(abre|abrir|lanzar)\s+(la\s+)?calculadora\b/i.test(lower)) {
      return {
        type: 'CALCULATOR',
        directAnswer: 'Desplegando la calculadora táctica integrada en pantalla.',
      };
    }

    // Bloc de Notas HUD
    if (/\b(abre|abrir|lanzar|ver)\s+(mis\s+)?(notas|apuntes|bloc)\b/i.test(lower)) {
      return {
        type: 'NOTES',
        directAnswer: 'Abriendo tu panel de notas del sistema.',
      };
    }

    // Guardar en Memoria explícito
    if (/^(recuerda que|guarda que|anota que|registra que)\s+/i.test(lower)) {
      const content = raw.replace(/^(recuerda que|guarda que|anota que|registra que)\s+/i, '').trim();
      return {
        type: 'SAVE_MEMORY',
        title: 'Memoria Registrada',
        content,
        category: 'FACT',
        directAnswer: `Anotado en tu núcleo de memoria semántica: "${content}". Lo consideraré en futuras decisiones.`,
      };
    }

    // Abrir Apps
    if (/\b(abre|abrir|pon|reproduce|busca en)\s+(youtube|spotify|whatsapp|maps|google maps|correo|gmail|calendario)\b/i.test(lower)) {
      if (lower.includes('youtube')) {
        const query = raw.replace(/.*youtube\s*(y busca|para buscar|con)?/i, '').trim();
        return {
          type: 'OPEN_APP',
          app: 'youtube',
          query,
          directAnswer: query ? `Iniciando YouTube y buscando "${query}".` : 'Abriendo interfaz de YouTube, jefe.',
        };
      }
      if (lower.includes('spotify') || lower.includes('reproduce') || lower.includes('pon música')) {
        const query = raw.replace(/.*(spotify|reproduce|pon m[uú]sica)\s*/i, '').trim();
        return {
          type: 'OPEN_APP',
          app: 'spotify',
          query,
          directAnswer: query ? `Sintonizando "${query}" en Spotify.` : 'Cargando tu lista de reproducción en Spotify.',
        };
      }
      if (lower.includes('whatsapp')) {
        return {
          type: 'OPEN_APP',
          app: 'whatsapp',
          directAnswer: 'Abriendo WhatsApp para tus comunicaciones directas.',
        };
      }
      if (lower.includes('maps')) {
        const query = raw.replace(/.*(maps|mapas)\s*(de|para)?/i, '').trim();
        return {
          type: 'OPEN_APP',
          app: 'maps',
          query,
          directAnswer: query ? `Calculando coordenadas para "${query}" en Maps.` : 'Desplegando navegación por satélite en Google Maps.',
        };
      }
      if (lower.includes('gmail') || lower.includes('correo')) {
        return {
          type: 'OPEN_APP',
          app: 'gmail',
          directAnswer: 'Abriendo tu bandeja de correo en Gmail.',
        };
      }
      if (lower.includes('calendario') || lower.includes('agenda')) {
        return {
          type: 'OPEN_APP',
          app: 'calendar',
          directAnswer: 'Desplegando tu calendario y agenda de eventos.',
        };
      }
    }

    // Rutinas
    if (/\b(modo trabajo|buenos d[ií]as|rutina de hoy|buenas noches|modo descanso)\b/i.test(lower)) {
      const routineName = lower.includes('trabajo') 
        ? 'Modo Trabajo y Enfoque' 
        : lower.includes('buenos d[ií]as') 
        ? 'Buenos Días, Viernes' 
        : 'Cierre de Jornada';
      return {
        type: 'ROUTINE',
        routineName,
        directAnswer: `Iniciando protocolo de rutina "${routineName}". Configurando subsistemas tácticos.`,
      };
    }

    return null;
  }

  /**
   * Evalúa si un texto es ambiguo o incompleto
   */
  private static isAmbiguous(raw: string, lower: string): boolean {
    const wordCount = raw.split(/\s+/).filter(Boolean).length;
    if (wordCount <= 2 && /^(el coso|la cosa|eso|aquello|hazlo|mira esto|qu[eé] tal|ayuda|no sirve)$/i.test(lower)) {
      return true;
    }
    if (/\b(el coso|la cosa de la cosa|el cosito)\b/i.test(lower)) {
      return true;
    }
    return false;
  }

  /**
   * Genera una sola pregunta corta de aclaración al final sin bloquear
   */
  public static generateClarification(message: string): string {
    const lower = message.toLowerCase();
    if (lower.includes('coso') || lower.includes('cosa')) {
      return '¿Te refieres a alguna aplicación, archivo o comando específico?';
    }
    if (lower.includes('no sirve') || lower.includes('no funciona')) {
      return '¿Se trata de la conexión de red, el audio o algún archivo en particular?';
    }
    return '¿Deseas que profundice en algún aspecto en particular?';
  }
}
