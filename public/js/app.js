const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const elements = {
  body: document.body, 
  sidebar: document.getElementById('sidebar'), 
  sidebarOverlay: document.getElementById('sidebar-overlay'), 
  chatList: document.getElementById('chat-list'), 
  chatBox: document.getElementById('chat-box'), 
  chatTitle: document.getElementById('chat-title'), 
  userInput: document.getElementById('user-input'), 
  sendBtn: document.getElementById('send-btn'), 
  sendIcon: document.getElementById('send-icon'), 
  stopIcon: document.getElementById('stop-icon'), 
  saveIcon: document.getElementById('save-icon'), 
  newChatBtn: document.getElementById('new-chat'), 
  toggleSidebarBtn: document.getElementById('toggle-sidebar'), 
  themeToggleBtn: document.getElementById('theme-toggle'), 
  settingsBtn: document.getElementById('settings-btn'),
  signinBtn: document.getElementById('signin-btn'),
  logoutBtn: document.getElementById('logout-btn'),
  profileSection: document.getElementById('profile-section'),
  profileBtn: document.getElementById('profile-btn'),
  profileDropdown: document.getElementById('profile-dropdown'),
  profileUsername: document.getElementById('profile-username'),
  profileEmail: document.getElementById('profile-email'),
  profilePlan: document.getElementById('profile-plan'),
  profileBtnUsername: document.getElementById('profile-btn-username'),
  modelSelector: document.getElementById('model-selector'), 
  modelDropdown: document.getElementById('model-dropdown'),
  chatActionsDropdown: document.getElementById('chat-actions-dropdown'),
  editIndicator: document.getElementById('edit-indicator'),
  cancelEditBtn: document.getElementById('cancel-edit-btn'),
  scrollToBottomBtn: document.getElementById('scroll-to-bottom-btn'),
  autocompleteSuggestions: document.getElementById('autocomplete-suggestions'),
  studyCommandBtn: document.getElementById('study-command-btn'),
  settingsModal: { 
    container: document.getElementById('settings-modal'), 
    fontOptions: document.getElementById('font-options'), 
    fontWeightOptions: document.getElementById('font-weight-options'), 
    chatBackgroundInput: document.getElementById('chat-background-input'),
    closeBtn: document.getElementById('close-settings-btn'), 
    resetBtn: document.getElementById('reset-settings-btn'), 
    proModelsToggle: document.getElementById('pro-models-toggle') 
  },
  renameModal: { 
    container: document.getElementById('rename-modal'), 
    input: document.getElementById('rename-input'), 
    saveBtn: document.getElementById('rename-save'), 
    cancelBtn: document.getElementById('rename-cancel') 
  },
  deleteModal: { 
    container: document.getElementById('delete-modal'), 
    message: document.getElementById('delete-message'), 
    confirmBtn: document.getElementById('delete-confirm'), 
    cancelBtn: document.getElementById('delete-cancel') 
  },
  signinModal: { 
    container: document.getElementById('signin-modal'), 
    closeBtn: document.getElementById('close-signin-btn') 
  },
};

let state = { 
  chats: [], 
  anonymousChats: [], 
  activeId: null, 
  editingMessage: null, 
  modalContext: {}, 
  settings: { 
    model: 'openai', 
    font: 'inter', 
    fontWeight: '400', 
    proModelsEnabled: false 
  }, 
  currentUser: null 
};

let currentController = null;
let isStreaming = false;
let isScrolledUp = false;
let isGeneratingTitle = false;
let attachedImageData = null;

function updateSendButtonState() {
    const userInputEmpty = elements.userInput.value.trim() === '';
    if (isStreaming) {
        elements.sendBtn.disabled = false;
    } else {
        elements.sendBtn.disabled = isGeneratingTitle;
    }
}

const createChat = (title = 'New Chat') => ({ id: Date.now().toString(), title, messages: [], model: state.settings.model });

const saveState = () => {
    const stateToSave = {
        settings: state.settings,
        anonymousChats: state.anonymousChats,
        activeId: state.activeId
    };
    localStorage.setItem('fronixState', JSON.stringify(stateToSave));
    if(state.currentUser) {
        localStorage.setItem('lastActiveChatId', state.activeId);
    }
};

