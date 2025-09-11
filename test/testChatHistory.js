const axios = require('axios');
const assert = require('assert');

const API_BASE_URL = 'http://localhost:3001';

// !!! IMPORTANT: Replace with actual user ID and a valid auth token !!!
// You'll need to obtain these from your running application after a user logs in.
const MOCK_USER_ID = process.env.TEST_USER_ID || 'YOUR_MOCK_USER_ID'; 
const MOCK_AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || 'YOUR_MOCK_AUTH_TOKEN';

const headers = {
    'Authorization': `Bearer ${MOCK_AUTH_TOKEN}`,
    'Content-Type': 'application/json'
};

async function createChat(title = 'Test Chat') {
    try {
        const response = await axios.post(`${API_BASE_URL}/api/chat`, { title }, { headers });
        return response.data;
    } catch (error) {
        console.error('Error creating chat:', error.response ? error.response.data : error.message);
        throw error;
    }
}

async function saveMessages(chatId, userMessage, assistantMessage) {
    try {
        const response = await axios.post(`${API_BASE_URL}/api/chat/${chatId}/save-messages`, { userMessage, assistantMessage }, { headers });
        return response.data;
    } catch (error) {
        console.error('Error saving messages:', error.response ? error.response.data : error.message);
        throw error;
    }
}

async function getChatMessages(chatId) {
    try {
        const response = await axios.get(`${API_BASE_URL}/api/chat/${chatId}/messages`, { headers });
        return response.data;
    } catch (error) {
        console.error('Error getting chat messages:', error.response ? error.response.data : error.message);
        throw error;
    }
}

async function getAllChats() {
    try {
        const response = await axios.get(`${API_BASE_URL}/api/chat`, { headers });
        return response.data;
    } catch (error) {
        console.error('Error getting all chats:', error.response ? error.response.data : error.message);
        throw error;
    }
}

async function deleteChat(chatId) {
    try {
        const response = await axios.delete(`${API_BASE_URL}/api/chat/${chatId}`, { headers });
        return response.data;
    } catch (error) {
        console.error('Error deleting chat:', error.response ? error.response.data : error.message);
        throw error;
    }
}

async function toggleStudyMode(chatId) {
    try {
        const response = await axios.post(`${API_BASE_URL}/api/chat/${chatId}/toggle-study-mode`, {}, { headers });
        return response.data;
    } catch (error) {
        console.error('Error toggling study mode:', error.response ? error.response.data : error.message);
        throw error;
    }
}

