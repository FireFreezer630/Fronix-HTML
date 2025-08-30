// js/utils.js
// Provides common utility functions used across the application.
window.App = window.App || {};
App.isTokenExpired = function(token) {
        if (!token) return true;
        
        try {
            // Parse JWT token to check expiration
            const payload = JSON.parse(atob(token.split('.')[1]));
            const currentTime = Math.floor(Date.now() / 1000);
            
            // Check if token is expired (with 30 second buffer)
            return payload.exp && (payload.exp - 30) < currentTime;
        } catch (error) {
            console.warn("Invalid token format:", error);
            return true; // Consider invalid tokens as expired
        }
    }
    
    App.validateAndRefreshToken = async function() {
        let token = localStorage.getItem('authToken');
        const refreshToken = localStorage.getItem('refreshToken');

        if (!token) {
            return null;
        }

        if (App.isTokenExpired(token)) {
            console.log("Access token expired. Attempting to refresh...");
            if (!refreshToken) {
                console.log("No refresh token available. Logging out.");
                localStorage.removeItem('authToken');
                App.state.currentUser = null;
                App.updateLoginStateUI();
                return null;
            }

            try {
                const response = await fetch(`${App.API_BASE_URL}/api/auth/refresh`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refreshToken })
                });

                if (!response.ok) {
                    throw new Error('Failed to refresh token');
                }

                const { session } = await response.json();
                localStorage.setItem('authToken', session.access_token);
                localStorage.setItem('refreshToken', session.refresh_token);
                token = session.access_token;
                console.log("Token refreshed successfully.");
            } catch (error) {
                console.error("Failed to refresh token:", error);
                localStorage.removeItem('authToken');
                localStorage.removeItem('refreshToken');
                App.state.currentUser = null;
                App.updateLoginStateUI();
                return null;
            }
        }
        
        return token;
    }
    
    // --- CORRECTED Sign In Function ---
App.handleSignIn = async function(email, password, retryCount = 0) {
    if (!email || !password) {
        App.openAlertModal("Validation Error", "Please enter both your email and password.");
        return;
    }
    const maxRetries = 2;
    const signinBtn = App.elements.signinEmailBtn;
    const buttonText = signinBtn.querySelector('.button-text');
    const spinner = signinBtn.querySelector('svg');

    signinBtn.disabled = true;
    buttonText.classList.add('hidden');
    spinner.classList.remove('hidden');

    try {
        // This function CORRECTLY calls your backend, not the client library.
        const response = await fetch(`${App.API_BASE_URL}/api/auth/signin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Unknown sign-in error');
        }
        // The onAuthStateChange listener will detect the login and handle the rest.
        // We manually set the token to speed up the process.
        localStorage.setItem('authToken', data.session.access_token);
        localStorage.setItem('refreshToken', data.session.refresh_token);
        App.loadDataFromServer();
        App.closeAllModals();
        App.openAlertModal('Success', 'You have successfully signed in.');
    } catch (error) {
        console.error("Sign-in failed:", error);
        // Retry logic for network/fetch errors
        if (retryCount < maxRetries && (error.message.includes('fetch failed') || error.message.includes('network'))) {
            console.log(`Retrying sign-in attempt ${retryCount + 1}/${maxRetries + 1}...`);
            setTimeout(() => {
                App.handleSignIn(email, password, retryCount + 1);
            }, 1000 * (retryCount + 1)); // Exponential backoff: 1s, 2s
        } else {
            App.openAlertModal('Sign-in Error', error.message);
        }
    } finally {
        signinBtn.disabled = false;
        buttonText.classList.remove('hidden');
        spinner.classList.add('hidden');
    }
}

App.retryWithBackoff = async function(fn, maxRetries = 3, baseDelay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            const isLastAttempt = attempt === maxRetries;
            const isNetworkError = error.message.includes('fetch') || error.message.includes('network') || error.message.includes('Failed to fetch');
            const isServerError = error.status >= 500;
            const shouldRetry = !isLastAttempt && (isNetworkError || isServerError);
            
            if (shouldRetry) {
                const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
                console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`, error.message);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                throw error;
            }
        }
    }
}

