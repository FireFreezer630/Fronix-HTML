import React, { useEffect } from 'react';
import { useAppState } from './hooks/useAppState';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { SettingsModal } from './components/SettingsModal';
import { sendMessage } from './utils/api';
import { Message } from './types';

function App() {
  const {
    state,
    updateState,
    createNewChat,
    deleteChat,
    updateChat,
    addMessage,
    updateMessage,
    updateSettings,
    getCurrentChat,
  } = useAppState();

  // Apply theme to document
  useEffect(() => {
    if (state.settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state.settings.theme]);

  const handleNewChat = () => {
    createNewChat();
    updateState({ isSidebarOpen: false });
  };

  const handleChatSelect = (chatId: string) => {
    updateState({ currentChatId: chatId, isSidebarOpen: false });
  };

  const handleDeleteChat = (chatId: string) => {
    deleteChat(chatId);
  };

  const handleRenameChat = (chatId: string, newTitle: string) => {
    updateChat(chatId, { title: newTitle });
  };

  const handleSendMessage = async (content: string) => {
    const currentChat = getCurrentChat();
    if (!currentChat) return;

    // Create user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    // Create assistant message placeholder
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    };

    // Add messages to chat
    addMessage(currentChat.id, userMessage);
    addMessage(currentChat.id, assistantMessage);

    // Update chat title if it's the first message
    if (currentChat.messages.length === 0) {
      const title = content.length > 50 ? content.substring(0, 50) + '...' : content;
      updateChat(currentChat.id, { title });
    }

    updateState({ isStreaming: true });

    // Prepare messages for API
    const messages = [...currentChat.messages, userMessage];

    // Send to API
    await sendMessage(
      messages,
      currentChat.model,
      (chunk: string) => {
        // Update assistant message with new content
        updateMessage(currentChat.id, assistantMessage.id, {
          content: (prev) => (prev.content || '') + chunk,
        });
      },
      () => {
        // Mark as complete
        updateMessage(currentChat.id, assistantMessage.id, {
          isStreaming: false,
        });
        updateState({ isStreaming: false });
      },
      (error: string) => {
        // Handle error
        updateMessage(currentChat.id, assistantMessage.id, {
          content: `Error: ${error}`,
          isStreaming: false,
        });
        updateState({ isStreaming: false });
      }
    );
  };

  const handleModelChange = (modelId: string) => {
    const currentChat = getCurrentChat();
    if (currentChat) {
      updateChat(currentChat.id, { model: modelId });
    }
  };

  const handleToggleSidebar = () => {
    updateState({ isSidebarOpen: !state.isSidebarOpen });
  };

  const handleSettingsOpen = () => {
    updateState({ isSettingsOpen: true, isSidebarOpen: false });
  };

  const handleSettingsClose = () => {
    updateState({ isSettingsOpen: false });
  };

  const currentChat = getCurrentChat();

  return (
    <div className={`h-screen flex ${
      state.settings.theme === 'dark' ? 'bg-dark-bg' : 'bg-light-bg'
    }`}>
      <Sidebar
        chats={state.chats}
        currentChatId={state.currentChatId}
        isOpen={state.isSidebarOpen}
        onChatSelect={handleChatSelect}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        onRenameChat={handleRenameChat}
        onClose={() => updateState({ isSidebarOpen: false })}
        onSettingsOpen={handleSettingsOpen}
        theme={state.settings.theme}
      />

      <ChatArea
        chat={currentChat}
        isStreaming={state.isStreaming}
        onSendMessage={handleSendMessage}
        onModelChange={handleModelChange}
        onToggleSidebar={handleToggleSidebar}
        theme={state.settings.theme}
        fontFamily={state.settings.fontFamily}
        fontSize={state.settings.fontSize}
        fontWeight={state.settings.fontWeight}
      />

      <SettingsModal
        isOpen={state.isSettingsOpen}
        settings={state.settings}
        onClose={handleSettingsClose}
        onUpdateSettings={updateSettings}
      />
    </div>
  );
}

export default App;