async function runChatHistoryTests() {
    console.log('--- Running Chat History Tests ---');

    if (MOCK_USER_ID === 'YOUR_MOCK_USER_ID' || MOCK_AUTH_TOKEN === 'YOUR_MOCK_AUTH_TOKEN') {
        console.warn('WARNING: Please replace MOCK_USER_ID and MOCK_AUTH_TOKEN in test/testChatHistory.js with actual values.');
        console.warn('Skipping tests due to missing credentials.');
        return;
    }

    let chat1Id, chat2Id;

    try {
        // Test 1: Create a new chat and add messages
        console.log('\nTest 1: Creating a new chat and adding messages...');
        const chat1 = await createChat('Chat History Test 1');
        chat1Id = chat1.id;
        assert.ok(chat1Id, 'Chat 1 should be created');
        console.log(`Chat 1 created with ID: ${chat1Id}`);

        await saveMessages(chat1Id, 'Hello AI', 'Hi there! How can I help you?');
        await saveMessages(chat1Id, 'Explain LLMs', 'LLMs are large language models...');
        console.log('Messages added to Chat 1.');

        const messages1 = await getChatMessages(chat1Id);
        assert.strictEqual(messages1.length, 4, 'Chat 1 should have 4 messages (user, assistant, user, assistant)');
        console.log(`Chat 1 has ${messages1.length} messages.`);

        // Test 2: Create another chat and add messages
        console.log('\nTest 2: Creating another chat and adding messages...');
        const chat2 = await createChat('Chat History Test 2');
        chat2Id = chat2.id;
        assert.ok(chat2Id, 'Chat 2 should be created');
        console.log(`Chat 2 created with ID: ${chat2Id}`);

        await saveMessages(chat2Id, 'What is quantum physics?', 'Quantum physics is a fundamental theory...');
        console.log('Messages added to Chat 2.');

        const messages2 = await getChatMessages(chat2Id);
        assert.strictEqual(messages2.length, 2, 'Chat 2 should have 2 messages');
        console.log(`Chat 2 has ${messages2.length} messages.`);

        // Test 3: Get all chats and verify their presence
        console.log('\nTest 3: Getting all chats...');
        const allChats = await getAllChats();
        assert.ok(allChats.length >= 2, 'Should retrieve at least 2 chats');
        const foundChat1 = allChats.find(c => c.id === chat1Id);
        const foundChat2 = allChats.find(c => c.id === chat2Id);
        assert.ok(foundChat1, 'Chat 1 should be in the list of all chats');
        assert.ok(foundChat2, 'Chat 2 should be in the list of all chats');
        console.log('All chats retrieved successfully. Chat 1 and Chat 2 found.');

        // Test 4: Verify messages of a specific chat after getting all chats
        console.log('\nTest 4: Verifying messages of Chat 1 after getting all chats...');
        const retrievedMessages1 = await getChatMessages(chat1Id);
        assert.strictEqual(retrievedMessages1.length, 4, 'Retrieved messages for Chat 1 should still be 4');
        console.log('Messages for Chat 1 verified.');

        console.log('\nTest 5: Verifying messages of Chat 2 after getting all chats...');
        const retrievedMessages2 = await getChatMessages(chat2Id);
        assert.strictEqual(retrievedMessages2.length, 2, 'Retrieved messages for Chat 2 should still be 2');
        console.log('Messages for Chat 2 verified.');

        console.log('\nAll chat history tests passed!');

    } catch (error) {
        console.error('\n--- Chat History Test Failed ---');
        console.error(error);
        throw error; // Re-throw to indicate failure
    } finally {
        // Clean up created chats
        if (chat1Id) {
            try {
                await deleteChat(chat1Id);
                console.log(`Cleaned up Chat 1: ${chat1Id}`);
            } catch (err) {
                console.error(`Failed to clean up Chat 1: ${chat1Id}`, err.message);
            }
        }
        if (chat2Id) {
            try {
                await deleteChat(chat2Id);
                console.log(`Cleaned up Chat 2: ${chat2Id}`);
            } catch (err) {
                console.error(`Failed to clean up Chat 2: ${chat2Id}`, err.message);
            }
        }
        console.log('--- Chat History Tests Finished ---');
    }
}

// --- Optimistic UI Test Helpers ---

// Mock frontend state and elements for testing optimistic UI
let mockState = {
    chats: [],
    activeId: null,
    editingMessage: null,
    modalContext: {},
    settings: { model: 'openai' },
    currentUser: { id: MOCK_USER_ID, email: 'test@example.com', plan: 'basic' }
};

const mockElements = {
    chatList: { innerHTML: '' },
    chatTitle: { textContent: '' },
    userInput: { value: '', style: { height: 'auto' }, disabled: false },
    sendBtn: { classList: { add: () => {}, remove: () => {} }, disabled: false },
    sendIcon: { classList: { add: () => {}, remove: () => {} } },
    stopIcon: { classList: { add: () => {}, remove: () => {} } },
    profileSection: { classList: { add: () => {}, remove: () => {} } },
    logoutBtn: { classList: { add: () => {}, remove: () => {} } },
    signinBtn: { classList: { add: () => {}, remove: () => {} } },
    renameModal: { input: { value: '' }, container: { style: { display: 'none' } } },
    deleteModal: { message: { textContent: '' }, container: { style: { display: 'none' } }, confirmBtn: { onclick: null }, cancelBtn: { onclick: null } },
    signinModal: { container: { style: { display: 'none' } }, closeBtn: { onclick: null } },
    profileDropdown: { classList: { add: () => {}, remove: () => {} } },
    settingsModal: { container: { style: { display: 'none' } }, closeBtn: { onclick: null }, resetBtn: { onclick: null }, apiTokenInput: { value: '' } },
    autocompleteSuggestions: { classList: { add: () => {}, remove: () => {} } },
    studyCommandBtn: { addEventListener: () => {} }
};

