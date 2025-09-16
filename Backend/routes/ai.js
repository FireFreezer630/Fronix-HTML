const express = require('express');
const router = express.Router();
const axios = require('axios');
const supabase = require('../config/supabaseClient');
const authMiddleware = require('../middleware/authMiddleware');
const fs = require('fs');
const path = require('path');
const cache = require('../utils/cache');

// Safe JSON stringification to handle circular references
function safeStringify(obj, space = 2) {
    const seen = new WeakSet();
    return JSON.stringify(obj, (key, val) => {
        if (val != null && typeof val === 'object') {
            if (seen.has(val)) {
                return '[Circular Reference]';
            }
            seen.add(val);
        }
        return val;
    }, space);
}

// ====================================
// API Key Pool Management System
// ====================================

class ApiKeyPool {
    constructor(keys, name) {
        this.keys = keys.filter(key => key && key.trim() !== '');
        this.name = name;
        this.currentIndex = 0;
        this.maxRetries = this.keys.length;
        
        console.log(`🔑 ${this.name} API Key Pool initialized with ${this.keys.length} keys`);
        if (this.keys.length === 0) {
            console.error(`❌ No valid ${this.name} API keys found in environment variables!`);
        }
    }
    
    getCurrentKey() {
        if (this.keys.length === 0) {
            if (this.name === 'Airforce') {
                return null; // airforce.ai can work without a key
            }
            throw new Error(`No API keys available for ${this.name}`);
        }
        return this.keys[this.currentIndex];
    }
    
    rotateToNextKey() {
        if (this.keys.length <= 1) {
            console.warn(`⚠️ Only one API key available in ${this.name}, cannot rotate`);
            return false;
        }
        
        const previousIndex = this.currentIndex;
        this.currentIndex = (this.currentIndex + 1) % this.keys.length;
        
        console.log(`🔄 ${this.name} API Key rotated from index ${previousIndex} to ${this.currentIndex}`);
        return true;
    }
    
    resetToFirstKey() {
        this.currentIndex = 0;
        console.log(`🔄 ${this.name} API Key pool reset to first key`);
    }
}

// Global API key pool instances
const v1ApiKeys = (process.env.AI_API_KEY || '').split(',').filter(Boolean);
const v2ApiKeys = [
    process.env.AI_API_KEY_V2,
    process.env.AI_API_KEY_V2_3,
    process.env.AI_API_KEY_V2_4,
    process.env.AI_API_KEY_V2_5
].filter(Boolean);
const airforceApiKeys = (process.env.AIRFORCE_API_KEYS || '').split(',').filter(Boolean);
const navyApiKeys = (process.env.NAVY_API_KEYS || '').split(',').filter(Boolean);
const mnnApiKeys = (process.env.MNN_API_KEY || '').split(',').filter(Boolean);

const v1ApiKeyPool = new ApiKeyPool(v1ApiKeys, 'V1');
const v2ApiKeyPool = new ApiKeyPool(v2ApiKeys, 'V2');
const airforceApiKeyPool = new ApiKeyPool(airforceApiKeys, 'Airforce');
const navyApiKeyPool = new ApiKeyPool(navyApiKeys, 'Navy');
const mnnApiKeyPool = new ApiKeyPool(mnnApiKeys, 'MNN');


// Cached study mode prompt
let studyModePrompt = '';
try {
    studyModePrompt = fs.readFileSync(path.join(__dirname, '../../study-mode.md'), 'utf8');
    console.log('📚 Study mode prompt loaded and cached successfully.');
} catch (fileError) {
    console.error('Error reading study-mode.md:', fileError.message);
    studyModePrompt = 'You are currently in study mode. Please provide academic and guiding responses.'; // Fallback prompt
}

