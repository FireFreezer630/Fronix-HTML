Refactoring a single, large JavaScript block embedded directly in an HTML file is an excellent step towards improving maintainability, readability, and scalability. The current approach with a single script tag makes debugging and understanding the code's flow very difficult.

Here's a strategy to refactor your `index.html` file, breaking down the JavaScript into several logical files, along with Windows commands to set up the new directory structure and guidance on how to move the code.

## Refactoring Strategy

We'll categorize the existing JavaScript code into several modules based on their responsibilities. To make it easy to refactor without immediately introducing a build system or ES Modules (`import`/`export`), we'll use a global `App` object to expose functions and variables from each file. This maintains a global scope similar to your current setup but with better organization.

**Proposed File Structure:**

```
your-project/
├── index.html
└── js/
    ├── config.js         // API URLs, Supabase keys, system prompts, fonts, etc.
    ├── state.js          // Global state, supabaseClient, save/load state, global flags (isStreaming, etc.)
    ├── elements.js       // References to all DOM elements
    ├── utils.js          // General utility functions (token validation, device type, markdown rendering, copy, scroll)
    ├── ui.js             // Functions related to rendering/updating UI components (sidebar, chat, profile, model selector)
    ├── modals.js         // Functions for opening/closing/managing all modal dialogs
    ├── auth.js           // Authentication logic (signIn, signUp, Google login, token refresh)
    ├── chat.js           // Core chat logic (creating chats, adding messages, sending messages, edit/delete chat actions)
    ├── settings.js       // Theme and font settings management
    └── main.js           // The main entry point, handles initial setup and all event listeners
```

## Step-by-Step Refactoring Guide

### 1. Create New Directories and Files (Windows Commands)

Open your Command Prompt or PowerShell, navigate to your project's root directory (where `index.html` is located), and run these commands:

```cmd
mkdir js
cd js
type nul > config.js
type nul > state.js
type nul > elements.js
type nul > utils.js
type nul > ui.js
type nul > modals.js
type nul > auth.js
type nul > chat.js
type nul > settings.js
type nul > main.js
cd ..
```

### 2. Modify `index.html`

Remove the entire `<script>` block that currently contains all your JavaScript. Replace it with references to the new, modularized JavaScript files. The order is important, as some files depend on others (`elements.js` depends on `index.html` elements existing, `ui.js` might depend on `state.js` and `elements.js`, `main.js` depends on everything else).

**Find this block:**

```html
  <script>
    const API_BASE_URL = 'http://localhost:3001';
    // ... all your JavaScript ...
  </script>
</body>
</html>
```

**Replace it with this:**

```html
  <!-- Custom Application Scripts -->
  <!-- Configuration & Setup -->
  <script src="js/config.js"></script>
  <script src="js/state.js"></script>
  <script src="js/elements.js"></script>

  <!-- Utilities -->
  <script src="js/utils.js"></script>

  <!-- UI Rendering -->
  <script src="js/ui.js"></script>

  <!-- Modals -->
  <script src="js/modals.js"></script>

  <!-- Core Logic -->
  <script src="js/auth.js"></script>
  <script src="js/chat.js"></script>
  <script src="js/settings.js"></script>
  
  <!-- Main Application Entry Point -->
  <script src="js/main.js"></script>
</body>
</html>
```

### 3. Populate New JavaScript Files

Now, go through your original `<script>` block in `index.html` and move the relevant code into the new files. For each file, we'll encapsulate its logic and expose necessary functions/variables to a global `window.App` object. This makes them accessible from other files.

**Important:** You'll need to prefix references to `state`, `elements`, `API_BASE_URL`, `MODELS`, `FONTS`, `FONT_WEIGHTS`, `supabaseClient`, and functions like `openAlertModal`, `renderSidebar`, etc., with `App.` in the new files.

---

**`js/config.js`**

```javascript
// js/config.js

// Global application configuration constants
const API_BASE_URL = 'http://localhost:3001'; // Your Node.js backend URL
const SUPABASE_URL = 'https://dfrlmrplshijbosawpms.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmcmxtcnBsc2hpamJvc2F3cG1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyNzEzMDYsImV4cCI6MjA2ODg0NzMwNn0.BzsC5u2LGbq3QydQCAKnIiJvrRHTdjx3HzNGdCzf_ac';
const SYSTEM_PROMPT_BASE = `You are Fronix, a large language model. This means most of the time your lines should be a sentence or two, unless the user\'s request requires reasoning or long-form outputs. Never use emojis, unless explicitly asked to. 
Knowledge cutoff: 2024-06
Current date: 2025-05-15

Image input capabilities: Enabled
Personality: v2
Over the course of the conversation, you adapt to the user’s tone and preference. Try to match the user’s vibe, tone, and generally how they are speaking. You want the conversation to feel natural. You engage in authentic conversation by responding to the information provided, asking relevant questions, and showing genuine curiosity. If natural, continue the conversation with casual conversation.
`;

const FONTS = { 'inter': 'Inter', 'sans-serif': 'Sans Serif', 'work-sans': 'Work Sans', 'yu-gothic': 'Yu Gothic' };
const FONT_WEIGHTS = { '300': 'Thin', '400': 'Regular', '500': 'Medium', '600': 'Semibold', '700': 'Bold' };

// Initialize global App object if it doesn't exist
window.App = window.App || {};

// Expose these configurations globally via the App object
App.API_BASE_URL = API_BASE_URL;
App.SUPABASE_URL = SUPABASE_URL;
App.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
App.SYSTEM_PROMPT_BASE = SYSTEM_PROMPT_BASE;
App.FONTS = FONTS;
App.FONT_WEIGHTS = FONT_WEIGHTS;
```

---

**`js/state.js`**

```javascript
// js/state.js
// Manages application state and Supabase client initialization

// Supabase client initialization (uses App.SUPABASE_URL from config.js)
const supabaseClient = supabase.createClient(App.SUPABASE_URL, App.SUPABASE_ANON_KEY);

// Global application state
let state = { 
    chats: [], 
    activeId: null, 
    editingMessage: null, 
    modalContext: {}, 
    settings: { 
        model: 'openai-large', 
        font: 'inter', 
        fontWeight: '400', 
        apiToken: '', 
        proModelsEnabled: false 
    }, 
    currentUser: null 
};

// Global flags and temporary data
let currentController = null; // For aborting fetch requests
let isStreaming = false;      // Flag to indicate if streaming is active
let isScrolledUp = false;     // Flag to indicate if the user has scrolled up
let isGeneratingTitle = false; // Flag to indicate if title generation is in progress
let attachedImageData = null; // To store { file, dataUrl } for image uploads

// Function to save current state to localStorage
const saveState = () => {
    localStorage.setItem('fronixState', JSON.stringify({ settings: state.settings, currentUser: state.currentUser }));
    localStorage.setItem('fronixChats', JSON.stringify(state.chats));
    localStorage.setItem('lastActiveChatId', state.activeId);
};

// Expose these state management items globally via the App object
App.supabaseClient = supabaseClient;
App.state = state;
App.saveState = saveState;

// For flags and mutable globals, use getters/setters on App to easily update and read them
Object.defineProperty(App, 'currentController', {
    get: function() { return currentController; },
    set: function(value) { currentController = value; }
});
Object.defineProperty(App, 'isStreaming', {
    get: function() { return isStreaming; },
    set: function(value) { isStreaming = value; /* App.updateSendButtonState(); */ } // Optionally trigger UI update
});
Object.defineProperty(App, 'isScrolledUp', {
    get: function() { return isScrolledUp; },
    set: function(value) { isScrolledUp = value; }
});
Object.defineProperty(App, 'isGeneratingTitle', {
    get: function() { return isGeneratingTitle; },
    set: function(value) { isGeneratingTitle = value; /* App.updateSendButtonState(); */ } // Optionally trigger UI update
});
Object.defineProperty(App, 'attachedImageData', {
    get: function() { return attachedImageData; },
    set: function(value) { attachedImageData = value; }
});
```

---

**`js/elements.js`**

```javascript
// js/elements.js
// Stores references to all relevant DOM elements for easy access

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
    imageUpload: document.getElementById('image-upload'),
    attachBtn: document.getElementById('attach-btn'),
    imagePreviewContainer: document.getElementById('image-preview-container'),
    settingsModal: {
        container: document.getElementById('settings-modal'),
        fontOptions: document.getElementById('font-options'),
        fontWeightOptions: document.getElementById('font-weight-options'),
        closeBtn: document.getElementById('close-settings-btn'),
        resetBtn: document.getElementById('reset-settings-btn'),
        apiTokenInput: document.getElementById('api-token-input'),
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
        closeBtn: document.getElementById('close-signin-btn'),
        signinTabBtn: document.getElementById('signin-tab-btn'),
        signupTabBtn: document.getElementById('signup-tab-btn'),
        signinView: document.getElementById('signin-view'),
        signupView: document.getElementById('signup-view'),
        signinEmail: document.getElementById('signin-email'),
        passwordInput: document.getElementById('password-input'),
        passwordToggleBtn: document.getElementById('password-toggle-btn'),
        eyeOpenIcon: document.getElementById('eye-open-icon'),
        eyeClosedIcon: document.getElementById('eye-closed-icon'),
        signinEmailBtn: document.getElementById('signin-email-btn'),
        signinGoogleBtn: document.getElementById('signin-google-btn'),
        signupEmail: document.getElementById('signup-email'),
        signupPassword: document.getElementById('signup-password'),
        signupEmailBtn: document.getElementById('signup-email-btn'),
        signupGoogleBtn: document.getElementById('signup-google-btn'),
    },
    alertModal: {
        container: document.getElementById('alert-modal'),
        title: document.getElementById('alert-title'),
        message: document.getElementById('alert-message'),
        okBtn: document.getElementById('alert-ok-btn')
    },
};

// Expose elements globally via the App object
App.elements = elements;
```

---

**`js/utils.js`**

