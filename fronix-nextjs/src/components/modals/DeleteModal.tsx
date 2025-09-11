import React from 'react';

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  message: string;
  chatTitle?: string;
}

const DeleteModal: React.FC<DeleteModalProps> = ({ isOpen, onClose, onConfirm, message, chatTitle }) => {
  if (!isOpen) return null;

  return (
    <div id="delete-modal" className="modal-container"><div className="modal-content bg-light-sidebar dark:bg-dark-sidebar p-6 rounded-2xl shadow-xl w-full max-w-sm border border-light-border dark:border-dark-border"><h3 className="text-lg font-semibold mb-4">Delete Chat</h3><p id="delete-message" className="mb-4 text-light-text-subtle dark:text-dark-text-subtle">{message} {chatTitle && <span className="font-bold">'{chatTitle}'</span>}?</p><div className="flex justify-end gap-2"><button id="delete-cancel" className="px-4 py-2 rounded-md hover:bg-light-border-hover dark:hover:bg-dark-border-hover" onClick={onClose}>Cancel</button><button id="delete-confirm" className="px-4 py-2 rounded-md bg-red-600 text-white" onClick={onConfirm}>Delete</button></div></div></div>
  );
};

export default DeleteModal;
