# 🖥️ Viernes (F.R.I.D.A.Y.) - Instalador para Windows (.exe)

Guía completa para empaquetar, compilar y ejecutar **Viernes** como una aplicación nativa de escritorio para Windows con instalador NSIS (.exe), sin necesidad de abrir terminales ni comandos de consola.

---

## ⚡ Motor de Respuesta Universal (Universal Answer Engine)

Viernes implementa una arquitectura que garantiza que **el usuario SIEMPRE obtenga una respuesta útil**, sin bloqueos, respuestas vacías ni mensajes de "no sé" a secas.

### 1. Enrutador Previo de Intenciones (`src/services/intentRouter.ts`)
Antes de invocar modelos en la nube, el sistema clasifica la consulta:
- **Comando Local**: Temporizador, calculadora, notas, apertura de aplicaciones (YouTube, Spotify, WhatsApp, Maps), rutinas y guardado en memoria. Se procesa de forma instantánea en local.
- **Información Actual / En Vivo**: Consultas sobre clima, noticias, cotizaciones, deportes, horarios o términos como *"hoy"*, *"ahora"*, *"último"*. Activa **Google Search Grounding**.
- **Consulta con URL**: Detecta enlaces (`https://...`), descarga el contenido de la página de forma segura en servidor y lo analiza.
- **Correcciones del Usuario**: Cuando el usuario indica *"eso es incorrecto"* o *"te equivocaste"*, Viernes busca en la web para corroborar y ofrece guardar la corrección en el Banco de Memoria.
- **Pregunta Ambigua o Incompleta**: Responde asumiendo la interpretación más factible y añade una única pregunta corta de aclaración al final sin bloquear.

### 2. Cadena de Respaldo de 5 Niveles (`answerEverything`)
Si un nivel experimenta saturación, timeout (límite de 12 segundos) o fallo de red, desciende automáticamente al siguiente escalón con reintentos y retroceso exponencial:

| Nivel | Componente | Cuándo se usa | Confiabilidad |
|---|---|---|---|
| **Tier 1** | **Gemini 3.8 Flash + Google Search** | Noticias, clima, precios, eventos, actualidad | Máxima actualidad y fuentes citadas |
| **Tier 2** | **Gemini 3.8 Flash Estándar** | Conocimiento general, código, razonamiento | Profundidad analítica y creatividad |
| **Tier 3** | **Gemini 3.1 Flash Lite** | Respaldo ante cuota o latencia de Tier 1/2 | Respuesta ágil y ultraligera |
| **Tier 4** | **Base Local Determinista** | Sin internet o sin API key | Memoria de usuario, mathjs, hora, comandos |
| **Tier 5** | **Mensaje de Emergencia Táctica** | Caída absoluta de enlaces y red | Acción directa sobre qué sí puede hacer |

- **Caché Táctica**: Almacenamiento en memoria con TTL diferenciado (3 minutos para clima/noticias; 2 horas para conocimiento estable).
- **Streaming en Tiempo Real (SSE)**: El texto aparece progresivamente y la síntesis de voz comienza a emitir las primeras oraciones de inmediato.

---

## 🛡️ Límites Reales de la IA y Ética de Honestidad

1. **Sin Alucinaciones de Datos Críticos**:
   - Viernes tiene prohibido inventar enlaces, cifras o hechos no verificables. Si un dato no está en internet ni en la memoria, indica su nivel de confianza (*Alta, Media o Baja*) y recomienda qué verificar.
2. **Avisos Profesionales**:
   - En consultas médicas, legales o financieras, Viernes incorpora automáticamente una nota de verificación recordando que la respuesta es orientativa y no sustituye el criterio de un especialista colegiado.
3. **Privacidad de Notificaciones**:
   - Las notificaciones de Windows se procesan 100% en local mediante `%LOCALAPPDATA%\Microsoft\Windows\Notifications\wpndatabase.db`. Jamás se envían a servidores externos salvo que el usuario pida explícitamente *"resume mis notificaciones"*.

---

## 🔍 Cómo Depurar Fallos y Probar la Cadena

### 1. Batería de Pruebas Automatizada (20 Casos)
Ejecuta en tu terminal:
```bash
npm run test:answers
```
Este comando prueba:
- Clima, noticias, precios y deportes en vivo.
- Cálculos con `mathjs` y porcentajes.
- Código, preguntas ambiguas, URLs y memoria.
- Casos de desconexión sin internet y claves inválidas.
- Imprime una tabla detallada con tiempo de respuesta, nivel que respondió y confirmación de que ninguna respuesta quedó vacía.