```javascript
// js/utils.js
// General utility functions

// Marked.js and Highlight.js setup
marked.setOptions({
    highlight: function(code, lang) {
        const language = hljs.getLanguage(lang) ? lang : 'plaintext';
        return hljs.highlight(code, { language }).value;
    },
    langPrefix: 'hljs language-'
});

// Checks if a JWT token is expired
const isTokenExpired = (token) => {
    if (!token) return true;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Math.floor(Date.now() / 1000);
        return payload.exp && (payload.exp - 30) < currentTime; // 30-second buffer
    } catch (error) {
        console.warn("Invalid token format:", error);
        return true;
    }
};

// Detects the device type (mobile/desktop)
const getDeviceType = () => {
    const userAgent = navigator.userAgent;
    if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|rim)|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(userAgent) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|az(w|x)|be(ck|qr|dc)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(is|eo)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(ad|in|u2)|er(ic|k0)|esl |ez([4-7]0|os|wa|ze)|fetc|fly(\-| _)|g1 u|g560|gene|gf\-5|g\-mo|go(\.(w|od))|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ts)|ice( ss|sh)|iq(mo|yr)|ir(ad|ie|v )|kodo|ko(pf|pn)|kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|mc)|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|ad|ll|tx|up|vl|wi)|mt(50|p1|v )|mwbp|nc(ar|et|wi)|ne(on|vl|im)|ng(01|02|ui|vm|ro)|nl(ec|xp|mw)|ol(o|ad)|owg1|ox(ad|ev)|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(78|12|21|32|60|\-[2-7]|i\-)|'s(at|ti|un)|rd(fr|lo)|re(ad|ie|zg)|rkt |rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|pn|si)|sch(01|mc)|sec(47|65)|send|serg|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|20)|t7(70|50)|tap(a|g)|'t(ap|ym)|tdg\-|tel(i|m)|tfw |tg(wt|lk)|ti(\-|v|ar)|tk(ad|pt)|tp(av|ow)|tr(ig|sy)|ts(70|m\-|p[ad])|twg1|u c9|u eg|u h(op|pk)|ul(ad|eg|em)|up(\.(b|ul1))|v(?:rgv|us)|w(?:a(?:tud|cd)|es(?:c[4-6]|s[89])|v(?:g[02]|sm)|bl)|wi(mp|ty)|wk(at|if)|xant|xtg1|z(?:pmo|qz)|zymo/i.test(userAgent.substr(0, 4))) {
        return "mobile";
    } else {
        return "desktop";
    }
};

// Renders markdown content for display
const renderContent = (text) => {
    if (!text) return '';
    let html = marked.parse(text, { breaks: true, gfm: true });
    return html;
};

// Renders markdown content for streaming (inline parsing, no block elements)
const renderStreamingContent = (text) => {
    if (!text) return '';
    let html = marked.parseInline(text, { breaks: true, gfm: true });
    return html;
};

// Copies text to clipboard and provides visual feedback
const copyMessage = (text, btn) => {
    navigator.clipboard.writeText(text).then(() => {
        const originalIcon = btn.innerHTML;
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        setTimeout(() => btn.innerHTML = originalIcon, 1500);
    });
};

// Scrolls the chatbox to the bottom
const scrollToBottom = () => {
    App.elements.chatBox.parentElement.scrollTo({
        top: App.elements.chatBox.parentElement.scrollHeight,
        behavior: 'smooth'
    });
};

// Utility function for retry mechanism with exponential backoff
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            const isLastAttempt = attempt === maxRetries;
            const isNetworkError = error.message.includes('fetch') || error.message.includes('network') || error.message.includes('Failed to fetch');
            const isServerError = error.status >= 500; // General server errors
            const shouldRetry = !isLastAttempt && (isNetworkError || isServerError);
            
            if (shouldRetry) {
                const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff (1s, 2s, 4s...)
                console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`, error.message);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                throw error; // Rethrow on last attempt or non-retryable error
            }
        }
    }
}


// Expose these utility functions globally via the App object
App.isTokenExpired = isTokenExpired;
App.getDeviceType = getDeviceType;
App.renderContent = renderContent;
App.renderStreamingContent = renderStreamingContent;
App.copyMessage = copyMessage;
App.scrollToBottom = scrollToBottom;
App.retryWithBackoff = retryWithBackoff;```

---

**`js/ui.js`**

```javascript
// js/ui.js
// Handles rendering and updating various user interface components

// Placeholder for models, will be populated by loadAvailableModels in chat.js
// but needs to be globally accessible for UI functions here.
let MODELS = {}; 

// Updates the state of the send button based on streaming and title generation status
const updateSendButtonState = () => {
    const userInputEmpty = App.elements.userInput.value.trim() === '';
    if (App.isStreaming) {
        App.elements.sendBtn.disabled = false; // Always enabled as a stop button during streaming
    } else {
        // Button is disabled if input is empty OR title is generating
        App.elements.sendBtn.disabled = userInputEmpty || App.isGeneratingTitle; 
    }
};

// Renders the list of chats in the sidebar
const renderSidebar = () => {
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    App.elements.chatList.innerHTML = ''; // Clear existing list

    // Sort chats by creation date (newest first) if created_at exists, otherwise maintain current order
    const sortedChats = [...App.state.chats].sort((a, b) => {
        if (a.created_at && b.created_at) {
            return new Date(b.created_at) - new Date(a.created_at);
        }
        return 0; // Maintain order if no creation date
    });

    sortedChats.forEach(chat => {
        const isActive = chat.id === App.state.activeId;
        let li = document.createElement('li');
        li.className = `group w-full flex items-center justify-between px-4 py-2 rounded-lg cursor-pointer transition-colors relative ${isActive ? 'bg-light-border-active dark:bg-dark-border-active' : 'hover:bg-light-border-hover dark:hover:bg-dark-border-hover'}`;
        
        let actionsHtml;
        if (isTouchDevice) {
            // For touch devices, show a "..." button to open a dropdown for actions
            actionsHtml = `<button class="chat-actions-btn p-1 text-light-text-subtle hover:text-light-text dark:hover:text-dark-text rounded"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg></button>`;
        } else {
            // For desktop, show rename and delete buttons on hover
            actionsHtml = `<div class="sidebar-item-actions flex-shrink-0 flex items-center gap-1">
                <button class="rename-btn p-1 text-light-text-subtle hover:text-light-text dark:hover:text-dark-text rounded"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg></button>
                <button class="delete-btn p-1 text-light-text-subtle hover:text-red-500 rounded"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
            </div>`;
        }

        li.innerHTML = `<span class="truncate text-sm font-medium">${chat.title}</span>${actionsHtml}`;
        
        li.addEventListener('click', () => {
            App.setActive(chat.id); // Call global App function
            if (window.innerWidth < 768) {
                App.toggleSidebar(); // Call global App function
            }
        });

        const renameBtn = li.querySelector('.rename-btn');
        if (renameBtn) {
            renameBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent activating the chat
                App.openRenameModal(chat.id); // Call global App function
            });
        }

        const deleteBtn = li.querySelector('.delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent activating the chat
                App.openDeleteModal(chat.id); // Call global App function
            });
        }

        const actionsBtn = li.querySelector('.chat-actions-btn');
        if (actionsBtn) {
            actionsBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent activating the chat
                App.openChatActionsDropdown(chat.id, e.currentTarget); // Call global App function
            });
        }
        App.elements.chatList.appendChild(li);
    });
};

