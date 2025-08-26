// js/main.js
// The main entry point for the application. Initializes the app and sets up event listeners.

window.App = window.App || {};

App.isStreaming = false; // Flag to indicate if streaming is active
App.isScrolledUp = false; // Flag to indicate if the user has scrolled up
App.isGeneratingTitle = false; // Flag to indicate if title generation is in progress
App.attachedImageData = null; // To store { file, dataUrl }
App.currentController = null; // For aborting fetch requests
App.studyModePrompt = ""; // Default study mode prompt
App.isStudyMode = false; // Flag for study mode

App.init = async function() {
    // 1. Load available models from the backend
    await App.loadAvailableModels();

    // 2. Apply the user's preferred theme on startup.
    const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    App.applyTheme(savedTheme);

    // 3. Load cached data from localStorage for optimistic UI
    const cachedState = localStorage.getItem('fronixState');
    if (cachedState) {
        const p = JSON.parse(cachedState);
        App.state.settings = { ...App.state.settings, ...p.settings };
        App.state.currentUser = p.currentUser;
    }
    const cachedChats = localStorage.getItem('fronixChats');
    if (cachedChats) {
        App.state.chats = JSON.parse(cachedChats);
    }
    const lastActiveChatId = localStorage.getItem('lastActiveChatId');
    if (lastActiveChatId) {
        App.state.activeId = lastActiveChatId;
    }

    // Render the UI immediately with cached data
    App.renderSidebar();
    App.renderChat();
    App.updateLoginStateUI();
    App.updateProfileUI();
    
    // 4. Set up the master Supabase Authentication listener.
    App.supabaseClient.auth.onAuthStateChange(async (event, session) => {
        console.log(`Supabase auth event: ${event}`);
        if (event === 'SIGNED_IN' && session) {
            console.log('User signed in. Session:', session);
            localStorage.setItem('authToken', session.access_token);
            localStorage.setItem('refreshToken', session.refresh_token);
            
            // Manually set user for immediate UI update
            const { data: { user } } = await App.supabaseClient.auth.getUser();
            App.state.currentUser = user;
            
            await App.loadDataFromServer(); 
            App.closeAllModals();

        } else if (event === 'SIGNED_OUT') {
            console.log('User signed out.');
            localStorage.removeItem('authToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('fronixChats');
            localStorage.removeItem('lastActiveChatId');
            
            App.state.currentUser = null;
            App.state.chats = [];
            App.state.activeId = null;
            
            App.updateLoginStateUI();
            App.renderSidebar();
            App.renderChat();
        }
    });
    
    // 5. Check if a token already exists and fetch latest data from server
    const existingToken = localStorage.getItem('authToken');
    if (existingToken) {
        console.log('An existing auth token was found on page load. Loading user data from server.');
        App.loadDataFromServer();
    } else {
        // If no token exists, ensure the UI is in the logged-out state.
        console.log('No existing auth token found. Ensuring logged-out state.');
        App.updateLoginStateUI();
    }
    
    // 6. Apply UI settings and attach all event listeners.
    App.applyFont(App.state.settings.font);
    App.applyFontWeight(App.state.settings.fontWeight);
    App.renderFontOptions();
    App.renderFontWeightOptions();
    App.updateProModelsToggleUI();
    
    App.elements.settingsModal.apiTokenInput.addEventListener('change', (e) => {
        App.state.settings.apiToken = e.target.value;
        App.saveState();
    });

    App.elements.alertModal.okBtn.onclick = App.closeAlertModal;

    App.elements.settingsModal.proModelsToggle.addEventListener('click', () => {
        if (App.state.currentUser && App.state.currentUser.plan === 'pro') {
            App.state.settings.proModelsEnabled = !App.state.settings.proModelsEnabled;
            App.updateProModelsToggleUI();
            App.saveState();
            App.renderModelDropdown();

            // After toggling pro models, ensure the currently selected model is still available
            const currentModelData = App.MODELS[App.state.settings.model];
            if (currentModelData && currentModelData.pro && !App.state.settings.proModelsEnabled) {
                // If a pro model is selected and pro models are now disabled,
                // fall back to a default non-pro model.
                const defaultNonProModel = Object.keys(App.MODELS).find(key => !App.MODELS[key].pro);
                if (defaultNonProModel) {
                    App.state.settings.model = defaultNonProModel;
                    App.saveState();
                    App.updateModelSelectorDisplay(); // Update display with new model
                    App.renderModelDropdown(); // Re-render dropdown with new selection
                }
            }
        } else {
            App.openAlertModal('Pro Plan Required', 'You need a pro plan to use pro models. Contact @zshadowultra on Discord for access.');
        }
    });

    // Initial state update for send button
    App.updateSendButtonState();

    // Dynamic click handler for send/stop button
    App.elements.sendBtn.onclick = () => {
        if (App.isStreaming) {
            // Button is in stop state - abort the stream
            if (App.currentController) App.currentController.abort();
        } else {
            // Button is in send state - send message
            App.sendMessage();
        }
    };

    App.elements.scrollToBottomBtn.onclick = App.scrollToBottom;

    App.elements.chatBox.parentElement.addEventListener('scroll', () => {
        const { scrollTop, scrollHeight, clientHeight } = App.elements.chatBox.parentElement;
        const atBottom = scrollHeight - scrollTop - clientHeight < 50;
        App.isScrolledUp = !atBottom;

        if (App.isScrolledUp && App.isStreaming) {
            App.elements.scrollToBottomBtn.classList.add('opacity-100');
            App.elements.scrollToBottomBtn.classList.remove('opacity-0', 'pointer-events-none');
        } else {
            App.elements.scrollToBottomBtn.classList.remove('opacity-100');
            App.elements.scrollToBottomBtn.classList.add('opacity-0', 'pointer-events-none');
        }
    });

    // Ensure a chat is present by default
    if (App.state.chats.length === 0) {
        await App.handleNewChat(); // Create a new chat if none exist
    }
    App.setActive(App.state.activeId);

    // Image attachment logic
    const attachBtn = document.getElementById('attach-btn');
    const imageUpload = document.getElementById('image-upload');
    const imagePreviewContainer = document.getElementById('image-preview-container');

    attachBtn.onclick = () => imageUpload.click();

    imageUpload.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        // Check file size (50MB limit)
        const maxSize = 50 * 1024 * 1024; // 50MB in bytes
        if (file.size > maxSize) {
            App.openAlertModal('File Size Exceeded', 'File size must be less than 50MB.');
            imageUpload.value = null;
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            App.attachedImageData = { file: file, dataUrl: e.target.result };

            imagePreviewContainer.innerHTML = `
                <div class="relative inline-block">
                    <img src="${e.target.result}" class="h-20 w-20 object-cover rounded-lg">
                    <button id="remove-image-btn" class="absolute top-0 right-0 -mt-2 -mr-2 bg-red-500 text-white rounded-full p-1 leading-none">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
            `;
            imagePreviewContainer.classList.remove('hidden');

            document.getElementById('remove-image-btn').onclick = () => {
                App.attachedImageData = null;
                imageUpload.value = null;
                imagePreviewContainer.innerHTML = '';
                imagePreviewContainer.classList.add('hidden');
            };
        };
        reader.readAsDataURL(file);
    });
}
document.addEventListener('DOMContentLoaded', App.init);
App.elements.themeToggleBtn.onclick = App.toggleTheme;
    
