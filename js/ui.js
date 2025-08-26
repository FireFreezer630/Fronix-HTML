// js/ui.js
// Handles rendering and updating all UI components.
window.App = window.App || {};

App.scrollToBottom = function() {
    const chatBoxParent = App.elements.chatBox.parentElement;
    chatBoxParent.scrollTop = chatBoxParent.scrollHeight;
    App.isScrolledUp = false; // Reset scroll state
    App.elements.scrollToBottomBtn.classList.remove('opacity-100');
    App.elements.scrollToBottomBtn.classList.add('opacity-0', 'pointer-events-none');
}

App.renderContent = function(content) {
    return marked.parse(content);
}

App.renderStreamingContent = function(chunk) {
    App.elements.chatBox.innerHTML += chunk; // Append chunk directly
    if (!App.isScrolledUp) {
        App.scrollToBottom();
    }
}

// Marked.js configuration
marked.setOptions({
    breaks: true, // Allow GFM line breaks
    highlight: function(code, lang) {
        const language = hljs.getLanguage(lang) ? lang : 'plaintext';
        return hljs.highlight(code, { language }).value;
    }
});

App.updateLoginStateUI = async function() {
    if (App.state.currentUser) {
        App.elements.signinBtn.classList.add('hidden');
        App.elements.profileSection.classList.remove('hidden');
        App.elements.logoutBtn.classList.remove('hidden');
        // Fetch user metadata for profile display
        const { data, error } = await App.supabaseClient.from('users').select('*').eq('id', App.state.currentUser.id).single();
        if (error) {
            console.error('Error fetching user metadata:', error);
        } else if (data) {
            App.state.currentUser.profile = data;
            App.updateProfileUI(); // Update profile UI with fetched data
        }
    } else {
        App.elements.signinBtn.classList.remove('hidden');
        App.elements.profileSection.classList.add('hidden');
        App.elements.logoutBtn.classList.add('hidden');
        App.updateProfileUI(); // Clear profile UI
    }
}

App.updateProfileUI = function() {
    if (App.state.currentUser && App.state.currentUser.profile) {
        App.elements.profileEmail.textContent = App.state.currentUser.profile.email;
        App.elements.profilePlan.textContent = App.state.currentUser.profile.plan === 'pro' ? 'Pro Plan' : 'Free Plan';
        App.elements.profileAvatar.src = App.state.currentUser.profile.avatar_url || 'https://github.com/shadcn.png'; // Default avatar
        App.elements.profileAvatar.alt = App.state.currentUser.profile.full_name || 'User Avatar';
    } else {
        App.elements.profileEmail.textContent = '';
        App.elements.profilePlan.textContent = '';
        App.elements.profileAvatar.src = 'https://github.com/shadcn.png'; // Default avatar
        App.elements.profileAvatar.alt = 'User Avatar';
    }
}

App.renderSidebar = function() {
    App.elements.chatList.innerHTML = ''; // Clear existing list
    if (App.state.chats.length === 0 && !App.state.currentUser) {
        App.elements.chatList.innerHTML = 
            `<div class="p-4 text-light-text-subtle dark:text-dark-text-subtle text-sm">
                <p>Sign in to save your chats!</p>
            </div>`;
        return;
    }

    const sortedChats = [...App.state.chats].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    sortedChats.forEach(chat => {
        const chatItem = document.createElement('div');
        chatItem.className = `flex items-center justify-between py-2 px-3 text-sm rounded-md cursor-pointer group hover:bg-light-fill-hover dark:hover:bg-dark-fill-hover ${chat.id === App.state.activeId ? 'bg-light-fill-selected dark:bg-dark-fill-selected' : ''}`;
        chatItem.setAttribute('role', 'button');
        chatItem.setAttribute('tabindex', '0');
        chatItem.setAttribute('aria-label', `Select chat ${chat.title}`);
        chatItem.onclick = () => App.setActive(chat.id);
        chatItem.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') App.setActive(chat.id); };

        chatItem.innerHTML = `
            <span class="truncate flex-grow">${chat.title}</span>
            <div class="chat-actions flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button class="p-1 hover:bg-light-fill-hover-bg dark:hover:bg-dark-fill-hover-bg rounded-md" aria-label="Rename chat" data-id="${chat.id}" data-action="rename">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-edit-2"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                </button>
                <button class="p-1 hover:bg-light-fill-hover-bg dark:hover:bg-dark-fill-hover-bg rounded-md" aria-label="Delete chat" data-id="${chat.id}" data-action="delete">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                </button>
            </div>
        `;
        App.elements.chatList.appendChild(chatItem);
    });
}

App.renderChat = function() {
    const chat = App.state.chats.find(c => c.id === App.state.activeId);
    App.elements.chatBox.innerHTML = '';

    // Display welcome message if no active chat or no chats at all
    if (!chat || chat.messages.length === 0) {
        App.elements.chatBox.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-center text-light-text-subtle dark:text-dark-text-subtle">
                <h2 class="text-2xl font-semibold mb-4 text-light-text dark:text-dark-text">Welcome to Fronix!</h2>
                <p class="mb-2">Start a new conversation or select an existing one from the sidebar.</p>
                <p>Type your message below to begin.</p>
            </div>
        `;
        App.elements.chatTitle.textContent = 'New Chat'; // Default title for new chat
        App.elements.chatActionsDropdown.classList.add('hidden'); // Hide actions dropdown
        App.elements.modelSelector.classList.remove('hidden'); // Show model selector
        return;
    }

    App.elements.chatTitle.textContent = chat.title;
    App.elements.chatActionsDropdown.classList.remove('hidden'); // Show actions dropdown for active chat
    App.elements.modelSelector.classList.remove('hidden'); // Show model selector

    chat.messages.forEach(message => {
        const messageElement = document.createElement('div');
        messageElement.className = `flex items-start gap-4 py-4 px-5 ${message.role === 'user' ? 'bg-light-chat-user dark:bg-dark-chat-user' : 'bg-light-chat-ai dark:bg-dark-chat-ai'}`;
        messageElement.innerHTML = `
            <img src="${message.role === 'user' ? App.elements.profileAvatar.src : 'https://github.com/achenzz.png'}" 
                 alt="${message.role === 'user' ? (App.state.currentUser?.profile?.full_name || 'User') : 'AI'}" 
                 class="w-8 h-8 rounded-full object-cover" />
            <div class="flex-1">
                <p class="font-semibold mb-1">${message.role === 'user' ? (App.state.currentUser?.profile?.full_name || 'You') : 'Fronix'}</p>
                <div class="prose dark:prose-invert prose-sm break-words leading-relaxed">
                    ${App.renderContent(message.content)}
                </div>
            </div>
        `;
        App.elements.chatBox.appendChild(messageElement);
    });
    App.scrollToBottom();
}
