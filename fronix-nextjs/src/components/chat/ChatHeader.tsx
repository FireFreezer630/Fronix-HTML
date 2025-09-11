import React from 'react';
import MenuIcon from '@/src/components/icons/MenuIcon';
import ChevronDownIcon from '@/src/components/icons/ChevronDownIcon';
import { UserProfile } from '@/src/lib/api'; // Import UserProfile

interface ChatHeaderProps {
  onToggleSidebar: () => void;
  userProfile: UserProfile | null;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ onToggleSidebar, userProfile }) => {
  const [isModelDropdownOpen, setIsModelDropdownOpen] = React.useState(false);
  const [selectedModel, setSelectedModel] = React.useState<'basic' | 'pro'>(userProfile?.plan === 'pro' ? 'pro' : 'basic');

  const availableModels = [
    { id: 'basic', name: 'Basic Model', requiresPro: false },
    { id: 'pro', name: 'Pro Model', requiresPro: true },
  ];

  const handleModelChange = (modelId: 'basic' | 'pro') => {
    setSelectedModel(modelId);
    setIsModelDropdownOpen(false);
    // In a real application, you would also update the backend or global state
    // with the selected model.
  };

  const handleToggleModelDropdown = () => {
    setIsModelDropdownOpen(!isModelDropdownOpen);
  };

  return (
    <header className="bg-light-chat-surface dark:bg-dark-chat-surface px-4 py-3 flex items-center gap-4 relative">
      <button id="toggle-sidebar" className="p-2 text-light-text-subtle dark:text-dark-text-subtle hover:text-light-text dark:hover:text-dark-text rounded-full" onClick={onToggleSidebar}><MenuIcon /></button>
      <div id="model-selector" className="flex items-center gap-1 cursor-pointer" onClick={handleToggleModelDropdown}>
        <h1 id="chat-title" className="text-lg font-semibold truncate">{availableModels.find(model => model.id === selectedModel)?.name}</h1>
        <ChevronDownIcon className="text-light-text-subtle dark:text-dark-text-subtle" />
      </div>
      <div id="model-dropdown" className={`absolute top-full left-4 mt-2 w-48 bg-light-sidebar dark:bg-dark-sidebar rounded-lg shadow-lg border border-light-border dark:border-dark-border z-10 ${isModelDropdownOpen ? '' : 'hidden'}`}>
        <ul className="py-1">
          {availableModels.map((model) => (
            <li key={model.id}>
              <button
                className={`w-full text-left px-4 py-2 text-sm ${selectedModel === model.id ? 'bg-accent/10 text-accent' : 'hover:bg-light-border-hover dark:hover:bg-dark-border-hover'} ${model.requiresPro && userProfile?.plan !== 'pro' ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => handleModelChange(model.id)}
                disabled={model.requiresPro && userProfile?.plan !== 'pro'}
              >
                {model.name} {model.requiresPro && <span className="text-xs text-yellow-500">(Pro)</span>}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
};

export default ChatHeader;
