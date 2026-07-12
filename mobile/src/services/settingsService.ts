import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppSettings, DEFAULT_SETTINGS } from '../types';

// The only thing this app persists locally. All card/deck/scheduling data
// lives in Anki — the source of truth.

const SETTINGS_KEY = 'echoCards_settings';

export const settingsService = {
  get: async (): Promise<AppSettings> => {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
  },
  set: async (settings: AppSettings): Promise<void> => {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  },
};