// Mock functions that interact with the DOM or global state
const mockRenderSidebar = () => { /* console.log('Mock renderSidebar called'); */ };
const mockRenderChat = () => { /* console.log('Mock renderChat called'); */ };
const mockSaveState = () => { /* console.log('Mock saveState called'); */ };
const mockUpdateLoginStateUI = () => { /* console.log('Mock updateLoginStateUI called'); */ };
const mockUpdateProfileUI = () => { /* console.log('Mock updateProfileUI called'); */ };
const mockAnimateModalOpen = (modal) => { modal.style.display = 'flex'; };
const mockAnimateModalClose = (modal, onComplete) => { modal.style.display = 'none'; if (onComplete) onComplete(); };
const mockCloseAllModals = () => {
    mockElements.renameModal.container.style.display = 'none';
    mockElements.deleteModal.container.style.display = 'none';
    mockElements.signinModal.container.style.display = 'none';
    mockElements.settingsModal.container.style.display = 'none';
    mockElements.profileDropdown.classList.add('hidden'); // Ensure dropdown is hidden
};

// Override global functions/variables with mocks for testing purposes
let originalFetch;
let originalSetTimeout;
let originalRequestAnimationFrame;
let originalLocalStorage;
let originalAlert;
let originalAddEventListener;
let originalRemoveEventListener;
let originalDocument;

function setupMocks() {
    originalFetch = global.fetch;
    global.fetch = async (url, options) => {
        const token = options.headers['Authorization'] ? options.headers['Authorization'].split(' ')[1] : '';
        if (token === 'INVALID_TOKEN') {
            return {
                ok: false,
                status: 401,
                json: async () => ({ error: 'Invalid or expired token' }),
                text: async () => 'Invalid or expired token'
            };
        }
        // Simulate network error for specific URL or condition
        if (url.includes('simulate-error')) {
            throw new Error('Network error simulated');
        }
        // Fallback to original fetch for actual API calls in tests
        return originalFetch(url, options);
    };

    originalSetTimeout = global.setTimeout;
    global.setTimeout = (fn, delay) => fn(); // Immediately execute for testing

    originalRequestAnimationFrame = global.requestAnimationFrame;
    global.requestAnimationFrame = (fn) => fn(); // Immediately execute for testing

    originalLocalStorage = global.localStorage;
    global.localStorage = {
        _data: {},
        setItem: function(id, val) { this._data[id] = String(val); },
        getItem: function(id) { return this._data.hasOwnProperty(id) ? this._data[id] : undefined; },
        removeItem: function(id) { delete this._data[id]; },
        clear: function() { this._data = {}; }
    };

    originalAlert = global.alert;
    global.alert = (msg) => console.log(`MOCK ALERT: ${msg}`); // Mock alert

    originalAddEventListener = global.document.addEventListener;
    global.document.addEventListener = (event, handler) => {
        if (event === 'click') {
            // Store click handler for testing purposes
            mockElements.documentClickHandler = handler;
        }
    };

    originalRemoveEventListener = global.document.removeEventListener;
    global.document.removeEventListener = (event, handler) => {
        if (event === 'click' && mockElements.documentClickHandler === handler) {
            mockElements.documentClickHandler = null;
        }
    };

    originalDocument = global.document;
    global.document = { // Mock document for getElementById
        getElementById: (id) => {
            if (id.startsWith('assistant-msg-')) {
                return { innerHTML: '', id: id }; // Mock message div for streaming
            }
            // Use mockElements for known IDs, otherwise fallback
            return mockElements[id] || { classList: { add: () => {}, remove: () => {}, contains: () => false }, value: '', style: {} };
        },
        querySelector: (selector) => {
            if (selector === '.modal-content') return { style: {}, querySelector: () => ({ style: {} }) }; // For modals
            return null;
        },
        querySelectorAll: (selector) => {
            if (selector === '.modal-container') {
                return [
                    { style: { display: 'none' }, querySelector: () => ({ style: {} }) },
                    { style: { display: 'none' }, querySelector: () => ({ style: {} }) },
                    { style: { display: 'none' }, querySelector: () => ({ style: {} }) },
                    { style: { display: 'none' }, querySelector: () => ({ style: {} }) }
                ];
            }
            return [];
        }
    };
    global.window = {
        innerWidth: 1024, // Mock desktop size
        matchMedia: (query) => ({
            matches: query.includes('dark') // Simulate dark mode preference
        })
    };


    // Replace original functions with mocks
    global.renderSidebar = mockRenderSidebar;
    global.renderChat = mockRenderChat;
    global.saveState = mockSaveState;
    global.updateLoginStateUI = mockUpdateLoginStateUI;
    global.updateProfileUI = mockUpdateProfileUI;
    global.animateModalOpen = mockAnimateModalOpen;
    global.animateModalClose = mockAnimateModalClose;
    global.closeAllModals = mockCloseAllModals;
    global.elements = mockElements; // Make mock elements globally accessible
    global.state = mockState; // Make mock state globally accessible
    global.isStreaming = false;
    global.isGeneratingTitle = false;
    global.attachedImageData = null;
    global.currentController = null;
    global.MODELS = { 'openai': { name: 'OpenAI (Default)', type: 'text' } }; // Mock MODELS
    global.marked = { parse: (text) => text, parseInline: (text) => text }; // Mock marked.js
    global.renderMathInElement = () => {}; // Mock KaTeX
    global.scrollToBottom = () => {}; // Mock scroll

    // Reset mockState for each test
    mockState.chats = [];
    mockState.activeId = null;
    mockState.editingMessage = null;
    mockState.modalContext = {};
    mockState.settings = { model: 'openai', font: 'inter', fontWeight: '400', apiToken: '' };
    mockState.currentUser = { id: MOCK_USER_ID, email: 'test@example.com', plan: 'basic' };
    
    // Reset local storage mock data
    global.localStorage.clear();
    global.localStorage.setItem('authToken', MOCK_AUTH_TOKEN);
}

