function updateProfileUI() {
    if (state.currentUser) {
        elements.profileUsername.textContent = state.currentUser.username || 'User';
        elements.profileEmail.textContent = state.currentUser.email;
        elements.profilePlan.textContent = state.currentUser.plan || 'basic';
        elements.profileBtnUsername.textContent = state.currentUser.username || 'User';
    }
}

function updateLoginStateUI() {
    if (state.currentUser) {
        elements.signinBtn.classList.add('hidden');
        elements.profileSection.classList.remove('hidden');
        elements.logoutBtn.classList.remove('hidden');
    } else {
        elements.signinBtn.classList.remove('hidden');
        elements.profileSection.classList.add('hidden');
        elements.logoutBtn.classList.add('hidden');
    }
}

function renderContent(text) { if (!text) return ''; let html = marked.parse(text, { breaks: true, gfm: true }); return html; }
function renderStreamingContent(text) { if (!text) return ''; let html = marked.parseInline(text, { breaks: true, gfm: true }); return html; }

function renderSidebar() {
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    elements.chatList.innerHTML = '';
    const chatsToRender = state.currentUser ? state.chats : state.anonymousChats;
    chatsToRender.forEach(chat => {
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
            setActive(chat.id);
            if (window.innerWidth < 768) {
                toggleSidebar();
            }
        });

        const renameBtn = li.querySelector('.rename-btn');
        if (renameBtn) {
            renameBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openRenameModal(chat.id);
            });
        }

        const deleteBtn = li.querySelector('.delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openDeleteModal(chat.id);
            });
        }

        const actionsBtn = li.querySelector('.chat-actions-btn');
        if (actionsBtn) {
            actionsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openChatActionsDropdown(chat.id, e.currentTarget);
            });
        }
        elements.chatList.appendChild(li);
    });
}

