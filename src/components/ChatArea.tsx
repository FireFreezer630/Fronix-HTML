import React, { useEffect, useRef } from 'react';
import { Chat, Message } from '../types';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ModelSelector } from './ModelSelector';

interface ChatAreaProps {
  chat: Chat | null;
  isStreaming: boolean;
  onSendMessage: (message: string) => void;
  onModelChange: (modelId: string) => void;
  onToggleSidebar: () => void;
  theme: 'light' | 'dark';
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  chat,
  isStreaming,
  onSendMessage,
  onModelChange,
  onToggleSidebar,
  theme,
  fontFamily,
  fontSize,
  fontWeight,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chat?.messages]);

  if (!chat) {
    return (
      <div className={`flex-1 flex flex-col ${
        theme === 'dark' ? 'bg-dark-bg' : 'bg-light-bg'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${
          theme === 'dark' ? 'border-dark-border bg-dark-surface' : 'border-light-border bg-light-surface'
        }`}>
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleSidebar}
              className={`md:hidden p-2 rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'hover:bg-dark-border text-dark-text-secondary'
                  : 'hover:bg-light-border text-light-text-secondary'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className={`text-lg font-semibold ${
              theme === 'dark' ? 'text-dark-text' : 'text-light-text'
            }`}>
              Fronix.ai
            </h1>
          </div>
        </div>

        {/* Empty State */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
              theme === 'dark' ? 'bg-dark-surface' : 'bg-light-surface'
            }`}>
              <svg className={`w-8 h-8 ${
                theme === 'dark' ? 'text-dark-text-secondary' : 'text-light-text-secondary'
              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h2 className={`text-xl font-semibold mb-2 ${
              theme === 'dark' ? 'text-dark-text' : 'text-light-text'
            }`}>
              Welcome to Fronix.ai
            </h2>
            <p className={`${
              theme === 'dark' ? 'text-dark-text-secondary' : 'text-light-text-secondary'
            }`}>
              Start a new conversation to begin chatting with AI models.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex-1 flex flex-col ${
      theme === 'dark' ? 'bg-dark-bg' : 'bg-light-bg'
    }`}>
      {/* Header */}
      <div className={`flex items-center justify-between p-4 border-b ${
        theme === 'dark' ? 'border-dark-border bg-dark-surface' : 'border-light-border bg-light-surface'
      }`}>
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className={`md:hidden p-2 rounded-lg transition-colors ${
              theme === 'dark'
                ? 'hover:bg-dark-border text-dark-text-secondary'
                : 'hover:bg-light-border text-light-text-secondary'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className={`text-lg font-semibold ${
            theme === 'dark' ? 'text-dark-text' : 'text-light-text'
          }`}>
            {chat.title}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <ModelSelector
            selectedModel={chat.model}
            onModelChange={onModelChange}
            theme={theme}
          />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {chat.messages.length === 0 ? (
          <div className="flex items-center justify-center h-full p-8">
            <div className="text-center max-w-md">
              <div className={`w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center ${
                theme === 'dark' ? 'bg-dark-surface' : 'bg-light-surface'
              }`}>
                <svg className={`w-6 h-6 ${
                  theme === 'dark' ? 'text-dark-text-secondary' : 'text-light-text-secondary'
                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className={`${
                theme === 'dark' ? 'text-dark-text-secondary' : 'text-light-text-secondary'
              }`}>
                Start the conversation by sending a message below.
              </p>
            </div>
          </div>
        ) : (
          <div>
            {chat.messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                theme={theme}
                fontFamily={fontFamily}
                fontSize={fontSize}
                fontWeight={fontWeight}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <ChatInput
        onSendMessage={onSendMessage}
        disabled={isStreaming}
        theme={theme}
        placeholder={chat.messages.length === 0 ? "Start your conversation..." : "Type your message..."}
      />
    </div>
  );
};