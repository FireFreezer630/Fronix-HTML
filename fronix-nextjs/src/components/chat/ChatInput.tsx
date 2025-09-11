import React, { useState, useRef, useEffect } from 'react';
import ArrowDownIcon from '@/src/components/icons/ArrowDownIcon';
import EditIcon from '@/src/components/icons/EditIcon';
import XIcon from '@/src/components/icons/XIcon';
import PaperclipIcon from '@/src/components/icons/PaperclipIcon';
import SendIcon from '@/src/components/icons/SendIcon';
import StopIcon from '@/src/components/icons/StopIcon';
import SaveIcon from '@/src/components/icons/SaveIcon';
import { sendChatMessage } from '@/src/lib/api';

interface ChatInputProps {
  activeChatId: string | null;
  onSendMessage: (message: string) => void;
}

const ChatInput: React.FC<ChatInputProps> = ({
  activeChatId,
  onSendMessage,
}) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Adjust textarea height based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(event.target.value);
  };

  const handleSendMessageClick = async () => {
    if (!message.trim() || !activeChatId) {
      return;
    }
    const messageToSend = message.trim();
    setMessage(''); // Clear input immediately
    onSendMessage(messageToSend);

    const result = await sendChatMessage(activeChatId, messageToSend);
    if (result.success) {
      console.log("Message sent successfully:", result.data);
    } else {
      console.error("Failed to send message:", result.error);
      alert(result.error || "Failed to send message.");
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessageClick();
    }
  };

  return (
    <div className="relative">

      {/* Scroll To Bottom Button */}
      <button id="scroll-to-bottom-btn" className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-4 p-2 rounded-full bg-light-sidebar dark:bg-dark-sidebar shadow-md border border-light-border dark:border-dark-border text-light-text-subtle dark:text-dark-text-subtle hover:bg-light-border-hover dark:hover:bg-dark-border-hover transition-opacity duration-300 opacity-0 pointer-events-none">
          <ArrowDownIcon />
      </button>
      
      {/* Corrected Edit Indicator: Single element with corrected layout */}
      <div id="edit-indicator" className="max-w-3xl mx-auto px-3 py-2 flex items-center justify-between bg-blue-100 dark:bg-blue-900/30 rounded-t-lg text-sm font-medium text-gray-800 dark:text-gray-100 hidden">
          <div className="flex items-center gap-2">
              <EditIcon className="flex-shrink-0 text-blue-600 dark:text-blue-400" />
              <span>Editing message</span>
          </div>
          <button id="cancel-edit-btn" className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
              <XIcon />
          </button>
      </div>

      {/* ADDED: Image Preview Container */}
      <div id="image-preview-container" className="max-w-3xl mx-auto p-4 hidden">
          {/* Image preview will be dynamically inserted here by JavaScript */}
      </div>

      {/* Input Bar */}
      <div className="max-w-3xl mx-auto p-4 relative">
        <div className="flex items-end space-x-2 p-2 rounded-2xl bg-light-sidebar dark:bg-dark-sidebar shadow-lg">
          <input type="file" id="image-upload" className="hidden" accept="image/png, image/jpeg, image/webp, image/gif"/>
          <button id="attach-btn" className="p-3 rounded-full hover:bg-light-border-hover dark:hover:bg-dark-border-hover transition-colors text-light-text-subtle dark:text-dark-text-subtle">
              <PaperclipIcon />
          </button>
          <textarea id="user-input" rows={1} className="flex-1 bg-transparent py-3 px-4 resize-none focus:outline-none" placeholder="Type your message..." style={{ maxHeight: '200px' }} value={message} onChange={handleInputChange} onKeyDown={handleKeyDown} ref={textareaRef}></textarea>
          <button id="send-btn" className="p-3 rounded-full bg-accent hover:bg-accent-hover text-white disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors" onClick={handleSendMessageClick} disabled={!message.trim() || !activeChatId}>
            <SendIcon id="send-icon" />
            <StopIcon id="stop-icon" className="hidden" />
            <SaveIcon id="save-icon" className="hidden" />
          </button>
        </div>
        {/* Autocomplete Suggestions */}
        <div id="autocomplete-suggestions" className="absolute bottom-full left-0 w-full mb-2 p-2 rounded-lg shadow-lg bg-light-sidebar dark:bg-dark-sidebar border border-light-border dark:border-dark-border hidden">
          <button id="study-command-btn" className="w-full text-left px-3 py-2 text-sm text-light-text dark:text-dark-text hover:bg-light-border-hover dark:hover:bg-dark-border-hover rounded-md">
              /study - Toggle study mode
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