function renderChat() {
    const chats = state.currentUser ? state.chats : state.anonymousChats;
    const chat = chats.find(c => c.id === state.activeId);
    elements.chatBox.innerHTML = '';

    if (!chat) {
        elements.chatBox.innerHTML = `<div class="text-center text-light-text-subtle dark:text-dark-text-subtle py-8"><h2 class="text-3xl font-bold mb-2">Fronix</h2><p>Start a new message to begin.</p></div>`;
        return;
    }
    
    if (!chat.messages || chat.messages.length === 0) {
        elements.chatBox.innerHTML = `<div class="text-center text-light-text-subtle dark:text-dark-text-subtle py-8"><h2 class="text-3xl font-bold mb-2">Fronix</h2><p>Start a new message to begin.</p></div>`;
        return;
    }

    chat.messages.forEach((msg, index) => {
        const wrapper = document.createElement('div');
        const msgDiv = document.createElement('div');
        
        if (msg.id) {
            msgDiv.id = msg.id;
        }

        const isUser = msg.role === 'user';

        if (isUser) {
            msgDiv.className = 'ml-auto w-fit max-w-[90%]';
            
            let content = msg.content;
            if (typeof content === 'string' && (content.startsWith('[') || content.startsWith('{'))) {
                try {
                    content = JSON.parse(content);
                } catch (e) {
                    content = msg.content;
                }
            }
            
            if (Array.isArray(content)) {
                const contentWrapper = document.createElement('div');
                contentWrapper.className = 'p-4 rounded-2xl bg-light-user-bubble dark:bg-dark-user-bubble flex flex-col gap-3';
                content.forEach(part => {
                    if (part.type === 'text' && part.text) {
                        const p = document.createElement('p');
                        p.className = 'whitespace-pre-wrap';
                        p.textContent = part.text;
                        contentWrapper.appendChild(p);
                    } else if (part.type === 'image_url') {
                        const img = document.createElement('img');
                        img.src = part.image_url.url;
                        img.className = 'w-48 h-auto rounded-lg cursor-pointer';
                        img.onclick = () => window.open(part.image_url.url, '_blank');
                        contentWrapper.appendChild(img);
                    }
                });
                msgDiv.appendChild(contentWrapper);
            } else {
                msgDiv.classList.add('p-4', 'rounded-2xl', 'bg-light-user-bubble', 'dark:bg-dark-user-bubble');
                const p = document.createElement('p');
                p.className = 'whitespace-pre-wrap';
                p.textContent = content;
                msgDiv.appendChild(p);
            }
        } else {
            msgDiv.className = 'prose prose-sm md:prose-base max-w-none text-light-text dark:text-dark-text';
            if (msg.content === '...') {
                msgDiv.innerHTML = `<div class="flex items-center space-x-1.5">${Array(3).fill().map(() => `<div class="loader-dot w-2 h-2 bg-gray-400 rounded-full"></div>`).join('')}</div>`;
            } else {
                msgDiv.innerHTML = renderContent(msg.content);
            }
            renderMathInElement(msgDiv, {
                delimiters: [{ left: "[", right: "]", display: true }, { left: "$$", right: "$$", display: true }, { left: "$", right: "$", display: false }]
            });
        }

        const actionsDiv = document.createElement('div');
        actionsDiv.className = `flex gap-2 mt-2 items-center text-light-text-subtle dark:text-dark-text-subtle ${isUser ? 'justify-end' : 'justify-start'}`;
        const copyBtn = document.createElement('button');
        copyBtn.className = 'p-1 hover:text-light-text dark:hover:text-dark-text rounded-md transition-colors';
        copyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
        copyBtn.onclick = () => copyMessage(msg.content, copyBtn);
        actionsDiv.appendChild(copyBtn);

        if (isUser) {
            const editBtn = document.createElement('button');
            editBtn.className = 'p-1 hover:text-light-text dark:hover:text-dark-text rounded-md transition-colors';
            editBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>`;
            editBtn.onclick = () => enterEditMode(chat.id, index);
            actionsDiv.appendChild(editBtn);
        }

        wrapper.appendChild(msgDiv);
        wrapper.appendChild(actionsDiv);
        elements.chatBox.appendChild(wrapper);
    });
    elements.chatBox.parentElement.scrollTop = elements.chatBox.parentElement.scrollHeight;
}

function scrollToBottom() {
    elements.chatBox.parentElement.scrollTo({
        top: elements.chatBox.parentElement.scrollHeight,
        behavior: 'smooth'
    });
}

function copyMessage(text, btn) { navigator.clipboard.writeText(text).then(() => { const originalIcon = btn.innerHTML; btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`; setTimeout(() => btn.innerHTML = originalIcon, 1500); }); }

function enterEditMode(chatId, messageIndex) {
    const chats = state.currentUser ? state.chats : state.anonymousChats;
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;

    const message = chat.messages[messageIndex];
    if (!message) return;
    
    const imagePreviewContainer = document.getElementById('image-preview-container');
    imagePreviewContainer.innerHTML = '';
    imagePreviewContainer.classList.add('hidden');
    attachedImageData = null;
    document.getElementById('image-upload').value = null;

    if (Array.isArray(message.content)) {
        const textPart = message.content.find(p => p.type === 'text');
        const imagePart = message.content.find(p => p.type === 'image_url');

        elements.userInput.value = textPart ? textPart.text : '';

        if (imagePart && imagePart.image_url.url) {
            attachedImageData = { dataUrl: imagePart.image_url.url };
            
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
                attachedImageData = null;
                document.getElementById('image-upload').value = null;
                imagePreviewContainer.innerHTML = '';
                imagePreviewContainer.classList.add('hidden');
            };
        }
    } else {
        elements.userInput.value = message.content;
    }

    state.editingMessage = { chatId, messageIndex, messageId: message.id };
    elements.userInput.focus();
    elements.sendIcon.classList.add('hidden');
    elements.saveIcon.classList.remove('hidden');
    elements.editIndicator.classList.remove('hidden');
}

function exitEditMode() {
    state.editingMessage = null;
    elements.userInput.value = '';
    elements.sendIcon.classList.remove('hidden');
    elements.saveIcon.classList.add('hidden');
    elements.editIndicator.classList.add('hidden');
    elements.editIndicator.classList.remove('flex');

    attachedImageData = null;
    document.getElementById('image-upload').value = null;
    const imagePreviewContainer = document.getElementById('image-preview-container');
    imagePreviewContainer.innerHTML = '';
    imagePreviewContainer.classList.add('hidden');

    renderChat();
}

function toggleSidebar() { const isMobile = window.innerWidth < 768; elements.sidebar.classList.toggle(isMobile ? 'open' : 'closed'); if (isMobile) elements.sidebarOverlay.classList.toggle('open'); }

function animateModalOpen(modalContainer) {
    modalContainer.style.display = 'flex';
    const modalContent = modalContainer.querySelector('.modal-content');
    anime({ targets: modalContent, scale: [0.92, 1], opacity: [0, 1], duration: 250, easing: 'easeOutCubic' });
}

function animateModalClose(modalContainer, onComplete = () => {}) {
    const modalContent = modalContainer.querySelector('.modal-content');
    anime({ targets: modalContent, scale: 0.95, opacity: 0, duration: 100, easing: 'easeInCubic', complete: () => { modalContainer.style.display = 'none'; onComplete(); } });
}

