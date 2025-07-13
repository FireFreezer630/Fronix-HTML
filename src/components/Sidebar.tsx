import React, { useState } from 'react';
import { Chat } from '../types';

interface SidebarProps {
  chats: Chat[];
  currentChatId: string | null;
  isOpen: boolean;
  onChatSelect: (chatId: string) => void;
  onNewChat: () => void;
  onDeleteChat: (chatId: string) => void;
  onRenameChat: (chatId: string, newTitle: string) => void;
  onClose: () => void;
  onSettingsOpen: () => void;
  theme: 'light' | 'dark';
}

export const Sidebar: React.FC<SidebarProps> = ({
  chats,
  currentChatId,
  isOpen,
  onChatSelect,
  onNewChat,
  onDeleteChat,
  onRenameChat,
  onClose,
  onSettingsOpen,
  theme,
}) => {
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const handleRename = (chat: Chat) => {
    setEditingChatId(chat.id);
    setEditingTitle(chat.title);
  };

  const handleSaveRename = () => {
    if (editingChatId && editingTitle.trim()) {
      onRenameChat(editingChatId, editingTitle.trim());
    }
    setEditingChatId(null);
    setEditingTitle('');
  };

  const handleCancelRename = () => {
    setEditingChatId(null);
    setEditingTitle('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveRename();
    } else if (e.key === 'Escape') {
      handleCancelRename();
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-full w-80 z-50 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } ${
          theme === 'dark'
            ? 'bg-dark-surface border-dark-border'
            : 'bg-light-surface border-light-border'
        } border-r flex flex-col`}
      >
        {/* Header */}
        <div className="p-4 border-b border-inherit">
          <div className="flex items-center justify-between mb-4">
            <h1 className={`text-xl font-semibold ${
              theme === 'dark' ? 'text-dark-text' : 'text-light-text'
            }`}>
              Fronix.ai
            </h1>
            <button
              onClick={onClose}
              className={`md:hidden p-2 rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'hover:bg-dark-border text-dark-text-secondary'
                  : 'hover:bg-light-border text-light-text-secondary'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <button
            onClick={onNewChat}
            className={`w-full p-3 rounded-lg border-2 border-dashed transition-colors ${
              theme === 'dark'
                ? 'border-dark-border hover:border-blue-500 text-dark-text-secondary hover:text-dark-text'
                : 'border-light-border hover:border-blue-500 text-light-text-secondary hover:text-light-text'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Chat
            </div>
          </button>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
          {chats.map((chat) => (
            <div
              key={chat.id}
              className={`group relative p-3 rounded-lg cursor-pointer transition-colors ${
                currentChatId === chat.id
                  ? theme === 'dark'
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-500 text-white'
                  : theme === 'dark'
                  ? 'hover:bg-dark-border text-dark-text'
                  : 'hover:bg-light-border text-light-text'
              }`}
              onClick={() => onChatSelect(chat.id)}
            >
              {editingChatId === chat.id ? (
                <input
                  type="text"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onBlur={handleSaveRename}
                  onKeyDown={handleKeyPress}
                  className={`w-full bg-transparent border-none outline-none ${
                    currentChatId === chat.id ? 'text-white' : theme === 'dark' ? 'text-dark-text' : 'text-light-text'
                  }`}
                  autoFocus
                />
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="truncate flex-1 text-sm font-medium">
                      {chat.title}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRename(chat);
                        }}
                        className={`p-1 rounded transition-colors ${
                          currentChatId === chat.id
                            ? 'hover:bg-blue-700'
                            : theme === 'dark'
                            ? 'hover:bg-dark-bg'
                            : 'hover:bg-light-bg'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteChat(chat.id);
                        }}
                        className={`p-1 rounded transition-colors ${
                          currentChatId === chat.id
                            ? 'hover:bg-red-600'
                            : 'hover:bg-red-500 text-red-500'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className={`text-xs mt-1 ${
                    currentChatId === chat.id
                      ? 'text-blue-100'
                      : theme === 'dark'
                      ? 'text-dark-text-secondary'
                      : 'text-light-text-secondary'
                  }`}>
                    {chat.messages.length} messages
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className={`p-4 border-t ${
          theme === 'dark' ? 'border-dark-border' : 'border-light-border'
        }`}>
          <button
            onClick={onSettingsOpen}
            className={`w-full p-3 rounded-lg transition-colors ${
              theme === 'dark'
                ? 'hover:bg-dark-border text-dark-text-secondary hover:text-dark-text'
                : 'hover:bg-light-border text-light-text-secondary hover:text-light-text'
            }`}
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Settings
            </div>
          </button>
        </div>
      </div>
    </>
  );
};