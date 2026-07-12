import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, ScrollView } from 'react-native';
import { AppSettings, ChatMessage } from '../types';
import {
  RealtimeVoiceClient, float32ToPcm16Base64, pcm16Base64ToFloat32,
} from '../services/realtimeVoiceService';
import { executeAnkiTool, TOOL_DECLARATIONS, AgentAppActions } from '../services/agentService';
import { colors } from '../theme';

// Hands-free realtime conversation with the Anki agent.
//
// Speaks the OpenAI Realtime protocol, so the backend is interchangeable:
// a self-hosted huggingface/speech-to-speech server on the machine running
// Anki (works fully offline — the fallback when cloud models don't work, or
// the main option), or any cloud endpoint with the same protocol.
//
// Full mic ↔ speaker loop is implemented for the web build (run it on the
// same desktop as Anki — the ideal spot for realtime voice). Native iOS/
// Android needs a raw-PCM mic-stream module (see README) — until then the
// screen explains that and the text Agent chat remains fully functional.

interface VoiceScreenProps {
  settings: AppSettings;
  onStartReview: (deckName: string) => void;
  onBack: () => void;
}

// The realtime protocol uses OpenAI-style JSON-schema tools (lowercase
// types), while the Gemini agent uses uppercase Type enums — convert.
function toRealtimeTools(): object[] {
  const lower = (schema: any): any => {
    if (Array.isArray(schema)) return schema.map(lower);
    if (schema && typeof schema === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(schema)) {
        out[k] = k === 'type' && typeof v === 'string' ? v.toLowerCase() : lower(v);
      }
      return out;
    }
    return schema;
  };
  return TOOL_DECLARATIONS.map(t => ({
    type: 'function',
    name: t.name,
    description: t.description,
    parameters: lower(t.parameters),
  }));
}

