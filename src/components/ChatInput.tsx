import React, { useState, useRef, useEffect } from 'react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled: boolean;
  theme: 'light' | 'dark';
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  disabled,
  theme,
  placeholder = "Type your message...",
}) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [message]);

  return (
    <div className={`border-t ${
      theme === 'dark' ? 'border-dark-border bg-dark-surface' : 'border-light-border bg-light-surface'
    }`}>
      <form onSubmit={handleSubmit} className="p-4">
        <div className={`relative rounded-lg border ${
          theme === 'dark' ? 'border-dark-border bg-dark-bg' : 'border-light-border bg-light-bg'
        }`}>
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={`w-full p-4 pr-12 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              theme === 'dark'
                ? 'bg-dark-bg text-dark-text placeholder-dark-text-secondary'
                : 'bg-light-bg text-light-text placeholder-light-text-secondary'
            }`}
            style={{ minHeight: '60px', maxHeight: '200px' }}
          />
          
          <button
            type="submit"
            disabled={!message.trim() || disabled}
            className={`absolute right-2 bottom-2 p-2 rounded-lg transition-colors ${
              !message.trim() || disabled
                ? theme === 'dark'
                  ? 'text-dark-text-secondary cursor-not-allowed'
                  : 'text-light-text-secondary cursor-not-allowed'
                : theme === 'dark'
                ? 'text-blue-400 hover:text-blue-300 hover:bg-dark-border'
                : 'text-blue-500 hover:text-blue-600 hover:bg-light-border'
            }`}
          >
            {disabled ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
        
        <div className={`mt-2 text-xs ${
          theme === 'dark' ? 'text-dark-text-secondary' : 'text-light-text-secondary'
        }`}>
          Press Enter to send, Shift+Enter for new line
        </div>
      </form>
    </div>
  );
};