function restoreMocks() {
    global.fetch = originalFetch;
    global.setTimeout = originalSetTimeout;
    global.requestAnimationFrame = originalRequestAnimationFrame;
    global.localStorage = originalLocalStorage;
    global.alert = originalAlert;
    global.document.addEventListener = originalAddEventListener;
    global.document.removeEventListener = originalRemoveEventListener;
    global.document = originalDocument;

    // Clear globals set by mocks
    global.renderSidebar = undefined;
    global.renderChat = undefined;
    global.saveState = undefined;
    global.updateLoginStateUI = undefined;
    global.updateProfileUI = undefined;
    global.animateModalOpen = undefined;
    global.animateModalClose = undefined;
    global.closeAllModals = undefined;
    global.elements = undefined;
    global.state = undefined;
    global.isStreaming = undefined;
    global.isGeneratingTitle = undefined;
    global.attachedImageData = undefined;
    global.currentController = undefined;
    global.MODELS = undefined;
    global.marked = undefined;
    global.renderMathInElement = undefined;
    global.scrollToBottom = undefined;
}

// --- Optimistic UI Test Cases ---

async function testOptimisticSendMessage() {
    console.log('\n--- Running Optimistic Send Message Test ---');
    setupMocks();

    try {
        mockState.chats = [{ id: 'chat1', title: 'Test Chat', messages: [] }];
        mockState.activeId = 'chat1';
        mockElements.userInput.value = 'Hello AI!';

        // Simulate sendMessage (assuming the real sendMessage is loaded in the global scope)
        // We'll mock the fetch call for the actual AI response
        global.fetch = async (url, options) => {
            if (url.includes('/api/ai/chat')) {
                return new Response(new ReadableStream({
                    start(controller) {
                        controller.enqueue(new TextEncoder().encode('data: {"choices": [{"delta": {"content": "Hi there!"}}]}\n\n'));
                        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
                        controller.close();
                    }
                }));
            }
            // Fallback for other fetches (e.g., save-messages)
            return originalFetch(url, options);
        };

        await global.sendMessage();

        // Assert optimistic updates
        assert.strictEqual(mockState.chats[0].messages.length, 2, 'Should have 2 messages optimistically added');
        assert.strictEqual(mockState.chats[0].messages[0].content, 'Hello AI!', 'User message content should match');
        assert.strictEqual(mockState.chats[0].messages[1].content, 'Hi there!', 'Assistant message should be updated with real response');
        assert.strictEqual(mockElements.userInput.value, '', 'User input should be cleared');
        assert.strictEqual(mockElements.sendBtn.disabled, false, 'Send button should be re-enabled');
        assert.strictEqual(global.isStreaming, false, 'isStreaming should be false');

        console.log('Optimistic send message success.');

    } catch (error) {
        console.error('Optimistic Send Message Test Failed:', error.message);
        assert.fail(error);
    } finally {
        restoreMocks();
    }
}