// Renders the messages in the main chat area
const renderChat = () => {
    const chat = App.state.chats.find(c => c.id === App.state.activeId);
    App.elements.chatBox.innerHTML = '';

    // If no active chat or no messages, show welcome screen
    if (!chat || !chat.messages || chat.messages.length === 0) {
        App.elements.chatBox.innerHTML = `<div class="text-center text-light-text-subtle dark:text-dark-text-subtle py-8"><h2 class="text-3xl font-bold mb-2">Fronix</h2><p>Start a new message to begin.</p></div>`;
        return;
    }

    // Render each message
    chat.messages.forEach((msg, index) => {
        const wrapper = document.createElement('div');
        const msgDiv = document.createElement('div');
        
        if (msg.id) { // Use message ID for tracking, especially for placeholders
            msgDiv.id = msg.id;
        }

        const isUser = msg.role === 'user';

        if (isUser) {
            msgDiv.className = 'ml-auto w-fit max-w-[90%]';
            
            // Handle multimodal content (array) or plain text
            let content = msg.content;
            if (typeof content === 'string' && (content.startsWith('[') || content.startsWith('{'))) {
                try {
                    content = JSON.parse(content);
                } catch (e) {
                    content = msg.content; // If parsing fails, treat as string
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
                // Regular text message
                msgDiv.classList.add('p-4', 'rounded-2xl', 'bg-light-user-bubble', 'dark:bg-dark-user-bubble');
                const p = document.createElement('p');
                p.className = 'whitespace-pre-wrap';
                p.textContent = content;
                msgDiv.appendChild(p);
            }
        } else {
            // Assistant message styling and content rendering
            msgDiv.className = 'prose prose-sm md:prose-base max-w-none text-light-text dark:text-dark-text';
            if (msg.content === '...') {
                // Loading animation for streaming responses
                msgDiv.innerHTML = `<div class="flex items-center space-x-1.5">${Array(3).fill().map(() => `<div class="loader-dot w-2 h-2 bg-gray-400 rounded-full"></div>`).join('')}</div>`;
            } else {
                // Render markdown and MathJax (KaTeX)
                msgDiv.innerHTML = App.renderContent(msg.content);
            }
            // Ensure KaTeX rendering is applied after content is in DOM
            renderMathInElement(msgDiv, {
                delimiters: [{ left: "[", right: "]", display: true }, { left: "$$", right: "$$", display: true }, { left: "$", right: "$", display: false }]
            });
        }

        // Add action buttons (copy, edit)
        const actionsDiv = document.createElement('div');
        actionsDiv.className = `flex gap-2 mt-2 items-center text-light-text-subtle dark:text-dark-text-subtle ${isUser ? 'justify-end' : 'justify-start'}`;
        const copyBtn = document.createElement('button');
        copyBtn.className = 'p-1 hover:text-light-text dark:hover:text-dark-text rounded-md transition-colors';
        copyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
        copyBtn.onclick = () => App.copyMessage(msg.content, copyBtn);
        actionsDiv.appendChild(copyBtn);

        if (isUser) {
            const editBtn = document.createElement('button');
            editBtn.className = 'p-1 hover:text-light-text dark:hover:text-dark-text rounded-md transition-colors';
            editBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>`;
            editBtn.onclick = () => App.enterEditMode(chat.id, index);
            actionsDiv.appendChild(editBtn);
        }

        wrapper.appendChild(msgDiv);
        wrapper.appendChild(actionsDiv);
        App.elements.chatBox.appendChild(wrapper);
    });
    // Scroll to bottom after rendering new messages
    App.elements.chatBox.parentElement.scrollTop = App.elements.chatBox.parentElement.scrollHeight;
};

// Updates the profile section UI with current user info
const updateProfileUI = () => {
    if (App.state.currentUser) {
        App.elements.profileUsername.textContent = App.state.currentUser.username || 'User';
        App.elements.profileEmail.textContent = App.state.currentUser.email;
        App.elements.profilePlan.textContent = App.state.currentUser.plan || 'basic';
        App.elements.profileBtnUsername.textContent = App.state.currentUser.username || 'User';
    }
};

// Updates visibility of sign-in/out buttons and profile section
const updateLoginStateUI = () => {
    if (App.state.currentUser) {
        App.elements.signinBtn.classList.add('hidden');
        App.elements.profileSection.classList.remove('hidden');
        App.elements.logoutBtn.classList.remove('hidden');
    } else {
        App.elements.signinBtn.classList.remove('hidden');
        App.elements.profileSection.classList.add('hidden');
        App.elements.logoutBtn.classList.add('hidden');
    }
};

// Updates the displayed model name in the header
const updateModelSelectorDisplay = () => {
    let currentModelKey = App.state.settings.model;
    let modelData = MODELS[currentModelKey]; // Uses the local MODELS variable (populated by App.loadAvailableModels)
    let displayName = 'No models available';
    let modelType = '';

    // Fallback logic if the currently selected model is not available
    if (!modelData) {
        console.warn(`⚠️ Currently selected model "${currentModelKey}" is not available. Attempting to find a fallback.`);
        if (MODELS['openai-large']) {
            currentModelKey = 'openai-large';
            modelData = MODELS[currentModelKey];
            console.log(`  - Falling back to 'openai-large'.`);
        } else {
            const firstAvailableModelKey = Object.keys(MODELS)[0];
            if (firstAvailableModelKey) {
                currentModelKey = firstAvailableModelKey;
                modelData = MODELS[currentModelKey];
                console.log(`  - Falling back to first available model: '${currentModelKey}'.`);
            } else {
                console.error(`❌ No models are available. Displaying "No models available".`);
                App.state.settings.model = null;
                App.elements.chatTitle.textContent = displayName;
                return;
            }
        }
        App.state.settings.model = currentModelKey;
        App.saveState();
    }

    displayName = modelData.name;
    modelType = modelData.type === 'image' ? ' 🎨' : ' 💬';
    
    App.elements.chatTitle.textContent = displayName + modelType;
    console.log('🔄 Updated model selector display to:', displayName, `(${modelData.type})`);
};

// Updates the UI of the "Enable Pro Models" toggle switch
const updateProModelsToggleUI = () => {
    const enabled = App.state.settings.proModelsEnabled;
    const toggle = App.elements.settingsModal.proModelsToggle;
    if (!toggle) return;
    const knob = toggle.querySelector('span');

    toggle.setAttribute('aria-checked', enabled);
    toggle.classList.toggle('bg-accent', enabled);
    toggle.classList.toggle('bg-gray-200', !enabled);
    toggle.classList.toggle('dark:bg-gray-700', !enabled); // Keep dark mode specific class for gray-700
    knob.classList.toggle('translate-x-5', enabled);
    knob.classList.toggle('translate-x-0', !enabled);
};

// Renders the model selection dropdown
const renderModelDropdown = () => {
    App.elements.modelDropdown.innerHTML = '';
    
    const isProUser = App.state.currentUser && App.state.currentUser.plan === 'pro';
    const proModelsEnabled = App.state.settings.proModelsEnabled;

    // Filter models based on pro status and user settings
    const availableModels = Object.entries(MODELS).filter(([key, data]) => {
        if (data.pro) {
            return isProUser && proModelsEnabled;
        }
        return true; // Free models are always available
    });

    // Separate models by type for distinct sections in the dropdown
    const textModels = availableModels.filter(([_, data]) => data.type === 'text');
    const imageModels = availableModels.filter(([_, data]) => data.type === 'image');
    
    // Add Text Models section
    const textHeader = document.createElement('div');
    textHeader.className = 'px-3 py-2 text-xs font-medium text-light-text-subtle dark:text-dark-text-subtle uppercase tracking-wider border-b border-light-border dark:border-dark-border';
    textHeader.textContent = '💬 Text Models';
    App.elements.modelDropdown.appendChild(textHeader);
    
    textModels.forEach(([key, data]) => {
        const btn = document.createElement('button');
        const isSelected = key === App.state.settings.model;
        btn.className = `w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between ${isSelected ? 'bg-accent text-white' : 'hover:bg-light-border-hover dark:hover:bg-dark-border-hover'}`;
        
        let proBadge = '';
        if (data.pro) {
            proBadge = '<span class="text-xs font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-full">PRO</span>';
        }

        btn.innerHTML = `<span>${data.name}</span> ${proBadge}`;
        btn.onclick = () => {
            App.state.settings.model = key;
            const activeChat = App.state.chats.find(c => c.id === App.state.activeId);
            if (activeChat) activeChat.model = key; // Update model for the active chat
            App.saveState();
            App.updateModelSelectorDisplay();
            App.renderModelDropdown();
            App.elements.modelDropdown.style.display = 'none'; // Close dropdown after selection
        };
        App.elements.modelDropdown.appendChild(btn);
    });
    
    // Add Image Generation section if there are any image models
    if (imageModels.length > 0) {
        const imgHeader = document.createElement('div');
        imgHeader.className = 'px-3 py-2 text-xs font-medium text-light-text-subtle dark:text-dark-text-subtle uppercase tracking-wider border-b border-light-border dark:border-dark-border mt-2';
        imgHeader.textContent = '🎨 Image Generation';
        App.elements.modelDropdown.appendChild(imgHeader);
        
        imageModels.forEach(([key, data]) => {
            const btn = document.createElement('button');
            const isSelected = key === App.state.settings.model;
            btn.className = `w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between ${isSelected ? 'bg-accent text-white' : 'hover:bg-light-border-hover dark:hover:bg-dark-border-hover'}`;
            
            let proBadge = '';
            if (data.pro) {
                proBadge = '<span class="text-xs font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-full">PRO</span>';
            }

            btn.innerHTML = `<span>${data.name}</span> ${proBadge}`;
            btn.onclick = () => {
                App.state.settings.model = key;
                const activeChat = App.state.chats.find(c => c.id === App.state.activeId);
                if (activeChat) activeChat.model = key;
                App.saveState();
                App.updateModelSelectorDisplay();
                App.renderModelDropdown();
                App.elements.modelDropdown.style.display = 'none';
                console.log('🖼️ Selected image model:', key);
            };
            App.elements.modelDropdown.appendChild(btn);
        });
    }
};

// Expose these UI functions and the MODELS variable globally via the App object
App.MODELS = MODELS; // Note: MODELS will be populated by App.loadAvailableModels (in chat.js)
App.updateSendButtonState = updateSendButtonState;
App.renderSidebar = renderSidebar;
App.renderChat = renderChat;
App.updateProfileUI = updateProfileUI;
App.updateLoginStateUI = updateLoginStateUI;
App.updateModelSelectorDisplay = updateModelSelectorDisplay;
App.updateProModelsToggleUI = updateProModelsToggleUI;
App.renderModelDropdown = renderModelDropdown;
```

---

**`js/modals.js`**

```javascript
// js/modals.js
// Centralized functions for managing modal dialogs and their animations

// Animates the opening of a modal
const animateModalOpen = (modalContainer) => {
    modalContainer.style.display = 'flex'; // Make container visible
    const modalContent = modalContainer.querySelector('.modal-content');
    anime({ 
        targets: modalContent, 
        scale: [0.92, 1], 
        opacity: [0, 1], 
        duration: 250, 
        easing: 'easeOutCubic' 
    });
};

// Animates the closing of a modal
const animateModalClose = (modalContainer, onComplete = () => {}) => {
    const modalContent = modalContainer.querySelector('.modal-content');
    anime({ 
        targets: modalContent, 
        scale: 0.95, 
        opacity: 0, 
        duration: 100, 
        easing: 'easeInCubic', 
        complete: () => { 
            modalContainer.style.display = 'none'; // Hide container after animation
            onComplete(); 
        } 
    });
};

// Opens the rename chat modal
const openRenameModal = (chatId) => {
    App.state.modalContext.chatId = chatId; // Store chat ID in state for modal actions
    const chat = App.state.chats.find(c => c.id === chatId);
    if (!chat) return;
    App.elements.renameModal.input.value = chat.title; // Pre-fill input with current title
    animateModalOpen(App.elements.renameModal.container);
};

// Opens the delete chat modal
const openDeleteModal = (chatId) => {
    App.state.modalContext.chatId = chatId;
    const chat = App.state.chats.find(c => c.id === chatId);
    if (!chat) return;
    App.elements.deleteModal.message.textContent = `Are you sure you want to delete "${chat.title}"?`;
    animateModalOpen(App.elements.deleteModal.container);
};

// Opens a generic alert modal with a title and message
const openAlertModal = (title, message) => {
    App.elements.alertModal.title.textContent = title;
    App.elements.alertModal.message.textContent = message;
    animateModalOpen(App.elements.alertModal.container);
};

// Closes the generic alert modal
const closeAlertModal = () => {
    animateModalClose(App.elements.alertModal.container);
};

// Closes all currently open modal dialogs and the chat actions dropdown
const closeAllModals = () => { 
    document.querySelectorAll('.modal-container').forEach(m => { 
        if (m.style.display === 'flex') animateModalClose(m); 
    }); 
    App.elements.chatActionsDropdown.style.display = 'none';
};

// Opens the dropdown menu for chat-specific actions (rename, delete)
const openChatActionsDropdown = (chatId, target) => {
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
    // Attach event listeners for dropdown actions
    dropdown.querySelector('.rename-action').onclick = () => {
        openRenameModal(chatId);
        dropdown.style.display = 'none';
    };
    dropdown.querySelector('.delete-action').onclick = () => {
        openDeleteModal(chatId);
        dropdown.style.display = 'none';
    };        
    // Position and display the dropdown
    dropdown.style.top = `${rect.bottom + 4}px`;
    dropdown.style.left = `${rect.left - dropdown.offsetWidth + rect.width}px`;
    dropdown.style.display = 'block';

    // Close dropdown when clicking outside
    setTimeout(() => {
        document.addEventListener('click', function hide(e) {
            if (!dropdown.contains(e.target)) {
                dropdown.style.display = 'none';
                document.removeEventListener('click', hide);
            }
        });
    }, 0);
};

// Expose these modal functions globally via the App object
App.animateModalOpen = animateModalOpen;
App.animateModalClose = animateModalClose;
App.openRenameModal = openRenameModal;
App.openDeleteModal = openDeleteModal;
App.openAlertModal = openAlertModal;
App.closeAlertModal = closeAlertModal;
App.closeAllModals = closeAllModals;
App.openChatActionsDropdown = openChatActionsDropdown;
```

---

**`js/auth.js`**

```javascript
// js/auth.js
// Handles user authentication and session management

// Validates the current auth token and refreshes it if expired
const validateAndRefreshToken = async () => {
    let token = localStorage.getItem('authToken');
    const refreshToken = localStorage.getItem('refreshToken');

    if (!token) {
        return null;
    }

    if (App.isTokenExpired(token)) { // Uses utility function from utils.js
        console.log("Access token expired. Attempting to refresh...");
        if (!refreshToken) {
            console.log("No refresh token available. Logging out.");
            localStorage.removeItem('authToken');
            App.state.currentUser = null;
            App.updateLoginStateUI(); // Uses UI function from ui.js
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
};

// Handles user sign-in with email and password
const handleSignIn = async (email, password, retryCount = 0) => {
    if (!email || !password) {
        App.openAlertModal("Error", "Please enter both your email and password.");
        return;
    }
    const maxRetries = 2;
    const signinBtn = App.elements.signinModal.signinEmailBtn;
    const buttonText = signinBtn.querySelector('.button-text');
    const spinner = signinBtn.querySelector('svg');

    signinBtn.disabled = true;
    buttonText.classList.add('hidden');
    spinner.classList.remove('hidden');

    try {
        const response = await fetch(`${App.API_BASE_URL}/api/auth/signin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Unknown sign-in error');
        }
        localStorage.setItem('authToken', data.session.access_token);
        localStorage.setItem('refreshToken', data.session.refresh_token);
        await App.loadDataFromServer(); // Calls core chat function
        App.closeAllModals(); // Calls modal function
        App.openAlertModal('Success', 'You have successfully signed in.');
    } catch (error) {
        console.error("Sign-in failed:", error);
        if (retryCount < maxRetries && (error.message.includes('fetch failed') || error.message.includes('network'))) {
            console.log(`Retrying sign-in attempt ${retryCount + 1}/${maxRetries + 1}...`);
            setTimeout(() => {
                handleSignIn(email, password, retryCount + 1);
            }, 1000 * (retryCount + 1));
        } else {
            App.openAlertModal('Sign-in Error', error.message);
        }
    } finally {
        signinBtn.disabled = false;
        buttonText.classList.remove('hidden');
        spinner.classList.add('hidden');
    }
};

// Handles user sign-up with email and password
const handleSignUp = async (email, password) => {
    if (!email || !password) {
        App.openAlertModal("Error", "Please provide both an email and a password.");
        return;
    }
    if (password.length < 6) {
        App.openAlertModal("Error", "Password must be at least 6 characters long.");
        return;
    }
    try {
        const response = await fetch(`${App.API_BASE_URL}/api/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Unknown sign-up error');
        }
        App.openAlertModal('Sign-up Successful', 'Please check your email for verification.');
        App.closeAllModals();
    } catch (error) {
        console.error("Sign-up failed:", error);
        App.openAlertModal('Sign-up Error', error.message);
    }
};

// Initiates Google OAuth login via Supabase
const handleGoogleLogin = async () => {
    try {
        const { error } = await App.supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${App.API_BASE_URL}/api/auth/callback`
            }
        });
        if (error) {
            throw new Error('Supabase Google login failed: ' + error.message);
        }
    } catch (error) {
        console.error("Error during Google login:", error);
        App.openAlertModal('Google Login Error', error.message);
    }
};