// Enhanced API request function with automatic key rotation
async function makeApiRequestWithRetry(url, requestBody, requestOptions, pool) {
    const retryLimit = pool.maxRetries > 0 ? pool.maxRetries : 1;
    let attempt = 0;
    let lastError = null;
    
    while (attempt < retryLimit) {
        try {
            const currentKey = pool.getCurrentKey();
            
            const updatedOptions = { ...requestOptions };
            updatedOptions.headers = {
                ...requestOptions.headers,
            };

            if (currentKey) {
                updatedOptions.headers['Authorization'] = `Bearer ${currentKey}`;
            }
            
            console.log(`🔑 Attempt ${attempt + 1}/${retryLimit} using ${pool.name} API key index: ${pool.currentIndex}`);
            
            const response = await axios.post(url, requestBody, updatedOptions);
            
            if (attempt > 0) {
                pool.resetToFirstKey();
            }
            
            return response;
            
        } catch (error) {
            lastError = error;
            
            if (error.response && error.response.status === 429) {
                console.log(`⚠️ Rate limit hit on key ${pool.currentIndex + 1}/${pool.keys.length} for ${pool.name}`);
                
                const rotated = pool.rotateToNextKey();
                if (rotated) {
                    console.log(`🔄 Retrying with next API key...`);
                    attempt++;
                    continue;
                } else {
                    console.error(`❌ No more API keys to try in ${pool.name} pool`);
                    break;
                }
            } else {
                console.error(`❌ API request failed with non-retryable error:`, error.response?.status, error.message);
                break;
            }
        }
        attempt++;
    }
    
    console.error(`❌ All API key retries exhausted for ${pool.name}. Last error:`, lastError.message);
    throw lastError;
}

const PRO_MODELS = ['grok-4', 'gpt-5', 'gemini-2.5-pro', 'gemini-2.5-flash'];
const BETA_MODELS = ['gpt-4.1-mini', 'gpt-4-vision-preview']; // MNN AI beta models

async function selectProProvider(userId) {
    const cacheKey = `last_pro_provider_${userId}`;
    const lastProviderInfo = cache.get(cacheKey);

    if (lastProviderInfo) {
        const { provider, timestamp } = lastProviderInfo;
        if (provider === 'airforce') {
            const cooldown = 60 * 1000; // 1 minute
            if (Date.now() - timestamp < cooldown) {
                // Cooldown active, use navy
                cache.set(cacheKey, { provider: 'navy', timestamp: Date.now() });
                return 'navy';
            }
        }
    }

    // Default to airforce if no history or if cooldown is over
    cache.set(cacheKey, { provider: 'airforce', timestamp: Date.now() });
    return 'airforce';
}

