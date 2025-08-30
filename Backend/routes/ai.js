const express = require('express');
const router = express.Router();
const supabase = require('../config/supabaseClient');
const authMiddleware = require('../middleware/authMiddleware');
const cache = require('../utils/cache');
const MODELS = require('../config/models');
const {
    v1ApiKeyPool,
    v2ApiKeyPool,
    airforceApiKeyPool,
    navyApiKeyPool,
    makeApiRequestWithRetry,
    benchmarkModel // Import benchmarkModel
} = require('../services/aiService');

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

// Cached study mode prompt
let studyModePrompt = 'You are currently in study mode. Please provide academic and guiding responses. Your general tone should be supportive and encouraging, like a tutor. When you provide explanations, try to simplify complex topics, break them down into smaller, digestible pieces, and offer analogies if appropriate. Always encourage the user to ask questions and explore further. Your goal is to foster understanding, not just provide answers.';

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

const PUBLIC_MODELS = ['openai', 'gemini', 'elixposearch'];

router.post('/chat', authMiddleware, async (req, res) => {
    const { model, messages, chatId, proModelsEnabled } = req.body;
    const FREE_MODELS = Object.keys(MODELS).filter(key => MODELS[key].free);

    if (!req.user) {
        // Unauthenticated user
        if (!FREE_MODELS.includes(model)) {
            // Send error through stream for client to handle
            res.write('data: [ERROR] You must be logged in to use this model. Please log in or select a free model.\n\n');
            res.end();
            return;
        }
    }

    // Allow public models for non-authenticated users
    if (!req.user && PUBLIC_MODELS.includes(model)) {
        // Proceed without authentication checks for public models
    } else if (!req.user) {
        // If no user and not a public model, require authentication
        return res.status(401).json({ error: 'Authentication required to use this model.' });
    }

    if (!model || !messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'Invalid request body. "model" and a "messages" array are required.' });
    }

    let isStudyMode = false;
<<<<<<< HEAD
    if (chatId && req.user) {
=======
    if (chatId && req.user) { // study mode only for logged in users
>>>>>>> origin/main
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
                res.write('data: [ERROR] You need a pro plan to use this model. Contact @zshadowultra on Discord for access.\n\n');
                res.end();
                return;
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
                responseType: 'stream' // Ensure axios handles as stream
            },
            apiKeyPool
        );

        aiResponse.data.pipe(res);

    } catch (error) {
        console.error('❌ Error calling AI service (streaming):', error.message);
        // Send error through the stream if possible, otherwise close the response
        if (!res.headersSent) {
            res.write(`data: [ERROR] Internal server error occurred: ${error.message}\n\n`);
        }
        res.end();
    }
});

// New endpoint for benchmarking models
router.post('/benchmark', authMiddleware, async (req, res) => {
    if (!req.user || req.user.role !== 'admin') { // Assuming only admins can trigger benchmarks
        return res.status(403).json({ error: 'Unauthorized' });
    }
    
    try {
        console.log('Starting model benchmarking...');
        await benchmarkAllModels();
        res.status(200).json({ message: 'Benchmarking initiated.' });
    } catch (error) {
        console.error('Error initiating benchmarking:', error);
        res.status(500).json({ error: 'Failed to initiate benchmarking' });
    }
});



module.exports = router;