const loadState = () => {
    const d = localStorage.getItem('fronixState');
    if (d) {
        const p = JSON.parse(d);
        state.settings = { ...state.settings, ...p.settings };
        state.anonymousChats = p.anonymousChats || [];
        state.activeId = p.activeId;
    }
    const lastActiveChatId = localStorage.getItem('lastActiveChatId');
    if (lastActiveChatId && state.currentUser) {
        state.activeId = lastActiveChatId;
    }
    if (localStorage.getItem('authToken')) {
        loadDataFromServer();
    } else {
        if (state.anonymousChats.length > 0 && !state.activeId) {
            state.activeId = state.anonymousChats[0].id;
        }
    }
};

marked.setOptions({
    highlight: function(code, lang) {
        const language = hljs.getLanguage(lang) ? lang : 'plaintext';
        return hljs.highlight(code, { language }).value;
    },
    langPrefix: 'hljs language-'
});

function setActive(id) {
    console.log(`[setActive] Attempting to set active chat to ID: ${id}`);
    if (state.editingMessage) {
        console.log('[setActive] Exiting edit mode before changing chat.');
        exitEditMode();
    }
    state.activeId = id;
    const chats = state.currentUser ? state.chats : state.anonymousChats;
    const chat = chats.find(c => c.id === id);
    if (chat) {
        state.settings.model = chat.model || 'openai';
        console.log(`[setActive] Chat found. Setting model to: ${state.settings.model}`);
    } else {
        state.activeId = null;
        console.log(`[setActive] Chat with ID ${id} not found. Setting activeId to null.`);
    }
    updateModelSelectorDisplay();
    renderModelDropdown();
    console.log(`[setActive] Calling renderSidebar and renderChat for chat ID: ${state.activeId}`);
    renderSidebar();
    renderChat();
    saveState();
    console.log(`[setActive] Active chat set to: ${state.activeId}. State saved.`);
}

function addMessage(role, content, customId = null) {
    const chats = state.currentUser ? state.chats : state.anonymousChats;
    const chat = chats.find(c => c.id === state.activeId);
    if (!chat) return;
    
    if (!chat.messages) {
        chat.messages = [];
    }
    
    const message = { role, content };
    if (customId) {
        message.id = customId;
    }
    chat.messages.push(message);
    console.log('[addMessage] Message added. Chat messages (after push):', JSON.parse(JSON.stringify(chat.messages)));
    renderChat();
    saveState();
    console.log('[addMessage] State saved after adding message. Current chat messages:', JSON.parse(JSON.stringify(chat.messages)));
}