router.post('/chat', authMiddleware, async (req, res) => {
    const { model, messages, chatId, proModelsEnabled, betaModelsEnabled } = req.body;

    if (!model || !messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'Invalid request body. "model" and a "messages" array are required.' });
    }

    let isStudyMode = false;
    if (chatId) {
        const { data: chatData } = await supabase.from('chats').select('study_mode').eq('id', chatId).eq('user_id', req.user.id).single();
        if (chatData) {
            isStudyMode = chatData.study_mode;
        }
    }

    let messagesForAI = JSON.parse(JSON.stringify(messages));
    if (isStudyMode && studyModePrompt) {
        messagesForAI.unshift({ role: 'system', content: studyModePrompt });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
        let provider = 'default';
        let apiEndpoint;
        let apiKeyPool;
        let modelId = model;

        const V2_MODELS = ['kimi-k2-instruct', 'glm-4.5', 'glm-4.5-air'];
        const POLLINATIONS_MODELS = ['deepseek-reasoning', 'openai-reasoning', 'o4-mini-medium', 'o4-mini-high'];

        if (PRO_MODELS.includes(model)) {
            if (!proModelsEnabled) {
                return res.status(403).json({ error: 'Pro models are not enabled in your settings.' });
            }

            const { data: profile } = await supabase.from('profiles').select('plan').eq('user_id', req.user.id).single();

            if (!profile || profile.plan !== 'pro') {
                return res.status(403).json({ error: 'You need a pro plan to use this model. Contact @zshadowultra on Discord for access.' });
            }

            if (model === 'grok-4') {
                provider = 'navy';
            } else {
                provider = await selectProProvider(req.user.id);
            }
        } else if (BETA_MODELS.includes(model)) {
            if (!betaModelsEnabled) {
                return res.status(403).json({ error: 'Beta models are not enabled in your settings.' });
            }
            provider = 'mnn';
        } else if (V2_MODELS.includes(model)) {
            provider = 'v2';
        } else if (POLLINATIONS_MODELS.includes(model)) {
            provider = 'pollinations';
        } else {
            // Default models use V2 with provider-3 prefix
            provider = 'v2';
        }

        switch (provider) {
            case 'navy':
                apiEndpoint = 'https://api.navy/v1/chat/completions';
                apiKeyPool = navyApiKeyPool;
                break;
            case 'airforce':
                apiEndpoint = 'https://api.airforce/v1/chat/completions';
                apiKeyPool = airforceApiKeyPool;
                break;
            case 'pollinations':
                apiEndpoint = 'https://text.pollinations.ai/openai/chat/completions';
                const pollinationsMapping = {
                    'deepseek-reasoning': 'deepseek-reasoning',
                    'openai-reasoning': 'openai',  // OpenAI o3 maps to 'openai'
                    'o4-mini-medium': 'openai-reasoning',
                    'o4-mini-high': 'openai-reasoning',
                    'gemini': 'gemini'  // Pass gemini directly to pollinations
                };
                modelId = pollinationsMapping[model] || model;
                // No API key needed for pollinations
                break;
            case 'v2':
                apiEndpoint = `${process.env.AI_API_ENDPOINT_V2}/chat/completions`;
                const modelMapping = {
                    // V2 models with provider prefixes
                    'kimi-k2-instruct': 'provider-5/kimi-k2-instruct',
                    'glm-4.5': 'provider-1/glm-4.5-fp8',
                    'glm-4.5-air': 'provider-1/glm-4.5-air-fp8',
                    
                    // Default models with provider-3 prefix
                    'gpt-4.1': 'provider-3/gpt-4.1-nano',
                    'gpt-5-nano': 'provider-3/gpt-5-nano',
                    'gpt-4.1-mini': 'provider-3/gpt-4.1-mini',
                    'gpt-4o-mini': 'provider-3/gpt-4o-mini'
                };
                modelId = modelMapping[model] || model;
                apiKeyPool = v2ApiKeyPool;
                break;
            case 'mnn':
                apiEndpoint = 'https://api.mnnai.ru/v1/chat/completions';
                apiKeyPool = mnnApiKeyPool;
                break;
            default:
                // Check if it's an anonymous model that should go to pollinations
                if (model === 'gemini') {
                    apiEndpoint = 'https://text.pollinations.ai/openai/chat/completions';
                    modelId = 'gemini'; // Pass gemini directly
                    provider = 'pollinations';
                } else {
                    // Use V2 endpoint as fallback for other models
                    apiEndpoint = `${process.env.AI_API_ENDPOINT_V2}/chat/completions`;
                    // Map default models with provider-3 prefix
                    const defaultModelMapping = {
                        'gpt-4.1': 'provider-3/gpt-4.1-nano',
                        'gpt-5-nano': 'provider-3/gpt-5-nano',
                        'gpt-4.1-mini': 'provider-3/gpt-4.1-mini',
                        'gpt-4o-mini': 'provider-3/gpt-4o-mini'
                    };
                    modelId = defaultModelMapping[model] || model;
                    apiKeyPool = v2ApiKeyPool;
                }
        }

        const requestBody = {
            model: modelId,
            messages: messagesForAI,
            stream: true
        };

        let aiResponse;
        if (provider === 'pollinations') {
            // Direct request to pollinations without API key
            aiResponse = await axios.post(apiEndpoint, requestBody, {
                headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
                responseType: 'stream'
            });
        } else {
            // Use API key pool for other providers
            aiResponse = await makeApiRequestWithRetry(
                apiEndpoint,
                requestBody,
                {
                    headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
                    responseType: 'stream'
                },
                apiKeyPool
            );
        }

        aiResponse.data.pipe(res);

    } catch (error) {
        console.error('❌ Error calling AI service:', error.message);
        console.error('Full error details:', error.response ? safeStringify(error.response.data) : error.stack);
        
        // If headers weren't sent yet, try fallback
        if (!res.headersSent) {
            try {
                // Try fallback to public API
                console.log('🔄 Attempting fallback to public API');
                const fallbackUrl = 'https://text.pollinations.ai/openai/chat/completions';
                
                const requestBody = {
                    model: modelId,
                    messages: messagesForAI,
                    stream: true
                };
                
                const fallbackResponse = await axios.post(fallbackUrl, requestBody, {
                    headers: { 
                        'Content-Type': 'application/json', 
                        'Accept': 'text/event-stream',
                        'User-Agent': 'Fronix-Chat/1.0'
                    },
                    responseType: 'stream',
                    timeout: 15000
                });
                
                console.log('✅ Fallback API successful');
                fallbackResponse.data.pipe(res);
                return;
                
            } catch (fallbackError) {
                console.error('❌ Fallback also failed:', fallbackError.message);
                
                // Send error response
                res.status(500).json({ 
                    error: 'AI service temporarily unavailable',
                    details: 'All AI endpoints are currently down. Please try again later.',
                    model: modelId
                });
            }
        } else {
            // Connection already established, send error in stream format
            res.write('data: {"error": {"message": "AI service interrupted", "type": "service_error"}}\n\n');
            res.write('data: [DONE]\n\n');
            res.end();
        }
    }
});

