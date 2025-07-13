import React, { useState, useRef, useEffect } from 'react';
import { modelGroups } from '../data/models';

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  theme: 'light' | 'dark';
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onModelChange,
  theme,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedModelData = modelGroups
    .flatMap(group => group.models)
    .find(model => model.id === selectedModel);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleModelSelect = (modelId: string) => {
    onModelChange(modelId);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between w-full px-4 py-2 text-sm rounded-lg border transition-colors ${
          theme === 'dark'
            ? 'bg-dark-surface border-dark-border text-dark-text hover:bg-dark-border'
            : 'bg-light-surface border-light-border text-light-text hover:bg-light-border'
        }`}
      >
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            theme === 'dark' ? 'bg-green-400' : 'bg-green-500'
          }`} />
          <span className="font-medium">
            {selectedModelData?.name || 'Select Model'}
          </span>
          {selectedModelData && (
            <span className={`text-xs px-2 py-1 rounded ${
              theme === 'dark'
                ? 'bg-dark-border text-dark-text-secondary'
                : 'bg-light-border text-light-text-secondary'
            }`}>
              {selectedModelData.provider}
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className={`absolute top-full left-0 right-0 mt-2 rounded-lg border shadow-lg z-50 max-h-96 overflow-y-auto custom-scrollbar ${
          theme === 'dark'
            ? 'bg-dark-surface border-dark-border'
            : 'bg-light-surface border-light-border'
        }`}>
          {modelGroups.map((group) => (
            <div key={group.provider} className="p-2">
              <div className={`px-3 py-2 text-xs font-semibold uppercase tracking-wider ${
                theme === 'dark' ? 'text-dark-text-secondary' : 'text-light-text-secondary'
              }`}>
                {group.provider}
              </div>
              {group.models.map((model) => (
                <button
                  key={model.id}
                  onClick={() => handleModelSelect(model.id)}
                  className={`w-full text-left px-3 py-2 text-sm rounded transition-colors ${
                    selectedModel === model.id
                      ? theme === 'dark'
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-500 text-white'
                      : theme === 'dark'
                      ? 'hover:bg-dark-border text-dark-text'
                      : 'hover:bg-light-border text-light-text'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{model.name}</span>
                    {selectedModel === model.id && (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};