### 2. Botón "Probar conexión con Gemini" en Ajustes
En la pestaña **Ajustes** dentro de la aplicación, pulsa el botón *"Probar conexión con Gemini"* para ver en vivo el estado y latencia de cada uno de los 4 niveles de inferencia.

### 3. Registro en Consola
El servidor y la ventana de Electron imprimen en tiempo real etiquetas de diagnóstico:
```
[Viernes System] Respondió Nivel: Tier 1 (Gemini con Búsqueda en Google)
[Viernes System] Respondió Nivel: Tier 4 (Base Local Determinista)
```

---

## 📦 Requisitos para Compilar en Windows

1. **Node.js** (versión 18, 20 LTS o 22 LTS) desde [https://nodejs.org/](https://nodejs.org/).
2. **Git** (opcional).

---

## 🛠️ Pasos Exactos para Generar el Instalador (.exe)

Abre PowerShell o CMD en la carpeta del proyecto y ejecuta:

### Paso 1: Instalar dependencias
```bash
npm install
```

### Paso 2: Generar el instalador para Windows
```bash
npm run dist:win
```

Este comando ejecuta de forma secuencial:
1. `vite build`: Compila la interfaz gráfica React con Tailwind CSS.
2. `npm run build:server`: Empaqueta `server.ts` con esbuild a `dist-server/server.cjs`.
3. `electron-builder --win`: Genera los binarios de Electron y crea el instalador NSIS.

---

## 📍 Dónde Queda el Instalador Generado

Una vez completado el proceso, el instalador se ubica en:

```
📁 dist-electron/
   └── 💿 Viernes Setup 1.0.0.exe
```

*(También se genera la versión descomprimida portátil dentro de `dist-electron/win-unpacked/Viernes.exe`)*.

---

## 🚀 Instalación y Uso en tu PC

1. Haz doble clic sobre **`Viernes Setup 1.0.0.exe`**.
2. Elige la carpeta de instalación y permite crear los accesos directos en el **Escritorio** y **Menú Inicio**.
3. Al terminar, abre **Viernes (FRIDAY)**.
4. La aplicación arranca silenciosamente sin ventanas negras de consola. El servidor Express se inicia internamente y se sincroniza con el orbe holográfico.

---

## 🛡️ Solución a Problemas Conocidos

### A. Alerta de Windows Defender / SmartScreen ("Windows protegió su PC")
- Haz clic en **"Más información"** y luego en **"Ejecutar de todas formas"**. Al generar el instalador tú mismo sin un certificado comercial comprado de Microsoft, Windows emite esta advertencia preventiva la primera vez.

### B. Modo Concentración de Windows
- Desactiva "No molestar" o "Asistente de concentración" en Windows 10/11 si deseas que las notificaciones de WhatsApp se reflejen de inmediato en `wpndatabase.db`.

### C. SQLite en Electron: `sql.js` (WebAssembly) vs `better-sqlite3`
- Viernes utiliza **`sql.js`** por defecto para garantizar que `npm install` funcione en cualquier PC sin necesidad de instalar Visual Studio C++ Build Tools ni Python.
- Si prefieres usar `better-sqlite3` nativo, instala Visual Studio con herramientas C++ y ejecuta `npx @electron/rebuild -f -w better-sqlite3`.

### D. UserNotificationListener de Windows vs `wpndatabase.db`
- La API WinRT `UserNotificationListener` requiere un paquete UWP/MSIX con identidad de Microsoft Store. Por ello, leer `wpndatabase.db` en modo copia temporal de solo lectura es el método más confiable en aplicaciones Win32 independientes.

### E. Dónde se Guardan mis Recuerdos y mi Clave
- Todos tus datos residen de forma segura en `%APPDATA%\viernes-assistant\` (`app.getPath('userData')`). Nunca se borran al actualizar o reinstalar la app.
  - Clave de API y Proxy: `%APPDATA%\viernes-assistant\viernes_credentials.json`
  - Base de datos de memorias y rutinas: `%APPDATA%\viernes-assistant\viernes_store.json`
  - Registro de conectividad y diagnósticos: `%APPDATA%\viernes-assistant\connection.log`

---

## 🌐 Solución de Problemas de Conexión en la Versión .EXE

Si la app no se conecta a internet o a Gemini correctamente en Windows, sigue esta guía táctica paso a paso:

### 1. Panel de Diagnóstico Integrado
Ve a **Ajustes** y haz clic en el botón superior **"Probar conexión con Gemini"**. Se ejecutarán 6 pruebas en vivo con estado `✓` o `✗`:
- **a) Internet General**: Comprueba acceso HTTP real a `https://www.google.com/generate_204` con timeout de 5 segundos.
- **b) Alcance de la API**: Verifica handshake HTTPS hacia `https://generativelanguage.googleapis.com` (puerto 443).
- **c) Clave de API Gemini**: Confirma que la clave exista, tenga formato válido (`AIza...`) y se lea desde `UserData` (mostrando solo los últimos 4 caracteres por seguridad).
- **d) Comprobación de Modelos**: Envía una petición mínima ("Responde OK") al modelo principal (`gemini-3.8-flash`) y de respaldo (`gemini-3.1-flash-lite`). Si el modelo no existe (Error 404), lista automáticamente los modelos compatibles con tu clave para que puedas seleccionar uno con un solo clic.
- **e) Búsqueda en Google (Grounding)**: Evalúa si tu clave soporta la herramienta de búsqueda en vivo. Si falla por cuota (Error 429), ofrece desactivar la búsqueda con un clic para seguir conversando con Gemini sin consumir cuota adicional.
- **f) Servidor Local & Red Interna**: Comprueba que el servidor interno Express esté escuchando en `127.0.0.1` e informa si hay algún proxy activo.

