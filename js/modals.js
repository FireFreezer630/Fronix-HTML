// js/modals.js
// Manages all modal dialogs, including opening, closing, and animations.
window.App = window.App || {};

App.animateModalOpen = function(modalContainer) {
    modalContainer.style.display = 'flex';
    const modalContent = modalContainer.querySelector('.modal-content');
    anime({ targets: modalContent, scale: [0.92, 1], opacity: [0, 1], duration: 250, easing: 'easeOutCubic' });
}
App.animateModalClose = function(modalContainer, onComplete = () => {}) {
    const modalContent = modalContainer.querySelector('.modal-content');
    anime({ targets: modalContent, scale: 0.95, opacity: 0, duration: 100, easing: 'easeInCubic', complete: () => { modalContainer.style.display = 'none'; onComplete(); } });
}
App.openRenameModal = function(chatId) { 
    App.state.modalContext.chatId = chatId; 
    const chat = App.state.chats.find(c=>c.id === chatId); 
    if(!chat) return; 
    App.elements.renameModal.input.value = chat.title; 
    App.animateModalOpen(App.elements.renameModal.container); 
}
App.openDeleteModal = function(chatId) { 
    App.state.modalContext.chatId = chatId; 
    const chat = App.state.chats.find(c=>c.id === chatId); 
    if(!chat) return; 
    App.elements.deleteModal.message.textContent = `Are you sure you want to delete "${chat.title}"?`; 
    App.animateModalOpen(App.elements.deleteModal.container); 
}
App.openAlertModal = function(title, message) {
    App.elements.alertModal.title.textContent = title;
    App.elements.alertModal.message.textContent = message;
    App.animateModalOpen(App.elements.alertModal.container);
}
App.closeAlertModal = function() {
    App.animateModalClose(App.elements.alertModal.container);
}
App.closeAllModals = function() { 
    document.querySelectorAll('.modal-container').forEach(m => { if (m.style.display === 'flex') App.animateModalClose(m); }); 
    App.elements.chatActionsDropdown.style.display = 'none';
}
App.openChatActionsDropdown = function(chatId, target) {
    const rect = target.getBoundingClientRect();
    const dropdown = App.elements.chatActionsDropdown;
    dropdown.innerHTML = `
        <button class="rename-action w-full text-left px-3 py-2 text-sm hover:bg-light-border-hover dark:hover:bg-dark-border-hover flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
            Rename
        </button>
        <button class="delete-action w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-light-border-hover dark:hover:bg-dark-border-hover flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            Delete
        </button>
    `;
    dropdown.querySelector('.rename-action').onclick = () => {
        App.openRenameModal(chatId);
        dropdown.style.display = 'none'; // Correct: Only hide the dropdown
    };
    dropdown.querySelector('.delete-action').onclick = () => {
        App.openDeleteModal(chatId);
        dropdown.style.display = 'none'; // Correct: Only hide the dropdown
    };
    dropdown.style.top = `${rect.bottom + 4}px`;
    dropdown.style.left = `${rect.left - dropdown.offsetWidth + rect.width}px`;
    dropdown.style.display = 'block';

    setTimeout(() => {
        document.addEventListener('click', function hide(e) {
            if (!dropdown.contains(e.target)) {
                dropdown.style.display = 'none';
                document.removeEventListener('click', hide);
            }
        });
    }, 0);
};