// Expose these authentication functions globally via the App object
App.validateAndRefreshToken = validateAndRefreshToken;
App.handleSignIn = handleSignIn;
App.handleSignUp = handleSignUp;
App.handleGoogleLogin = handleGoogleLogin;
```

---

**`js/chat.js`**

```javascript
// js/chat.js
// Core logic for chat interactions, including message handling, chat management, and AI communication

// Creates a new chat object with a default title and model
const createChat = (title = 'New Chat') => ({ id: Date.now().toString(), title, messages: [], model: App.state.settings.model });

// Adds a new message to the active chat and updates the UI
const addMessage = (role, content, customId = null) => {
    const chat = App.state.chats.find(c => c.id === App.state.activeId);
    if (!chat) return;
    
    if (!chat.messages) {
        chat.messages = [];
    }
    
    const message = { role, content };
    if (customId) {
        message.id = customId; // Assign custom ID for optimistic updates
    }
    chat.messages.push(message);
    console.log('[addMessage] Message added. Chat messages (after push):', JSON.parse(JSON.stringify(chat.messages)));
    App.renderChat(); // Rerender chat with new message
    App.saveState();   // Save updated state
    console.log('[addMessage] State saved after adding message. Current chat messages:', JSON.parse(JSON.stringify(chat.messages)));
};

// Sets the active chat and updates related UI components
const setActive = (id) => {
    console.log(`[setActive] Attempting to set active chat to ID: ${id}`);
    if (App.state.editingMessage) {
        console.log('[setActive] Exiting edit mode before changing chat.');
        App.exitEditMode(); // Exit edit mode if active
    }
    App.state.activeId = id;
    const chat = App.state.chats.find(c => c.id === id);
    if (chat) {
        App.state.settings.model = chat.model || 'openai-large'; // Set model to chat's model or default
        console.log(`[setActive] Chat found. Setting model to: ${App.state.settings.model}`);
    } else {
        App.state.activeId = null; // If chat not found, clear active ID
        console.log(`[setActive] Chat with ID ${id} not found. Setting activeId to null.`);
    }
    App.updateModelSelectorDisplay(); // Update model display
    App.renderModelDropdown();        // Rerender model dropdown
    console.log(`[setActive] Calling renderSidebar and renderChat for chat ID: ${App.state.activeId}`);
    App.renderSidebar();              // Rerender sidebar to highlight active chat
    App.renderChat();                 // Rerender main chat area
    App.saveState();
    console.log(`[setActive] Active chat set to: ${App.state.activeId}. State saved.`);
};

// Loads available AI models from the backend
const loadAvailableModels = async () => {
    try {
        const response = await fetch(`${App.API_BASE_URL}/api/ai/models`);
        if (!response.ok) {
            throw new Error('Failed to fetch available models');
        }
        App.MODELS = await response.json(); // Update the global App.MODELS in ui.js
        App.renderModelDropdown();          // Rerender dropdown with new models
    } catch (error) {
        console.error('Error loading available models:', error);
        App.MODELS = { // Fallback to a default model list if API fails
            'openai-large': { name: 'OpenAI GPT-4.1', type: 'text' }
        };
        App.renderModelDropdown();
    }
};

