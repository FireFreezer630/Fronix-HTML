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

const v1ApiKeyPool = new ApiKeyPool(v1ApiKeys, 'V1');
const v2ApiKeyPool = new ApiKeyPool(v2ApiKeys, 'V2');
const airforceApiKeyPool = new ApiKeyPool(airforceApiKeys, 'Airforce');
const navyApiKeyPool = new ApiKeyPool(navyApiKeys, 'Navy');


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
    const { model, messages, chatId, proModelsEnabled } = req.body;

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

        const V2_MODELS = ['claude-opus-4', 'o4-mini-medium', 'o4-mini-high', 'gpt-4o-mini-search-preview', 'gemini-2.5-flash-thinking', 'kimi-k2', 'deepseek-r1-uncensored'];

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
        } else if (V2_MODELS.includes(model)) {
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
            case 'v2':
                apiEndpoint = `${process.env.AI_API_ENDPOINT_V2}/chat/completions`;
                const modelMapping = {
                    'claude-opus-4': 'provider-6/claude-opus-4-20250514',
                    'o4-mini-medium': 'provider-6/o4-mini-medium',
                    'o4-mini-high': 'provider-6/o4-mini-high',
                    'gpt-4o-mini-search-preview': 'provider-6/gpt-4o-mini-search-preview',
                    'gemini-2.5-flash-thinking': 'provider-6/gemini-2.5-flash-thinking',
                    'kimi-k2': 'provider-6/kimi-k2',
                    'deepseek-r1-uncensored': 'provider-6/deepseek-r1-uncensored'
                };
                modelId = modelMapping[model];
                apiKeyPool = v2ApiKeyPool;
                break;
            default:
                apiEndpoint = process.env.AI_API_ENDPOINT;
                apiKeyPool = v1ApiKeyPool;
        }

        const requestBody = {
            model: modelId,
            messages: messagesForAI,
            stream: true
        };

        const aiResponse = await makeApiRequestWithRetry(
            apiEndpoint,
            requestBody,
            {
                headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
                responseType: 'stream'
            },
            apiKeyPool
        );

        aiResponse.data.pipe(res);

    } catch (error) {
        console.error('❌ Error calling AI service:', error.message);
        res.status(500).json({ error: 'Internal server error occurred while contacting the AI service.' });
    }
});

// ... (keep the existing /images/generations endpoint) ...

module.exports = router;