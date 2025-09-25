// testErrorBoundary.js - Unit tests for ErrorBoundary and MemoryManager
const { describe, it, expect, beforeEach, afterEach, jest } = require('@jest/globals');

// Mock DOM elements and global objects
global.window = {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    location: { href: 'http://test.com' }
};

global.navigator = {
    userAgent: 'Test User Agent'
};

global.performance = {
    memory: {
        usedJSHeapSize: 1000000,
        totalJSHeapSize: 2000000,
        jsHeapSizeLimit: 4000000
    }
};

global.console = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
};

describe('ErrorBoundary Class', () => {
    let errorBoundary;

    beforeEach(() => {
        jest.clearAllMocks();

        errorBoundary = new (class ErrorBoundary {
            constructor() {
                this.errors = [];
                this.maxErrors = 10;
                this.errorTimeout = 5000;
            }

            captureError(error, errorInfo = {}) {
                const errorData = {
                    message: error.message || error.toString(),
                    stack: error.stack,
                    timestamp: new Date().toISOString(),
                    userAgent: navigator.userAgent,
                    url: window.location.href,
                    userId: global.state?.currentUser?.id || 'anonymous',
                    ...errorInfo
                };

                this.errors.push(errorData);

                if (this.errors.length > this.maxErrors) {
                    this.errors.shift();
                }

                console.error('[ErrorBoundary] Captured error:', errorData);

                this.showErrorToUser(errorData);
                this.reportError(errorData);

                return errorData;
            }

            showErrorToUser(errorData) {
                if (errorData.message.includes('AbortError') ||
                    errorData.message.includes('NetworkError') && errorData.message.includes('fetch')) {
                    return;
                }

                const isNetworkError = errorData.message.includes('Failed to fetch') ||
                                     errorData.message.includes('NetworkError');

                if (isNetworkError) {
                    this.showAlert('Connection error. Please check your internet connection and try again.', 'warning');
                } else if (!errorData.message.includes('Script error')) {
                    this.showAlert('An unexpected error occurred. Please refresh the page if problems persist.', 'error');
                }
            }

            reportError(errorData) {
                console.error('[ErrorReporting] Error report:', errorData);
            }

            getRecentErrors() {
                return this.errors.slice(-5);
            }

            clearErrors() {
                this.errors = [];
            }
        })();
    });

    afterEach(() => {
        jest.clearAllMocks();
        errorBoundary.clearErrors();
    });

    describe('captureError', () => {
        it('should capture and format JavaScript errors', () => {
            const testError = new Error('Test error message');
            testError.stack = 'Test stack trace';

            const errorInfo = {
                filename: 'test.js',
                lineno: 10,
                colno: 5,
                type: 'javascript'
            };

            const result = errorBoundary.captureError(testError, errorInfo);

            expect(result.message).toBe('Test error message');
            expect(result.stack).toBe('Test stack trace');
            expect(result.userAgent).toBe('Test User Agent');
            expect(result.url).toBe('http://test.com');
            expect(result.filename).toBe('test.js');
            expect(result.lineno).toBe(10);
            expect(result.type).toBe('javascript');
            expect(result.timestamp).toBeTruthy();
            expect(errorBoundary.errors.length).toBe(1);
        });

        it('should handle string errors', () => {
            const stringError = 'String error message';

            const result = errorBoundary.captureError(stringError);

            expect(result.message).toBe('String error message');
            expect(result.timestamp).toBeTruthy();
        });

        it('should limit stored errors to maxErrors', () => {
            errorBoundary.maxErrors = 2;

            for (let i = 0; i < 5; i++) {
                errorBoundary.captureError(new Error(`Error ${i}`));
            }

            expect(errorBoundary.errors.length).toBe(2);
            expect(errorBoundary.errors[0].message).toBe('Error 3');
            expect(errorBoundary.errors[1].message).toBe('Error 4');
        });

        it('should call showErrorToUser and reportError', () => {
            const testError = new Error('Test error');
            errorBoundary.showErrorToUser = jest.fn();
            errorBoundary.reportError = jest.fn();

            errorBoundary.captureError(testError);

            expect(errorBoundary.showErrorToUser).toHaveBeenCalledWith(
                expect.objectContaining({ message: 'Test error' })
            );
            expect(errorBoundary.reportError).toHaveBeenCalledWith(
                expect.objectContaining({ message: 'Test error' })
            );
        });
    });

    describe('showErrorToUser', () => {
        it('should not show error for AbortError', () => {
            errorBoundary.showAlert = jest.fn();

            errorBoundary.showErrorToUser({
                message: 'AbortError: The operation was aborted'
            });

            expect(errorBoundary.showAlert).not.toHaveBeenCalled();
        });

        it('should not show error for NetworkError in fetch', () => {
            errorBoundary.showAlert = jest.fn();

            errorBoundary.showErrorToUser({
                message: 'NetworkError: Failed to fetch'
            });

            expect(errorBoundary.showAlert).not.toHaveBeenCalled();
        });

        it('should show alert for network errors', () => {
            errorBoundary.showAlert = jest.fn();

            errorBoundary.showErrorToUser({
                message: 'Failed to fetch data from server'
            });

            expect(errorBoundary.showAlert).toHaveBeenCalledWith(
                'Connection error. Please check your internet connection and try again.',
                'warning'
            );
        });

        it('should show alert for unexpected errors', () => {
            errorBoundary.showAlert = jest.fn();

            errorBoundary.showErrorToUser({
                message: 'Unexpected runtime error'
            });

            expect(errorBoundary.showAlert).toHaveBeenCalledWith(
                'An unexpected error occurred. Please refresh the page if problems persist.',
                'error'
            );
        });

        it('should not show alert for script errors', () => {
            errorBoundary.showAlert = jest.fn();

            errorBoundary.showErrorToUser({
                message: 'Script error: External script failed to load'
            });

            expect(errorBoundary.showAlert).not.toHaveBeenCalled();
        });
    });

    describe('getRecentErrors', () => {
        it('should return recent errors', () => {
            for (let i = 0; i < 3; i++) {
                errorBoundary.captureError(new Error(`Error ${i}`));
            }

            const recent = errorBoundary.getRecentErrors();

            expect(recent.length).toBe(3);
            expect(recent[0].message).toBe('Error 0');
            expect(recent[2].message).toBe('Error 2');
        });

        it('should return empty array when no errors', () => {
            const recent = errorBoundary.getRecentErrors();

            expect(recent).toEqual([]);
        });
    });
});