// Loads user data and chats from the server (for authenticated users)
const loadDataFromServer = async () => {
    const token = localStorage.getItem('authToken');
    const isUserLoggedIn = !!App.state.currentUser;

    if (!isUserLoggedIn) {
        App.updateLoginStateUI(); // Ensure UI reflects logged-out state
        return;
    }

    if (!token) { // Should not happen if isUserLoggedIn is true, but a safeguard
        App.updateLoginStateUI();
        return;
    }

    try {
        // Wrap the entire data loading process in a retry mechanism
        await App.retryWithBackoff(async () => {
            // Fetch user info first
            const userResponse = await fetch(`${App.API_BASE_URL}/api/user/me`, {
                headers: { 'Authorization': `Bearer ${token}` },
                cache: 'no-cache'
            });
            
            if (userResponse.status === 401 || userResponse.status === 403) {
                throw new Error('AUTH_ERROR'); // Custom error for authentication issues
            }
            if (!userResponse.ok) {
                const error = new Error(`Failed to fetch user data. Status: ${userResponse.status}`);
                error.status = userResponse.status;
                throw error;
            }
            App.state.currentUser = await userResponse.json();

            // Then fetch chats
            const chatsResponse = await fetch(`${App.API_BASE_URL}/api/chat`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (chatsResponse.status === 401 || chatsResponse.status === 403) {
                throw new Error('AUTH_ERROR');
            }
            if (!chatsResponse.ok) {
                const error = new Error(`Failed to fetch chats. Status: ${chatsResponse.status}`);
                error.status = chatsResponse.status;
                throw error;
            }
            const chats = await chatsResponse.json();
            App.state.chats = chats; // Store all fetched chats

            // Fetch messages for each chat
            for (let i = 0; i < App.state.chats.length; i++) {
                const chat = App.state.chats[i];
                const messagesResponse = await fetch(`${App.API_BASE_URL}/api/chat/${chat.id}/messages`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (messagesResponse.status === 401 || messagesResponse.status === 403) {
                    throw new Error('AUTH_ERROR');
                }
                if (!messagesResponse.ok) {
                    const error = new Error(`Failed to fetch messages for chat ${chat.id}. Status: ${messagesResponse.status}`);
                    error.status = messagesResponse.status;
                    throw error;
                }
                const messages = await messagesResponse.json();
                chat.messages = Array.isArray(messages.messages) ? messages.messages : [];
            }

            // Set active chat to the newest chat or create a new one if none exist
            if (App.state.chats.length > 0) {
                App.state.activeId = App.state.chats[0].id; // Always select the newest chat
            } else {
                await App.handleNewChat(); // Create a new chat if no existing chats
                return; // handleNewChat will set activeId and render
            }
        });

        // If everything succeeded, save state and render UI
        App.saveState();
        console.log('[loadDataFromServer] Data loaded successfully. Current App.state.chats:', JSON.parse(JSON.stringify(App.state.chats)));
        console.log('[loadDataFromServer] Current App.state.activeId:', App.state.activeId);
        App.renderSidebar();
        App.renderChat();

    } catch (error) {
        console.error("[loadDataFromServer] Error loading data from server:", error);
        
        if (error.message === 'AUTH_ERROR') {
            // Only clear token and sign out on actual authentication errors
            App.openAlertModal('Session Expired', 'Your session has expired. Please sign in again.');
            localStorage.removeItem('authToken');
            App.state.currentUser = null;
        } else {
            console.warn('[loadDataFromServer] Temporary network issue or server error:', error.message);
            // For transient errors, just log, don't necessarily sign out or show intrusive alerts
        }
    } finally {
        App.updateLoginStateUI();
        App.updateProfileUI();
        console.log('[loadDataFromServer] Finished. Final App.state.activeId:', App.state.activeId);
    }
};

// Handles the creation of a new chat, either locally or on the server
const handleNewChat = async () => {
    const token = localStorage.getItem('authToken');
    const isUserLoggedIn = !!App.state.currentUser;
    const FREE_MODELS = Object.keys(App.MODELS).filter(key => App.MODELS[key].free);
    const MAX_LOCAL_CHATS = 5;

    // Unauthenticated user checks
    if (!isUserLoggedIn) {
        if (App.state.chats.length >= MAX_LOCAL_CHATS) {
            App.openAlertModal('Trial Limit Reached', `You can create up to ${MAX_LOCAL_CHATS} chats without logging in. Please sign in to create more.`);
            return;
        }
        if (!FREE_MODELS.includes(App.state.settings.model)) {
            App.openAlertModal('Model Restricted', `Only ${FREE_MODELS.join(' and ')} models are available for trial users. Please sign in to use other models.`);
            return;
        }
    } else if (!token) { // Logged in but no token (safety check)
        App.openAlertModal('Authentication Required', 'Please sign in to create a new chat.');
        return;
    }

    // Optimistically create a new chat object with a temporary ID
    const tempChatId = `temp-${Date.now()}`;
    const newChat = {
        id: tempChatId,
        title: 'New Chat',
        messages: [],
        model: App.state.settings.model
    };

    // Add the new chat to the state and set it as active
    console.log('[handleNewChat] Optimistically adding new chat:', newChat);
    App.state.chats.unshift(newChat); // Add to the beginning for "newest first"
    App.setActive(tempChatId);
    App.renderSidebar(); // Update sidebar immediately
    App.renderChat();   // Render empty chat immediately
    App.saveState();
    console.log('[handleNewChat] State after optimistic add. App.state.chats:', JSON.parse(JSON.stringify(App.state.chats)));
    console.log('[handleNewChat] State after optimistic add. App.state.activeId:', App.state.activeId);

    // If authenticated, also create on the backend
    if (isUserLoggedIn) {
        try {
            const response = await fetch(`${App.API_BASE_URL}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ title: 'New Chat' })
            });

            if (!response.ok) {
                throw new Error('Failed to create chat on server');
            }

            const newChatFromServer = await response.json();
            newChatFromServer.messages = []; // Initialize messages for consistency

            // Find the optimistically added chat and update its real ID
            const index = App.state.chats.findIndex(chat => chat.id === tempChatId);
            if (index !== -1) {
                App.state.chats[index].id = newChatFromServer.id;
                App.state.chats[index].created_at = newChatFromServer.created_at;
                App.state.activeId = newChatFromServer.id; // Ensure activeId is the real one
            } else {
                // Fallback if optimistic chat not found (shouldn't happen with correct flow)
                App.state.chats.unshift(newChatFromServer);
                App.state.activeId = newChatFromServer.id;
            }
            
            console.log('[handleNewChat] New chat created on server:', newChatFromServer);
            
            App.renderSidebar(); // Re-render to update ID in sidebar
            App.saveState();     // Save state with real ID
            console.log('[handleNewChat] State after successful backend save. App.state.chats:', JSON.parse(JSON.stringify(App.state.chats)));
            console.log('[handleNewChat] State after successful backend save. App.state.activeId:', App.state.activeId);

        } catch (error) {
            console.error("[handleNewChat] Error creating new chat:", error);
            App.openAlertModal('Error', 'Could not create a new chat. Please try again.');

            // Revert optimistic update on error
            const index = App.state.chats.findIndex(chat => chat.id === tempChatId);
            if (index !== -1) {
                App.state.chats.splice(index, 1); // Remove optimistic chat
                // If the deleted chat was active, set a new active chat
                if (App.state.activeId === tempChatId) {
                    App.state.activeId = App.state.chats.length > 0 ? App.state.chats[0].id : null;
                }
                App.renderSidebar(); // Re-render sidebar after removal
                App.renderChat();   // Re-render chat area
                App.saveState();
                console.log('[handleNewChat] State after error rollback. App.state.chats:', JSON.parse(JSON.stringify(App.state.chats)));
                console.log('[handleNewChat] State after error rollback. App.state.activeId:', App.state.activeId);
            }
        }
    }
};

// Sends a message (user input + attached image) to the AI service
const sendMessage = async () => {
    const userInput = App.elements.userInput.value.trim();
    const activeChat = App.state.chats.find(c => c.id === App.state.activeId);
    console.log(`[sendMessage] Start: App.isStreaming = ${App.isStreaming}, App.isGeneratingTitle = ${App.isGeneratingTitle}`);

    // Prevent sending if input is empty (and no image), no active chat, or already streaming/generating title
    if ((!userInput && !App.attachedImageData) || !activeChat || App.isStreaming || App.isGeneratingTitle) {
        console.log(`[sendMessage] Aborting due to invalid state. Input Empty: ${!userInput && !App.attachedImageData}, No Active Chat: ${!activeChat}, Streaming: ${App.isStreaming}, Generating Title: ${App.isGeneratingTitle}`);
        return;
    }

    const isUserLoggedIn = !!App.state.currentUser;
    let token = null;
    if (isUserLoggedIn) {
        token = await App.validateAndRefreshToken(); // Validate/refresh token
        if (!token) {
            App.openAlertModal('Session Expired', 'Your session has expired. Please sign in again.');
            setTimeout(() => {
                App.animateModalOpen(App.elements.signinModal.container);
            }, 1000);
            return;
        }
    }

    let isStudyMode = false;
    if (activeChat && activeChat.study_mode !== undefined) {
        isStudyMode = activeChat.study_mode;
    }

    // Handle /study command separately
    if (userInput.trim().startsWith('/study')) {
        const command = userInput.trim().split(' ')[0];
        if (command === '/study') {
            App.elements.userInput.value = '';
            App.elements.userInput.style.height = 'auto';
            App.addMessage('user', '/study'); // Add user's command to chat history

            const originalStudyMode = activeChat.study_mode; // Store original for rollback
            const newStudyModeStatus = !originalStudyMode;

            // Optimistically update study_mode status
            activeChat.study_mode = newStudyModeStatus;
            App.saveState();
            App.addMessage('assistant', `📚 Study mode ${newStudyModeStatus ? 'enabled' : 'disabled'}.`); // Optimistic system message

            try {
                const response = await fetch(`${App.API_BASE_URL}/api/chat/${activeChat.id}/toggle-study-mode`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to toggle study mode.');
                }
                console.log(`Study mode toggled successfully to: ${data.study_mode}`);

            } catch (error) {
                console.error("Error toggling study mode:", error);
                App.openAlertModal('Error', `Failed to toggle study mode: ${error.message}`);

                // Revert optimistic UI update on error
                activeChat.study_mode = originalStudyMode;
                App.saveState();
                App.addMessage('assistant', `⚠️ Failed to toggle study mode. Reverting to ${originalStudyMode ? 'enabled' : 'disabled'}.`);
            } finally {
                // Reset UI elements after command execution
                App.elements.sendIcon.classList.remove('hidden');
                App.elements.stopIcon.classList.add('hidden');
                App.elements.sendBtn.classList.remove('bg-red-600', 'hover:bg-red-700');
                App.elements.sendBtn.classList.add('bg-accent', 'hover:bg-accent-hover');
                App.updateSendButtonState();
                App.elements.userInput.disabled = false;
                App.isStreaming = false;
            }
            return; // Exit sendMessage function after handling /study command
        }
    }

    // Construct messages for AI, including system prompt and chat history
    let messagesForAI = JSON.parse(JSON.stringify(activeChat.messages));
    
    let fullSystemPrompt = App.SYSTEM_PROMPT_BASE;
    fullSystemPrompt += ` You are chatting with the user via the Fronix ${App.getDeviceType()} app.`;
    if (App.state.settings.model) {
        fullSystemPrompt += ` You are currently using the ${App.MODELS[App.state.settings.model]?.name || 'selected'} model.`;
    }

    // Assuming studyModePrompt is defined globally or comes from a specific source
    if (isStudyMode && window.studyModePrompt) { 
        fullSystemPrompt += `\n\n${window.studyModePrompt}`;
    }
    messagesForAI.unshift({ role: 'system', content: fullSystemPrompt });

    // Update send button state and UI for streaming
    App.updateSendButtonState();
    App.elements.sendIcon.classList.add('hidden');
    App.elements.stopIcon.classList.remove('hidden');
    App.elements.sendBtn.classList.remove('bg-accent', 'hover:bg-accent-hover');
    App.elements.sendBtn.classList.add('bg-red-600', 'hover:bg-red-700');
    App.elements.userInput.value = '';
    App.elements.userInput.style.height = 'auto';
    App.isStreaming = true; // Indicate that AI is streaming
    
    // Format user message content (text + image if attached)
    let userMessageContent;
    if (App.attachedImageData) {
        userMessageContent = [
            { type: 'text', text: userInput },
            {
                type: 'image_url',
                image_url: {
                    url: App.attachedImageData.dataUrl
                }
            }
        ];
    } else {
        userMessageContent = userInput;
    }
    
    const userMessageObj = { role: 'user', content: userMessageContent };
    const assistantMessageObj = { role: 'assistant', content: '...', id: 'assistant-msg-' + Date.now() }; // Temporary ID for placeholder

    // Optimistically add user and assistant placeholder messages to UI
    activeChat.messages.push(userMessageObj);
    activeChat.messages.push(assistantMessageObj);
    console.log('[sendMessage] Messages optimistically added. activeChat.messages (after push):', JSON.parse(JSON.stringify(activeChat.messages)));
    App.renderChat(); // Render immediately with new messages
    App.scrollToBottom();

    // Clear attached image immediately after adding to chat history
    if (App.attachedImageData) {
        App.attachedImageData = null;
        App.elements.imageUpload.value = null;
        App.elements.imagePreviewContainer.innerHTML = '';
        App.elements.imagePreviewContainer.classList.add('hidden');
    }
    
    const assistantMsgDiv = document.getElementById(assistantMessageObj.id); // Get the placeholder div
    
    App.currentController = new AbortController(); // Initialize AbortController for stream cancellation
    let fullResponse = "";

    try {
        const currentModel = activeChat.model || App.state.settings.model || 'openai-large';
        const modelData = App.MODELS[currentModel] || { name: 'OpenAI (Default)', type: 'text', pro: false };
        const isImageModel = modelData.type === 'image';

        // Check for pro model usage by unauthenticated users
        if (!isUserLoggedIn && modelData.pro) {
            App.openAlertModal('Model Restricted', `The ${modelData.name} model is only available for authenticated users with a pro plan. Please sign in or select a free model.`);
            // Revert optimistic UI update on error
            activeChat.messages.pop(); // Remove AI placeholder
            activeChat.messages.pop(); // Remove user message
            App.renderChat();
            App.saveState();
            return;
        }
        
        console.log('🔍 Current model for request:', currentModel);
        console.log('🔍 Model data:', modelData);
        console.log('🔍 Is image model:', isImageModel);
        
        let response;
        if (isImageModel) {
            // Route to image generation API for image models
            console.log('🎨 Routing to image generation API for model:', currentModel);
            response = await fetch(`${App.API_BASE_URL}/api/ai/images/generations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                signal: App.currentController.signal,
                body: JSON.stringify({
                    model: currentModel,
                    prompt: userInput,
                    n: 1,
                    size: '1024x1024',
                    quality: 'standard',
                    response_format: 'url'
                }),
            });
        } else {
            // Route to text chat API for text models
            console.log('💬 Routing to text chat API for model:', currentModel);
            response = await fetch(`${App.API_BASE_URL}/api/ai/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                signal: App.currentController.signal,
                body: JSON.stringify({
                    model: currentModel,
                    messages: activeChat.messages,
                    chatId: activeChat.id // Pass chatId for study mode check
                }),
            });
        }

        if (!response.ok) {
            let errorMessage = 'Failed to get response from AI service.';
            console.error("❌ FRONTEND HTTP Error Response:");
            console.error("  - Status:", response.status);
            console.error("  - Status Text:", response.statusText);
            console.error("  - Headers:", Object.fromEntries(response.headers.entries()));
            console.error("  - URL:", response.url);
            let responseBody = null;
            try {
                const responseText = await response.text();
                console.error("  - Response Body (text):", responseText);
                try {
                    responseBody = JSON.parse(responseText);
                    console.error("  - Response Body (parsed):", responseBody);
                } catch (parseError) {
                    console.error("  - Response Body (not JSON):", responseText);
                }
            } catch (readError) {
                console.error("  - Could not read response body:", readError);
            }
            if (response.status === 401 || response.status === 403) {
                errorMessage = 'Invalid or expired token';
            } else {
                try {
                    errorMessage = responseBody?.error || responseText || `HTTP ${response.status}: ${response.statusText}`;
                } catch (e) {
                    errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                }
            }
            throw new Error(errorMessage);
        }

        if (isImageModel) {
            // Handle image generation response (not streaming)
            const imageData = await response.json();
            console.log('🎨 Image generation response:', imageData);
            if (imageData.data && imageData.data.length > 0) {
                const imageUrl = imageData.data[0].url;
                const revisedPrompt = imageData.data[0].revised_prompt;
                fullResponse = `![Generated Image](${imageUrl})`; // Markdown for image
                if (revisedPrompt && revisedPrompt !== userInput) {
                    fullResponse += `\n\n*Revised prompt: ${revisedPrompt}*`;
                }
                assistantMsgDiv.innerHTML = App.renderContent(fullResponse);
            } else {
                throw new Error('No image data received from API');
            }
        } else {
            // Handle text streaming response
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                
                buffer = lines.pop() || ''; // Keep the last incomplete line in the buffer
                
                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (!trimmedLine) continue;
                    
                    if (trimmedLine === 'data: [DONE]') {
                        break; // Stream completed
                    }
                    
                    if (trimmedLine.startsWith('data: ')) {
                        try {
                            const jsonStr = trimmedLine.slice(6); // Remove 'data: ' prefix
                            const data = JSON.parse(jsonStr);
                            
                            // Extract content from choices[0].delta.content
                            if (data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content) {
                                const content = data.choices[0].delta.content;
                                fullResponse += content;
                                assistantMsgDiv.innerHTML = App.renderStreamingContent(fullResponse + '<span class="blinking-cursor"></span>');
                                App.scrollToBottom();
                            }
                        } catch (error) {
                            console.warn('Failed to parse streaming chunk:', trimmedLine, error);
                        }
                    }
                }
            }

            // Update the content of the optimistic assistant message in state
            assistantMessageObj.content = fullResponse;
            const currentChat = App.state.chats.find(c => c.id === activeChat.id);
            if (currentChat) {
                const messageToUpdate = currentChat.messages.find(m => m.id === assistantMessageObj.id);
                if (messageToUpdate) {
                    messageToUpdate.content = fullResponse;
                    delete messageToUpdate.id; // Remove temporary ID now that it's final
                }
            }
            App.saveState(); // Save state after content is fully received
            console.log('[sendMessage] State updated after AI stream completion. activeChat.messages (after update):', JSON.parse(JSON.stringify(activeChat.messages)));

            assistantMsgDiv.innerHTML = App.renderContent(fullResponse); // Render final content
            renderMathInElement(assistantMsgDiv); // Apply KaTeX
        }

        // Reset streaming state and button BEFORE potential title generation
        App.isStreaming = false;
        App.elements.stopIcon.classList.add('hidden');
        App.elements.sendIcon.classList.remove('hidden');
        App.elements.sendBtn.classList.remove('bg-red-600', 'hover:bg-red-700');
        App.elements.sendBtn.classList.add('bg-accent', 'hover:bg-accent-hover');
        App.updateSendButtonState(); // Re-enable the button
        App.elements.userInput.disabled = false; // Re-enable user input
        App.currentController = null;

        // Save messages to backend AFTER AI response is complete and processed
        // This is in its own try-catch block to prevent aggressive rollback on save failures.
        try {
            const lastUserMessage = activeChat.messages.findLast(m => m.role === 'user');
            const lastAssistantMessage = activeChat.messages.findLast(m => m.role === 'assistant');

            const saveResponse = await fetch(`${App.API_BASE_URL}/api/chat/${activeChat.id}/save-messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    userMessage: lastUserMessage,
                    assistantMessage: lastAssistantMessage
                })
            });
            const data = await saveResponse.json();

            if (!saveResponse.ok) {
                console.error("❌ FRONTEND: Failed to save messages to backend:", data);
            } else {
                console.log("✅ Messages successfully saved to backend.");
                // Check if a new title was generated and returned from backend
                if (data.generatedTitle) {
                    activeChat.title = data.generatedTitle;
                    App.renderSidebar(); // Re-render sidebar to show the new title
                    App.saveState();     // Save the new title to localStorage
                    console.log(`📝 Chat title updated to: "${data.generatedTitle}"`);
                }
            }
            } catch (saveError) {
                console.error("❌ FRONTEND: Error calling save-messages API:", saveError);
            }
    
            // Ensure UI is fully updated before potentially running title generation
            requestAnimationFrame(() => {
                console.log(`[sendMessage] After AI response & save (rAF): App.isStreaming = ${App.isStreaming}, sendBtn hidden: ${App.elements.sendIcon.classList.contains('hidden')}, stopBtn hidden: ${App.elements.stopIcon.classList.contains('hidden')}`);
    
                // After the second message, check if a title was generated
                if (activeChat.messages.length >= 2 && activeChat.title === 'New Chat') {
                    // The backend handles title generation. If the response didn't include it,
                    // a full data reload or subsequent fetch might be needed to pick it up.
                    console.log("📝 Chat title generation triggered on backend. Title will update on next data load, or has been updated by response.");
                }
            });
    } catch (error) {
        if (error.name === 'AbortError') {
            // User stopped the stream
            if (activeChat) {
                activeChat.messages.pop(); // Remove only AI placeholder
                App.renderChat();         // Re-render to reflect reverted state
                App.saveState();
            }
            assistantMsgDiv.innerHTML = App.renderContent(fullResponse + '\n\n*Stream stopped by user.*');
            App.isStreaming = false;
            App.elements.stopIcon.classList.add('hidden');
            App.elements.sendIcon.classList.remove('hidden');
            App.elements.sendBtn.classList.remove('bg-red-600', 'hover:bg-red-700');
            App.elements.sendBtn.classList.add('bg-accent', 'hover:bg-accent-hover');
            App.updateSendButtonState();
        } else {
            // Other errors during AI response generation/streaming
            if (activeChat) {
                activeChat.messages.pop(); // Remove AI placeholder
                activeChat.messages.pop(); // Remove user message
                console.log('[sendMessage] Other Error: Messages reverted. activeChat.messages:', activeChat.messages);
                App.renderChat();         // Re-render to reflect reverted state
                App.saveState();
                console.log('[sendMessage] Other Error: State saved after rollback.');
            }
            console.error("❌ FRONTEND sendMessage Error:", error);
            
            const isAuthError = error.message.includes('Invalid or expired token') ||
                               error.message.includes('401') ||
                               error.message.includes('403') ||
                               error.message.includes('Unauthorized') ||
                               error.message.includes('Authentication failed');
            
            if (isAuthError) {
                assistantMsgDiv.innerHTML = App.renderContent('⚠️ Your session has expired. Please sign in again.');
                localStorage.removeItem('authToken');
                App.state.currentUser = null;
                App.updateLoginStateUI();
                window.sendMessageRetryCount = 0; // Reset retry count for auth errors
                setTimeout(() => {
                    App.animateModalOpen(App.elements.signinModal.container);
                }, 1500);
                return;
            }
            
            const isNetworkError = error.message.includes('fetch') || error.message.includes('Failed to get response') || error.message.includes('network');
            const isServerError = error.message.includes('500') || error.message.includes('502') || error.message.includes('503');
            const shouldRetry = isNetworkError || isServerError;
            
            if (shouldRetry && (!window.sendMessageRetryCount || window.sendMessageRetryCount < 2)) {
                window.sendMessageRetryCount = (window.sendMessageRetryCount || 0) + 1;
                assistantMsgDiv.innerHTML = App.renderContent(`🔄 Connection issue detected. Retrying... (${window.sendMessageRetryCount}/2)`);
                setTimeout(async () => {
                    App.elements.userInput.value = userInput; // Restore user input for retry
                    await sendMessage(); // Retry sending the message
                }, 1500 * window.sendMessageRetryCount);
                return;
            } else {
                window.sendMessageRetryCount = 0; // Reset retry count after failure
                if (shouldRetry) {
                    assistantMsgDiv.innerHTML = App.renderContent(`⚠️ Connection failed after multiple attempts. Please check your internet connection and try again.`);
                } else {
                    assistantMsgDiv.innerHTML = App.renderContent(`⚠️ An error occurred: ${error.message}`);
                }
            }
        }
    } finally {
        App.elements.sendIcon.classList.remove('hidden');
        App.elements.stopIcon.classList.add('hidden');
        App.elements.sendBtn.classList.remove('bg-red-600', 'hover:bg-red-700');
        App.elements.sendBtn.classList.add('bg-accent', 'hover:bg-accent-hover');
        App.updateSendButtonState();
        App.elements.userInput.disabled = false;
        App.isStreaming = false; // Ensure streaming flag is reset
    }
};

