// testThemeUtils.js - Unit tests for theme switching and utility functions
const { describe, it, expect, beforeEach, afterEach, jest } = require('@jest/globals');

// Mock DOM elements
const mockDocument = {
    documentElement: {
        classList: {
            add: jest.fn(),
            remove: jest.fn(),
            toggle: jest.fn(),
            contains: jest.fn()
        },
        style: {
            setProperty: jest.fn()
        }
    },
    head: {
        appendChild: jest.fn()
    },
    getElementById: jest.fn(),
    createElement: jest.fn((tag) => ({
        textContent: '',
        appendChild: jest.fn()
    })),
    addEventListener: jest.fn(),
    startViewTransition: jest.fn()
};

const mockWindow = {
    matchMedia: jest.fn((query) => ({
        matches: query === '(prefers-reduced-motion: reduce)'
    }))
};

// Mock localStorage
const mockLocalStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn()
};

// Mock console
const mockConsole = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
};

// Setup global mocks
global.document = mockDocument;
global.window = mockWindow;
global.localStorage = mockLocalStorage;
global.console = mockConsole;

describe('Theme System', () => {
    let themeFunctions;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock theme icon elements
        mockDocument.getElementById.mockImplementation((id) => {
            if (id === 'theme-icon-light') {
                return {
                    classList: {
                        add: jest.fn(),
                        remove: jest.fn(),
                        toggle: jest.fn(),
                        contains: jest.fn()
                    },
                    style: {
                        transition: '',
                        opacity: '',
                        setProperty: jest.fn()
                    }
                };
            }
            if (id === 'theme-icon-dark') {
                return {
                    classList: {
                        add: jest.fn(),
                        remove: jest.fn(),
                        toggle: jest.fn(),
                        contains: jest.fn()
                    },
                    style: {
                        transition: '',
                        opacity: '',
                        setProperty: jest.fn()
                    }
                };
            }
            return null;
        });

        // Theme functions to test
        themeFunctions = {
            applyTheme: (theme) => {
                const validThemes = ['light', 'dark'];
                const sanitizedTheme = validThemes.includes(theme) ? theme : 'light';

                mockDocument.documentElement.classList.add('theme-transitioning');

                const isDark = sanitizedTheme === 'dark';
                mockDocument.documentElement.classList.toggle('dark', isDark);

                const lightIcon = mockDocument.getElementById('theme-icon-light');
                const darkIcon = mockDocument.getElementById('theme-icon-dark');

                if (lightIcon && darkIcon) {
                    lightIcon.style.transition = 'opacity 0.2s ease';
                    darkIcon.style.transition = 'opacity 0.2s ease';

                    lightIcon.style.opacity = isDark ? '0' : '1';
                    darkIcon.style.opacity = isDark ? '1' : '0';

                    setTimeout(() => {
                        lightIcon.classList.toggle('hidden', isDark);
                        darkIcon.classList.toggle('hidden', !isDark);
                        lightIcon.style.opacity = '';
                        darkIcon.style.opacity = '';
                    }, 200);
                }

                try {
                    mockLocalStorage.setItem('theme', sanitizedTheme);
                } catch (error) {
                    mockConsole.warn('[Theme] Failed to save theme preference:', error);
                }

                setTimeout(() => {
                    mockDocument.documentElement.classList.remove('theme-transitioning');
                }, 300);

                mockConsole.log(`[Theme] Applied theme: ${sanitizedTheme}`);
            },

            toggleTheme: (event) => {
                const currentTheme = mockLocalStorage.getItem('theme') || 'light';
                const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

                const prefersReducedMotion = mockWindow.matchMedia('(prefers-reduced-motion: reduce)').matches;

                if (mockDocument.startViewTransition && !prefersReducedMotion) {
                    try {
                        let cx = '50%';
                        let cy = '50%';

                        if (event && event.target) {
                            const btn = event.target.closest('button');
                            if (btn) {
                                const rect = btn.getBoundingClientRect();
                                cx = `${rect.left + rect.width / 2}px`;
                                cy = `${rect.top + rect.height / 2}px`;
                            }
                        }

                        mockDocument.documentElement.style.setProperty('--cx', cx);
                        mockDocument.documentElement.style.setProperty('--cy', cy);

                        const transition = mockDocument.startViewTransition(() => {
                            themeFunctions.applyTheme(newTheme);
                        });

                        transition.ready.catch((error) => {
                            mockConsole.warn('[Theme] View transition failed, falling back to standard transition:', error);
                            themeFunctions.applyTheme(newTheme);
                        });

                        return;
                    } catch (error) {
                        mockConsole.warn('[Theme] View transition error, falling back to standard transition:', error);
                    }
                }

                themeFunctions.applyTheme(newTheme);
            },

            initializeThemeSystem: () => {
                const themeStyles = mockDocument.createElement('style');
                themeStyles.textContent = `
                    .theme-transitioning * {
                        transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease !important;
                    }

                    @media (prefers-reduced-motion: reduce) {
                        .theme-transitioning * {
                            transition: none !important;
                        }
                    }

                    @view-transition {
                        navigation: auto;
                    }

                    ::view-transition-old(root),
                    ::view-transition-new(root) {
                        animation-duration: 0.2s;
                    }

                    .theme-toggle:focus {
                        outline: 2px solid var(--accent-color);
                        outline-offset: 2px;
                    }
                `;
                mockDocument.head.appendChild(themeStyles);

                mockConsole.log('[Theme] Theme system initialized with enhanced transitions');
            }
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('applyTheme', () => {
        it('should apply light theme correctly', () => {
            themeFunctions.applyTheme('light');

            expect(mockDocument.documentElement.classList.toggle).toHaveBeenCalledWith('dark', false);
            expect(mockDocument.documentElement.classList.add).toHaveBeenCalledWith('theme-transitioning');
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith('theme', 'light');
            expect(mockConsole.log).toHaveBeenCalledWith('[Theme] Applied theme: light');
        });

        it('should apply dark theme correctly', () => {
            themeFunctions.applyTheme('dark');

            expect(mockDocument.documentElement.classList.toggle).toHaveBeenCalledWith('dark', true);
            expect(mockDocument.documentElement.classList.add).toHaveBeenCalledWith('theme-transitioning');
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith('theme', 'dark');
            expect(mockConsole.log).toHaveBeenCalledWith('[Theme] Applied theme: dark');
        });

        it('should sanitize invalid theme values', () => {
            themeFunctions.applyTheme('invalid-theme');

            expect(mockDocument.documentElement.classList.toggle).toHaveBeenCalledWith('dark', false);
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith('theme', 'light');
        });

        it('should handle icon transitions correctly for light theme', () => {
            const lightIcon = mockDocument.getElementById('theme-icon-light');
            const darkIcon = mockDocument.getElementById('theme-icon-dark');

            themeFunctions.applyTheme('light');

            expect(lightIcon.style.transition).toBe('opacity 0.2s ease');
            expect(darkIcon.style.transition).toBe('opacity 0.2s ease');
            expect(lightIcon.style.opacity).toBe('1');
            expect(darkIcon.style.opacity).toBe('0');
        });

        it('should handle icon transitions correctly for dark theme', () => {
            const lightIcon = mockDocument.getElementById('theme-icon-light');
            const darkIcon = mockDocument.getElementById('theme-icon-dark');

            themeFunctions.applyTheme('dark');

            expect(lightIcon.style.transition).toBe('opacity 0.2s ease');
            expect(darkIcon.style.transition).toBe('opacity 0.2s ease');
            expect(lightIcon.style.opacity).toBe('0');
            expect(darkIcon.style.opacity).toBe('1');
        });

        it('should remove transition class after animation', () => {
            jest.useFakeTimers();
            themeFunctions.applyTheme('light');

            jest.advanceTimersByTime(300);

            expect(mockDocument.documentElement.classList.remove).toHaveBeenCalledWith('theme-transitioning');
            jest.useRealTimers();
        });

        it('should handle localStorage errors gracefully', () => {
            mockLocalStorage.setItem.mockImplementation(() => {
                throw new Error('Storage quota exceeded');
            });

            themeFunctions.applyTheme('dark');

            expect(mockConsole.warn).toHaveBeenCalledWith(
                '[Theme] Failed to save theme preference:',
                expect.any(Error)
            );
        });
    });

    describe('toggleTheme', () => {
        it('should toggle from light to dark', () => {
            mockLocalStorage.getItem.mockReturnValue('light');

            themeFunctions.toggleTheme();

            expect(mockDocument.documentElement.classList.toggle).toHaveBeenCalledWith('dark', true);
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith('theme', 'dark');
        });

        it('should toggle from dark to light', () => {
            mockLocalStorage.getItem.mockReturnValue('dark');

            themeFunctions.toggleTheme();

            expect(mockDocument.documentElement.classList.toggle).toHaveBeenCalledWith('dark', false);
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith('theme', 'light');
        });

        it('should use View Transitions API when available', () => {
            mockLocalStorage.getItem.mockReturnValue('light');
            mockDocument.startViewTransition = jest.fn((callback) => ({
                ready: { catch: jest.fn() }
            }));

            themeFunctions.toggleTheme();

            expect(mockDocument.startViewTransition).toHaveBeenCalled();
            expect(mockDocument.documentElement.style.setProperty).toHaveBeenCalledWith('--cx', '50%');
            expect(mockDocument.documentElement.style.setProperty).toHaveBeenCalledWith('--cy', '50%');
        });

        it('should calculate transition origin from click event', () => {
            mockLocalStorage.getItem.mockReturnValue('light');
            mockDocument.startViewTransition = jest.fn((callback) => ({
                ready: { catch: jest.fn() }
            }));

            const mockEvent = {
                target: {
                    closest: () => ({
                        getBoundingClientRect: () => ({
                            left: 100,
                            top: 200,
                            width: 50,
                            height: 30
                        })
                    })
                }
            };

            themeFunctions.toggleTheme(mockEvent);

            expect(mockDocument.documentElement.style.setProperty).toHaveBeenCalledWith('--cx', '125px');
            expect(mockDocument.documentElement.style.setProperty).toHaveBeenCalledWith('--cy', '215px');
        });

        it('should respect reduced motion preference', () => {
            mockWindow.matchMedia.mockReturnValue({ matches: true });
            mockLocalStorage.getItem.mockReturnValue('light');
            mockDocument.startViewTransition = jest.fn();

            themeFunctions.toggleTheme();

            expect(mockDocument.startViewTransition).not.toHaveBeenCalled();
        });

        it('should handle View Transitions API errors gracefully', () => {
            mockLocalStorage.getItem.mockReturnValue('light');
            mockDocument.startViewTransition = jest.fn(() => {
                throw new Error('View Transitions not supported');
            });

            themeFunctions.toggleTheme();

            expect(mockConsole.warn).toHaveBeenCalledWith(
                '[Theme] View transition error, falling back to standard transition:',
                expect.any(Error)
            );
            expect(mockDocument.documentElement.classList.toggle).toHaveBeenCalledWith('dark', false);
        });

        it('should handle transition ready promise rejection', () => {
            mockLocalStorage.getItem.mockReturnValue('light');
            const mockTransition = {
                ready: {
                    catch: jest.fn((callback) => {
                        callback(new Error('Transition failed'));
                    })
                }
            };
            mockDocument.startViewTransition = jest.fn(() => mockTransition);

            themeFunctions.toggleTheme();

            expect(mockConsole.warn).toHaveBeenCalledWith(
                '[Theme] View transition failed, falling back to standard transition:',
                expect.any(Error)
            );
        });
    });

    describe('initializeThemeSystem', () => {
        it('should add CSS styles for theme transitions', () => {
            themeFunctions.initializeThemeSystem();

            expect(mockDocument.createElement).toHaveBeenCalledWith('style');
            expect(mockDocument.head.appendChild).toHaveBeenCalled();
            expect(mockConsole.log).toHaveBeenCalledWith('[Theme] Theme system initialized with enhanced transitions');
        });

        it('should include accessibility and motion preferences in CSS', () => {
            themeFunctions.initializeThemeSystem();

            const styleElement = mockDocument.head.appendChild.mock.calls[0][0];
            expect(styleElement.textContent).toContain('prefers-reduced-motion');
            expect(styleElement.textContent).toContain('theme-toggle:focus');
            expect(styleElement.textContent).toContain('@view-transition');
        });
    });
});

describe('Utility Functions', () => {
    describe('safeFetch', () => {
        let safeFetchFn;

        beforeEach(() => {
            jest.clearAllMocks();

            safeFetchFn = async (url, options = {}) => {
                try {
                    const controller = { abort: jest.fn(), signal: {} };
                    const timeoutId = setTimeout(() => controller.abort(), 30000);

                    const response = await global.fetch(url, {
                        ...options,
                        signal: controller.signal
                    });

                    clearTimeout(timeoutId);

                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }

                    return response;
                } catch (error) {
                    const errorBoundary = {
                        captureError: jest.fn((err, info) => ({ ...err, ...info }))
                    };
                    errorBoundary.captureError(error, {
                        type: 'fetch',
                        url: url,
                        options: options
                    });
                    throw error;
                }
            };
        });

        it('should handle successful requests', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                status: 200,
                statusText: 'OK'
            });

            const result = await safeFetchFn('/api/test');

            expect(global.fetch).toHaveBeenCalledWith('/api/test', expect.any(Object));
            expect(result.ok).toBe(true);
        });

        it('should handle HTTP errors', async () => {
            global.fetch.mockResolvedValue({
                ok: false,
                status: 404,
                statusText: 'Not Found'
            });

            await expect(safeFetchFn('/api/test')).rejects.toThrow('HTTP 404: Not Found');
        });

        it('should handle network errors', async () => {
            global.fetch.mockRejectedValue(new Error('Network error'));

            await expect(safeFetchFn('/api/test')).rejects.toThrow('Network error');
        });

        it('should set timeout and abort controller', async () => {
            global.fetch.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

            const promise = safeFetchFn('/api/test');
            expect(global.fetch).toHaveBeenCalledWith(
                '/api/test',
                expect.objectContaining({ signal: expect.any(Object) })
            );

            await promise;
        });
    });

    describe('safeAsync', () => {
        it('should handle successful async functions', async () => {
            const testFn = jest.fn(() => Promise.resolve('success'));
            const safeFn = (fn, errorContext = {}) => {
                return async (...args) => {
                    try {
                        return await fn(...args);
                    } catch (error) {
                        const errorBoundary = {
                            captureError: jest.fn((err, info) => ({ ...err, ...info }))
                        };
                        errorBoundary.captureError(error, errorContext);
                        throw error;
                    }
                };
            };

            const result = await safeFn(testFn, { type: 'test' })();

            expect(testFn).toHaveBeenCalled();
            expect(result).toBe('success');
        });

        it('should handle async function errors', async () => {
            const testFn = jest.fn(() => Promise.reject(new Error('Test error')));
            const mockCaptureError = jest.fn();
            const safeFn = (fn, errorContext = {}) => {
                return async (...args) => {
                    try {
                        return await fn(...args);
                    } catch (error) {
                        mockCaptureError(error, errorContext);
                        throw error;
                    }
                };
            };

            await expect(safeFn(testFn, { type: 'test' })()).rejects.toThrow('Test error');
            expect(mockCaptureError).toHaveBeenCalledWith(
                expect.any(Error),
                { type: 'test' }
            );
        });
    });

    describe('isMobile', () => {
        const isMobileFn = () => {
            return window.innerWidth < 768 ||
                   ('ontouchstart' in window) ||
                   (navigator.maxTouchPoints > 0);
        };

        it('should detect mobile by screen width', () => {
            Object.defineProperty(window, 'innerWidth', { value: 500, writable: true });

            expect(isMobileFn()).toBe(true);
        });

        it('should detect mobile by touch events', () => {
            Object.defineProperty(window, 'innerWidth', { value: 1200, writable: true });
            Object.defineProperty(window, 'ontouchstart', { value: {}, writable: true });

            expect(isMobileFn()).toBe(true);
        });

        it('should detect mobile by touch points', () => {
            Object.defineProperty(window, 'innerWidth', { value: 1200, writable: true });
            delete window.ontouchstart;
            Object.defineProperty(navigator, 'maxTouchPoints', { value: 5, writable: true });

            expect(isMobileFn()).toBe(true);
        });

        it('should return false for desktop', () => {
            Object.defineProperty(window, 'innerWidth', { value: 1200, writable: true });
            delete window.ontouchstart;
            Object.defineProperty(navigator, 'maxTouchPoints', { value: 0, writable: true });

            expect(isMobileFn()).toBe(false);
        });
    });
});
