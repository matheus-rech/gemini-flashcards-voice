// Realtime speech client speaking the OpenAI Realtime WebSocket protocol.
//
// One protocol, two deployments:
//  - MAIN/FALLBACK (local, no cloud): the huggingface/speech-to-speech
//    pipeline (VAD → STT → LLM → TTS) serves this exact protocol at
//    ws://<machine-running-anki>:PORT/v1/realtime. Run it with
//    `speech-to-speech --mode realtime --ws_port 8766` (NOT the default
//    8765 — that port is taken by AnkiConnect on the same machine).
//  - CLOUD: any OpenAI-Realtime-compatible endpoint, by URL.
//
// Audio: 16 kHz, int16, mono PCM, base64-encoded inside JSON events.
// The client streams mic audio via `input_audio_buffer.append`; the server
// VAD detects turns and streams back `response.output_audio.delta` chunks
// (with `response.audio.delta` accepted as a legacy alias) plus transcripts.
//
// The transport (WebSocket) exists on both React Native and web; capturing
// raw PCM mic audio is platform-specific and injected by the caller.

export interface RealtimeVoiceCallbacks {
  onOpen?: () => void;
  onClose?: (reason: string) => void;
  onError?: (message: string) => void;
  // Base64 PCM16 @ 24kHz (server-dependent) audio chunk of the reply.
  onAudioDelta?: (base64Pcm: string) => void;
  // Incremental transcript of the assistant's spoken reply.
  onAssistantTranscriptDelta?: (text: string) => void;
  // Final transcript of what the user said (live transcription).
  onUserTranscript?: (text: string) => void;
  onSpeechStarted?: () => void; // server VAD: user started talking
  onSpeechStopped?: () => void;
  onResponseDone?: () => void;
  // Tool bridge: the server-side LLM asked to call a tool.
  onToolCall?: (name: string, args: Record<string, unknown>, callId: string) => void;
}

export class RealtimeVoiceClient {
  private ws: WebSocket | null = null;
  private callbacks: RealtimeVoiceCallbacks;
  private pendingToolArgs = new Map<string, { name: string; argsJson: string }>();

  constructor(callbacks: RealtimeVoiceCallbacks) {
    this.callbacks = callbacks;
  }

  connect(url: string, tools?: object[]): void {
    this.close();
    const ws = new WebSocket(url);
    this.ws = ws;

    ws.onopen = () => {
      // Configure the session: PCM16 in/out, server-side VAD turn taking.
      this.send({
        type: 'session.update',
        session: {
          modalities: ['audio', 'text'],
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
          turn_detection: { type: 'server_vad' },
          ...(tools && tools.length ? { tools, tool_choice: 'auto' } : {}),
        },
      });
      this.callbacks.onOpen?.();
    };
    ws.onerror = () => this.callbacks.onError?.('Voice server connection error.');
    ws.onclose = e => this.callbacks.onClose?.(e.reason || 'closed');
    ws.onmessage = e => {
      try {
        this.handleEvent(JSON.parse(String(e.data)));
      } catch {
        // Non-JSON frames are ignored.
      }
    };
  }

  private handleEvent(event: { type?: string } & Record<string, any>): void {
    switch (event.type) {
      case 'response.output_audio.delta': // current protocol name
      case 'response.audio.delta':        // legacy alias
        if (typeof event.delta === 'string') this.callbacks.onAudioDelta?.(event.delta);
        break;
      case 'response.output_audio_transcript.delta':
      case 'response.audio_transcript.delta':
        if (typeof event.delta === 'string') this.callbacks.onAssistantTranscriptDelta?.(event.delta);
        break;
      case 'conversation.item.input_audio_transcription.completed':
        if (typeof event.transcript === 'string') this.callbacks.onUserTranscript?.(event.transcript);
        break;
      case 'input_audio_buffer.speech_started':
        this.callbacks.onSpeechStarted?.();
        break;
      case 'input_audio_buffer.speech_stopped':
        this.callbacks.onSpeechStopped?.();
        break;
      case 'response.function_call_arguments.delta': {
        const id = String(event.call_id ?? event.item_id ?? '');
        const entry = this.pendingToolArgs.get(id) ?? { name: String(event.name ?? ''), argsJson: '' };
        entry.argsJson += String(event.delta ?? '');
        if (event.name) entry.name = String(event.name);
        this.pendingToolArgs.set(id, entry);
        break;
      }
      case 'response.function_call_arguments.done': {
        const id = String(event.call_id ?? event.item_id ?? '');
        const entry = this.pendingToolArgs.get(id);
        const name = String(event.name ?? entry?.name ?? '');
        const argsJson = String(event.arguments ?? entry?.argsJson ?? '{}');
        this.pendingToolArgs.delete(id);
        try {
          this.callbacks.onToolCall?.(name, JSON.parse(argsJson || '{}'), id);
        } catch {
          this.callbacks.onToolCall?.(name, {}, id);
        }
        break;
      }
      case 'response.done':
        this.callbacks.onResponseDone?.();
        break;
      case 'error':
        this.callbacks.onError?.(String(event.error?.message ?? 'Voice server error'));
        break;
      default:
        break;
    }
  }

  // Stream one chunk of mic audio (base64-encoded PCM16 @ 16kHz mono).
  appendAudio(base64Pcm: string): void {
    this.send({ type: 'input_audio_buffer.append', audio: base64Pcm });
  }

  // Deliver a tool result back to the server-side LLM and ask it to continue.
  sendToolResult(callId: string, result: Record<string, unknown>): void {
    this.send({
      type: 'conversation.item.create',
      item: { type: 'function_call_output', call_id: callId, output: JSON.stringify(result) },
    });
    this.send({ type: 'response.create' });
  }

  // Interrupt the assistant mid-reply (barge-in).
  cancelResponse(): void {
    this.send({ type: 'response.cancel' });
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private send(payload: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  close(): void {
    if (this.ws) {
      try { this.ws.close(); } catch { /* already closed */ }
      this.ws = null;
    }
    this.pendingToolArgs.clear();
  }
}

// ---- PCM helpers (shared by web mic capture / playback) ----

export function float32ToPcm16Base64(samples: Float32Array): string {
  const pcm = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const bytes = new Uint8Array(pcm.buffer);
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK)));
  }
  // btoa exists on web and in Hermes (RN) runtimes.
  return btoa(binary);
}

export function pcm16Base64ToFloat32(base64: string): Float32Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const pcm = new Int16Array(bytes.buffer, 0, Math.floor(bytes.length / 2));
  const out = new Float32Array(pcm.length);
  for (let i = 0; i < pcm.length; i++) out[i] = pcm[i] / 0x8000;
  return out;
}