App.getDeviceType = function() {
        const userAgent = navigator.userAgent;
        if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|rim)|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(userAgent) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|az(w|x)|be(ck|qr|dc)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(is|eo)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(ad|in|u2)|er(ic|k0)|esl |ez([4-7]0|os|wa|ze)|fetc|fly(\-| _)|g1 u|g560|gene|gf\-5|g\-mo|go(\.(w|od))|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ts)|ice( ss|sh)|iq(mo|yr)|ir(ad|ie|v )|kodo|ko(pf|pn)|kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|mc)|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|ad|ll|tx|up|vl|wi)|mt(50|p1|v )|mwbp|nc(ar|et|wi)|ne(on|vl|im)|ng(01|02|ui|vm|ro)|nl(ec|xp|mw)|ol(o|ad)|owg1|ox(ad|ev)|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(78|12|21|32|60|\-[2-7]|i\-)|'s(at|ti|un)|rd(fr|lo)|re(ad|ie|zg)|rkt |rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|pn|si)|sch(01|mc)|sec(47|65)|send|serg|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|20)|t7(70|50)|tap(a|g)|'t(ap|ym)|tdg\-|tel(i|m)|tfw |tg(wt|lk)|ti(\-|v|ar)|tk(ad|pt)|tp(av|ow)|tr(ig|sy)|ts(70|m\-|p[ad])|twg1|u c9|u eg|u h(op|pk)|ul(ad|eg|em)|up(\.(b|ul1))|v(?:rgv|us)|w(?:a(?:tud|cd)|es(?:c[4-6]|s[89])|v(?:g[02]|sm)|bl)|wi(mp|ty)|wk(at|if)|xant|xtg1|z(?:pmo|qz)|zymo/i.test(userAgent.substr(0, 4))) {
            return "mobile";
        } else {
            return "desktop";
        }
    }
App.loadAvailableModels = async function() {
        try {
            const response = await fetch(`${App.API_BASE_URL}/api/ai/models`);
            if (!response.ok) {
                throw new Error('Failed to fetch available models');
            }
            App.MODELS = await response.json();
            App.renderModelDropdown();
        } catch (error) {
            console.error('Error loading available models:', error);
            // Fallback to a default model list if the API fails
            App.MODELS = {
                'openai-large': { name: 'OpenAI GPT-4.1', type: 'text' }
            };
            App.renderModelDropdown();
        }
    }

    // New function to update the state of the send button
    App.updateSendButtonState = function() {
        const userInputEmpty = App.elements.userInput.value.trim() === '';
        if (App.isStreaming) {
            App.elements.sendBtn.disabled = false; // Always enabled as a stop button during streaming
        } else {
            // Button is disabled if input is empty OR title is generating.
            // If AI response just finished, and input is empty, the button should still be enabled.
            App.elements.sendBtn.disabled = App.isGeneratingTitle; // Only disabled if title is generating
        }
    }

    marked.setOptions({
        highlight: function(code, lang) {
            const language = hljs.getLanguage(lang) ? lang : 'plaintext';
            return hljs.highlight(code, { language }).value;
        },
        langPrefix: 'hljs language-'
    });

    App.renderContent = function(text) { if (!text) return ''; let html = marked.parse(text, { breaks: true, gfm: true }); return html; }
    App.renderStreamingContent = function(text) { if (!text) return ''; let html = marked.parseInline(text, { breaks: true, gfm: true }); return html; }

    App.renderSidebar = function() {
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        App.elements.chatList.innerHTML = '';
        state.chats.forEach(chat => {
            const isActive = chat.id === state.activeId;
            let li = document.createElement('li');
            li.className = `group w-full flex items-center justify-between px-4 py-2 rounded-lg cursor-pointer transition-colors relative ${isActive ? 'bg-light-border-active dark:bg-dark-border-active' : 'hover:bg-light-border-hover dark:hover:bg-dark-border-hover'}`;
            
            let actionsHtml;
            if (isTouchDevice) {
                actionsHtml = `<button class="chat-actions-btn p-1 text-light-text-subtle hover:text-light-text dark:hover:text-dark-text rounded"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg></button>`;
            } else {
                actionsHtml = `<div class="sidebar-item-actions flex-shrink-0 flex items-center gap-1">
                    <button class="rename-btn p-1 text-light-text-subtle hover:text-light-text dark:hover:text-dark-text rounded"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg></button>
                    <button class="delete-btn p-1 text-light-text-subtle hover:text-red-500 rounded"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
                </div>`;
            }

            li.innerHTML = `<span class="truncate text-sm font-medium">${chat.title}</span>${actionsHtml}`;
            
            li.addEventListener('click', () => {
                App.setActive(chat.id);
                if (window.innerWidth < 768) {
                    toggleSidebar();
                }
            });

            const renameBtn = li.querySelector('.rename-btn');
            if (renameBtn) {
                renameBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    App.openRenameModal(chat.id);
                });
            }

            const deleteBtn = li.querySelector('.delete-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    App.openDeleteModal(chat.id);
                });
            }

            const actionsBtn = li.querySelector('.chat-actions-btn');
            if (actionsBtn) {
                actionsBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    App.openChatActionsDropdown(chat.id, e.currentTarget);
                });
            }
            App.elements.chatList.appendChild(li);
        });
    }

    App.setActive = function(id) {
        console.log(`[App.setActive] Attempting to set active chat to ID: ${id}`);
        if (state.editingMessage) {
            console.log('[App.setActive] Exiting edit mode before changing chat.');
            App.exitEditMode();
        }
        state.activeId = id;
        const chat = state.chats.find(c => c.id === id);
        if (chat) {
            state.settings.model = chat.model || 'openai';
            console.log(`[App.setActive] Chat found. Setting model to: ${state.settings.model}`);
        } else {
            state.activeId = null;
            console.log(`[App.setActive] Chat with ID ${id} not found. Setting activeId to null.`);
        }
        App.updateModelSelectorDisplay();
        App.renderModelDropdown();
        console.log(`[App.setActive] Calling App.renderSidebar and App.renderChat for chat ID: ${state.activeId}`);
        App.renderSidebar();
        App.renderChat(); // This will now use the messages already loaded in state.chats
        App.saveState();
        console.log(`[App.setActive] Active chat set to: ${state.activeId}. State saved.`);
    }
    
