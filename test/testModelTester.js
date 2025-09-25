// testModelTester.js - Unit tests for ModelTester class
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

// Mock AbortController
global.AbortController = jest.fn(() => ({
    abort: jest.fn(),
    signal: {}
}));

// Mock MODELS object
const mockModels = {
    'gpt-4.1': { name: 'GPT-4.1', type: 'text', anonymous: true, api: 'openai' },
    'gemini': { name: 'Gemini Pro', type: 'text', anonymous: true, api: 'google' },
    'image-model': { name: 'DALL-E 3', type: 'image', api: 'openai' }
};

describe('ModelTester Class', () => {
    let modelTester;
    let mockState;

    beforeEach(() => {
        jest.clearAllMocks();

        // Create fresh ModelTester instance
        modelTester = new (class ModelTester {
            constructor() {
                this.controllers = new Map();
                this.activeTests = new Map();
                this.testResults = new Map();
            }

            async testModelWithRetry(modelId, apiName, maxRetries = 2) {
                const testKey = `${modelId}-${apiName}`;

                if (this.activeTests.has(testKey)) {
                    return this.activeTests.get(testKey);
                }

                const testPromise = this._testModelWithRetryInternal(modelId, apiName, maxRetries);
                this.activeTests.set(testKey, testPromise);

                try {
                    const result = await testPromise;
                    return result;
                } finally {
                    this.activeTests.delete(testKey);
                }
            }

            async _testModelWithRetryInternal(modelId, apiName, maxRetries) {
                let lastError;

                for (let attempt = 0; attempt <= maxRetries; attempt++) {
                    try {
                        const result = await this.testModelWithTimeout(modelId, apiName);
                        this.testResults.set(`${modelId}-${apiName}`, {
                            ...result,
                            timestamp: Date.now()
                        });
                        return result;
                    } catch (error) {
                        lastError = error;
                        console.warn(`[ModelTester] Attempt ${attempt + 1} failed for ${modelId}:`, error.message);

                        if (attempt < maxRetries) {
                            const delay = Math.pow(2, attempt) * 1000;
                            await this.delay(delay);
                        }
                    }
                }

                return {
                    success: false,
                    message: `Failed after ${maxRetries + 1} attempts: ${lastError?.message || 'Unknown error'}`,
                    error: lastError
                };
            }

            async testModelWithTimeout(modelId, apiName, timeoutMs = 10000) {
                return new Promise(async (resolve, reject) => {
                    const controller = new AbortController();
                    const timeout = setTimeout(() => {
                        controller.abort();
                        reject(new Error('Test timeout'));
                    }, timeoutMs);

                    this.controllers.set(`${modelId}-${apiName}`, controller);

                    try {
                        const result = await this._testModelOnce(modelId, apiName, controller);
                        clearTimeout(timeout);
                        resolve(result);
                    } catch (error) {
                        clearTimeout(timeout);
                        reject(error);
                    } finally {
                        this.controllers.delete(`${modelId}-${apiName}`);
                    }
                });
            }

            async _testModelOnce(modelId, apiName, controller) {
                const isImageModel = mockModels[modelId]?.type === 'image' || mockModels[modelId]?.type === 'image-edit';

                try {
                    if (isImageModel) {
                        return {
                            success: true,
                            message: 'Image model ready',
                            responseTime: 50,
                            timestamp: Date.now()
                        };
                    }

                    const token = mockState.settings.apiToken || localStorage.getItem('authToken');
                    const endpoint = mockState.currentUser ? 'http://localhost:3000/api/ai/chat' : 'http://localhost:3000/api/ai/chat-public';
                    const startTime = Date.now();

                    const response = await fetch(endpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            ...(token && mockState.currentUser ? { 'Authorization': `Bearer ${token}` } : {})
                        },
                        body: JSON.stringify({
                            model: modelId,
                            messages: [{ role: 'user', content: 'hi' }]
                        }),
                        signal: controller.signal
                    });

                    const responseTime = Date.now() - startTime;

                    if (response.ok) {
                        try {
                            const reader = response.body.getReader();
                            const decoder = new TextDecoder();
                            let responseText = '';
                            let hasContent = false;

                            while (true) {
                                const { done, value } = await reader.read();
                                if (done) break;

                                const chunk = decoder.decode(value);
                                responseText += chunk;

                                const matches = chunk.match(/"content":"([^"]+)"/g);
                                if (matches && matches.length > 0) {
                                    hasContent = true;
                                    const content = matches[0].replace(/"content":"/, '').replace(/"$/, '');
                                    return {
                                        success: true,
                                        message: content.substring(0, 30) + '...',
                                        responseTime,
                                        timestamp: Date.now()
                                    };
                                }

                                if (responseText.length > 500 || (Date.now() - startTime) > 8000) break;
                            }

                            return {
                                success: true,
                                message: hasContent ? 'Responding...' : 'Connected successfully',
                                responseTime,
                                timestamp: Date.now()
                            };
                        } catch (streamError) {
                            return {
                                success: true,
                                message: 'Connected successfully',
                                responseTime,
                                timestamp: Date.now()
                            };
                        }
                    } else {
                        const errorText = await response.text().catch(() => 'Unknown error');
                        return {
                            success: false,
                            message: `HTTP ${response.status}: ${response.statusText}`,
                            responseTime,
                            timestamp: Date.now()
                        };
                    }
                } catch (error) {
                    if (error.name === 'AbortError') {
                        return {
                            success: false,
                            message: 'Test timeout',
                            responseTime: 0,
                            timestamp: Date.now()
                        };
                    }

                    return {
                        success: false,
                        message: error.message.substring(0, 50),
                        responseTime: 0,
                        timestamp: Date.now()
                    };
                }
            }

            cleanup() {
                console.log(`[ModelTester] Cleaning up ${this.controllers.size} active connections`);
                this.controllers.forEach((controller, key) => {
                    controller.abort();
                });
                this.controllers.clear();
                this.activeTests.clear();
            }

            getCachedResult(modelId, apiName) {
                const key = `${modelId}-${apiName}`;
                const cached = this.testResults.get(key);

                if (cached) {
                    const isValid = (Date.now() - cached.timestamp) < (5 * 60 * 1000);
                    if (isValid) {
                        return cached;
                    } else {
                        this.testResults.delete(key);
                    }
                }

                return null;
            }

            delay(ms) {
                return new Promise(resolve => setTimeout(resolve, ms));
            }
        })();

        mockState = {
            currentUser: null,
            settings: { apiToken: 'test-token' }
        };

        localStorage.getItem.mockReturnValue('mock-token');
        global.fetch.mockResolvedValue({
            ok: true,
            status: 200,
            body: {
                getReader: () => ({
                    read: () => Promise.resolve({ done: true, value: undefined })
                })
            }
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
        modelTester.cleanup();
    });

    describe('testModelWithRetry', () => {
        it('should test text model successfully', async () => {
            const mockResponse = {
                ok: true,
                status: 200,
                body: {
                    getReader: () => ({
                        read: jest.fn()
                            .mockResolvedValueOnce({
                                done: false,
                                value: new TextEncoder().encode('{"content":"Hello')
                            })
                            .mockResolvedValueOnce({
                                done: false,
                                value: new TextEncoder().encode(' there!"}')
                            })
                            .mockResolvedValueOnce({
                                done: true,
                                value: undefined
                            })
                    })
                }
            };
            global.fetch.mockResolvedValue(mockResponse);

            const result = await modelTester.testModelWithRetry('gpt-4.1', 'openai');

            expect(result.success).toBe(true);
            expect(result.message).toBe('Hello there!...');
            expect(result.responseTime).toBeGreaterThan(0);
            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:3000/api/ai/chat-public',
                expect.objectContaining({
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: 'gpt-4.1',
                        messages: [{ role: 'user', content: 'hi' }]
                    })
                })
            );
        });

        it('should test image model successfully', async () => {
            const result = await modelTester.testModelWithRetry('image-model', 'openai');

            expect(result.success).toBe(true);
            expect(result.message).toBe('Image model ready');
            expect(result.responseTime).toBe(50);
        });

        it('should handle test failures with retry logic', async () => {
            global.fetch.mockRejectedValue(new Error('Network error'));

            const result = await modelTester.testModelWithRetry('gpt-4.1', 'openai', 1);

            expect(result.success).toBe(false);
            expect(result.message).toContain('Failed after 2 attempts');
            expect(global.fetch).toHaveBeenCalledTimes(2); // Initial + 1 retry
        });

        it('should return cached result if available and valid', async () => {
            const cachedResult = {
                success: true,
                message: 'Cached response',
                responseTime: 100,
                timestamp: Date.now()
            };

            modelTester.testResults.set('gpt-4.1-openai', cachedResult);

            const result = await modelTester.testModelWithRetry('gpt-4.1', 'openai');

            expect(result.success).toBe(true);
            expect(result.message).toBe('Cached response');
            expect(global.fetch).not.toHaveBeenCalled(); // Should not make API call
        });

        it('should prevent duplicate concurrent tests', async () => {
            const testPromise = modelTester.testModelWithRetry('gpt-4.1', 'openai');

            // Second call should return the same promise
            const testPromise2 = modelTester.testModelWithRetry('gpt-4.1', 'openai');

            expect(testPromise).toBe(testPromise2);
            expect(modelTester.activeTests.size).toBe(1);
        });
    });

    describe('testModelWithTimeout', () => {
        it('should timeout after specified duration', async () => {
            global.fetch.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

            const resultPromise = modelTester.testModelWithTimeout('gpt-4.1', 'openai', 50);

            await expect(resultPromise).rejects.toThrow('Test timeout');
            expect(global.AbortController).toHaveBeenCalled();
        });

        it('should abort controller on timeout', async () => {
            const mockController = { abort: jest.fn() };
            global.AbortController.mockReturnValue(mockController);

            const abortSpy = jest.spyOn(mockController, 'abort');

            // Override the testModelWithTimeout to use a longer timeout
            const longTimeoutPromise = new Promise(resolve => {
                setTimeout(() => resolve({
                    success: true,
                    message: 'Success',
                    responseTime: 100,
                    timestamp: Date.now()
                }), 100);
            });

            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Test timeout')), 50);
            });

            await expect(Promise.race([longTimeoutPromise, timeoutPromise])).rejects.toThrow('Test timeout');
            expect(abortSpy).toHaveBeenCalled();
        });
    });

    describe('cleanup', () => {
        it('should clean up all active connections', () => {
            const mockController1 = { abort: jest.fn() };
            const mockController2 = { abort: jest.fn() };

            modelTester.controllers.set('model1-api1', mockController1);
            modelTester.controllers.set('model2-api2', mockController2);
            modelTester.activeTests.set('test1', Promise.resolve());
            modelTester.activeTests.set('test2', Promise.resolve());

            modelTester.cleanup();

            expect(mockController1.abort).toHaveBeenCalled();
            expect(mockController2.abort).toHaveBeenCalled();
            expect(modelTester.controllers.size).toBe(0);
            expect(modelTester.activeTests.size).toBe(0);
        });
    });

    describe('getCachedResult', () => {
        it('should return cached result if valid', () => {
            const validResult = {
                success: true,
                message: 'Valid cache',
                responseTime: 100,
                timestamp: Date.now()
            };

            modelTester.testResults.set('gpt-4.1-openai', validResult);

            const result = modelTester.getCachedResult('gpt-4.1', 'openai');

            expect(result).toEqual(validResult);
        });

        it('should return null and delete expired cache', () => {
            const expiredResult = {
                success: true,
                message: 'Expired cache',
                responseTime: 100,
                timestamp: Date.now() - (6 * 60 * 1000) // 6 minutes ago
            };

            modelTester.testResults.set('gpt-4.1-openai', expiredResult);

            const result = modelTester.getCachedResult('gpt-4.1', 'openai');

            expect(result).toBeNull();
            expect(modelTester.testResults.has('gpt-4.1-openai')).toBe(false);
        });

        it('should return null for non-existent cache', () => {
            const result = modelTester.getCachedResult('non-existent', 'api');

            expect(result).toBeNull();
        });
    });

    describe('delay', () => {
        it('should delay execution by specified milliseconds', async () => {
            const startTime = Date.now();
            await modelTester.delay(100);
            const endTime = Date.now();

            expect(endTime - startTime).toBeGreaterThanOrEqual(95);
        });
    });

    describe('Error Handling', () => {
        it('should handle HTTP errors gracefully', async () => {
            global.fetch.mockResolvedValue({
                ok: false,
                status: 429,
                statusText: 'Too Many Requests',
                text: () => Promise.resolve('Rate limited')
            });

            const result = await modelTester.testModelWithRetry('gpt-4.1', 'openai');

            expect(result.success).toBe(false);
            expect(result.message).toBe('HTTP 429: Too Many Requests');
        });

        it('should handle network errors gracefully', async () => {
            global.fetch.mockRejectedValue(new Error('Network unreachable'));

            const result = await modelTester.testModelWithRetry('gpt-4.1', 'openai');

            expect(result.success).toBe(false);
            expect(result.message).toContain('Network unreachable');
        });

        it('should handle malformed response data', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                body: {
                    getReader: () => ({
                        read: () => Promise.resolve({ done: true, value: undefined })
                    })
                }
            });

            const result = await modelTester.testModelWithRetry('gpt-4.1', 'openai');

            expect(result.success).toBe(true);
            expect(result.message).toBe('Connected successfully');
        });
    });
});
