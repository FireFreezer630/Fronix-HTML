// testStudyMode.js - Unit tests for Study Mode functionality
const { describe, it, expect, beforeEach, afterEach, jest } = require('@jest/globals');

// Mock DOM elements and API responses
global.localStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
};

global.fetch = jest.fn();
global.console = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
};

// Mock state object
const mockState = {
    chats: [
        {
            id: 'chat1',
            title: 'Test Chat',
            messages: [],
            study_mode: false
        }
    ],
    activeId: 'chat1',
    currentUser: null,
    settings: { model: 'gpt-4.1' }
};

// Mock elements object
const mockElements = {
    studyModeIndicator: {
        classList: {
            add: jest.fn(),
            remove: jest.fn(),
            contains: jest.fn()
        }
    },
    userInput: { value: '', style: {} },
    sendIcon: { classList: { add: jest.fn(), remove: jest.fn() } },
    stopIcon: { classList: { add: jest.fn(), remove: jest.fn() } },
    sendBtn: { classList: { add: jest.fn(), remove: jest.fn() } }
};

// Mock API_BASE_URL
global.API_BASE_URL = 'http://localhost:3000';

describe('Study Mode Functionality', () => {
    let mockStudyModeFunctions;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock the functions that would be available in the actual environment
        mockStudyModeFunctions = {
            isAnonymousUser: jest.fn(),
            handleSlashCommand: jest.fn(),
            addMessage: jest.fn(),
            updateStudyModeIndicator: jest.fn(),
            saveState: jest.fn(),
            showAlert: jest.fn(),
            validateAndRefreshToken: jest.fn()
        };

        // Setup default mocks
        mockStudyModeFunctions.isAnonymousUser.mockReturnValue(false);
        localStorage.getItem.mockImplementation((key) => {
            if (key === 'authToken') return 'mock-token';
            if (key === 'theme') return 'light';
            return null;
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('handleSlashCommand', () => {
        it('should handle /study command correctly', () => {
            const handleSlashCommand = (input) => {
                const trimmed = input.trim();
                const command = trimmed.toLowerCase();

                if (command === '/study') {
                    return { type: 'study', action: 'toggle' };
                } else if (command.startsWith('/study ')) {
                    return { type: 'study', action: 'help' };
                }

                return null;
            };

            expect(handleSlashCommand('/study')).toEqual({ type: 'study', action: 'toggle' });
            expect(handleSlashCommand('/STUDY')).toEqual({ type: 'study', action: 'toggle' });
            expect(handleSlashCommand('/study help')).toEqual({ type: 'study', action: 'help' });
            expect(handleSlashCommand('/study   ')).toEqual({ type: 'study', action: 'toggle' });
            expect(handleSlashCommand('/other')).toBeNull();
        });

        it('should handle /study help command', () => {
            const handleSlashCommand = (input) => {
                const trimmed = input.trim();
                const command = trimmed.toLowerCase();

                if (command === '/study') {
                    return { type: 'study', action: 'toggle' };
                } else if (command.startsWith('/study ')) {
                    return { type: 'study', action: 'help' };
                }

                return null;
            };

            expect(handleSlashCommand('/study help')).toEqual({ type: 'study', action: 'help' });
        });
    });

    describe('Study Mode Toggle', () => {
        it('should toggle study mode from false to true', async () => {
            const toggleStudyMode = async (activeChat) => {
                const originalStudyMode = activeChat.study_mode || false;
                const newStudyModeStatus = !originalStudyMode;

                // Optimistically update UI
                activeChat.study_mode = newStudyModeStatus;
                mockStudyModeFunctions.updateStudyModeIndicator();
                mockStudyModeFunctions.saveState();

                // Simulate API call
                const isAnonymous = mockStudyModeFunctions.isAnonymousUser();
                const endpoint = isAnonymous
                    ? `${API_BASE_URL}/api/chat/anonymous/${activeChat.id}/toggle-study-mode`
                    : `${API_BASE_URL}/api/chat/${activeChat.id}/toggle-study-mode`;

                const headers = { 'Content-Type': 'application/json' };

                if (!isAnonymous) {
                    const token = await mockStudyModeFunctions.validateAndRefreshToken();
                    if (token) {
                        headers['Authorization'] = `Bearer ${token}`;
                    }
                }

                try {
                    const response = await fetch(endpoint, {
                        method: 'POST',
                        headers: headers
                    });

                    if (response.ok) {
                        console.log(`Study mode toggled successfully to: ${newStudyModeStatus}`);
                    }
                } catch (error) {
                    console.error("Error toggling study mode:", error);
                    // Revert optimistic update on error
                    activeChat.study_mode = originalStudyMode;
                    mockStudyModeFunctions.updateStudyModeIndicator();
                    mockStudyModeFunctions.saveState();
                }
            };

            const testChat = { ...mockState.chats[0] };
            await toggleStudyMode(testChat);

            expect(testChat.study_mode).toBe(true);
            expect(mockStudyModeFunctions.updateStudyModeIndicator).toHaveBeenCalled();
            expect(mockStudyModeFunctions.saveState).toHaveBeenCalled();
        });

        it('should handle anonymous user study mode toggle', async () => {
            mockStudyModeFunctions.isAnonymousUser.mockReturnValue(true);
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ study_mode: true })
            });

            const toggleStudyMode = async (activeChat) => {
                const originalStudyMode = activeChat.study_mode || false;
                const newStudyModeStatus = !originalStudyMode;

                activeChat.study_mode = newStudyModeStatus;
                mockStudyModeFunctions.updateStudyModeIndicator();
                mockStudyModeFunctions.saveState();

                const isAnonymous = mockStudyModeFunctions.isAnonymousUser();
                const endpoint = `${API_BASE_URL}/api/chat/anonymous/${activeChat.id}/toggle-study-mode`;

                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });

                if (response.ok) {
                    console.log('Anonymous study mode - state managed locally');
                }
            };

            const testChat = { ...mockState.chats[0] };
            await toggleStudyMode(testChat);

            expect(mockStudyModeFunctions.isAnonymousUser).toHaveBeenCalled();
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/chat/anonymous/'),
                expect.objectContaining({
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                })
            );
        });

        it('should handle authentication errors gracefully', async () => {
            mockStudyModeFunctions.validateAndRefreshToken.mockResolvedValue(null);
            mockStudyModeFunctions.showAlert.mockImplementation(() => {});

            const toggleStudyMode = async (activeChat) => {
                const originalStudyMode = activeChat.study_mode || false;

                if (!mockStudyModeFunctions.isAnonymousUser()) {
                    const token = await mockStudyModeFunctions.validateAndRefreshToken();
                    if (!token) {
                        mockStudyModeFunctions.showAlert('Your session has expired. Please sign in again.', 'warning');
                        return;
                    }
                }
            };

            const testChat = { ...mockState.chats[0] };
            await toggleStudyMode(testChat);

            expect(mockStudyModeFunctions.showAlert).toHaveBeenCalledWith(
                'Your session has expired. Please sign in again.',
                'warning'
            );
        });
    });

    describe('Study Mode UI Updates', () => {
        it('should show study mode indicator when active', () => {
            const updateStudyModeIndicator = () => {
                const activeChat = mockState.chats.find(c => c.id === mockState.activeId);
                if (activeChat && activeChat.study_mode && mockElements.studyModeIndicator) {
                    mockElements.studyModeIndicator.classList.remove('hidden');
                } else if (mockElements.studyModeIndicator) {
                    mockElements.studyModeIndicator.classList.add('hidden');
                }
            };

            // Test when study mode is active
            mockState.chats[0].study_mode = true;
            mockElements.studyModeIndicator.classList.contains.mockReturnValue(false);

            updateStudyModeIndicator();

            expect(mockElements.studyModeIndicator.classList.remove).toHaveBeenCalledWith('hidden');
        });

        it('should hide study mode indicator when inactive', () => {
            const updateStudyModeIndicator = () => {
                const activeChat = mockState.chats.find(c => c.id === mockState.activeId);
                if (activeChat && activeChat.study_mode && mockElements.studyModeIndicator) {
                    mockElements.studyModeIndicator.classList.remove('hidden');
                } else if (mockElements.studyModeIndicator) {
                    mockElements.studyModeIndicator.classList.add('hidden');
                }
            };

            // Test when study mode is inactive
            mockState.chats[0].study_mode = false;
            mockElements.studyModeIndicator.classList.contains.mockReturnValue(true);

            updateStudyModeIndicator();

            expect(mockElements.studyModeIndicator.classList.add).toHaveBeenCalledWith('hidden');
        });
    });

    describe('Study Mode Error Handling', () => {
        it('should handle network errors gracefully', async () => {
            global.fetch.mockRejectedValueOnce(new Error('Network error'));
            mockStudyModeFunctions.showAlert.mockImplementation(() => {});

            const toggleStudyModeWithError = async (activeChat) => {
                const originalStudyMode = activeChat.study_mode || false;
                const newStudyModeStatus = !originalStudyMode;

                activeChat.study_mode = newStudyModeStatus;
                mockStudyModeFunctions.updateStudyModeIndicator();
                mockStudyModeFunctions.saveState();

                try {
                    const response = await fetch(`${API_BASE_URL}/api/chat/${activeChat.id}/toggle-study-mode`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer mock-token'
                        }
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                } catch (error) {
                    console.error("Error toggling study mode:", error);

                    let errorMsg = 'Failed to toggle study mode.';
                    if (error.message.includes('fetch')) {
                        errorMsg = 'Network error. Study mode has been updated locally.';
                    }

                    mockStudyModeFunctions.showAlert(errorMsg, 'warning');

                    // Revert optimistic update on error
                    activeChat.study_mode = originalStudyMode;
                    mockStudyModeFunctions.updateStudyModeIndicator();
                    mockStudyModeFunctions.saveState();
                }
            };

            const testChat = { ...mockState.chats[0], study_mode: false };
            await toggleStudyModeWithError(testChat);

            expect(mockStudyModeFunctions.showAlert).toHaveBeenCalledWith(
                'Network error. Study mode has been updated locally.',
                'warning'
            );
            expect(testChat.study_mode).toBe(false); // Should be reverted
        });

        it('should handle 404 errors appropriately', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
                statusText: 'Not Found',
                json: () => Promise.resolve({ error: 'Chat not found' })
            });
            mockStudyModeFunctions.showAlert.mockImplementation(() => {});

            const testChat = { ...mockState.chats[0] };

            // Simulate the error handling logic
            try {
                const response = await fetch(`${API_BASE_URL}/api/chat/${testChat.id}/toggle-study-mode`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer mock-token'
                    }
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
                }
            } catch (error) {
                let errorMsg = 'Failed to toggle study mode.';
                if (error.message.includes('404')) {
                    errorMsg = 'Chat not found. The study mode state has been updated locally.';
                }

                mockStudyModeFunctions.showAlert(errorMsg, 'warning');
            }

            expect(mockStudyModeFunctions.showAlert).toHaveBeenCalledWith(
                'Chat not found. The study mode state has been updated locally.',
                'warning'
            );
        });
    });
});