async function testOptimisticCreateChat() {
    console.log('\n--- Running Optimistic Create Chat Test ---');
    setupMocks();

    try {
        mockState.chats = []; // Start with no chats

        // Simulate successful backend response for chat creation
        global.fetch = async (url, options) => {
            if (url.includes('/api/chat') && options.method === 'POST') {
                return {
                    ok: true,
                    json: async () => ({ id: 'realChatId', title: 'New Chat', created_at: new Date().toISOString() })
                };
            }
            return originalFetch(url, options);
        };

        await global.handleNewChat();

        // Assert optimistic updates
        assert.strictEqual(mockState.chats.length, 1, 'Should have 1 chat optimistically added');
        assert.strictEqual(mockState.chats[0].id, 'realChatId', 'New chat ID should be updated to real ID');
        assert.strictEqual(mockState.chats[0].title, 'New Chat', 'New chat title should be "New Chat"');
        assert.strictEqual(mockState.activeId, 'realChatId', 'New chat should be active');

        console.log('Optimistic create chat success.');

    } catch (error) {
        console.error('Optimistic Create Chat Test Failed:', error.message);
        assert.fail(error);
    } finally {
        restoreMocks();
    }
}

async function testOptimisticCreateChatFailure() {
    console.log('\n--- Running Optimistic Create Chat Failure Test ---');
    setupMocks();

    try {
        mockState.chats = []; // Start with no chats

        // Simulate failed backend response for chat creation
        global.fetch = async (url, options) => {
            if (url.includes('/api/chat') && options.method === 'POST') {
                return {
                    ok: false,
                    status: 500,
                    json: async () => ({ error: 'Server error' }),
                    text: async () => 'Server error'
                };
            }
            return originalFetch(url, options);
        };

        await global.handleNewChat();

        // Assert rollback
        assert.strictEqual(mockState.chats.length, 0, 'Should have 0 chats after rollback');
        assert.strictEqual(mockState.activeId, null, 'Active chat ID should be null after rollback');

        console.log('Optimistic create chat failure test success (rollback verified).');

    } catch (error) {
        console.error('Optimistic Create Chat Failure Test Failed:', error.message);
        assert.fail(error);
    } finally {
        restoreMocks();
    }
}

async function testOptimisticRenameChat() {
    console.log('\n--- Running Optimistic Rename Chat Test ---');
    setupMocks();

    try {
        mockState.chats = [{ id: 'chat1', title: 'Old Title', messages: [] }];
        mockState.activeId = 'chat1';
        mockElements.renameModal.input.value = 'New Chat Title';
        mockState.modalContext.chatId = 'chat1';

        // Simulate successful backend response for rename
        global.fetch = async (url, options) => {
            if (url.includes('/api/chat/chat1') && options.method === 'PUT') {
                return {
                    ok: true,
                    json: async () => ({ id: 'chat1', title: 'New Chat Title' })
                };
            }
            return originalFetch(url, options);
        };

        await global.elements.renameModal.saveBtn.onclick();

        // Assert optimistic update
        assert.strictEqual(mockState.chats[0].title, 'New Chat Title', 'Chat title in state should be updated');
        assert.strictEqual(mockElements.chatTitle.textContent, 'New Chat Title', 'Chat title in header should be updated');
        assert.strictEqual(mockElements.renameModal.container.style.display, 'none', 'Rename modal should be closed');

        console.log('Optimistic rename chat success.');

    } catch (error) {
        console.error('Optimistic Rename Chat Test Failed:', error.message);
        assert.fail(error);
    } finally {
        restoreMocks();
    }
}

