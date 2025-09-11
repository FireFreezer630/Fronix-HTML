import React from 'react';

interface RenameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newName: string) => void;
  initialName?: string; // Add optional initialName prop
}

const RenameModal: React.FC<RenameModalProps> = ({ isOpen, onClose, onSave, initialName }) => {
  if (!isOpen) return null;

  const [newName, setNewName] = React.useState(initialName || ''); // Initialize with initialName

  React.useEffect(() => {
    setNewName(initialName || '');
  }, [initialName, isOpen]);

  const handleSave = () => {
    onSave(newName);
    setNewName(''); // Clear input after saving
  };

  return (
    <div id="rename-modal" className="modal-container"><div className="modal-content bg-light-sidebar dark:bg-dark-sidebar p-6 sm:pb-8 rounded-2xl shadow-xl w-full max-w-sm border border-light-border dark:border-dark-border"><h3 className="text-lg font-semibold mb-4">Rename Chat</h3><input id="rename-input" type="text" className="w-full p-2 rounded-md bg-light-user-bubble dark:bg-dark-user-bubble focus:outline-none focus:ring-2 focus:ring-accent mb-4" value={newName} onChange={(e) => setNewName(e.target.value)} /><div className="flex justify-end gap-2"><button id="rename-cancel" className="px-4 py-2 rounded-md hover:bg-light-border-hover dark:hover:bg-dark-border-hover" onClick={onClose}>Cancel</button><button id="rename-save" className="px-4 py-2 rounded-md bg-accent text-white" onClick={handleSave}>Save</button></div></div></div>
  );
};

export default RenameModal;
