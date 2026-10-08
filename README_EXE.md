# 🖥️ Viernes (F.R.I.D.A.Y.) - Instalador para Windows (.exe)

Guía completa para empaquetar, compilar y ejecutar **Viernes** como una aplicación nativa de escritorio para Windows con instalador NSIS (.exe), sin necesidad de abrir terminales ni comandos de consola.

---

## ✨ Nuevas Funciones Incorporadas

1. **Búsqueda Web en Vivo (Google Search Grounding)**:
   - Viernes responde preguntas de actualidad, noticias mundiales, clima, cotizaciones, deportes y eventos recientes consultando Google en tiempo real.
   - Muestra las fuentes consultadas debajo de cada respuesta con enlaces directos y las menciona brevemente en voz alta.
   - **Cadena de Respaldo Cuádruple**: Si hay fallos de red o saturación de cuota (429/503), reintenta con retroceso exponencial, luego desciende a Gemini estándar, después a un modelo ligero (`gemini-3.1-flash-lite`), y finalmente al subsistema local determinista, garantizando que **siempre** haya respuesta útil.

2. **Siempre Conectado & Bandeja del Sistema (Tray)**:
   - Monitor continuo de red con indicador visual en la barra superior: **En línea** (verde), **Reconectando** (ámbar) y **Sin conexión / Local** (rojo).
   - Minimizar a la bandeja del sistema: al cerrar la ventana, Viernes se minimiza en la bandeja de tareas junto al reloj en lugar de cerrarse.
   - Menú contextual en el icono de la bandeja: *Abrir Viernes*, *Iniciar con Windows*, *Salir*.
   - Opción en Ajustes para **"Iniciar con Windows"** automáticamente al encender el equipo.

3. **Lectura Inteligente de Notificaciones de Windows**:
   - Monitoreo en segundo plano de avisos de Windows 10 y 11 (WhatsApp, Outlook, Google Chrome, Discord, etc.) mediante la base de datos local `wpndatabase.db` en modo de solo lectura.
   - **Privacidad Total**: Las notificaciones se analizan de manera 100% local en tu PC y solo se envían fragmentos a Gemini cuando solicitas explícitamente un resumen.
   - Comandos de voz directos: *"Oye Viernes, léeme las notificaciones"*, *"¿Tengo algo de WhatsApp?"*, *"Resume mis notificaciones"*.
   - Panel de notificaciones integrado con filtros por app, descarte y lectura en voz alta.

---

## 📦 1. Requisitos para Compilar en tu PC con Windows

