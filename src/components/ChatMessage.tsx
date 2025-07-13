import React from 'react';
import { Message } from '../types';
import { parseMarkdown, renderMath } from '../utils/markdown';

interface ChatMessageProps {
  message: Message;
  theme: 'light' | 'dark';
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  theme,
  fontFamily,
  fontSize,
  fontWeight,
}) => {
  const isUser = message.role === 'user';

  const getFontSizeClass = () => {
    switch (fontSize) {
      case 'small': return 'text-sm';
      case 'large': return 'text-lg';
      default: return 'text-base';
    }
  };

  const processContent = (content: string) => {
    let processed = renderMath(content);
    processed = parseMarkdown(processed);
    return processed;
  };

  return (
    <div className={`flex gap-4 p-4 ${
      isUser 
        ? theme === 'dark' ? 'bg-dark-bg' : 'bg-light-bg'
        : theme === 'dark' ? 'bg-dark-surface' : 'bg-light-surface'
    }`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isUser
          ? theme === 'dark' ? 'bg-blue-600' : 'bg-blue-500'
          : theme === 'dark' ? 'bg-green-600' : 'bg-green-500'
      }`}>
        {isUser ? (
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className={`font-semibold mb-2 ${getFontSizeClass()} ${
          theme === 'dark' ? 'text-dark-text' : 'text-light-text'
        }`}>
          {isUser ? 'You' : 'Assistant'}
        </div>
        
        <div 
          className={`markdown-content ${getFontSizeClass()} ${
            theme === 'dark' ? 'text-dark-text' : 'text-light-text'
          }`}
          style={{ 
            fontFamily: fontFamily === 'Inter' ? 'Inter, system-ui, sans-serif' : fontFamily,
            fontWeight: fontWeight 
          }}
        >
          {message.isStreaming ? (
            <div className="flex items-center gap-2">
              <span dangerouslySetInnerHTML={{ __html: processContent(message.content) }} />
              <div className="typing-indicator">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            </div>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: processContent(message.content) }} />
          )}
        </div>
      </div>
    </div>
  );
};