import React, { useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import * as Speech from 'expo-speech';
import { AppSettings, ChatMessage } from '../types';
import { agentService, AgentAppActions, GeminiContent } from '../services/agentService';
import { colors } from '../theme';

interface AgentScreenProps {
  settings: AppSettings;
  onStartReview: (deckName: string) => void;
  onBack: () => void;
}

const SUGGESTIONS = [
  'What decks do I have?',
  'What is due today?',
  'Create 10 cards about the Krebs cycle in my Biology deck',
  'Start reviewing my biggest deck',
];

const AgentScreen: React.FC<AgentScreenProps> = ({ settings, onStartReview, onBack }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'agent', text: "I'm Echo — your Anki command agent. Tell me what to do: list decks, create cards, check what's due, or start a review." },
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const historyRef = useRef<GeminiContent[]>([]);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const appActions: AgentAppActions = { startReview: onStartReview };

  const send = async (text: string) => {
    const command = text.trim();
    if (!command || isThinking) return;
    if (!settings.geminiApiKey) {
      setMessages(m => [...m, { role: 'user', text: command }, { role: 'agent', text: 'Add your Gemini API key in Settings first — that powers me.' }]);
      return;
    }
    setInput('');
    setMessages(m => [...m, { role: 'user', text: command }]);
    setIsThinking(true);
    try {
      const { reply, history } = await agentService.runCommand(
        settings.geminiApiKey, settings.ankiConnectHost, historyRef.current, command, appActions,
      );
      historyRef.current = history;
      setMessages(m => [...m, { role: 'agent', text: reply }]);
      if (settings.speakCards) {
        Speech.stop();
        Speech.speak(reply, { language: 'en-US' });
      }
    } catch (e) {
      setMessages(m => [...m, { role: 'agent', text: 'That command failed. Check your API key, your connection, and that Anki Desktop is running.' }]);
    } finally {
      setIsThinking(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}><Text style={styles.backLink}>‹ Back</Text></TouchableOpacity>
        <Text style={styles.title}>Echo Agent</Text>
        <View style={{ width: 48 }} />
      </View>

      <FlatList
        ref={listRef}
        style={{ flex: 1 }}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.agentBubble]}>
            <Text style={styles.bubbleText}>{item.text}</Text>
          </View>
        )}
      />

      {isThinking && (
        <View style={styles.thinkingRow}>
          <ActivityIndicator color={colors.accent} />
          <Text style={{ color: colors.textMuted, marginLeft: 8 }}>Working on it…</Text>
        </View>
      )}

      {messages.length <= 1 && (
        <View style={styles.suggestions}>
          {SUGGESTIONS.map(s => (
            <TouchableOpacity key={s} style={styles.suggestion} onPress={() => send(s)}>
              <Text style={{ color: colors.accent }}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Command your Anki…"
          placeholderTextColor={colors.textMuted}
          onSubmitEditing={() => send(input)}
          editable={!isThinking}
        />
        <TouchableOpacity
          style={[styles.sendButton, { backgroundColor: input.trim() && !isThinking ? colors.primary : colors.surfaceAlt }]}
          onPress={() => send(input)}
          disabled={!input.trim() || isThinking}
        >
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  backLink: { color: colors.accent, fontSize: 16, width: 48 },
  title: { color: colors.text, fontSize: 20, fontWeight: 'bold' },
  bubble: { borderRadius: 14, padding: 12, marginBottom: 8, maxWidth: '85%' },
  userBubble: { backgroundColor: colors.primary, alignSelf: 'flex-end' },
  agentBubble: { backgroundColor: colors.surface, alignSelf: 'flex-start' },
  bubbleText: { color: colors.text, lineHeight: 20 },
  thinkingRow: { flexDirection: 'row', alignItems: 'center', padding: 8 },
  suggestions: { marginBottom: 8, gap: 6 },
  suggestion: { backgroundColor: colors.surface, borderRadius: 10, padding: 10 },
  inputRow: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1, backgroundColor: colors.surfaceAlt, color: colors.text, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: colors.border,
  },
  sendButton: { paddingHorizontal: 16, borderRadius: 10, justifyContent: 'center' },
  sendText: { color: colors.text, fontWeight: '700' },
});

export default AgentScreen;