async function testOptimisticRenameChatFailure() {
    console.log('\n--- Running Optimistic Rename Chat Failure Test ---');
    setupMocks();

    try {
        mockState.chats = [{ id: 'chat1', title: 'Old Title', messages: [] }];
        mockState.activeId = 'chat1';
        mockElements.renameModal.input.value = 'New Chat Title';
        mockState.modalContext.chatId = 'chat1';

        // Simulate failed backend response for rename
        global.fetch = async (url, options) => {
            if (url.includes('/api/chat/chat1') && options.method === 'PUT') {
                return {
                    ok: false,
                    status: 500,
                    json: async () => ({ error: 'Server error' }),
                    text: async () => 'Server error'
                };
            }
            return originalFetch(url, options);
        };

        await global.elements.renameModal.saveBtn.onclick();

        // Assert rollback
        assert.strictEqual(mockState.chats[0].title, 'Old Title', 'Chat title in state should be reverted');
        assert.strictEqual(mockElements.chatTitle.textContent, 'Old Title', 'Chat title in header should be reverted');
        assert.strictEqual(mockElements.renameModal.container.style.display, 'none', 'Rename modal should be closed');

        console.log('Optimistic rename chat failure test success (rollback verified).');

    } catch (error) {
        console.error('Optimistic Rename Chat Failure Test Failed:', error.message);
        assert.fail(error);
    } finally {
        restoreMocks();
    }
}

async function testOptimisticDeleteChat() {
    console.log('\n--- Running Optimistic Delete Chat Test ---');
    setupMocks();

    try {
        mockState.chats = [{ id: 'chat1', title: 'Chat to Delete', messages: [] }];
        mockState.activeId = 'chat1';
        mockState.modalContext.chatId = 'chat1';

        // Simulate successful backend response for delete
        global.fetch = async (url, options) => {
            if (url.includes('/api/chat/chat1') && options.method === 'DELETE') {
                return { ok: true, json: async () => ({ message: 'Chat deleted' }) };
            }
            // For handleNewChat which is called if no chats remain
            if (url.includes('/api/chat') && options.method === 'POST') {
                return {
                    ok: true,
                    json: async () => ({ id: 'newChatAfterDelete', title: 'New Chat', created_at: new Date().toISOString() })
                };
            }
            return originalFetch(url, options);
        };

        await global.elements.deleteModal.confirmBtn.onclick();

        // Assert optimistic update
        assert.strictEqual(mockState.chats.length, 1, 'Should have 1 chat (newly created after delete)');
        assert.strictEqual(mockState.chats[0].id, 'newChatAfterDelete', 'New chat should be created and active');
        assert.strictEqual(mockElements.deleteModal.container.style.display, 'none', 'Delete modal should be closed');

        console.log('Optimistic delete chat success.');

    } catch (error) {
        console.error('Optimistic Delete Chat Test Failed:', error.message);
        assert.fail(error);
    } finally {
        restoreMocks();
    }
}

async function testOptimisticDeleteChatFailure() {
    console.log('\n--- Running Optimistic Delete Chat Failure Test ---');
    setupMocks();

    try {
        const chatToDelete = { id: 'chat1', title: 'Chat to Delete', messages: [] };
        mockState.chats = [chatToDelete];
        mockState.activeId = 'chat1';
        mockState.modalContext.chatId = 'chat1';

        // Simulate failed backend response for delete
        global.fetch = async (url, options) => {
            if (url.includes('/api/chat/chat1') && options.method === 'DELETE') {
                return {
                    ok: false,
                    status: 500,
                    json: async () => ({ error: 'Server error' }),
                    text: async () => 'Server error'
                };
            }
            return originalFetch(url, options);
        };

        await global.elements.deleteModal.confirmBtn.onclick();

        // Assert rollback
        assert.strictEqual(mockState.chats.length, 1, 'Should have 1 chat after rollback');
        assert.strictEqual(mockState.chats[0].id, 'chat1', 'Deleted chat should be re-added');
        assert.strictEqual(mockState.activeId, 'chat1', 'Active chat ID should be restored');
        assert.strictEqual(mockElements.deleteModal.container.style.display, 'none', 'Delete modal should be closed');

        console.log('Optimistic delete chat failure test success (rollback verified).');

    } catch (error) {
        console.error('Optimistic Delete Chat Failure Test Failed:', error.message);
        assert.fail(error);
    } finally {
        restoreMocks();
    }
}