// Place this function where your current App.addMessage is.
App.addMessage = function(role, content, customId = null) {
    const chat = state.chats.find(c => c.id === state.activeId);
    if (!chat) return;
    
    // Initialize messages array if it doesn't exist
    if (!chat.messages) {
        chat.messages = [];
    }
    
    const message = { role, content };
    if (customId) {
        message.id = customId; // Add the custom ID if provided
    }
    chat.messages.push(message);
    console.log('[App.addMessage] Message added. Chat messages (after push):', JSON.parse(JSON.stringify(chat.messages))); // Deep copy for logging
    App.renderChat(); // RenderChat will now correctly use the ID
    App.saveState();
    console.log('[App.addMessage] State saved after adding message. Current chat messages:', JSON.parse(JSON.stringify(chat.messages))); // Deep copy for logging
}

App.scrollToBottom = function() {
    App.elements.chatBox.parentElement.scrollTo({
        top: App.elements.chatBox.parentElement.scrollHeight,
        behavior: 'smooth'
    });
}

App.enterEditMode = function(chatId, messageIndex) {
    const chat = App.state.chats.find(c => c.id === chatId);
    if (!chat) return;

    const message = chat.messages[messageIndex];
    if (!message) return;
    
    // Clear any previous image preview first
    const imagePreviewContainer = document.getElementById('image-preview-container');
    imagePreviewContainer.innerHTML = '';
    imagePreviewContainer.classList.add('hidden');
    App.attachedImageData = null;
    document.getElementById('image-upload').value = null;

    // Check if the message content is an array (multimodal) or a string
    if (Array.isArray(message.content)) {
        const textPart = message.content.find(p => p.type === 'text');
        const imagePart = message.content.find(p => p.type === 'image_url');

        // Set the text input
        App.elements.userInput.value = textPart ? textPart.text : '';

        // If an image part exists, display it and set the App.state
        if (imagePart && imagePart.image_url.url) {
            App.attachedImageData = { dataUrl: imagePart.image_url.url }; // Set the App.state for resending
            
            // Re-use the preview logic to display the image
            imagePreviewContainer.innerHTML = `
                <div class="relative inline-block">
                    <img src="${imagePart.image_url.url}" class="h-20 w-20 object-cover rounded-lg">
                    <button id="remove-image-btn" class="absolute top-0 right-0 -mt-2 -mr-2 bg-red-500 text-white rounded-full p-1 leading-none">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
            `;
            imagePreviewContainer.classList.remove('hidden');

            document.getElementById('remove-image-btn').onclick = () => {
                App.attachedImageData = null;
                document.getElementById('image-upload').value = null;
                imagePreviewContainer.innerHTML = '';
                imagePreviewContainer.classList.add('hidden');
            };
        }
    } else {
        // Handle legacy/text-only messages
        App.elements.userInput.value = message.content;
    }

    // --- The rest of the function remains the same ---
    App.state.editingMessage = { chatId, messageIndex };
    App.elements.userInput.focus();
    App.elements.sendIcon.classList.add('hidden');
    App.elements.saveIcon.classList.remove('hidden');
    App.elements.editIndicator.classList.remove('hidden');
}

// Expose functions and variables to the global App scope
App.copyMessage = function(text, btn) { navigator.clipboard.writeText(text).then(() => { const originalIcon = btn.innerHTML; btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`; setTimeout(() => btn.innerHTML = originalIcon, 1500); }); };
App.isTokenExpired = App.isTokenExpired;
App.retryWithBackoff = App.retryWithBackoff;