1. **Node.js** (versión 18, 20 LTS o 22 LTS). Descárgalo gratis desde [https://nodejs.org/](https://nodejs.org/).
2. **Git** (opcional, para clonar el repositorio).

---

## 🛠️ 2. Pasos Exactos para Generar el Instalador (.exe)

Abre una terminal (PowerShell o CMD) en la carpeta del proyecto y ejecuta estos comandos:

### Paso 1: Instalar dependencias
```bash
npm install
```

### Paso 2: Generar el instalador para Windows
```bash
npm run dist:win
```

Este comando ejecuta automáticamente:
1. `vite build`: Compila la interfaz de usuario React con diseño holográfico y Tailwind CSS.
2. `npm run build:server`: Bundlea el servidor Express con el motor táctico a `dist-server/server.cjs` mediante esbuild.
3. `electron-builder --win`: Empaqueta los binarios de Electron, genera el icono del orbe y compila el instalador NSIS.

---

## 📍 3. Dónde Queda el Instalador Generado

Una vez finalizado el proceso (toma entre 1 y 2 minutos), encontrarás el instalador en:

```
📁 dist-electron/
   └── 💿 Viernes Setup 1.0.0.exe
```

*(También se genera la versión descomprimida portátil dentro de `dist-electron/win-unpacked/Viernes.exe`)*.

---

## 🚀 4. Instalación y Uso en Windows

1. Haz doble clic sobre **`Viernes Setup 1.0.0.exe`**.
2. El asistente de instalación te permitirá:
   - Elegir la carpeta de instalación en tu disco duro.
   - Crear un acceso directo en tu **Escritorio**.
   - Crear un acceso directo en tu **Menú Inicio**.
3. Al finalizar, haz doble clic en el acceso directo de **Viernes (FRIDAY)** en tu escritorio.
4. **La app arranca silenciosamente**: No verás ninguna ventana de terminal; el servidor Express se inicia internamente y la ventana holográfica se abre automáticamente.

---

## 🛡️ 5. Problemas Conocidos y Cómo Resolverlos

### A. Alerta de Windows Defender / SmartScreen ("Windows protegió su PC")
- **Causa**: Al generar tú mismo el instalador en tu PC, el ejecutable no cuenta con una firma digital comercial comprada de Microsoft.
- **Solución**:
  1. En la ventana azul que dice *"Windows protegió su PC"*, haz clic en **"Más información"**.
  2. Haz clic en el botón **"Ejecutar de todas formas"**.
  3. Esto solo ocurre la primera vez que abres el instalador.

---

### B. Modo Concentración de Windows (Focus Assist / No molestar)
- **Causa**: Si tienes activado el "Modo concentración" en Windows 10/11, el sistema operativo silencia y no registra de inmediato los eventos de notificación en `wpndatabase.db`.
- **Solución**:
  - En la barra de tareas de Windows, asegúrate de desactivar "No molestar" o "Asistente de concentración" para que las notificaciones de WhatsApp o correo se registren al instante.

---

### C. Falso Positivo de Antivirus
- **Causa**: Algunos antivirus marcan archivos `.exe` recién compilados en local por sospecha genérica (*heurística*).
- **Solución**:
  - Agrega la carpeta `dist-electron` o el archivo `Viernes.exe` a la lista de exclusiones de tu antivirus. El código fuente es 100% transparente y abierto.

---

### D. Reconocimiento de Voz y Micrófono en Electron
- **Causa**: El motor `webkitSpeechRecognition` de Google Chrome requiere credenciales propietarias de Google que no vienen en el binario estándar de Electron.
- **Solución implementada en Viernes**:
  Viernes cuenta con tres alternativas automáticas configurables en **Ajustes**:
  1. **Nativo Electron (MediaRecorder + Gemini)** *(Recomendado)*: Captura el audio directamente con tu micrófono y lo transcribe mediante la inteligencia multimodal de Gemini.
  2. **Modo Lanzador Edge**: En **Ajustes**, pulsa *"Abrir en Edge (Modo App)"*. Esto abre Viernes en una ventana sin bordes en Microsoft Edge, el cual incluye soporte de voz nativo de Windows para `webkitSpeechRecognition`.
  3. **Control por texto o toque**: Siempre puedes escribir tus comandos o pulsar el orbe central.

---

### E. Dónde se Guardan mis Recuerdos y mi API Key
- Todos los datos de usuario (memorias, rutinas, notas, preferencias, notificaciones y clave de Gemini) se almacenan de forma persistente en:
  `%APPDATA%\viernes-assistant\` (equivalente a `app.getPath('userData')`).
- Esto garantiza que **tus datos nunca se borran** cuando actualices o reinstales el programa.

---

### F. SQLite en Electron: WebAssembly (`sql.js`) vs Dependencia Nativa (`better-sqlite3`)
- **Arquitectura de Viernes**: Por defecto, Viernes utiliza **`sql.js`** (SQLite compilado a WebAssembly).
  - **Ventaja**: No requiere herramientas de compilación C++ de Visual Studio (`node-gyp`), ni Python, ni ejecutar `@electron/rebuild`. Se compila e instala directamente con `npm install` en cualquier máquina con Windows sin errores de binarios nativos.
- **Si deseas usar `better-sqlite3` nativo**:
  1. Instala Visual Studio con la carga de trabajo "Desarrollo para el escritorio con C++" y Python 3.
  2. Ejecuta:
     ```bash
     npm install better-sqlite3
     npx @electron/rebuild -f -w better-sqlite3
     ```
  3. En `electron/notificationReader.cjs`, puedes reemplazar `sql.js` por `const Database = require('better-sqlite3'); const db = new Database(tempDbPath, { readonly: true });`.
  - Sin embargo, para la inmensa mayoría de usuarios, `sql.js` es la alternativa más robusta porque produce un instalador que funciona de inmediato sin dependencias nativas del sistema.

---

### G. Lector de Notificaciones: `wpndatabase.db` vs API `UserNotificationListener` de Windows
- **¿Por qué se lee `wpndatabase.db`?**:
  - En Windows 10 y 11, la base de datos `%LOCALAPPDATA%\Microsoft\Windows\Notifications\wpndatabase.db` almacena el registro histórico y en tiempo real de todos los avisos de aplicaciones (WhatsApp, Outlook, Slack, navegador, etc.).
  - Viernes copia este archivo de forma atómica a una carpeta temporal (`%TEMP%`) antes de consultarlo en modo solo lectura para garantizar que nunca se bloquee el archivo ni se interfiera con el Centro de Actividades de Windows.
- **¿Por qué no la API `UserNotificationListener` mediante PowerShell?**:
  - La API WinRT `Windows.UI.Notifications.Management.UserNotificationListener` requiere que el proceso cuente con **Identidad de Paquete (Package Identity)** de Windows (es decir, una aplicación empaquetada como UWP o MSIX con la capacidad restringida `userNotificationListener` declarada en su manifiesto de la Microsoft Store).
  - Al invocarse desde PowerShell o desde un ejecutable Win32 / Electron estándar sin empaquetado MSIX de la Store, Windows deniega el acceso arrojando `Error 0x80070005 (Acceso denegado)`.
  - Por esta razón, el método de consulta de solo lectura a `wpndatabase.db` es el estándar en aplicaciones Win32 independientes, garantizando funcionamiento sin necesidad de certificados empresariales de Microsoft Store.