### 2. Botón "Copiar Diagnóstico" y Registro `connection.log`
- En el panel de diagnóstico de Ajustes, pulsa el botón **"Copiar diagnóstico"**. Se generará un informe técnico completo en formato Markdown en tu portapapeles listo para compartir o pegar en incidencias.
- Las peticiones y cambios de nivel se registran en `%APPDATA%\viernes-assistant\connection.log` con fecha ISO, nivel de respuesta, código HTTP y latencia, **redactando cualquier clave o token de forma estricta**.

### 3. Regla en Firewall de Windows Defender
Si Windows Defender Firewall bloquea la conexión saliente de Node o del ejecutable de Viernes, abre una consola de **PowerShell o CMD como Administrador** y ejecuta:
```cmd
netsh advfirewall firewall add rule name="Viernes Asistente" dir=out action=allow program="%LOCALAPPDATA%\Programs\viernes-assistant\Viernes.exe" enable=yes
```
*(Si instalaste en otra ruta, sustituye el parámetro `program` por la ruta real a `Viernes.exe`)*.

### 4. Redes Corporativas, VPN y Servidores Proxy
Si estás detrás de un proxy corporativo o educativo:
1. Abre **Ajustes** y localiza la sección **"Configuración de Proxy de Red"**.
2. Escribe la URL de tu servidor proxy (ej. `http://proxy.empresa.com:8080`).
3. Haz clic en **"Aplicar Proxy"**. Viernes configurará inmediatamente la sesión de Chromium en Electron y el despachador `EnvHttpProxyAgent` en el servidor Node.js sin necesidad de reiniciar.

### 5. Guía Rápida de Códigos de Error de Gemini
| Código | Causa Común | Solución Recomendada |
| :--- | :--- | :--- |
| **401 UNAUTHENTICATED** | Clave de API inválida, revocada o con espacios al copiar. | Genera una clave nueva en [Google AI Studio](https://aistudio.google.com) y pulsa "Guardar Clave" en Ajustes. |
| **403 PERMISSION_DENIED** | API Generative Language deshabilitada o región restringida. | Habilita la API en Google Cloud Console o prueba desde una conexión/red diferente. |
| **404 NOT_FOUND** | El nombre del modelo no existe o fue descontinuado. | Pulsa "Probar conexión" en Ajustes y selecciona uno de los modelos válidos detectados. |
| **429 RESOURCE_EXHAUSTED** | Límite de peticiones por minuto o cuota diaria alcanzada. | Desactiva "Búsqueda Web Automática" en Ajustes o cambia al modelo ligero `gemini-3.1-flash-lite`. |
| **503 UNAVAILABLE** | Servidores de Google con sobrecarga temporal. | Viernes conmuta automáticamente a la base local determinista; reintenta en unos instantes. |
| **ETIMEDOUT / Timeout** | Firewall bloqueando la salida o corte de internet. | Añade la regla de firewall (`netsh advfirewall`) o verifica tu conexión Wi-Fi/cable. |
| **ENOTFOUND** | Error de resolución DNS (`generativelanguage.googleapis.com`). | Cambia tus DNS a los de Google (`8.8.8.8`) o Cloudflare (`1.1.1.1`). |
| **ECONNREFUSED** | Conexión rechazada localmente. | Comprueba que ningún software de seguridad de terceros (antivirus) esté bloqueando `127.0.0.1` o la salida web. |
