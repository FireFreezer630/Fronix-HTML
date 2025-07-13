import React from 'react';
import { AppSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  settings: AppSettings;
  onClose: () => void;
  onUpdateSettings: (updates: Partial<AppSettings>) => void;
}

const fontOptions = [
  { value: 'Inter', label: 'Inter' },
  { value: 'JetBrains Mono', label: 'JetBrains Mono' },
  { value: 'Source Code Pro', label: 'Source Code Pro' },
  { value: 'Fira Code', label: 'Fira Code' },
  { value: 'Roboto Mono', label: 'Roboto Mono' },
  { value: 'Ubuntu Mono', label: 'Ubuntu Mono' },
  { value: 'Cascadia Code', label: 'Cascadia Code' },
  { value: 'Consolas', label: 'Consolas' },
  { value: 'Menlo', label: 'Menlo' },
  { value: 'Monaco', label: 'Monaco' },
];

const fontWeightOptions = [
  { value: '300', label: 'Light' },
  { value: '400', label: 'Normal' },
  { value: '500', label: 'Medium' },
  { value: '600', label: 'Semi Bold' },
  { value: '700', label: 'Bold' },
];

const fontSizeOptions = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  onClose,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop"
      onClick={handleBackdropClick}
    >
      <div className={`w-full max-w-md mx-4 rounded-lg shadow-xl fade-in ${
        settings.theme === 'dark'
          ? 'bg-dark-surface border border-dark-border'
          : 'bg-light-surface border border-light-border'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${
          settings.theme === 'dark' ? 'border-dark-border' : 'border-light-border'
        }`}>
          <h2 className={`text-xl font-semibold ${
            settings.theme === 'dark' ? 'text-dark-text' : 'text-light-text'
          }`}>
            Settings
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              settings.theme === 'dark'
                ? 'hover:bg-dark-border text-dark-text-secondary hover:text-dark-text'
                : 'hover:bg-light-border text-light-text-secondary hover:text-light-text'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Theme */}
          <div>
            <label className={`block text-sm font-medium mb-3 ${
              settings.theme === 'dark' ? 'text-dark-text' : 'text-light-text'
            }`}>
              Theme
            </label>
            <div className="flex gap-2">
              {['light', 'dark'].map((theme) => (
                <button
                  key={theme}
                  onClick={() => onUpdateSettings({ theme: theme as 'light' | 'dark' })}
                  className={`flex-1 p-3 rounded-lg border-2 transition-colors capitalize ${
                    settings.theme === theme
                      ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      : settings.theme === 'dark'
                      ? 'border-dark-border hover:border-blue-500 text-dark-text'
                      : 'border-light-border hover:border-blue-500 text-light-text'
                  }`}
                >
                  {theme}
                </button>
              ))}
            </div>
          </div>

          {/* Font Family */}
          <div>
            <label className={`block text-sm font-medium mb-3 ${
              settings.theme === 'dark' ? 'text-dark-text' : 'text-light-text'
            }`}>
              Font Family
            </label>
            <select
              value={settings.fontFamily}
              onChange={(e) => onUpdateSettings({ fontFamily: e.target.value })}
              className={`w-full p-3 rounded-lg border transition-colors ${
                settings.theme === 'dark'
                  ? 'bg-dark-bg border-dark-border text-dark-text'
                  : 'bg-light-bg border-light-border text-light-text'
              }`}
            >
              {fontOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Font Weight */}
          <div>
            <label className={`block text-sm font-medium mb-3 ${
              settings.theme === 'dark' ? 'text-dark-text' : 'text-light-text'
            }`}>
              Font Weight
            </label>
            <select
              value={settings.fontWeight}
              onChange={(e) => onUpdateSettings({ fontWeight: e.target.value })}
              className={`w-full p-3 rounded-lg border transition-colors ${
                settings.theme === 'dark'
                  ? 'bg-dark-bg border-dark-border text-dark-text'
                  : 'bg-light-bg border-light-border text-light-text'
              }`}
            >
              {fontWeightOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Font Size */}
          <div>
            <label className={`block text-sm font-medium mb-3 ${
              settings.theme === 'dark' ? 'text-dark-text' : 'text-light-text'
            }`}>
              Font Size
            </label>
            <div className="flex gap-2">
              {fontSizeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => onUpdateSettings({ fontSize: option.value as 'small' | 'medium' | 'large' })}
                  className={`flex-1 p-3 rounded-lg border-2 transition-colors ${
                    settings.fontSize === option.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      : settings.theme === 'dark'
                      ? 'border-dark-border hover:border-blue-500 text-dark-text'
                      : 'border-light-border hover:border-blue-500 text-light-text'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`flex justify-end gap-3 p-6 border-t ${
          settings.theme === 'dark' ? 'border-dark-border' : 'border-light-border'
        }`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg transition-colors ${
              settings.theme === 'dark'
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};