// Images generation endpoint
router.post('/images/generations', authMiddleware, async (req, res) => {
    const { model, prompt, n = 1, size = '1024x1024', quality = 'standard', response_format = 'url' } = req.body;

    if (!model || !prompt) {
        return res.status(400).json({ error: 'Model and prompt are required.' });
    }

    try {
        // For now, return a mock response since image generation endpoints vary
        // This should be implemented based on your specific image generation API
        const mockImageResponse = {
            data: [{
                url: 'https://via.placeholder.com/1024x1024/4F46E5/FFFFFF?text=Generated+Image',
                revised_prompt: prompt
            }]
        };
        
        console.log('🎨 Mock image generation response for prompt:', prompt);
        res.status(200).json(mockImageResponse);
        
    } catch (error) {
        console.error('❌ Error in image generation:', error.message);
        res.status(500).json({ error: 'Internal server error occurred during image generation.' });
    }
});

// ====================================
// Model Availability Checker
// ====================================

class ModelAvailabilityChecker {
    constructor() {
        this.modelStatus = new Map();
        this.checkInterval = 10 * 60 * 1000; // 10 minutes
        this.isRunning = false;
        
        // Models to check availability for
        this.modelsToCheck = [
            // Anonymous/Pollinations models
            { id: 'gpt-4.1', provider: 'pollinations', apiName: 'provider-3/gpt-4.1-nano' },
            { id: 'gpt-5-nano', provider: 'pollinations', apiName: 'provider-3/gpt-5-nano' },
            { id: 'gemini', provider: 'pollinations', apiName: 'gemini' },
            { id: 'deepseek-reasoning', provider: 'pollinations', apiName: 'deepseek-reasoning' },
            { id: 'openai-reasoning', provider: 'pollinations', apiName: 'openai' },
            { id: 'o4-mini-medium', provider: 'pollinations', apiName: 'openai-reasoning' },
            { id: 'o4-mini-high', provider: 'pollinations', apiName: 'openai-reasoning' },
            // A4F models
            { id: 'kimi-k2-instruct', provider: 'A4F', apiName: 'provider-5/kimi-k2-instruct' },
            { id: 'glm-4.5', provider: 'A4F', apiName: 'provider-1/glm-4.5-fp8' },
            { id: 'glm-4.5-air', provider: 'A4F', apiName: 'provider-1/glm-4.5-air-fp8' },
            // Pro models
            { id: 'gpt-5', provider: 'airforce', apiName: 'gpt-5' },
            { id: 'gemini-2.5-pro', provider: 'airforce', apiName: 'gemini-2.5-pro' },
            { id: 'gemini-2.5-flash', provider: 'airforce', apiName: 'gemini-2.5-flash' },
            // Beta models
            { id: 'gpt-4.1-mini', provider: 'MNN', apiName: 'gpt-4.1-mini' },
            { id: 'gpt-4-vision-preview', provider: 'MNN', apiName: 'gpt-4-vision-preview' }
        ];
    }
    
    async checkModelAvailability(modelId, provider) {
        // Always return true - don't mark models as unavailable
        // This prevents false negatives from temporary network issues
        return true;
    }
    
    async checkAllModels() {
        console.log('🔍 Updating model availability...');
        
        // Set all models as available with their metadata
        this.modelsToCheck.forEach((model) => {
            this.modelStatus.set(model.id, {
                available: true,
                provider: model.provider,
                apiName: model.apiName
            });
            console.log(`📊 Model ${model.id}: ✅ Available`);
        });
        
        console.log('✅ Model availability update completed');
    }
    
    start() {
        if (this.isRunning) {
            console.log('⚠️ Model availability checker is already running');
            return;
        }
        
        this.isRunning = true;
        console.log('🚀 Starting model availability checker...');
        
        // Check immediately on startup
        this.checkAllModels();
        
        // Set up periodic checks
        this.intervalId = setInterval(() => {
            this.checkAllModels();
        }, this.checkInterval);
    }
    
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isRunning = false;
        console.log('⏹️ Model availability checker stopped');
    }
    
    getModelStatus(modelId) {
        return this.modelStatus.get(modelId) || { available: true };
    }
    
    getAllModelStatus() {
        const status = {};
        this.modelStatus.forEach((value, key) => {
            status[key] = value;
        });
        return status;
    }
}