// Enters "edit message" mode, populating the input with a message's content
const enterEditMode = (chatId, messageIndex) => {
    const chat = App.state.chats.find(c => c.id === chatId);
    if (!chat) return;

    const message = chat.messages[messageIndex];
    if (!message) return;
    
    // Clear any previous image preview and attached data
    App.elements.imagePreviewContainer.innerHTML = '';
    App.elements.imagePreviewContainer.classList.add('hidden');
    App.attachedImageData = null;
    App.elements.imageUpload.value = null;

    // Handle multimodal messages (array content) or plain text
    if (Array.isArray(message.content)) {
        const textPart = message.content.find(p => p.type === 'text');
        const imagePart = message.content.find(p => p.type === 'image_url');

        App.elements.userInput.value = textPart ? textPart.text : '';

        // If an image part exists, display it in the preview and set state
        if (imagePart && imagePart.image_url.url) {
            App.attachedImageData = { dataUrl: imagePart.image_url.url }; // Set the state for resending
            
            App.elements.imagePreviewContainer.innerHTML = `
                <div class="relative inline-block">
                    <img src="${imagePart.image_url.url}" class="h-20 w-20 object-cover rounded-lg">
                    <button id="remove-image-btn" class="absolute top-0 right-0 -mt-2 -mr-2 bg-red-500 text-white rounded-full p-1 leading-none">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
            `;
            App.elements.imagePreviewContainer.classList.remove('hidden');

            document.getElementById('remove-image-btn').onclick = () => {
                App.attachedImageData = null;
                App.elements.imageUpload.value = null;
                App.elements.imagePreviewContainer.innerHTML = '';
                App.elements.imagePreviewContainer.classList.add('hidden');
            };
        }
    } else {
        // Handle legacy/text-only messages
        App.elements.userInput.value = message.content;
    }

    App.state.editingMessage = { chatId, messageIndex }; // Store which message is being edited
    App.elements.userInput.focus();
    App.elements.sendIcon.classList.add('hidden');    // Hide send icon
    App.elements.saveIcon.classList.remove('hidden'); // Show save icon
    App.elements.editIndicator.classList.remove('hidden'); // Show "Editing message" indicator
    App.elements.editIndicator.classList.add('flex'); // Ensure it's a flex container
};

