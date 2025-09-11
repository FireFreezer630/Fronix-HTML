import React, { useEffect, useRef } from 'react';
import { Message } from '@/src/lib/api';

interface ChatDisplayProps {
  messages: Message[];
}

const ChatDisplay: React.FC<ChatDisplayProps> = ({ messages }) => {
  const chatBoxWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatBoxWrapperRef.current) {
      chatBoxWrapperRef.current.scrollTop = chatBoxWrapperRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <main className="flex-1 overflow-hidden flex flex-col bg-light-chat-surface dark:bg-dark-chat-surface">
      <div id="chat-box-wrapper" className="flex-1 overflow-y-auto px-4 sm:px-8 md:px-12 lg:px-24" ref={chatBoxWrapperRef}>
        <div id="chat-box" className="max-w-4xl mx-auto pb-20 space-y-6">
          {messages.length === 0 ? (
            <div className="text-center text-light-text-subtle dark:text-dark-text-subtle py-8">
              <h2 className="text-3xl font-bold mb-2">Fronix</h2>
              <p>Start a new message to begin.</p>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] p-3 rounded-lg ${message.sender === 'user' ? 'bg-accent text-white' : 'bg-light-user-bubble dark:bg-dark-user-bubble text-light-text dark:text-dark-text'}`}>
                  <p>{message.content}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
};

export default ChatDisplay;