function openRenameModal(chatId) { state.modalContext.chatId = chatId; const chats = state.currentUser ? state.chats : state.anonymousChats; const chat = chats.find(c=>c.id === chatId); if(!chat) return; elements.renameModal.input.value = chat.title; animateModalOpen(elements.renameModal.container); }

function openDeleteModal(chatId) { state.modalContext.chatId = chatId; const chats = state.currentUser ? state.chats : state.anonymousChats; const chat = chats.find(c=>c.id === chatId); if(!chat) return; elements.deleteModal.message.textContent = `Are you sure you want to delete "${chat.title}"?`; animateModalOpen(elements.deleteModal.container); }

function closeAllModals() { 
    document.querySelectorAll('.modal-container').forEach(m => { if (m.style.display === 'flex') animateModalClose(m); }); 
    elements.chatActionsDropdown.style.display = 'none';
}

function openChatActionsDropdown(chatId, target) {
    const rect = target.getBoundingClientRect();
    const dropdown = elements.chatActionsDropdown;
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
        openRenameModal(chatId);
        dropdown.style.display = 'none';
    };

    dropdown.querySelector('.delete-action').onclick = () => {
        openDeleteModal(chatId);
        dropdown.style.display = 'none';
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
}

function applyFont(font) { Object.keys(FONTS).forEach(f => elements.body.classList.remove(`font-${f}`)); elements.body.classList.add(`font-${font}`); state.settings.font = font; saveState(); renderFontOptions(); }

function applyFontWeight(weight) { elements.body.style.fontWeight = weight; state.settings.fontWeight = weight; saveState(); renderFontWeightOptions(); }

function renderFontOptions() { const currentFont = state.settings.font; elements.settingsModal.fontOptions.innerHTML = '<div><label class="text-sm font-medium text-light-text-subtle dark:text-dark-text-subtle">Font Family</label></div>'; Object.entries(FONTS).forEach(([key, name]) => { const btn = document.createElement('button'); btn.className = `w-full text-left px-3 py-2 rounded-md transition-colors text-sm ${currentFont === key ? 'bg-accent text-white font-semibold' : 'hover:bg-light-border-hover dark:hover:bg-dark-border-hover'}`; btn.textContent = name; btn.onclick = () => { applyFont(key); }; elements.settingsModal.fontOptions.appendChild(btn); }); }

function renderFontWeightOptions() { const currentWeight = state.settings.fontWeight; elements.settingsModal.fontWeightOptions.innerHTML = `<div class="flex justify-between items-center"><label class="text-sm font-medium text-light-text-subtle dark:text-dark-text-subtle">Font Weight</label><span id="font-weight-label" class="text-sm text-light-text-subtle dark:text-dark-text-subtle">${FONT_WEIGHTS[currentWeight]}</span></div><input type="range" id="font-weight-slider" class="w-full h-2 bg-light-border dark:bg-dark-border rounded-lg appearance-none cursor-pointer accent-accent" min="0" max="${Object.keys(FONT_WEIGHTS).length - 1}" step="1" value="${Object.keys(FONT_WEIGHTS).indexOf(currentWeight)}">`; document.getElementById('font-weight-slider').addEventListener('input', (e) => { const weight = Object.keys(FONT_WEIGHTS)[e.target.value]; applyFontWeight(weight); document.getElementById('font-weight-label').textContent = FONT_WEIGHTS[weight]; }); }

function updateModelSelectorDisplay() {
    const currentModel = state.settings.model || 'openai';
    const modelData = MODELS[currentModel] || { name: 'Unknown Model', type: 'text' };
    const displayName = modelData.name;
    const modelType = modelData.type === 'image' ? ' 🎨' : ' 💬';
    elements.chatTitle.textContent = displayName + modelType;
    console.log('🔄 Updated model selector display to:', displayName, `(${modelData.type})`);
}

function updateProModelsToggleUI() {
    const enabled = state.settings.proModelsEnabled;
    const toggle = elements.settingsModal.proModelsToggle;
    if (!toggle) return;
    const knob = toggle.querySelector('span');

    toggle.setAttribute('aria-checked', enabled);
    toggle.classList.toggle('bg-accent', enabled);
    toggle.classList.toggle('bg-gray-200', !enabled);
    toggle.classList.toggle('dark:bg-gray-700', !enabled);
    knob.classList.toggle('translate-x-5', enabled);
    knob.classList.toggle('translate-x-0', !enabled);
}

