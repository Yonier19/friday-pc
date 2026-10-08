// Web Audio API and Speech Synthesis / Recognition Services for Viernes

export type VoiceEngineType = 'electron_gemini' | 'browser_speech' | 'edge_launcher';

class AudioService {
  private audioCtx: AudioContext | null = null;
  private recognition: any = null;
  private isRecognitionActive: boolean = false;
  private isContinuousMode: boolean = false;
  private wakeWordRegex: RegExp = /(oye\s+viernes|hola\s+viernes|viernes|friday|aura|jarvis)/i;

  // MediaRecorder state for Electron desktop compatibility
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private mediaStream: MediaStream | null = null;
  private isMediaRecording: boolean = false;

  private getContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // Futuristic Stark HUD Chimes using Web Audio API
  playActivationSound() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      // Polyphonic ascending chord with crystalline sparkle
      const freqs = [587.33, 880, 1174.66, 1760]; // D5, A5, D6, A6
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.04);

        gain.gain.setValueAtTime(0, now + idx * 0.04);
        gain.gain.linearRampToValueAtTime(0.08, now + idx * 0.04 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.04 + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.04);
        osc.stop(now + idx * 0.04 + 0.45);
      });
    } catch {
      // AudioContext policy handled gracefully
    }
  }

  playDeactivationSound() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const freqs = [1046.5, 783.99, 523.25]; // C6, G5, C5
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.04);

        gain.gain.setValueAtTime(0, now + idx * 0.04);
        gain.gain.linearRampToValueAtTime(0.06, now + idx * 0.04 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.04 + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.04);
        osc.stop(now + idx * 0.04 + 0.35);
      });
    } catch {}
  }

  playProcessingSound() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.16);
    } catch {}
  }

  playAlarmSound() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      for (let i = 0; i < 3; i++) {
        const startTime = now + i * 0.25;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(987.77, startTime); // B5

        gain.gain.setValueAtTime(0.12, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.2);
      }
    } catch {}
  }

  // Text-To-Speech using Web Speech API
  speak(
    text: string,
    options: {
      voiceName?: string;
      rate?: number;
      pitch?: number;
      volume?: number;
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
    } = {}
  ) {
    if (!('speechSynthesis' in window)) {
      if (options.onError) options.onError('SpeechSynthesis no soportado');
      return;
    }

    window.speechSynthesis.cancel();

    const cleanText = text
      .replace(/\[\[ACTION:.*?\]\]/gs, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`{1,3}.*?`{1,3}/gs, '')
      .replace(/#+\s+/g, '')
      .trim();

    if (!cleanText) {
      if (options.onEnd) options.onEnd();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = options.rate ?? 1.05;
    utterance.pitch = options.pitch ?? 1.0;
    utterance.volume = options.volume ?? 1.0;

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      let selectedVoice = null;
      if (options.voiceName) {
        selectedVoice = voices.find(v => v.name === options.voiceName);
      }
      if (!selectedVoice) {
        selectedVoice = voices.find(v => v.lang.startsWith('es') && (
          v.name.toLowerCase().includes('female') ||
          v.name.toLowerCase().includes('mujer') ||
          v.name.toLowerCase().includes('monica') ||
          v.name.toLowerCase().includes('helena') ||
          v.name.toLowerCase().includes('sabina') ||
          v.name.toLowerCase().includes('paulina') ||
          v.name.toLowerCase().includes('lucia')
        ));
      }
      if (!selectedVoice) {
        selectedVoice = voices.find(v => v.lang.startsWith('es'));
      }
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang;
      }
    }

    utterance.onstart = () => {
      options.onStart?.();
    };

    utterance.onend = () => {
      options.onEnd?.();
    };

    utterance.onerror = (e) => {
      options.onError?.(e);
      options.onEnd?.();
    };

    window.speechSynthesis.speak(utterance);
  }

  stopSpeaking() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  getAvailableVoices(): SpeechSynthesisVoice[] {
    if ('speechSynthesis' in window) {
      return window.speechSynthesis.getVoices();
    }
    return [];
  }

  // MediaRecorder Engine (Captures microphone in Electron and transcribes via server)
  async startMediaRecording(onDone: (base64Audio: string, mimeType: string) => void): Promise<boolean> {
    try {
      if (!this.mediaStream) {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      this.audioChunks = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const recorder = new MediaRecorder(this.mediaStream, { mimeType });
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.audioChunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        this.isMediaRecording = false;
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          // extract base64 after "data:audio/webm;base64,"
          const base64Data = result.split(',')[1] || '';
          onDone(base64Data, mimeType);
        };
        reader.readAsDataURL(audioBlob);
      };

      recorder.start();
      this.mediaRecorder = recorder;
      this.isMediaRecording = true;
      return true;
    } catch (err) {
      console.error('[AudioService] Error iniciando MediaRecorder:', err);
      this.isMediaRecording = false;
      return false;
    }
  }

  stopMediaRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {}
    }
    this.isMediaRecording = false;
  }

  isRecording(): boolean {
    return this.isMediaRecording;
  }

  // Transcribe recorded audio with Server / Gemini
  async transcribeAudio(base64Audio: string, mimeType = 'audio/webm'): Promise<string> {
    try {
      const res = await fetch('/api/assistant/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64: base64Audio, mimeType }),
      });
      const data = await res.json();
      return data.transcript || '';
    } catch (err) {
      console.warn('[AudioService] Error al transcribir audio:', err);
      return '';
    }
  }

  // Launch Edge in App Mode (Fallback launcher)
  async launchEdgeApp(): Promise<boolean> {
    try {
      // If Electron IPC is available
      const electronAPI = (window as any).electronAPI;
      if (electronAPI && typeof electronAPI.launchEdgeApp === 'function') {
        await electronAPI.launchEdgeApp();
        return true;
      }

      // Otherwise call server endpoint
      const res = await fetch('/api/assistant/launch-edge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port: window.location.port || 3000 }),
      });
      const data = await res.json();
      return !!data.success;
    } catch {
      return false;
    }
  }

  // Standard Web Speech API Recognition (Browser mode)
  initSpeechRecognition(
    callbacks: {
      onWakeWordDetected?: () => void;
      onTranscript?: (transcript: string, isFinal: boolean) => void;
      onError?: (error: any) => void;
      onListeningChange?: (isListening: boolean) => void;
    },
    settings: {
      continuous?: boolean;
      wakeWordPhrase?: string;
    } = {}
  ) {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      return { supported: false };
    }

    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {}
    }

    const recog = new SpeechRecognition();
    recog.lang = 'es-ES';
    recog.continuous = settings.continuous ?? false;
    recog.interimResults = true;
    recog.maxAlternatives = 1;

    this.isContinuousMode = settings.continuous ?? false;

    if (settings.wakeWordPhrase) {
      const cleanPhrase = settings.wakeWordPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      this.wakeWordRegex = new RegExp(`(${cleanPhrase}|oye\\s+viernes|viernes|friday|aura|jarvis)`, 'i');
    }

    recog.onstart = () => {
      this.isRecognitionActive = true;
      callbacks.onListeningChange?.(true);
    };

    recog.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const activeText = (finalTranscript || interimTranscript).trim();

      if (this.wakeWordRegex.test(activeText)) {
        callbacks.onWakeWordDetected?.();
      }

      if (finalTranscript) {
        callbacks.onTranscript?.(finalTranscript, true);
      } else if (interimTranscript) {
        callbacks.onTranscript?.(interimTranscript, false);
      }
    };

    recog.onerror = (event: any) => {
      callbacks.onError?.(event.error);
    };

    recog.onend = () => {
      this.isRecognitionActive = false;
      callbacks.onListeningChange?.(false);
      if (this.isContinuousMode) {
        setTimeout(() => {
          try {
            if (this.isContinuousMode) recog.start();
          } catch {}
        }, 500);
      }
    };

    this.recognition = recog;
    return { supported: true, instance: recog };
  }

  startListening() {
    if (this.recognition && !this.isRecognitionActive) {
      try {
        this.recognition.start();
      } catch (err) {
        console.warn('[AudioService] Recognition start exception:', err);
      }
    }
  }

  stopListening() {
    this.isContinuousMode = false;
    if (this.recognition && this.isRecognitionActive) {
      try {
        this.recognition.stop();
      } catch {}
    }
  }

  isListening() {
    return this.isRecognitionActive;
  }
}

export const audioService = new AudioService();
