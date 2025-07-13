export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  model: string;
}

export interface Model {
  id: string;
  name: string;
  provider: string;
  description?: string;
}

export interface ModelGroup {
  provider: string;
  models: Model[];
}

export interface AppSettings {
  theme: 'light' | 'dark';
  fontSize: 'small' | 'medium' | 'large';
  fontFamily: string;
  fontWeight: string;
}

export interface AppState {
  chats: Chat[];
  currentChatId: string | null;
  settings: AppSettings;
  isSettingsOpen: boolean;
  isSidebarOpen: boolean;
  isStreaming: boolean;
}