function renderModelDropdown() {
    elements.modelDropdown.innerHTML = '';
    
    const isProUser = state.currentUser && state.currentUser.plan === 'pro';
    const proModelsEnabled = state.settings.proModelsEnabled;
    const publicModels = ['openai', 'elixposearch', 'gemini'];

    let modelsToShow = [];
    if (state.currentUser) {
        modelsToShow = Object.entries(MODELS);
    } else {
        modelsToShow = Object.entries(MODELS).filter(([key, data]) => publicModels.includes(key));
    }

    const textModels = modelsToShow.filter(([_, data]) => data.type === 'text');
    const imageModels = modelsToShow.filter(([_, data]) => data.type === 'image');
    
    const textHeader = document.createElement('div');
    textHeader.className = 'px-3 py-2 text-xs font-medium text-light-text-subtle dark:text-dark-text-subtle uppercase tracking-wider border-b border-light-border dark:border-dark-border';
    textHeader.textContent = '💬 Text Models';
    elements.modelDropdown.appendChild(textHeader);
    
    textModels.forEach(([key, data]) => {
        const btn = document.createElement('button');
        const isSelected = key === state.settings.model;
        const isPro = data.pro;
        const isAvailable = !isPro || (isProUser && proModelsEnabled);

        let classes = 'w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between';
        if (isSelected) {
            classes += ' bg-accent text-white';
        } else if (isAvailable) {
            classes += ' hover:bg-light-border-hover dark:hover:bg-dark-border-hover';
        } else {
            classes += ' opacity-50 cursor-not-allowed';
        }
        btn.className = classes;

        let proBadge = '';
        if (isPro) {
            proBadge = `<i data-lucide="crown" class="w-4 h-4 text-blue-500"></i>`;
        }

        btn.innerHTML = `<span>${data.name}</span> ${proBadge}`;
        
        if (isAvailable) {
            btn.onclick = () => {
                state.settings.model = key;
                const activeChat = state.currentUser ? state.chats.find(c => c.id === state.activeId) : state.anonymousChats.find(c => c.id === state.activeId);
                if (activeChat) activeChat.model = key;
                saveState();
                updateModelSelectorDisplay();
                renderModelDropdown();
                elements.modelDropdown.style.display = 'none';
                lucide.createIcons();
            };
        } else {
            btn.disabled = true;
        }

        elements.modelDropdown.appendChild(btn);
    });
    
    if (imageModels.length > 0) {
        const imgHeader = document.createElement('div');
        imgHeader.className = 'px-3 py-2 text-xs font-medium text-light-text-subtle dark:text-dark-text-subtle uppercase tracking-wider border-b border-light-border dark:border-dark-border mt-2';
        imgHeader.textContent = '🎨 Image Generation';
        elements.modelDropdown.appendChild(imgHeader);
        
        imageModels.forEach(([key, data]) => {
            const btn = document.createElement('button');
            const isSelected = key === state.settings.model;
            const isPro = data.pro;
            const isAvailable = !isPro || (isProUser && proModelsEnabled);

            let classes = 'w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between';
            if (isSelected) {
                classes += ' bg-accent text-white';
            } else if (isAvailable) {
                classes += ' hover:bg-light-border-hover dark:hover:bg-dark-border-hover';
            } else {
                classes += ' opacity-50 cursor-not-allowed';
            }
            btn.className = classes;

            let proBadge = '';
            if (isPro) {
                proBadge = `<i data-lucide="crown" class="w-4 h-4 text-blue-500"></i>`;
            }

            btn.innerHTML = `<span>${data.name}</span> ${proBadge}`;

            if (isAvailable) {
                btn.onclick = () => {
                    state.settings.model = key;
                    const activeChat = state.currentUser ? state.chats.find(c => c.id === state.activeId) : state.anonymousChats.find(c => c.id === state.activeId);
                    if (activeChat) activeChat.model = key;
                    saveState();
                    updateModelSelectorDisplay();
                    renderModelDropdown();
                    elements.modelDropdown.style.display = 'none';
                    console.log('🖼️ Selected image model:', key);
                    lucide.createIcons();
                };
            } else {
                btn.disabled = true;
            }
            elements.modelDropdown.appendChild(btn);
        });
    }
    lucide.createIcons();
}

function applyTheme(theme) {
    const isDark = theme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    document.getElementById('theme-icon-light').classList.toggle('hidden', isDark);
    document.getElementById('theme-icon-dark').classList.toggle('hidden', !isDark);
    localStorage.setItem('theme', theme);
}

function toggleTheme(event) {
    const isDark = document.documentElement.classList.contains('dark');
    const newTheme = isDark ? 'light' : 'dark';

    if (!document.startViewTransition) {
        applyTheme(newTheme);
        return;
    }
    
    const btn = elements.themeToggleBtn;
    const rect = btn.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    document.documentElement.style.setProperty('--cx', cx + 'px');
    document.documentElement.style.setProperty('--cy', cy + 'px');

    document.startViewTransition(() => {
        applyTheme(newTheme);
    });
}