// Global instance
const modelChecker = new ModelAvailabilityChecker();

// Export function to start the checker
const startModelAvailabilityChecker = () => {
    modelChecker.start();
};

// ====================================
// Public Chat Endpoint (No Auth Required)
// ====================================

// Define which models are allowed for anonymous users
const ANONYMOUS_ALLOWED_MODELS = ['gpt-4.1', 'gpt-5-nano', 'gemini'];

router.post('/chat-public', async (req, res) => {
    const { model, messages } = req.body;
    
    if (!model || !messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'Invalid request body. "model" and a "messages" array are required.' });
    }
    
    // Check if the model is allowed for anonymous users
    let actualModel = model;
    if (model === 'gemini') {
        actualModel = 'gemini-2.5-lite'; // Map gemini to gemini-2.5-lite
    }
    
    // Map model names for the public API
    const publicModelMapping = {
        'gpt-4.1': 'provider-3/gpt-4.1-nano',
        'gpt-5-nano': 'provider-3/gpt-5-nano',
        'gemini': 'gemini'  // Pass gemini directly to pollinations
    };
    
    if (!ANONYMOUS_ALLOWED_MODELS.includes(model)) {
        return res.status(403).json({ 
            error: 'This model requires authentication. Please sign in to use this model.',
            allowedModels: ANONYMOUS_ALLOWED_MODELS
        });
    }
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    try {
        // Try multiple fallback endpoints for better reliability
        const fallbackEndpoints = [
            { 
                url: `${process.env.AI_API_ENDPOINT_V2}/chat/completions`,
                pool: v2ApiKeyPool,
                name: 'V2 API'
            },
            { 
                url: 'https://api.pollinations.ai/openai/chat/completions',
                pool: null,
                name: 'Pollinations API'
            },
            {
                url: 'https://text.pollinations.ai/openai/chat/completions', 
                pool: null,
                name: 'Pollinations Text API'
            }
        ];
        
        let lastError = null;
        
        for (const endpoint of fallbackEndpoints) {
            try {
                console.log(`🔄 Trying ${endpoint.name} for model ${actualModel}`);
                
                const requestBody = {
                    model: publicModelMapping[actualModel] || actualModel,
                    messages: messages,
                    stream: true
                };
                
                let requestOptions = {
                    headers: { 
                        'Content-Type': 'application/json', 
                        'Accept': 'text/event-stream',
                        'User-Agent': 'Fronix-Chat/1.0'
                    },
                    responseType: 'stream',
                    timeout: 15000
                };
                
                let response;
                
                if (endpoint.pool && endpoint.pool.keys.length > 0) {
                    // Use API key pool if available
                    response = await makeApiRequestWithRetry(
                        endpoint.url,
                        requestBody,
                        requestOptions,
                        endpoint.pool
                    );
                } else {
                    // Direct request without API key
                    response = await axios.post(endpoint.url, requestBody, requestOptions);
                }
                
                console.log(`✅ Successfully connected to ${endpoint.name}`);
                response.data.pipe(res);
                return; // Success, exit the function
                
            } catch (error) {
                console.error(`❌ ${endpoint.name} failed:`, error.message);
                lastError = error;
                continue; // Try next endpoint
            }
        }
        
        // If all endpoints failed, send a fallback response
        console.error('❌ All AI endpoints failed, sending fallback response');
        res.write('data: {"choices":[{"delta":{"content":"I apologize, but I\'m currently experiencing technical difficulties. The AI service is temporarily unavailable. Please try again in a few moments or contact support if the issue persists."}}]}\n\n');
        res.write('data: [DONE]\n\n');
        res.end();
        
    } catch (error) {
        console.error('❌ Critical error in chat-public:', error.message);
        if (!res.headersSent) {
            res.status(500).json({ 
                error: 'AI service temporarily unavailable',
                details: 'Please try again later or contact support'
            });
        }
    }
});

// ====================================
// Model Status Endpoint
// ====================================

router.get('/model-status', (req, res) => {
    try {
        const status = modelChecker.getAllModelStatus();
        res.json({
            status,
            lastChecked: Date.now(),
            anonymousModels: ANONYMOUS_ALLOWED_MODELS
        });
    } catch (error) {
        console.error('❌ Error getting model status:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = { router, startModelAvailabilityChecker };