function init() {
    const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(savedTheme);
    
    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
            console.log('User signed in. Session:', session);
            localStorage.setItem('authToken', session.access_token);
            localStorage.setItem('refreshToken', session.refresh_token);
            loadDataFromServer();
            closeAllModals();
        } else if (event === 'SIGNED_OUT') {
            localStorage.removeItem('authToken');
            localStorage.removeItem('refreshToken');
            state.currentUser = null;
            state.chats = [];
            state.activeId = null;
            updateLoginStateUI();
            renderSidebar();
            renderChat();
            console.log('User signed out.');
        }
    });

    const d = localStorage.getItem('fronixState');
    if (d) {
        const p = JSON.parse(d);
        state.settings = { ...state.settings, ...p.settings };
        if (p.settings.apiToken) elements.settingsModal.apiTokenInput.value = p.settings.apiToken;
    }
    
    const existingToken = localStorage.getItem('authToken');
    if (existingToken) {
        console.log('An existing auth token was found on page load. Loading user data.');
        loadDataFromServer();
    } else {
        updateLoginStateUI();
        if (!state.activeId && state.anonymousChats.length === 0) {
            handleNewChat();
        }
    }
    
    applyFont(state.settings.font);
    applyFontWeight(state.settings.fontWeight);
    applyChatBackground(state.settings.chatBackground); // Apply chat background on load
    renderFontOptions();
    renderFontWeightOptions();
    updateProModelsToggleUI();
    
    

    elements.settingsModal.proModelsToggle.addEventListener('click', () => {
        if (state.currentUser && state.currentUser.plan === 'pro') {
            state.settings.proModelsEnabled = !state.settings.proModelsEnabled;
            updateProModelsToggleUI();
            saveState();
            renderModelDropdown();
        } else {
            alert('You need a pro plan to use pro models. Contact @zshadowultra on Discord for access.');
        }
    });

    

    updateSendButtonState();

    elements.sendBtn.onclick = () => {
        if (isStreaming) {
            if (currentController) currentController.abort();
        } else {
            sendMessage();
        }
    };

    elements.scrollToBottomBtn.onclick = scrollToBottom;

    elements.chatBox.parentElement.addEventListener('scroll', () => {
        const { scrollTop, scrollHeight, clientHeight } = elements.chatBox.parentElement;
        const atBottom = scrollHeight - scrollTop - clientHeight < 50;
        isScrolledUp = !atBottom;

        if (isScrolledUp && isStreaming) {
            elements.scrollToBottomBtn.classList.add('opacity-100');
            elements.scrollToBottomBtn.classList.remove('opacity-0', 'pointer-events-none');
        } else {
            elements.scrollToBottomBtn.classList.remove('opacity-100');
            elements.scrollToBottomBtn.classList.add('opacity-0', 'pointer-events-none');
        }
    });
    
    elements.newChatBtn.addEventListener('click', handleNewChat);
    elements.toggleSidebarBtn.addEventListener('click', toggleSidebar);
    elements.sidebarOverlay.addEventListener('click', toggleSidebar);
    elements.themeToggleBtn.addEventListener('click', toggleTheme);
    elements.settingsBtn.addEventListener('click', () => animateModalOpen(elements.settingsModal.container));
    elements.settingsModal.closeBtn.addEventListener('click', () => animateModalClose(elements.settingsModal.container));
    elements.settingsModal.resetBtn.addEventListener('click', () => {
        applyFont('inter');
        applyFontWeight('400');
        state.settings.proModelsEnabled = false;
        updateProModelsToggleUI();
        saveState();
    });

    elements.renameModal.saveBtn.addEventListener('click', async () => {
        const newTitle = elements.renameModal.input.value.trim();
        if (!newTitle) return;
        const chatId = state.modalContext.chatId;
        const chats = state.currentUser ? state.chats : state.anonymousChats;
        const chat = chats.find(c => c.id === chatId);
        if (chat) {
            chat.title = newTitle;
            renderSidebar();
            saveState();
            if (state.currentUser) {
                try {
                    await fetch(`${API_BASE_URL}/api/chat/${chatId}/rename`, {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                        },
                        body: JSON.stringify({ title: newTitle })
                    });
                } catch (error) {
                    console.error('Failed to rename chat on server:', error);
                    // Optionally revert title change or notify user
                }
            }
        }
        animateModalClose(elements.renameModal.container);
    });
    elements.renameModal.cancelBtn.addEventListener('click', () => animateModalClose(elements.renameModal.container));

    elements.deleteModal.confirmBtn.addEventListener('click', async () => {
        const chatId = state.modalContext.chatId;
        const chats = state.currentUser ? state.chats : state.anonymousChats;
        const index = chats.findIndex(c => c.id === chatId);
        if (index > -1) {
            chats.splice(index, 1);
            if (state.activeId === chatId) {
                setActive(chats.length > 0 ? chats[0].id : null);
            }
            renderSidebar();
            renderChat();
            saveState();
            if (state.currentUser) {
                try {
                    await fetch(`${API_BASE_URL}/api/chat/${chatId}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
                    });
                } catch (error) {
                    console.error('Failed to delete chat on server:', error);
                    // Optionally restore chat or notify user
                }
            }
        }
        animateModalClose(elements.deleteModal.container);
    });
    elements.deleteModal.cancelBtn.addEventListener('click', () => animateModalClose(elements.deleteModal.container));

    elements.signinBtn.addEventListener('click', () => animateModalOpen(elements.signinModal.container));
    elements.signinModal.closeBtn.addEventListener('click', () => animateModalClose(elements.signinModal.container));
    elements.logoutBtn.addEventListener('click', handleLogout);

    document.getElementById('signin-tab-btn').addEventListener('click', () => {
        document.getElementById('signin-view').classList.remove('hidden');
        document.getElementById('signup-view').classList.add('hidden');
        document.getElementById('signin-tab-btn').classList.add('text-accent', 'border-accent');
        document.getElementById('signin-tab-btn').classList.remove('text-light-text-subtle', 'dark:text-dark-text-subtle', 'border-transparent');
        document.getElementById('signup-tab-btn').classList.add('text-light-text-subtle', 'dark:text-dark-text-subtle', 'border-transparent');
        document.getElementById('signup-tab-btn').classList.remove('text-accent', 'border-accent');
    });

    document.getElementById('signup-tab-btn').addEventListener('click', () => {
        document.getElementById('signup-view').classList.remove('hidden');
        document.getElementById('signin-view').classList.add('hidden');
        document.getElementById('signup-tab-btn').classList.add('text-accent', 'border-accent');
        document.getElementById('signup-tab-btn').classList.remove('text-light-text-subtle', 'dark:text-dark-text-subtle', 'border-transparent');
        document.getElementById('signin-tab-btn').classList.add('text-light-text-subtle', 'dark:text-dark-text-subtle', 'border-transparent');
        document.getElementById('signin-tab-btn').classList.remove('text-accent', 'border-accent');
    });

    document.getElementById('signin-email-btn').addEventListener('click', () => {
        const email = document.getElementById('signin-email').value;
        const password = document.getElementById('password-input').value;
        handleSignIn(email, password);
    });

    document.getElementById('signup-email-btn').addEventListener('click', () => {
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        handleSignUp(email, password);
    });

    document.getElementById('signin-google-btn').addEventListener('click', handleGoogleLogin);
    document.getElementById('signup-google-btn').addEventListener('click', handleGoogleLogin);

    document.getElementById('password-toggle-btn').addEventListener('click', (e) => {
        const passwordInput = document.getElementById('password-input');
        const eyeOpen = document.getElementById('eye-open-icon');
        const eyeClosed = document.getElementById('eye-closed-icon');
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            eyeOpen.classList.add('hidden');
            eyeClosed.classList.remove('hidden');
        } else {
            passwordInput.type = 'password';
            eyeOpen.classList.remove('hidden');
            eyeClosed.classList.add('hidden');
        }
    });

    elements.userInput.addEventListener('input', () => {
        elements.userInput.style.height = 'auto';
        elements.userInput.style.height = `${elements.userInput.scrollHeight}px`;
        updateSendButtonState();
        
        const text = elements.userInput.value;
        if (text.startsWith('/')) {
            elements.autocompleteSuggestions.classList.remove('hidden');
        } else {
            elements.autocompleteSuggestions.classList.add('hidden');
        }
    });

    elements.userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    elements.studyCommandBtn.addEventListener('click', () => {
        elements.userInput.value = '/study ';
        elements.autocompleteSuggestions.classList.add('hidden');
        elements.userInput.focus();
    });

    elements.cancelEditBtn.addEventListener('click', exitEditMode);

    elements.modelSelector.addEventListener('click', () => {
        const dropdown = elements.modelDropdown;
        if (dropdown.style.display === 'block') {
            dropdown.style.display = 'none';
        } else {
            renderModelDropdown();
            dropdown.style.display = 'block';
        }
    });

    document.addEventListener('click', (e) => {
        if (!elements.modelSelector.contains(e.target) && !elements.modelDropdown.contains(e.target)) {
            elements.modelDropdown.style.display = 'none';
        }
        if (!elements.profileBtn.contains(e.target) && !elements.profileDropdown.contains(e.target)) {
            elements.profileDropdown.classList.add('hidden');
        }
    });

    elements.profileBtn.addEventListener('click', () => {
        elements.profileDropdown.classList.toggle('hidden');
    });
    
    document.getElementById('attach-btn').addEventListener('click', () => {
        document.getElementById('image-upload').click();
    });

    document.getElementById('image-upload').addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                attachedImageData = { file, dataUrl: e.target.result };
                const imagePreviewContainer = document.getElementById('image-preview-container');
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
                    attachedImageData = null;
                    document.getElementById('image-upload').value = null;
                    imagePreviewContainer.innerHTML = '';
                    imagePreviewContainer.classList.add('hidden');
                };
            };
            reader.readAsDataURL(file);
        }
    });
}



document.addEventListener('DOMContentLoaded', init);