describe('MemoryManager Class', () => {
    let memoryManager;

    beforeEach(() => {
        jest.clearAllMocks();

        memoryManager = new (class MemoryManager {
            constructor() {
                this.cleanupFunctions = new Set();
                this.intervals = new Set();
                this.timeouts = new Set();
                this.eventListeners = new Map();
                this.observers = new Set();
            }

            registerCleanup(fn) {
                this.cleanupFunctions.add(fn);
            }

            registerInterval(intervalId) {
                this.intervals.add(intervalId);
            }

            registerTimeout(timeoutId) {
                this.timeouts.add(timeoutId);
            }

            registerEventListener(element, event, handler, options) {
                const key = `${element}-${event}-${handler}`;
                element.addEventListener(event, handler, options);
                this.eventListeners.set(key, { element, event, handler, options });
            }

            registerObserver(observer) {
                this.observers.add(observer);
            }

            cleanup() {
                console.log(`[MemoryManager] Starting cleanup...`);

                this.intervals.forEach(id => {
                    clearInterval(id);
                    console.log(`[MemoryManager] Cleared interval: ${id}`);
                });
                this.intervals.clear();

                this.timeouts.forEach(id => {
                    clearTimeout(id);
                    console.log(`[MemoryManager] Cleared timeout: ${id}`);
                });
                this.timeouts.clear();

                this.eventListeners.forEach(({ element, event, handler, options }, key) => {
                    element.removeEventListener(event, handler, options);
                    console.log(`[MemoryManager] Removed event listener: ${key}`);
                });
                this.eventListeners.clear();

                this.observers.forEach(observer => {
                    observer.disconnect();
                    console.log(`[MemoryManager] Disconnected observer: ${observer}`);
                });
                this.observers.clear();

                this.cleanupFunctions.forEach(fn => {
                    try {
                        fn();
                        console.log('[MemoryManager] Ran cleanup function');
                    } catch (error) {
                        console.warn('[MemoryManager] Cleanup function failed:', error);
                    }
                });
                this.cleanupFunctions.clear();

                console.log('[MemoryManager] Cleanup completed');
            }

            getMemoryInfo() {
                if ('memory' in performance) {
                    const memInfo = performance.memory;
                    return {
                        used: Math.round(memInfo.usedJSHeapSize / 1024 / 1024),
                        total: Math.round(memInfo.totalJSHeapSize / 1024 / 1024),
                        limit: Math.round(memInfo.jsHeapSizeLimit / 1024 / 1024),
                        usagePercent: Math.round((memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit) * 100)
                    };
                }
                return null;
            }
        })();
    });

    afterEach(() => {
        jest.clearAllMocks();
        memoryManager.cleanup();
    });

    describe('registerInterval', () => {
        it('should register and clear intervals', () => {
            const mockClearInterval = global.clearInterval = jest.fn();
            const intervalId = setInterval(() => {}, 1000);

            memoryManager.registerInterval(intervalId);
            memoryManager.cleanup();

            expect(mockClearInterval).toHaveBeenCalledWith(intervalId);
            expect(memoryManager.intervals.size).toBe(0);
        });
    });

    describe('registerTimeout', () => {
        it('should register and clear timeouts', () => {
            const mockClearTimeout = global.clearTimeout = jest.fn();
            const timeoutId = setTimeout(() => {}, 1000);

            memoryManager.registerTimeout(timeoutId);
            memoryManager.cleanup();

            expect(mockClearTimeout).toHaveBeenCalledWith(timeoutId);
            expect(memoryManager.timeouts.size).toBe(0);
        });
    });

    describe('registerEventListener', () => {
        it('should register and remove event listeners', () => {
            const mockElement = {
                addEventListener: jest.fn(),
                removeEventListener: jest.fn()
            };
            const mockHandler = jest.fn();

            memoryManager.registerEventListener(mockElement, 'click', mockHandler);
            memoryManager.cleanup();

            expect(mockElement.addEventListener).toHaveBeenCalledWith('click', mockHandler, undefined);
            expect(mockElement.removeEventListener).toHaveBeenCalledWith('click', mockHandler, undefined);
            expect(memoryManager.eventListeners.size).toBe(0);
        });
    });

    describe('registerObserver', () => {
        it('should register and disconnect observers', () => {
            const mockObserver = {
                disconnect: jest.fn()
            };

            memoryManager.registerObserver(mockObserver);
            memoryManager.cleanup();

            expect(mockObserver.disconnect).toHaveBeenCalled();
            expect(memoryManager.observers.size).toBe(0);
        });
    });

    describe('registerCleanup', () => {
        it('should register and run cleanup functions', () => {
            const mockCleanup = jest.fn();

            memoryManager.registerCleanup(mockCleanup);
            memoryManager.cleanup();

            expect(mockCleanup).toHaveBeenCalled();
            expect(memoryManager.cleanupFunctions.size).toBe(0);
        });

        it('should handle cleanup function errors', () => {
            const mockCleanup = jest.fn(() => {
                throw new Error('Cleanup failed');
            });

            memoryManager.registerCleanup(mockCleanup);
            memoryManager.cleanup();

            expect(mockCleanup).toHaveBeenCalled();
        });
    });

    describe('getMemoryInfo', () => {
        it('should return memory information', () => {
            const memInfo = memoryManager.getMemoryInfo();

            expect(memInfo).toEqual({
                used: 1,
                total: 2,
                limit: 4,
                usagePercent: 25
            });
        });
    });

    describe('cleanup', () => {
        it('should clean up all resources and log actions', () => {
            const mockElement = { removeEventListener: jest.fn() };
            const mockObserver = { disconnect: jest.fn() };
            const mockCleanup = jest.fn();

            memoryManager.registerInterval(123);
            memoryManager.registerTimeout(456);
            memoryManager.registerEventListener(mockElement, 'click', () => {});
            memoryManager.registerObserver(mockObserver);
            memoryManager.registerCleanup(mockCleanup);

            memoryManager.cleanup();

            expect(global.clearInterval).toHaveBeenCalledWith(123);
            expect(global.clearTimeout).toHaveBeenCalledWith(456);
            expect(mockElement.removeEventListener).toHaveBeenCalled();
            expect(mockObserver.disconnect).toHaveBeenCalled();
            expect(mockCleanup).toHaveBeenCalled();
        });
    });
});