// Exits "edit message" mode, clearing the input and resetting UI
const exitEditMode = () => {
    App.state.editingMessage = null;
    App.elements.userInput.value = '';
    App.elements.sendIcon.classList.remove('hidden');
    App.elements.saveIcon.classList.add('hidden');
    App.elements.editIndicator.classList.add('hidden');
    App.elements.editIndicator.classList.remove('flex'); // Remove flex class

    // Clear attached image preview and data
    App.attachedImageData = null;
    App.elements.imageUpload.value = null;
    App.elements.imagePreviewContainer.innerHTML = '';
    App.elements.imagePreviewContainer.classList.add('hidden');

    App.renderChat(); // Re-render chat (to remove any temporary edit highlights, etc.)
};

// Toggles the visibility of the sidebar
const toggleSidebar = () => {
    const isMobile = window.innerWidth < 768;
    App.elements.sidebar.classList.toggle(isMobile ? 'open' : 'closed');
    if (isMobile) App.elements.sidebarOverlay.classList.toggle('open');
};

// Expose these core chat functions globally via the App object
App.createChat = createChat;
App.addMessage = addMessage;
App.setActive = setActive;
App.loadAvailableModels = loadAvailableModels;
App.loadDataFromServer = loadDataFromServer;
App.handleNewChat = handleNewChat;
App.sendMessage = sendMessage;
App.enterEditMode = enterEditMode;
App.exitEditMode = exitEditMode;
App.toggleSidebar = toggleSidebar;
```

---

**`js/settings.js`**

```javascript
// js/settings.js
// Manages application-wide settings such as theme and font preferences

// Applies the selected font family to the body
const applyFont = (font) => {
    Object.keys(App.FONTS).forEach(f => App.elements.body.classList.remove(`font-${f}`)); // Remove existing font classes
    App.elements.body.classList.add(`font-${font}`); // Add new font class
    App.state.settings.font = font; // Update state
    App.saveState(); // Persist state
    App.renderFontOptions(); // Re-render font options to show active selection
};

// Applies the selected font weight to the body
const applyFontWeight = (weight) => {
    App.elements.body.style.fontWeight = weight; // Apply font weight
    App.state.settings.fontWeight = weight; // Update state
    App.saveState(); // Persist state
    App.renderFontWeightOptions(); // Re-render font weight options to show active selection
};

// Renders the font family selection options in the settings modal
const renderFontOptions = () => {
    const currentFont = App.state.settings.font;
    App.elements.settingsModal.fontOptions.innerHTML = '<div><label class="text-sm font-medium text-light-text-subtle dark:text-dark-text-subtle">Font Family</label></div>';
    Object.entries(App.FONTS).forEach(([key, name]) => {
        const btn = document.createElement('button');
        btn.className = `w-full text-left px-3 py-2 rounded-md transition-colors text-sm ${currentFont === key ? 'bg-accent text-white font-semibold' : 'hover:bg-light-border-hover dark:hover:bg-dark-border-hover'}`;
        btn.textContent = name;
        btn.onclick = () => { App.applyFont(key); };
        App.elements.settingsModal.fontOptions.appendChild(btn);
    });
};

// Renders the font weight slider and label in the settings modal
const renderFontWeightOptions = () => {
    const currentWeight = App.state.settings.fontWeight;
    App.elements.settingsModal.fontWeightOptions.innerHTML = `<div class="flex justify-between items-center"><label class="text-sm font-medium text-light-text-subtle dark:text-dark-text-subtle">Font Weight</label><span id="font-weight-label" class="text-sm text-light-text-subtle dark:text-dark-text-subtle">${App.FONT_WEIGHTS[currentWeight]}</span></div><input type="range" id="font-weight-slider" class="w-full h-2 bg-light-border dark:bg-dark-border rounded-lg appearance-none cursor-pointer accent-accent" min="0" max="${Object.keys(App.FONT_WEIGHTS).length - 1}" step="1" value="${Object.keys(App.FONT_WEIGHTS).indexOf(currentWeight)}">`;
    document.getElementById('font-weight-slider').addEventListener('input', (e) => {
        const weight = Object.keys(App.FONT_WEIGHTS)[e.target.value];
        App.applyFontWeight(weight);
        document.getElementById('font-weight-label').textContent = App.FONT_WEIGHTS[weight];
    });
};

// Applies the specified theme (light or dark) to the document
const applyTheme = (theme) => {
    const isDark = theme === 'dark';
    document.documentElement.classList.toggle('dark', isDark); // Toggle dark class on <html>
    App.elements.themeIconLight.classList.toggle('hidden', isDark); // Show/hide sun icon
    App.elements.themeIconDark.classList.toggle('hidden', !isDark); // Show/hide moon icon
    localStorage.setItem('theme', theme); // Persist theme preference
};

// Toggles between light and dark themes with a view transition animation
const toggleTheme = (event) => {
    const isDark = document.documentElement.classList.contains('dark');
    const newTheme = isDark ? 'light' : 'dark';

    // Fallback for browsers not supporting View Transitions API
    if (!document.startViewTransition) {
        applyTheme(newTheme);
        return;
    }
    
    // Calculate click coordinates for circular reveal animation
    const btn = App.elements.themeToggleBtn;
    const rect = btn.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    document.documentElement.style.setProperty('--cx', cx + 'px');
    document.documentElement.style.setProperty('--cy', cy + 'px');

    // Start the view transition
    document.startViewTransition(() => {
        applyTheme(newTheme);
    });
};

// Expose these settings functions globally via the App object
App.applyFont = applyFont;
App.applyFontWeight = applyFontWeight;
App.renderFontOptions = renderFontOptions;
App.renderFontWeightOptions = renderFontWeightOptions;
App.applyTheme = applyTheme;
App.toggleTheme = toggleTheme;
```
*Note: In `settings.js`, I've added `App.elements.themeIconLight` and `App.elements.themeIconDark`. You'll need to define these in `js/elements.js` if they don't already exist or if you need to use them from the `App` object.*

```javascript
// Add these to elements.js if they are not already there
// ... inside the elements object ...
    themeIconLight: document.getElementById('theme-icon-light'),
    themeIconDark: document.getElementById('theme-icon-dark'),
// ...
```

---

**`js/main.js`**

```javascript
// js/main.js
// Main entry point for the application. Initializes state, loads data, and sets up event listeners.

const init = async () => {
    // 1. Load available models from the backend
    await App.loadAvailableModels();

    // 2. Apply the user's preferred theme on startup.
    const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    App.applyTheme(savedTheme);

    // 3. Load cached data from localStorage for optimistic UI display
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
            
            // Manually set user for immediate UI update (Supabase's getUser() can be async)
            const { data: { user } } = await App.supabaseClient.auth.getUser();
            App.state.currentUser = user;
            
            await App.loadDataFromServer(); // Fetch latest data from backend
            App.closeAllModals();           // Close any open modals
            App.openAlertModal('Success', 'You have successfully signed in.'); // Show success message

        } else if (event === 'SIGNED_OUT') {
            console.log('User signed out.');
            // Clear all local storage related to user session and chats
            localStorage.removeItem('authToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('fronixChats');
            localStorage.removeItem('lastActiveChatId');
            
            // Reset application state
            App.state.currentUser = null;
            App.state.chats = [];
            App.state.activeId = null;
            
            // Update UI to reflect logged-out state
            App.updateLoginStateUI();
            App.renderSidebar();
            App.renderChat();
        }
    });
    
    // 5. Check if a token already exists on page load and fetch latest data from server
    const existingToken = localStorage.getItem('authToken');
    if (existingToken) {
        console.log('An existing auth token was found on page load. Loading user data from server.');
        await App.loadDataFromServer(); // Use await here to ensure data is loaded before proceeding
    } else {
        console.log('No existing auth token found. Ensuring logged-out state.');
        App.updateLoginStateUI();
    }
    
    // 6. Apply UI settings and attach all event listeners.
    App.applyFont(App.state.settings.font);
    App.applyFontWeight(App.state.settings.fontWeight);
    App.renderFontOptions();
    App.renderFontWeightOptions();
    App.updateProModelsToggleUI();
    
    // Settings modal API Token input listener
    App.elements.settingsModal.apiTokenInput.addEventListener('change', (e) => {
        App.state.settings.apiToken = e.target.value;
        App.saveState();
    });

    // Alert modal OK button
    App.elements.alertModal.okBtn.onclick = App.closeAlertModal;

    // Pro Models toggle switch listener
    App.elements.settingsModal.proModelsToggle.addEventListener('click', () => {
        if (App.state.currentUser && App.state.currentUser.plan === 'pro') {
            App.state.settings.proModelsEnabled = !App.state.settings.proModelsEnabled;
            App.updateProModelsToggleUI();
            App.saveState();
            App.renderModelDropdown();

            // After toggling pro models, ensure the currently selected model is still available
            const currentModelData = App.MODELS[App.state.settings.model];
            if (currentModelData && currentModelData.pro && !App.state.settings.proModelsEnabled) {
                const defaultNonProModel = Object.keys(App.MODELS).find(key => !App.MODELS[key].pro);
                if (defaultNonProModel) {
                    App.state.settings.model = defaultNonProModel;
                    App.saveState();
                    App.updateModelSelectorDisplay();
                    App.renderModelDropdown();
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
            if (App.currentController) App.currentController.abort(); // Stop streaming
        } else {
            App.sendMessage(); // Send message
        }
    };

    // Scroll to bottom button
    App.elements.scrollToBottomBtn.onclick = App.scrollToBottom;

    // Chatbox scroll event listener for "scroll to bottom" button visibility
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
    } else if (!App.state.activeId) {
        // If chats exist but no activeId is set (e.g., first load after clearing activeId), activate the first one
        App.setActive(App.state.chats[0].id);
    } else {
        // If an active ID is already set, ensure it's properly activated and rendered
        App.setActive(App.state.activeId);
    }
    

    // Image attachment logic
    App.elements.attachBtn.onclick = () => App.elements.imageUpload.click();

    App.elements.imageUpload.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        // Check file size (50MB limit)
        const maxSize = 50 * 1024 * 1024;
        if (file.size > maxSize) {
            App.openAlertModal('File Size Exceeded', 'File size must be less than 50MB.');
            App.elements.imageUpload.value = null; // Clear the input
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            App.attachedImageData = { file: file, dataUrl: e.target.result };

            App.elements.imagePreviewContainer.innerHTML = `
                <div class="relative inline-block">
                    <img src="${e.target.result}" class="h-20 w-20 object-cover rounded-lg">
                    <button id="remove-image-btn" class="absolute top-0 right-0 -mt-2 -mr-2 bg-red-500 text-white rounded-full p-1 leading-none">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
            `;
            App.elements.imagePreviewContainer.classList.remove('hidden');

            document.getElementById('remove-image-btn').onclick = () => {
                App.attachedImageData = null;
                App.elements.imageUpload.value = null;
                App.elements.imagePreviewContainer.innerHTML = '';
                App.elements.imagePreviewContainer.classList.add('hidden');
            };
        };
        reader.readAsDataURL(file);
    });
};
    
