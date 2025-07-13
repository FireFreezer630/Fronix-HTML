import { AppState, Chat, AppSettings } from '../types';

const STORAGE_KEYS = {
  CHATS: 'fronix_chats',
  SETTINGS: 'fronix_settings',
  CURRENT_CHAT: 'fronix_current_chat',
} as const;

export const defaultSettings: AppSettings = {
  theme: 'dark',
  fontSize: 'medium',
  fontFamily: 'Inter',
  fontWeight: '400',
};

export const loadChats = (): Chat[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CHATS);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading chats:', error);
    return [];
  }
};

export const saveChats = (chats: Chat[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(chats));
  } catch (error) {
    console.error('Error saving chats:', error);
  }
};

export const loadSettings = (): AppSettings => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
  } catch (error) {
    console.error('Error loading settings:', error);
    return defaultSettings;
  }
};

export const saveSettings = (settings: AppSettings): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving settings:', error);
  }
};

export const loadCurrentChatId = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_CHAT);
  } catch (error) {
    console.error('Error loading current chat ID:', error);
    return null;
  }
};

export const saveCurrentChatId = (chatId: string | null): void => {
  try {
    if (chatId) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_CHAT, chatId);
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_CHAT);
    }
  } catch (error) {
    console.error('Error saving current chat ID:', error);
  }
};