// js/state.js
// Manages global application state and the Supabase client.
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Initialize global state. This will be saved to localStorage.
App.state = App.state || {
    chats: [],
    activeId: null,
    editingMessage: null,
    supabaseAuthToken: null,
    currentUser: null, // Ensure currentUser is always initialized, even if null
    settings: {
        model: 'openai-large',
        apiKey: '',
        proModelsEnabled: false,
        temperature: 0.7,
        topP: 1,
        maxTokens: 1000,
        font: 'Inter',
        fontWeight: '400',
        systemPrompt: App.SYSTEM_PROMPT_BASE // Default system prompt
    }
};
// Expose functions and variables to the global App scope
App.supabaseClient = supabaseClient;

App.saveState = function() {
    console.log('[App.saveState] Saving state...');
    localStorage.setItem('appState', JSON.stringify(App.state));
    console.log('[App.saveState] State saved.');
};

App.loadState = function() {
    console.log('[App.loadState] Loading state...');
    const savedState = localStorage.getItem('appState');
    if (savedState) {
        try {
            const parsedState = JSON.parse(savedState);
            // Merge loaded state with current default state to ensure new properties are included
            App.state = {
                ...App.state,
                ...parsedState,
                settings: { ...App.state.settings, ...parsedState.settings }
            };
            console.log('[App.loadState] State loaded:', JSON.parse(JSON.stringify(App.state)));
        } catch (e) {
            console.error('Error parsing saved state, resetting to default:', e);
            localStorage.removeItem('appState'); // Clear corrupted state
            // App.state remains as initialized defaults
        }
    }
    console.log('[App.loadState] Finished loading state.');
};
