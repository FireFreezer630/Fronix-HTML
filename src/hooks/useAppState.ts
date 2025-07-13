import { useState, useEffect, useCallback } from 'react';
import { AppState, Chat, Message, AppSettings } from '../types';
import { 
  loadChats, 
  saveChats, 
  loadSettings, 
  saveSettings, 
  loadCurrentChatId, 
  saveCurrentChatId,
  defaultSettings 
} from '../utils/storage';
import { defaultModel } from '../data/models';

const initialState: AppState = {
  chats: [],
  currentChatId: null,
  settings: defaultSettings,
  isSettingsOpen: false,
  isSidebarOpen: false,
  isStreaming: false,
};

export const useAppState = () => {
  const [state, setState] = useState<AppState>(initialState);

  // Load initial data
  useEffect(() => {
    const chats = loadChats();
    const settings = loadSettings();
    const currentChatId = loadCurrentChatId();

    setState(prev => ({
      ...prev,
      chats,
      settings,
      currentChatId: chats.find(chat => chat.id === currentChatId) ? currentChatId : null,
    }));
  }, []);

  // Save data when state changes
  useEffect(() => {
    saveChats(state.chats);
  }, [state.chats]);

  useEffect(() => {
    saveSettings(state.settings);
  }, [state.settings]);

  useEffect(() => {
    saveCurrentChatId(state.currentChatId);
  }, [state.currentChatId]);

  const updateState = useCallback((updates: Partial<AppState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const createNewChat = useCallback(() => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      model: defaultModel,
    };

    setState(prev => ({
      ...prev,
      chats: [newChat, ...prev.chats],
      currentChatId: newChat.id,
    }));

    return newChat.id;
  }, []);

  const deleteChat = useCallback((chatId: string) => {
    setState(prev => {
      const newChats = prev.chats.filter(chat => chat.id !== chatId);
      const newCurrentChatId = prev.currentChatId === chatId 
        ? (newChats.length > 0 ? newChats[0].id : null)
        : prev.currentChatId;

      return {
        ...prev,
        chats: newChats,
        currentChatId: newCurrentChatId,
      };
    });
  }, []);

  const updateChat = useCallback((chatId: string, updates: Partial<Chat>) => {
    setState(prev => ({
      ...prev,
      chats: prev.chats.map(chat =>
        chat.id === chatId
          ? { ...chat, ...updates, updatedAt: Date.now() }
          : chat
      ),
    }));
  }, []);

  const addMessage = useCallback((chatId: string, message: Message) => {
    setState(prev => ({
      ...prev,
      chats: prev.chats.map(chat =>
        chat.id === chatId
          ? {
              ...chat,
              messages: [...chat.messages, message],
              updatedAt: Date.now(),
            }
          : chat
      ),
    }));
  }, []);

  const updateMessage = useCallback((chatId: string, messageId: string, updates: Partial<Message>) => {
    setState(prev => ({
      ...prev,
      chats: prev.chats.map(chat =>
        chat.id === chatId
          ? {
              ...chat,
              messages: chat.messages.map(msg =>
                msg.id === messageId ? { ...msg, ...updates } : msg
              ),
              updatedAt: Date.now(),
            }
          : chat
      ),
    }));
  }, []);

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setState(prev => ({
      ...prev,
      settings: { ...prev.settings, ...updates },
    }));
  }, []);

  const getCurrentChat = useCallback(() => {
    return state.chats.find(chat => chat.id === state.currentChatId) || null;
  }, [state.chats, state.currentChatId]);

  return {
    state,
    updateState,
    createNewChat,
    deleteChat,
    updateChat,
    addMessage,
    updateMessage,
    updateSettings,
    getCurrentChat,
  };
};