// Attach main init function to DOMContentLoaded
document.addEventListener('DOMContentLoaded', init);

// Event Listeners for various UI interactions
App.elements.themeToggleBtn.onclick = App.toggleTheme;
App.elements.newChatBtn.onclick = App.handleNewChat;
App.elements.toggleSidebarBtn.onclick = App.toggleSidebar; 
App.elements.sidebarOverlay.onclick = App.toggleSidebar;

// User input textarea auto-resize and autocomplete
App.elements.userInput.addEventListener('input', () => {
    App.elements.userInput.style.height = 'auto';
    App.elements.userInput.style.height = (App.elements.userInput.scrollHeight) + 'px';
    App.updateSendButtonState();

    const inputValue = App.elements.userInput.value;
    if (inputValue.startsWith('/')) {
        App.elements.autocompleteSuggestions.classList.remove('hidden');
    } else {
        App.elements.autocompleteSuggestions.classList.add('hidden');
    }
});

// User input textarea keydown for sending messages
App.elements.userInput.addEventListener('keydown', e => {
    const isMobile = window.innerWidth < 768;
    if (e.key === 'Enter' && !e.shiftKey) {
        if (!isMobile) {
            e.preventDefault();
            App.sendMessage();
        }
    }
});

// Autocomplete for /study command
App.elements.studyCommandBtn.addEventListener('click', () => {
    App.elements.userInput.value = '/study';
    App.elements.autocompleteSuggestions.classList.add('hidden');
    App.elements.userInput.focus();
});

// Settings button and modal
App.elements.settingsBtn.onclick = () => App.animateModalOpen(App.elements.settingsModal.container);
App.elements.settingsModal.closeBtn.onclick = () => App.animateModalClose(App.elements.settingsModal.container);
App.elements.settingsModal.resetBtn.onclick = () => {
  localStorage.clear();
  window.location.reload(); // Hard refresh to reset everything
};

// Rename chat modal actions
App.elements.renameModal.saveBtn.onclick = async () => {
    const { chatId } = App.state.modalContext;
    const newName = App.elements.renameModal.input.value.trim();
    if (!newName) return;

    const token = localStorage.getItem('authToken');
    if (!token) {
        App.openAlertModal("Authentication error", "Please sign in again.");
        return;
    }

    const chatToRename = App.state.chats.find(c => c.id === chatId);
    if (!chatToRename) {
        App.closeAllModals();
        return;
    }
    const originalTitle = chatToRename.title; // Store original for rollback

    // Optimistic UI update
    chatToRename.title = newName;
    if (chatId === App.state.activeId) {
        App.elements.chatTitle.textContent = newName;
    }
    console.log('[renameModal.saveBtn.onclick] State after optimistic update. App.state.chats:', JSON.parse(JSON.stringify(App.state.chats)));
    console.log('[renameModal.saveBtn.onclick] State after optimistic update. App.state.activeId:', App.state.activeId);
    App.renderSidebar();
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

        console.log(`Chat ${chatId} renamed successfully to "${newName}"`);

    } catch (error) {
        console.error("Error renaming chat:", error);
        App.openAlertModal('Error', `Failed to rename chat: ${error.message}`);
        
        // Revert optimistic UI update on error
        chatToRename.title = originalTitle;
        if (chatId === App.state.activeId) {
            App.elements.chatTitle.textContent = originalTitle;
        }
        console.log('[renameModal.saveBtn.onclick] Error rollback. App.state.chats:', JSON.parse(JSON.stringify(App.state.chats)));
        console.log('[renameModal.saveBtn.onclick] Error rollback. App.state.activeId:', App.state.activeId);
        App.renderSidebar();
        App.saveState();
    } finally {
        App.updateSendButtonState();
        console.log('[renameModal.saveBtn.onclick] Finally block executed. Button state updated.');
    }
};

// Delete chat modal actions
App.elements.deleteModal.confirmBtn.onclick = async () => {
    const { chatId } = App.state.modalContext;
    const token = localStorage.getItem('authToken');
    if (!token) {
        App.openAlertModal("Authentication error", "Please sign in again.");
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
    } else if (chatId === oldActiveId) {
        // If the deleted chat was the active one, activate the nearest chat
        App.state.activeId = App.state.chats[Math.max(0, chatToDeleteIndex - 1)]?.id || App.state.chats[0]?.id;
    }
    
    App.renderSidebar(); // Update sidebar immediately
    App.renderChat();   // Update chat area immediately
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

        console.log(`Chat ${chatId} deleted successfully.`);
        // If no chats left after deletion, ensure a new chat is created
        if (App.state.chats.length === 0) {
            await App.handleNewChat();
        }

    } catch (error) {
        console.error("Error deleting chat:", error);
        App.openAlertModal('Error', `Failed to delete chat: ${error.message}`);
        
        // Revert optimistic UI update on error
        App.state.chats.splice(chatToDeleteIndex, 0, chatToDelete); // Re-add chat
        App.state.activeId = oldActiveId; // Restore activeId
        console.log('[deleteModal.confirmBtn.onclick] Error rollback. App.state.chats:', JSON.parse(JSON.stringify(App.state.chats)));
        console.log('[deleteModal.confirmBtn.onclick] Error rollback. App.state.activeId:', App.state.activeId);
        App.renderSidebar(); // Re-render sidebar
        App.renderChat();   // Re-render chat area
        App.saveState();
    } finally {
        App.updateSendButtonState();
        console.log('[deleteModal.confirmBtn.onclick] Finally block executed. Button state updated.');
    }
};

// Close modals when clicking outside or on cancel buttons
[App.elements.settingsModal.container, App.elements.renameModal.container, App.elements.deleteModal.container, App.elements.signinModal.container].forEach(el => el.onclick = (e) => { if (e.target === el) App.closeAllModals(); });
[App.elements.renameModal.cancelBtn, App.elements.deleteModal.cancelBtn, App.elements.signinModal.closeBtn].forEach(el => el.onclick = App.closeAllModals);

// Cancel edit button
App.elements.cancelEditBtn.onclick = App.exitEditMode;
App.updateSendButtonState(); // Update after exitEditMode listener setup

// Sign-in button
App.elements.signinBtn.onclick = () => App.animateModalOpen(App.elements.signinModal.container);

// Logout button
App.elements.logoutBtn.onclick = async () => {
    const { error } = await App.supabaseClient.auth.signOut();
    if (error) {
        console.error('Error logging out:', error);
        App.openAlertModal('Logout Error', 'An error occurred while logging out. Please try again.');
    }
};

// Profile button and dropdown toggle
App.elements.profileBtn.onclick = () => {
    const isHidden = App.elements.profileDropdown.classList.contains('hidden');
    App.elements.profileDropdown.classList.toggle('hidden', !isHidden);
};

// Close profile dropdown if clicked outside
document.addEventListener('click', (e) => {
    if (!App.elements.profileSection.contains(e.target)) {
        App.elements.profileDropdown.classList.add('hidden');
    }
});

// Sign In / Sign Up Toggle
App.elements.signinModal.signinTabBtn.addEventListener('click', () => {
    App.elements.signinModal.signinView.classList.remove('hidden');
    App.elements.signinModal.signupView.classList.add('hidden');
    App.elements.signinModal.signinTabBtn.classList.add('text-accent', 'border-accent');
    App.elements.signinModal.signinTabBtn.classList.remove('text-light-text-subtle', 'dark:text-dark-text-subtle', 'border-transparent');
    App.elements.signinModal.signupTabBtn.classList.remove('text-accent', 'border-accent');
    App.elements.signinModal.signupTabBtn.classList.add('text-light-text-subtle', 'dark:text-dark-text-subtle', 'border-transparent');
});

App.elements.signinModal.signupTabBtn.addEventListener('click', () => {
    App.elements.signinModal.signupView.classList.remove('hidden');
    App.elements.signinModal.signinView.classList.add('hidden');
    App.elements.signinModal.signupTabBtn.classList.add('text-accent', 'border-accent');
    App.elements.signinModal.signupTabBtn.classList.remove('text-light-text-subtle', 'dark:text-dark-text-subtle', 'border-transparent');
    App.elements.signinModal.signinTabBtn.classList.remove('text-accent', 'border-accent');
    App.elements.signinModal.signinTabBtn.classList.add('text-light-text-subtle', 'dark:text-dark-text-subtle', 'border-transparent');
});

// Password visibility toggle
App.elements.signinModal.passwordToggleBtn.addEventListener('click', () => {
    const isPassword = App.elements.signinModal.passwordInput.type === 'password';
    App.elements.signinModal.passwordInput.type = isPassword ? 'text' : 'password';
    App.elements.signinModal.eyeOpenIcon.classList.toggle('hidden', isPassword);
    App.elements.signinModal.eyeClosedIcon.classList.toggle('hidden', !isPassword);
});

// Sign in/up with email/password buttons
App.elements.signinModal.signinEmailBtn.onclick = () => {
    const email = App.elements.signinModal.signinEmail.value;
    const password = App.elements.signinModal.passwordInput.value;
    App.handleSignIn(email, password);
};

App.elements.signinModal.signupEmailBtn.onclick = () => {
    const email = App.elements.signinModal.signupEmail.value;
    const password = App.elements.signinModal.signupPassword.value;
    App.handleSignUp(email, password);
};

// Google sign in/up buttons
App.elements.signinModal.signinGoogleBtn.onclick = App.handleGoogleLogin;
App.elements.signinModal.signupGoogleBtn.onclick = App.handleGoogleLogin;

// Model selector dropdown toggle
App.elements.modelSelector.onclick = () => {
  const isHidden = App.elements.modelDropdown.style.display === 'none' || App.elements.modelDropdown.style.display === '';
  App.elements.modelDropdown.style.display = isHidden ? 'block' : 'none';
};
// Close model dropdown if clicked outside
document.addEventListener('click', (e) => {
  if (!App.elements.modelSelector.contains(e.target) && !App.elements.modelDropdown.contains(e.target)) {
    App.elements.modelDropdown.style.display = 'none';
  }
});
```

---

This detailed breakdown provides the new files, their content, and the necessary changes to `index.html`. Remember to carefully move the code, update `App.` prefixes, and verify functionality after each section is moved. This refactoring greatly improves the organization and maintainability of your frontend application.