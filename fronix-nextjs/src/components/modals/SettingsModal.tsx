import React from 'react';
import XIcon from '@/src/components/icons/XIcon';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div id="settings-modal" className="modal-container">
      <div className="modal-content bg-light-sidebar dark:bg-dark-sidebar p-6 rounded-2xl shadow-xl w-full max-w-md border border-light-border dark:border-dark-border">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold">Settings</h3>
          <button id="close-settings-btn" className="p-1 rounded-full hover:bg-light-border-hover dark:hover:bg-dark-border-hover transition-colors" onClick={onClose}>
            <XIcon width="22" height="22" />
          </button>
        </div>
        <div className="space-y-6">
          <div className="space-y-2">
            <div>
              <label htmlFor="api-token-input" className="text-sm font-medium text-light-text-subtle dark:text-dark-text-subtle">API Token</label>
              <p className="text-xs text-light-text-subtle dark:text-dark-text-subtle">Your token is stored only in your browser's local storage.</p>
            </div>
            <input id="api-token-input" type="password" className="w-full p-2 rounded-md bg-light-user-bubble dark:bg-dark-user-bubble focus:outline-none focus:ring-2 focus:ring-accent" placeholder="Enter your API token..." />
          </div>
          <div className="flex items-center justify-between">
            <label htmlFor="pro-models-toggle" className="text-sm font-medium text-light-text-subtle dark:text-dark-text-subtle">Enable Pro Models</label>
            <button id="pro-models-toggle" type="button" className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 bg-gray-200 dark:bg-gray-700" role="switch" aria-checked="false">
              <span aria-hidden="true" className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out translate-x-0"></span>
            </button>
          </div>
          <div id="font-options"></div>
          <div id="font-weight-options"></div>
          <div>
            <button id="reset-settings-btn" className="w-full px-4 py-2 rounded-md text-sm font-medium border border-light-border dark:border-dark-border hover:bg-light-border-hover dark:hover:bg-dark-border-hover transition-colors">Reset to Default</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