async function testOptimisticToggleStudyMode() {
    console.log('\n--- Running Optimistic Toggle Study Mode Test ---');
    setupMocks();

    try {
        mockState.chats = [{ id: 'chat1', title: 'Test Chat', messages: [], study_mode: false }];
        mockState.activeId = 'chat1';
        mockElements.userInput.value = '/study';

        // Simulate successful backend response for toggle
        global.fetch = async (url, options) => {
            if (url.includes('/api/chat/chat1/toggle-study-mode') && options.method === 'POST') {
                return { ok: true, json: async () => ({ study_mode: true }) };
            }
            return originalFetch(url, options);
        };

        await global.sendMessage(); // Call sendMessage to trigger /study command

        // Assert optimistic update
        assert.strictEqual(mockState.chats[0].study_mode, true, 'Study mode should be true in state');
        assert.strictEqual(mockState.chats[0].messages[mockState.chats[0].messages.length - 1].content, '📚 Study mode enabled.', 'System message should be displayed');
        assert.strictEqual(mockElements.sendBtn.disabled, false, 'Send button should be re-enabled');

        console.log('Optimistic toggle study mode success.');

    } catch (error) {
        console.error('Optimistic Toggle Study Mode Test Failed:', error.message);
        assert.fail(error);
    } finally {
        restoreMocks();
    }
}

async function testOptimisticToggleStudyModeFailure() {
    console.log('\n--- Running Optimistic Toggle Study Mode Failure Test ---');
    setupMocks();

    try {
        mockState.chats = [{ id: 'chat1', title: 'Test Chat', messages: [], study_mode: false }];
        mockState.activeId = 'chat1';
        mockElements.userInput.value = '/study';

        // Simulate failed backend response for toggle
        global.fetch = async (url, options) => {
            if (url.includes('/api/chat/chat1/toggle-study-mode') && options.method === 'POST') {
                return {
                    ok: false,
                    status: 500,
                    json: async () => ({ error: 'Server error' }),
                    text: async () => 'Server error'
                };
            }
            return originalFetch(url, options);
        };

        await global.sendMessage(); // Call sendMessage to trigger /study command

        // Assert rollback
        assert.strictEqual(mockState.chats[0].study_mode, false, 'Study mode should be reverted to false');
        assert.ok(mockState.chats[0].messages[mockState.chats[0].messages.length - 1].content.includes('⚠️ Failed to toggle study mode. Reverting to disabled.'), 'Error message should be displayed');
        assert.strictEqual(mockElements.sendBtn.disabled, false, 'Send button should be re-enabled');

        console.log('Optimistic toggle study mode failure test success (rollback verified).');

    } catch (error) {
        console.error('Optimistic Toggle Study Mode Failure Test Failed:', error.message);
        assert.fail(error);
    } finally {
        restoreMocks();
    }
}


// Run all tests
async function runAllTests() {
    console.log('--- Starting All Tests ---');
    try {
        await runChatHistoryTests();
        await testOptimisticSendMessage();
        await testOptimisticCreateChat();
        await testOptimisticCreateChatFailure();
        await testOptimisticRenameChat();
        await testOptimisticRenameChatFailure();
        await testOptimisticDeleteChat();
        await testOptimisticDeleteChatFailure();
        await testOptimisticToggleStudyMode();
        await testOptimisticToggleStudyModeFailure();
        console.log('\n--- All Tests Passed Successfully! ---');
    } catch (e) {
        console.error('\n--- One or more tests failed ---');
        console.error(e);
        process.exit(1); // Exit with a non-zero code to indicate failure
    }
}

runAllTests();