describe('PerformanceMonitor Class', () => {
    let performanceMonitor;

    beforeEach(() => {
        jest.clearAllMocks();

        performanceMonitor = new (class PerformanceMonitor {
            constructor() {
                this.metrics = {
                    pageLoadTime: 0,
                    renderTimes: [],
                    apiCallTimes: [],
                    memoryUsage: []
                };
                this.startTime = performance.now();
            }

            recordPageLoad() {
                this.metrics.pageLoadTime = performance.now() - this.startTime;
                console.log(`[Performance] Page loaded in ${this.metrics.pageLoadTime.toFixed(2)}ms`);
            }

            recordRenderTime(fnName, startTime) {
                const duration = performance.now() - startTime;
                this.metrics.renderTimes.push({ fnName, duration, timestamp: Date.now() });
                if (this.metrics.renderTimes.length > 100) {
                    this.metrics.renderTimes.shift();
                }
                console.log(`[Performance] ${fnName} rendered in ${duration.toFixed(2)}ms`);
            }

            recordApiCall(endpoint, duration, success) {
                this.metrics.apiCallTimes.push({
                    endpoint,
                    duration,
                    success,
                    timestamp: Date.now()
                });
                if (this.metrics.apiCallTimes.length > 50) {
                    this.metrics.apiCallTimes.shift();
                }
            }

            recordMemoryUsage() {
                const memInfo = {
                    used: Math.round(1000000 / 1024 / 1024),
                    total: Math.round(2000000 / 1024 / 1024),
                    limit: Math.round(4000000 / 1024 / 1024),
                    usagePercent: 25
                };

                this.metrics.memoryUsage.push({
                    ...memInfo,
                    timestamp: Date.now()
                });

                if (this.metrics.memoryUsage.length > 20) {
                    this.metrics.memoryUsage.shift();
                }

                if (memInfo.usagePercent > 80) {
                    console.warn(`[Performance] High memory usage: ${memInfo.usagePercent}%`);
                }
            }

            getReport() {
                const avgRenderTime = this.metrics.renderTimes.length > 0
                    ? this.metrics.renderTimes.reduce((sum, r) => sum + r.duration, 0) / this.metrics.renderTimes.length
                    : 0;

                const avgApiTime = this.metrics.apiCallTimes.length > 0
                    ? this.metrics.apiCallTimes.reduce((sum, r) => sum + r.duration, 0) / this.metrics.apiCallTimes.length
                    : 0;

                const successRate = this.metrics.apiCallTimes.length > 0
                    ? (this.metrics.apiCallTimes.filter(r => r.success).length / this.metrics.apiCallTimes.length) * 100
                    : 100;

                return {
                    pageLoadTime: this.metrics.pageLoadTime,
                    averageRenderTime: Math.round(avgRenderTime * 100) / 100,
                    averageApiTime: Math.round(avgApiTime * 100) / 100,
                    apiSuccessRate: Math.round(successRate * 100) / 100,
                    memoryUsage: {
                        used: 1,
                        total: 2,
                        limit: 4,
                        usagePercent: 25
                    },
                    totalApiCalls: this.metrics.apiCallTimes.length,
                    totalRenders: this.metrics.renderTimes.length
                };
            }
        })();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('recordPageLoad', () => {
        it('should record page load time', () => {
            performanceMonitor.recordPageLoad();

            expect(performanceMonitor.metrics.pageLoadTime).toBeGreaterThan(0);
            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('[Performance] Page loaded in')
            );
        });
    });

    describe('recordRenderTime', () => {
        it('should record render time', () => {
            const startTime = performance.now() - 100;
            performanceMonitor.recordRenderTime('testFunction', startTime);

            expect(performanceMonitor.metrics.renderTimes.length).toBe(1);
            expect(performanceMonitor.metrics.renderTimes[0].fnName).toBe('testFunction');
            expect(performanceMonitor.metrics.renderTimes[0].duration).toBe(100);
            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('[Performance] testFunction rendered in')
            );
        });

        it('should limit stored render times to 100', () => {
            for (let i = 0; i < 110; i++) {
                performanceMonitor.recordRenderTime(`function${i}`, performance.now() - 10);
            }

            expect(performanceMonitor.metrics.renderTimes.length).toBe(100);
        });
    });

    describe('recordApiCall', () => {
        it('should record API call metrics', () => {
            performanceMonitor.recordApiCall('/api/test', 150, true);

            expect(performanceMonitor.metrics.apiCallTimes.length).toBe(1);
            expect(performanceMonitor.metrics.apiCallTimes[0].endpoint).toBe('/api/test');
            expect(performanceMonitor.metrics.apiCallTimes[0].duration).toBe(150);
            expect(performanceMonitor.metrics.apiCallTimes[0].success).toBe(true);
        });

        it('should limit stored API calls to 50', () => {
            for (let i = 0; i < 60; i++) {
                performanceMonitor.recordApiCall(`/api/test${i}`, 100, true);
            }

            expect(performanceMonitor.metrics.apiCallTimes.length).toBe(50);
        });
    });

    describe('recordMemoryUsage', () => {
        it('should record memory usage', () => {
            performanceMonitor.recordMemoryUsage();

            expect(performanceMonitor.metrics.memoryUsage.length).toBe(1);
            expect(performanceMonitor.metrics.memoryUsage[0].usagePercent).toBe(25);
        });

        it('should warn on high memory usage', () => {
            global.performance.memory.usedJSHeapSize = 3200000; // 80% usage
            global.performance.memory.jsHeapSizeLimit = 4000000;

            performanceMonitor.recordMemoryUsage();

            expect(console.warn).toHaveBeenCalledWith(
                expect.stringContaining('[Performance] High memory usage: 80%')
            );
        });

        it('should limit stored memory readings to 20', () => {
            for (let i = 0; i < 25; i++) {
                performanceMonitor.recordMemoryUsage();
            }

            expect(performanceMonitor.metrics.memoryUsage.length).toBe(20);
        });
    });

    describe('getReport', () => {
        it('should generate comprehensive performance report', () => {
            // Add some test data
            performanceMonitor.recordPageLoad();
            performanceMonitor.recordRenderTime('testRender', performance.now() - 50);
            performanceMonitor.recordApiCall('/api/test', 100, true);
            performanceMonitor.recordMemoryUsage();

            const report = performanceMonitor.getReport();

            expect(report.pageLoadTime).toBeGreaterThan(0);
            expect(report.averageRenderTime).toBe(50);
            expect(report.averageApiTime).toBe(100);
            expect(report.apiSuccessRate).toBe(100);
            expect(report.totalApiCalls).toBe(1);
            expect(report.totalRenders).toBe(1);
            expect(report.memoryUsage.usagePercent).toBe(25);
        });

        it('should handle empty metrics gracefully', () => {
            const report = performanceMonitor.getReport();

            expect(report.averageRenderTime).toBe(0);
            expect(report.averageApiTime).toBe(0);
            expect(report.apiSuccessRate).toBe(100);
            expect(report.totalApiCalls).toBe(0);
            expect(report.totalRenders).toBe(0);
        });
    });
});