const VoiceScreen: React.FC<VoiceScreenProps> = ({ settings, onStartReview, onBack }) => {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'live' | 'error'>('idle');
  const [statusDetail, setStatusDetail] = useState('');
  const [transcript, setTranscript] = useState<ChatMessage[]>([]);
  const clientRef = useRef<RealtimeVoiceClient | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const micCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const playCursorRef = useRef(0);
  const assistantDraft = useRef('');

  const appActions: AgentAppActions = { startReview: onStartReview };

  const appendTranscript = (msg: ChatMessage) => setTranscript(t => [...t.slice(-30), msg]);

  const stopEverything = useCallback(() => {
    clientRef.current?.close();
    clientRef.current = null;
    micStreamRef.current?.getTracks().forEach(t => t.stop());
    micStreamRef.current = null;
    micCtxRef.current?.close().catch(() => {});
    micCtxRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    setStatus('idle');
  }, []);

  useEffect(() => () => stopEverything(), [stopEverything]);

  // Sequentially schedule reply audio chunks (PCM16 @16kHz from the server).
  const playAudioDelta = (base64: string) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const samples = pcm16Base64ToFloat32(base64);
    if (samples.length === 0) return;
    const buffer = ctx.createBuffer(1, samples.length, 16000);
    buffer.getChannelData(0).set(samples);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    const startAt = Math.max(ctx.currentTime, playCursorRef.current);
    source.start(startAt);
    playCursorRef.current = startAt + buffer.duration;
  };

  const start = async () => {
    if (Platform.OS !== 'web') {
      setStatus('error');
      setStatusDetail('Live voice needs the web build for now (run it on the computer next to Anki). On the phone, use the Echo Agent chat — replies are still spoken aloud.');
      return;
    }
    setStatus('connecting');
    setStatusDetail(`Connecting to ${settings.realtimeVoiceUrl}…`);
    try {
      const nav: any = (globalThis as any).navigator;
      const stream: MediaStream = await nav.mediaDevices.getUserMedia({ audio: { channelCount: 1, sampleRate: 16000 } });
      micStreamRef.current = stream;

      const AC: any = (globalThis as any).AudioContext || (globalThis as any).webkitAudioContext;
      const micCtx: AudioContext = new AC({ sampleRate: 16000 });
      micCtxRef.current = micCtx;
      audioCtxRef.current = new AC();
      playCursorRef.current = 0;

      const client = new RealtimeVoiceClient({
        onOpen: () => {
          setStatus('live');
          setStatusDetail('Live — just talk. The server detects your turns.');
        },
        onClose: reason => {
          setStatus('idle');
          setStatusDetail(reason ? `Disconnected: ${reason}` : 'Disconnected.');
        },
        onError: msg => {
          setStatus('error');
          setStatusDetail(`${msg} — is the speech server running? (huggingface/speech-to-speech: speech-to-speech --mode realtime --ws_port 8766)`);
        },
        onAudioDelta: playAudioDelta,
        onUserTranscript: text => appendTranscript({ role: 'user', text }),
        onAssistantTranscriptDelta: delta => { assistantDraft.current += delta; },
        onResponseDone: () => {
          if (assistantDraft.current.trim()) appendTranscript({ role: 'agent', text: assistantDraft.current.trim() });
          assistantDraft.current = '';
        },
        onSpeechStarted: () => {
          // Barge-in: drop any queued assistant audio immediately.
          playCursorRef.current = 0;
          const ctx = audioCtxRef.current;
          if (ctx) { ctx.close().catch(() => {}); audioCtxRef.current = new AC(); }
        },
        onToolCall: async (name, args, callId) => {
          appendTranscript({ role: 'agent', text: `⚙ ${name}(${JSON.stringify(args)})` });
          const result = await executeAnkiTool(settings.ankiConnectHost, { name, args }, appActions);
          clientRef.current?.sendToolResult(callId, result);
        },
      });
      clientRef.current = client;
      client.connect(settings.realtimeVoiceUrl, toRealtimeTools());

      // Mic → 16kHz PCM16 → server.
      const source = micCtx.createMediaStreamSource(stream);
      const processor = micCtx.createScriptProcessor(4096, 1, 1);
      processor.onaudioprocess = e => {
        if (clientRef.current?.isConnected) {
          clientRef.current.appendAudio(float32ToPcm16Base64(e.inputBuffer.getChannelData(0)));
        }
      };
      source.connect(processor);
      processor.connect(micCtx.destination);
    } catch (e) {
      setStatus('error');
      setStatusDetail('Microphone access failed or connection refused. Check mic permissions and the voice server URL in Settings.');
      stopEverything();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { stopEverything(); onBack(); }}>
          <Text style={styles.backLink}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Live Voice</Text>
        <View style={{ width: 48 }} />
      </View>

      <Text style={styles.subtitle}>
        Realtime conversation with your Anki agent — local speech server or cloud, same protocol.
      </Text>

      <ScrollView style={styles.transcript}>
        {transcript.map((m, i) => (
          <View key={i} style={[styles.bubble, m.role === 'user' ? styles.userBubble : styles.agentBubble]}>
            <Text style={styles.bubbleText}>{m.text}</Text>
          </View>
        ))}
      </ScrollView>

      {statusDetail ? <Text style={[styles.status, status === 'error' && { color: '#f87171' }]}>{statusDetail}</Text> : null}

      {status === 'live' ? (
        <TouchableOpacity style={[styles.bigButton, { backgroundColor: colors.danger }]} onPress={stopEverything}>
          <Text style={styles.bigButtonText}>■ End conversation</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.bigButton, { backgroundColor: colors.accent }]}
          onPress={start}
          disabled={status === 'connecting'}
        >
          <Text style={styles.bigButtonText}>{status === 'connecting' ? 'Connecting…' : '🎙 Start talking'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  backLink: { color: colors.accent, fontSize: 16, width: 48 },
  title: { color: colors.text, fontSize: 20, fontWeight: 'bold' },
  subtitle: { color: colors.textMuted, textAlign: 'center', marginBottom: 12 },
  transcript: { flex: 1 },
  bubble: { borderRadius: 14, padding: 12, marginBottom: 8, maxWidth: '85%' },
  userBubble: { backgroundColor: colors.primary, alignSelf: 'flex-end' },
  agentBubble: { backgroundColor: colors.surface, alignSelf: 'flex-start' },
  bubbleText: { color: colors.text, lineHeight: 20 },
  status: { color: colors.textMuted, textAlign: 'center', marginVertical: 8 },
  bigButton: { padding: 18, borderRadius: 14, alignItems: 'center', marginTop: 8 },
  bigButtonText: { color: colors.text, fontWeight: '800', fontSize: 16 },
});

export default VoiceScreen;