App.elements.newChatBtn.onclick = App.handleNewChat;
App.elements.toggleSidebarBtn.onclick = App.toggleSidebar; 
App.elements.sidebarOverlay.onclick = App.toggleSidebar;
App.elements.userInput.addEventListener('input', () => {
    App.elements.userInput.style.height = 'auto';
    App.elements.userInput.style.height = (App.elements.userInput.scrollHeight) + 'px';
    App.updateSendButtonState(); // Update button state on input change

    const inputValue = App.elements.userInput.value;
    if (inputValue.startsWith('/')) {
        App.elements.autocompleteSuggestions.classList.remove('hidden');
    } else {
        App.elements.autocompleteSuggestions.classList.add('hidden');
    }
});

App.elements.userInput.addEventListener('keydown', e => {
    const isMobile = window.innerWidth < 768;
    if (e.key === 'Enter' && !e.shiftKey) {
        if (!isMobile) {
            e.preventDefault();
            App.sendMessage();
        }
    }
});

App.elements.studyCommandBtn.addEventListener('click', () => {
    App.elements.userInput.value = '/study';
    App.elements.autocompleteSuggestions.classList.add('hidden');
    App.elements.userInput.focus();
});
App.elements.settingsBtn.onclick = () => App.animateModalOpen(App.elements.settingsModal.container);
App.elements.settingsModal.closeBtn.onclick = () => App.animateModalClose(App.elements.settingsModal.container);
App.elements.settingsModal.resetBtn.onclick = () => {
  localStorage.clear();
  window.location.reload();
};
App.elements.renameModal.saveBtn.onclick = async () => {
    const { chatId } = App.state.modalContext;
    const newName = App.elements.renameModal.input.value.trim();
    if (!newName) return;

    const token = localStorage.getItem('authToken');
    if (!token) {
        alert("Authentication error. Please sign in again.");
        return;
    }

    const chatToRename = App.state.chats.find(c => c.id === chatId);
    if (!chatToRename) {
        App.closeAllModals();
        return;
    }
    const originalTitle = chatToRename.title; // Store original title for rollback

    // Optimistic UI update
    chatToRename.title = newName;
    if (chatId === App.state.activeId) {
        App.elements.chatTitle.textContent = newName;
    }
    console.log('[renameModal.saveBtn.onclick] State after optimistic update. state.chats:', JSON.parse(JSON.stringify(App.state.chats))); // Deep copy for logging
    console.log('[renameModal.saveBtn.onclick] State after optimistic update. state.activeId:', App.state.activeId);
    App.renderSidebar(); // Update sidebar immediately
    App.saveState();

    App.closeAllModals(); // Close modal immediately after optimistic update
    try {
        const response = await fetch(`${App.API_BASE_URL}/api/chat/${chatId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ title: newName })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update chat title on server.');
        }

        // Backend confirmed, no further UI changes needed for success beyond optimistic update
        console.log(`Chat ${chatId} renamed successfully to "${newName}"`);

    } catch (error) {
        console.error("Error renaming chat:", error);
        alert(`Failed to rename chat: ${error.message}`);
        
        // Revert optimistic UI update on error
        chatToRename.title = originalTitle;
        if (chatId === App.state.activeId) {
            App.elements.chatTitle.textContent = originalTitle;
        }
        console.log('[renameModal.saveBtn.onclick] Error rollback. state.chats:', JSON.parse(JSON.stringify(App.state.chats))); // Deep copy for logging
        console.log('[renameModal.saveBtn.onclick] Error rollback. state.activeId:', App.state.activeId);
        App.renderSidebar(); // Re-render sidebar to show original title
        App.saveState();
    } finally { // Ensure button state is updated
        App.updateSendButtonState();
        console.log('[renameModal.saveBtn.onclick] Finally block executed. Button state updated.');
    }
};
App.elements.deleteModal.confirmBtn.onclick = async () => {
    const { chatId } = App.state.modalContext;
    const token = localStorage.getItem('authToken');
    if (!token) {
        alert("Authentication error. Please sign in again.");
        return;
    }

    const chatToDeleteIndex = App.state.chats.findIndex(c => c.id === chatId);
    if (chatToDeleteIndex === -1) {
        App.closeAllModals();
        return;
    }
    const chatToDelete = App.state.chats[chatToDeleteIndex]; // Store chat for rollback

    // Optimistic UI update: Remove chat from state and re-render
    App.state.chats.splice(chatToDeleteIndex, 1);
    
    let oldActiveId = App.state.activeId; // Store current activeId for potential rollback

    if (App.state.chats.length === 0) {
        App.state.activeId = null; // No chats left, clear activeId
    }
    else if (chatId === oldActiveId) {
        // If the deleted chat was the active one, activate the nearest chat
        App.state.activeId = App.state.chats[Math.max(0, chatToDeleteIndex - 1)]?.id || App.state.chats[0]?.id;
    }
    
    App.renderSidebar(); // Update sidebar immediately
    App.renderChat(); // Update chat area immediately
    App.saveState();
    App.closeAllModals(); // Close modal immediately after optimistic update

    try {
        const response = await fetch(`${App.API_BASE_URL}/api/chat/${chatId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to delete chat on server.');
        }

        // Backend confirmed, no further UI changes needed for success beyond optimistic update
        console.log(`Chat ${chatId} deleted successfully.`);
        // If no chats left after deletion, ensure a new chat is created
        if (App.state.chats.length === 0) {
            await App.handleNewChat();
        }

    } catch (error) {
        console.error("Error deleting chat:", error);
        alert(`Failed to delete chat: ${error.message}`);
        
        // Revert optimistic UI update on error
        App.state.chats.splice(chatToDeleteIndex, 0, chatToDelete); // Re-add chat
        App.state.activeId = oldActiveId; // Restore activeId
        console.log('[deleteModal.confirmBtn.onclick] Error rollback. state.chats:', JSON.parse(JSON.stringify(App.state.chats))); // Deep copy for logging
        console.log('[deleteModal.confirmBtn.onclick] Error rollback. state.activeId:', App.state.activeId);
        App.renderSidebar(); // Re-render sidebar
        App.renderChat(); // Re-render chat area
        App.saveState();
    }
    finally {
        App.updateSendButtonState();
        console.log('[deleteModal.confirmBtn.onclick] Finally block executed. Button state updated.');
    }
};
[App.elements.settingsModal.container, App.elements.renameModal.container, App.elements.deleteModal.container, App.elements.signinModal.container].forEach(el => el.onclick = (e) => { if (e.target === el) App.closeAllModals(); });
[App.elements.renameModal.cancelBtn, App.elements.deleteModal.cancelBtn, App.elements.signinModal.closeBtn].forEach(el => el.onclick = App.closeAllModals);

// Expose functions and variables to the global App scope
App.copyMessage = function(text, btn) { navigator.clipboard.writeText(text).then(() => { const originalIcon = btn.innerHTML; btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`; setTimeout(() => btn.innerHTML = originalIcon, 1500); }); };
App.isTokenExpired = App.isTokenExpired;
App.retryWithBackoff = App.retryWithBackoff;


