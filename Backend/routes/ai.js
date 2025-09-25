const express = require('express');
const router = express.Router();
const axios = require('axios');
const supabase = require('../config/supabaseClient');
const authMiddleware = require('../middleware/authMiddleware');
const fs = require('fs');
const path = require('path');
const cache = require('../utils/cache');
const stream = require('stream');
const imgbbUploader = require('imgbb-uploader');
const fastJson = require('fast-json-stringify');
const errorSchema = {
    type: 'object',
    properties: {
        message: { type: 'string' },
        stack: { type: 'string' },
        response: {
            type: 'object',
            properties: {
                status: { type: 'number' },
                data: { type: 'string' } // Stringify the data to avoid nested objects
            }
        }
    }
};

const stringifyError = fastJson(errorSchema);

// Safe JSON stringification to handle circular references
function safeStringify(obj, space = 2) {
    try {
        return stringifyError(obj);
    } catch (e) {
        // Fallback to standard JSON.stringify for unexpected structures
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
};

// ====================================
// AI Function Calling System
// ====================================

// Function schemas for OpenAI-style function calling
const FUNCTION_SCHEMAS = {
    generate_image: {
        name: "generate_image",
        description: "Generate an image using the specified model based on the prompt. Use 'nanobana' for high-quality photorealistic images or 'flux' for faster generation with good quality.",
        parameters: {
            type: "object",
            properties: {
                prompt: {
                    type: "string",
                    description: "Detailed photographic terminology-based prompt describing the image to generate"
                },
                model: {
                    type: "string",
                    enum: ["nanobana", "flux"],
                    default: "nanobana",
                    description: "Model to use: 'nanobana' for superior photorealistic quality, 'flux' for faster generation"
                },
                size: { type: "string", enum: ["512x512", "1024x1024"], default: "1024x1024" },
                quality: {
                    type: "string",
                    enum: ["standard", "high"],
                    default: "high",
                    description: "Quality level - use 'high' for best results"
                }
            },
            required: ["prompt"]
        }
    },
    edit_image: {
        name: "edit_image",
        description: "Edit an existing image using nanobana model. Provide the image URL and detailed editing instructions.",
        parameters: {
            type: "object",
            properties: {
                image_url: {
                    type: "string",
                    description: "URL of the image to edit (from ImageBB or other hosting)"
                },
                prompt: {
                    type: "string",
                    description: "Detailed photographic terminology-based prompt describing the desired edits"
                },
                model: {
                    type: "string",
                    enum: ["nanobana"],
                    default: "nanobana",
                    description: "Must use 'nanobana' for image editing - it's superior for consistency and quality"
                }
            },
            required: ["image_url", "prompt"]
        }
    },
    web_search: {
        name: "web_search",
        description: "Search the web using Tavily API for current information to enhance responses",
        parameters: {
            type: "object",
            properties: {
                query: { type: "string", description: "Search query" },
                max_results: { type: "number", default: 5, description: "Maximum number of results to return" },
                include_answer: { type: "boolean", default: true, description: "Include AI-generated answer" },
                search_depth: {
                    type: "string",
                    enum: ["basic", "advanced"],
                    default: "basic",
                    description: "Search depth - 'advanced' uses more credits but better results"
                }
            },
            required: ["query"]
        }
    }
};

// Model comparison and selection logic
const MODEL_SELECTION_CRITERIA = {
    nanobana: {
        strengths: ['photorealistic', 'editing', 'consistency', 'character', 'multimodal', 'storytelling'],
        speed: 'medium',
        quality: 'excellent',
        cost: 'high'
    },
    flux: {
        strengths: ['speed', 'commercial', 'typography', 'workflow', 'local_editing'],
        speed: 'fast',
        quality: 'good',
        cost: 'medium'
    }
};

// Intelligent model selection based on requirements
function selectOptimalModel(requirements) {
    const { quality, speed, editing, character_consistency } = requirements;

    // Prioritize nanobana for high-quality, editing, and consistency needs
    if (quality === 'high' || editing || character_consistency) {
        return 'nanobana';
    }

    // Use flux for speed requirements
    if (speed === 'fast') {
        return 'flux';
    }

    // Default to nanobana for best quality
    return 'nanobana';
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
    process.env.AI_API_KEY_V2_2,
    process.env.AI_API_KEY_V2_3,
    process.env.AI_API_KEY_V2_4,
    process.env.AI_API_KEY_V2_5
].filter(Boolean);
const airforceApiKeys = (process.env.AIRFORCE_API_KEY || '').split(',').filter(Boolean);
const navyApiKeys = (process.env.NAVY_API_KEYS || '').split(',').filter(Boolean);

const v1ApiKeyPool = new ApiKeyPool(v1ApiKeys, 'V1');
const v2ApiKeyPool = new ApiKeyPool(v2ApiKeys, 'V2');
const airforceApiKeyPool = new ApiKeyPool(airforceApiKeys, 'Airforce');
const navyApiKeyPool = new ApiKeyPool(navyApiKeys, 'Navy');


// Study mode prompt
const studyModePrompt = `Let's discuss a topic or concept that I'm curious about, and you'll ask me questions to help me explore it further. We'll work together to build a deep understanding of the topic, and you'll provide feedback to help me identify any misconceptions or gaps in my understanding, sort of like the Feynman technique. We'll approach this with an open mind, and we'll be curious and inquisitive as we explore the topic.
I want you to keep in mind that you do also ask specific questions that will push my understanding of said topic, it doesn't matter if I'm not capable of answering cause my goal is to learn more and more. Let's begin.`;

// Enhanced API request function with automatic key rotation
async function makeApiRequestWithRetry(url, requestBody, requestOptions, pool) {
    const retryLimit = pool.maxRetries > 0 ? pool.maxRetries : 1;
    let attempt = 0;
    let lastError = null;
    
    while (attempt < retryLimit) {
        const requestTimerLabel = `API Request Attempt ${attempt + 1}`;
        console.time(requestTimerLabel);
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
            
            console.timeEnd(requestTimerLabel);
            return response;
            
        } catch (error) {
            console.timeEnd(requestTimerLabel);
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

const PRO_MODELS = ['grok-4', 'gpt-5', 'gemini-2.5-pro', 'gemini-2.5-flash', 'imagen-4'];

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
        console.time('Provider Selection');
        let provider = 'default';
        let apiEndpoint;
        let apiKeyPool;
        let modelId = model;

        const V2_MODELS = ['kimi-k2-instruct', 'glm-4.5', 'glm-4.5-air'];
        const POLLINATIONS_MODELS = [
            'deepseek-reasoning',
            'openai-reasoning',
            'o4-mini-medium',
            'o4-mini-high',
            'pollinations-flux',
            'pollinations-kontext',
            'nanobanana',
            'seedream'
        ];

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
                apiKeyPool = v1ApiKeyPool; // Use v1 key pool for pollinations
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
            case 'default':
                // Check if it's an anonymous model that should go to pollinations
                if (model === 'gemini') {
                    apiEndpoint = 'https://text.pollinations.ai/openai/chat/completions';
                    modelId = 'gemini'; // Pass gemini directly
                    provider = 'pollinations';
                    apiKeyPool = v1ApiKeyPool;
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
        console.timeEnd('Provider Selection');

        const requestBody = {
            model: modelId,
            messages: messagesForAI,
            stream: true,
            functions: FUNCTION_SCHEMAS,
            function_call: 'auto' // Let the AI decide when to call functions
        };

        const aiResponse = await makeApiRequestWithRetry(
            apiEndpoint,
            requestBody,
            {
                headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
                responseType: 'stream',
                timeout: 30000 // 30 second timeout to prevent hanging connections
            },
            apiKeyPool
        );

        aiResponse.data.on('data', async (chunk) => {
            try {
                const lines = chunk.toString().split('\n');
                const parsedLines = lines
                    .map((line) => line.replace(/^data: /, '').trim())
                    .filter((line) => line !== '' && line !== '[DONE]')
                    .map((line) => {
                        try {
                            return JSON.parse(line);
                        } catch (error) {
                            console.error('Error parsing JSON line:', line);
                            return null;
                        }
                    })
                    .filter(line => line !== null);

                for (const parsedLine of parsedLines) {
                    const { choices } = parsedLine;
                    if (choices && choices.length > 0) {
                        const { delta, finish_reason } = choices[0];

                        // Handle function calls
                        if (finish_reason === 'function_call' && delta && delta.function_call) {
                            console.log('🔧 Function call detected:', delta.function_call.name);

                            try {
                                // Execute the function call
                                let functionResult;
                                const functionCall = delta.function_call;

                                switch (functionCall.name) {
                                    case 'generate_image':
                                        functionResult = await handleImageGenerationFunction(
                                            functionCall.arguments.prompt,
                                            functionCall.arguments.model,
                                            functionCall.arguments.size,
                                            functionCall.arguments.quality
                                        );
                                        break;
                                    case 'edit_image':
                                        functionResult = await handleImageEditingFunction(
                                            functionCall.arguments.image_url,
                                            functionCall.arguments.prompt,
                                            functionCall.arguments.model
                                        );
                                        break;
                                    case 'web_search':
                                        functionResult = await handleWebSearchFunction(
                                            functionCall.arguments.query,
                                            functionCall.arguments.max_results,
                                            functionCall.arguments.include_answer,
                                            functionCall.arguments.search_depth
                                        );
                                        break;
                                    default:
                                        throw new Error(`Unknown function: ${functionCall.name}`);
                                }

                                // Send function result back to AI
                                const functionResponse = {
                                    role: 'function',
                                    name: functionCall.name,
                                    content: JSON.stringify(functionResult)
                                };

                                // Add function response to messages and continue streaming
                                messagesForAI.push({
                                    role: 'assistant',
                                    content: null,
                                    function_call: functionCall
                                });
                                messagesForAI.push(functionResponse);

                                // Continue the conversation with function result
                                const followUpRequestBody = {
                                    model: modelId,
                                    messages: messagesForAI,
                                    stream: true,
                                    functions: FUNCTION_SCHEMAS,
                                    function_call: 'auto'
                                };

                                try {
                                    const followUpResponse = await makeApiRequestWithRetry(
                                        apiEndpoint,
                                        followUpRequestBody,
                                        {
                                            headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
                                            responseType: 'stream',
                                            timeout: 30000
                                        },
                                        apiKeyPool
                                    );

                                    // Pipe the follow-up response
                                    followUpResponse.data.pipe(res);
                                    return;

                                } catch (followUpError) {
                                    console.error('Error in follow-up request:', followUpError);
                                    res.write(`data: ${JSON.stringify({ error: { message: 'Function execution failed' } })}\n\n`);
                                    res.write('data: [DONE]\n\n');
                                    res.end();
                                    return;
                                }

                            } catch (functionError) {
                                console.error('Function execution error:', functionError);
                                res.write(`data: ${JSON.stringify({ error: { message: `Function error: ${functionError.message}` } })}\n\n`);
                                res.write('data: [DONE]\n\n');
                                res.end();
                                return;
                            }
                        }

                        // Handle regular content streaming
                        if (delta && delta.content) {
                            res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: delta.content } }] })}\n\n`);
                        }
                    }
                }
            } catch (error) {
                console.error('Error processing stream data:', error);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Stream processing error' });
                } else {
                    res.write(`data: ${JSON.stringify({ error: { message: 'Stream processing error' } })}\n\n`);
                    res.write('data: [DONE]\n\n');
                    res.end();
                }
            }
        });

        // Set a timeout for the entire streaming response to prevent hanging connections
        const responseTimeout = setTimeout(() => {
            console.error('Response timeout - ending stream');
            if (!res.headersSent) {
                res.status(504).json({ error: 'Gateway timeout' });
            } else {
                res.write(`data: ${JSON.stringify({ error: { message: 'Response timeout' } })}\n\n`);
                res.write('data: [DONE]\n\n');
                res.end();
            }
        }, 60000); // 60 second timeout for the entire response

        // Clean up timeout when client disconnects
        req.on('close', () => {
            clearTimeout(responseTimeout);
            console.log('Client disconnected, cleaning up timeout');
        });

        res.on('close', () => {
            clearTimeout(responseTimeout);
            console.log('Response closed, cleaning up timeout');
        });

        aiResponse.data.on('end', () => {
            clearTimeout(responseTimeout);
            try {
                res.write('data: [DONE]\n\n');
                res.end();
            } catch (error) {
                console.error('Error ending stream:', error);
            }
        });

        aiResponse.data.on('error', (error) => {
            clearTimeout(responseTimeout);
            console.error('Stream error:', error);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Stream connection error' });
            } else {
                res.write(`data: ${JSON.stringify({ error: { message: 'Stream connection error' } })}\n\n`);
                res.write('data: [DONE]\n\n');
                res.end();
            }
        });

    } catch (error) {
        console.error('❌ Error calling AI service:', error.message);
        console.error('Full error details:', error.response ? safeStringify(error.response.data) : error.stack);
        
        if (!res.headersSent) {
            res.status(500).json({
                error: 'AI service temporarily unavailable',
                details: 'All AI endpoints are currently down. Please try again later.',
                model: modelId
            });
        } else {
            // Connection already established, send error in stream format
            res.write(`data: ${JSON.stringify({ error: { message: 'AI service interrupted' } })}\n\n`);
            res.write('data: [DONE]\n\n');
            res.end();
        }
    }
});

// Images generation endpoint
router.post('/images/generations', authMiddleware, async (req, res) => {
    const { model, prompt, n = 1, size = '1024x1024', quality = 'standard', response_format = 'url', width, height, seed, image } = req.body;

    if (!model || !prompt) {
        return res.status(400).json({ error: 'Model and prompt are required.' });
    }

    // Check if user has pro plan for imagen-4
    if (model === 'imagen-4') {
        const { data: profile } = await supabase.from('profiles').select('plan').eq('user_id', req.user.id).single();
        if (!profile || profile.plan !== 'pro') {
            return res.status(403).json({ error: 'You need a pro plan to use imagen-4. Contact @zshadowultra on Discord for access.' });
        }
    }

    try {
        let imageUrl;
        const pollinationsImageModels = new Set(['pollinations-flux', 'pollinations-kontext', 'nanobanana', 'seedream']);
        const isPollinations = model.startsWith('pollinations-') || pollinationsImageModels.has(model);

        if (isPollinations) {
            const pollinationsModel = model.startsWith('pollinations-') ? model.replace('pollinations-', '') : model;
            let url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`;
            const params = new URLSearchParams({
                nologo: 'true',
                private: 'true',
                token: process.env.POLLINATIONS_API_KEY,
                seed: Math.floor(Math.random() * 1000000), // Add randomized seed
                quality: 'high'
            });
            if (width) params.append('width', width);
            if (height) params.append('height', height);
            if (seed) params.append('seed', seed);
            if (pollinationsModel !== 'basic') params.append('model', pollinationsModel);
            if (image) params.append('image', image);

            imageUrl = `${url}?${params.toString()}`;

            // For Pollinations, the URL is the image itself. We don't need to make a request here,
            // but we will return it in the same format as other providers.
            const responseData = {
                data: [
                    {
                        url: imageUrl,
                        revised_prompt: prompt
                    }
                ]
            };
            return res.status(200).json({
                status: 'completed',
                data: responseData.data,
                model: model,
                prompt: prompt,
                created: Date.now()
            });

        } else { // Existing logic for Airforce (imagen-4)
            const requestBody = {
                model: model,
                prompt: prompt,
                n: n,
                size: size,
                response_format: response_format
            };
            if (quality && quality !== 'standard') {
                requestBody.quality = quality;
            }
            const response = await makeApiRequestWithRetry(
                'https://api.airforce/v1/images/generations',
                requestBody,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${process.env.AIRFORCE_API_KEY}`
                    }
                },
                airforceApiKeyPool
            );
            const imageData = response.data;

            console.log('✅ Image generation completed successfully');

            // Ensure proper response format
            const formattedResponse = {
                status: 'completed',
                data: Array.isArray(imageData.data) ? imageData.data : [imageData],
                model: model,
                prompt: prompt,
                created: Date.now()
            };

            res.status(200).json(formattedResponse);
        }

    } catch (error) {
        console.error('❌ Error in image generation:', error.message);

        res.status(500).json({
            error: 'Internal server error occurred during image generation.',
            details: error.message
        });
    }
});

// ====================================
// Image Upload Endpoint for Image-to-Image
// ====================================

router.post('/images/upload', authMiddleware, async (req, res) => {
    const { image } = req.body;

    if (!image) {
        return res.status(400).json({ error: 'Image is required.' });
    }

    try {
        console.log('📤 Uploading image to ImgBB for image-to-image generation...');

        // Upload image to ImgBB
        const uploadResult = await imgbbUploader({
            apiKey: process.env.IMGBB_API_KEY,
            base64string: image.replace(/^data:image\/[a-z]+;base64,/, ''),
            name: `temp_${Date.now()}`
        });

        console.log('✅ Image uploaded to ImgBB successfully');

        res.status(200).json({
            url: uploadResult.url,
            deleteUrl: uploadResult.delete_url
        });

    } catch (error) {
        console.error('❌ Error uploading image to ImgBB:', error.message);
        res.status(500).json({
            error: 'Failed to upload image.',
            details: error.message
        });
    }
});

// ====================================
// Function Calling Handlers
// ====================================

// Handle image generation function calls
async function handleImageGenerationFunction(prompt, model = 'nanobana', size = '1024x1024', quality = 'high') {
    try {
        console.log(`🎨 Executing image generation: ${model} - ${prompt.substring(0, 50)}...`);

        // Model-specific endpoint routing
        const modelEndpoints = {
            nanobana: 'https://api.nanobana.ai/v1/images/generations',
            flux: 'https://api.flux.ai/v1/images/generations'
        };

        const endpoint = modelEndpoints[model];
        if (!endpoint) throw new Error(`Unsupported model: ${model}`);

        const requestBody = {
            model: model,
            prompt: prompt,
            size: size,
            quality: quality,
            response_format: 'url'
        };

        const apiKey = process.env[`${model.toUpperCase()}_API_KEY`];
        if (!apiKey) throw new Error(`API key not found for ${model}`);

        const response = await axios.post(endpoint, requestBody, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            }
        });

        if (!response.data || !response.data.data || !response.data.data[0]) {
            throw new Error('Invalid response from image generation API');
        }

        const result = response.data.data[0];
        return {
            image_url: result.url,
            model_used: model,
            prompt_used: prompt,
            quality: quality
        };
    } catch (error) {
        console.error('❌ Image generation function failed:', error.message);
        throw new Error(`Image generation failed: ${error.message}`);
    }
}

// Handle image editing function calls
async function handleImageEditingFunction(image_url, prompt, model = 'nanobana') {
    try {
        console.log(`✏️ Executing image editing: ${model} - ${prompt.substring(0, 50)}...`);

        // Validate image URL and download for processing
        const imageResponse = await axios.get(image_url, { responseType: 'arraybuffer' });
        if (!imageResponse.data) throw new Error('Failed to fetch image for editing');

        const base64Image = Buffer.from(imageResponse.data).toString('base64');

        const requestBody = {
            model: model,
            prompt: prompt,
            image: base64Image,
            response_format: 'url',
            strength: 0.8 // Balance between original and edits
        };

        const apiKey = process.env.NANOBANA_API_KEY;
        if (!apiKey) throw new Error('Nanobana API key not found');

        const response = await axios.post('https://api.nanobana.ai/v1/images/edits', requestBody, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            }
        });

        if (!response.data || !response.data.data || !response.data.data[0]) {
            throw new Error('Invalid response from image editing API');
        }

        const result = response.data.data[0];
        return {
            edited_image_url: result.url,
            original_image_url: image_url,
            model_used: model,
            prompt_used: prompt
        };
    } catch (error) {
        console.error('❌ Image editing function failed:', error.message);
        throw new Error(`Image editing failed: ${error.message}`);
    }
}

// Handle web search function calls using Tavily API
async function handleWebSearchFunction(query, maxResults = 5, includeAnswer = true, searchDepth = 'basic') {
    try {
        console.log(`🔍 Executing web search: ${query} (${searchDepth})`);

        const apiKey = process.env.TAVILY_API_KEY;
        if (!apiKey) throw new Error('Tavily API key not found');

        const response = await axios.post('https://api.tavily.com/search', {
            query: query,
            max_results: maxResults,
            include_answer: includeAnswer,
            search_depth: searchDepth
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            }
        });

        if (!response.data) {
            throw new Error('Invalid response from Tavily API');
        }

        return {
            query: query,
            answer: response.data.answer || null,
            results: response.data.results.map(item => ({
                title: item.title,
                url: item.url,
                content: item.content,
                score: item.score
            })),
            search_depth: searchDepth,
            response_time: response.data.response_time
        };
    } catch (error) {
        console.error('❌ Web search function failed:', error.message);
        throw new Error(`Web search failed: ${error.message}`);
    }
}

// ====================================
// Optimized Model Availability Checker with Batching & Caching
// ====================================

class OptimizedModelAvailabilityChecker {
    constructor() {
        this.modelStatus = new Map();
        this.checkInterval = 5 * 60 * 1000; // 5 minutes (reduced from 10)
        this.isRunning = false;
        this.cache = new Map(); // TTL cache for API responses
        this.pendingRequests = new Map(); // Request deduplication
        this.batchQueue = new Set(); // Batch processing queue
        this.batchTimeout = null; // Batch processing timer
        this.batchDelay = 100; // 100ms batch delay

        // Models to check availability for
        this.modelsToCheck = [
            // Anonymous/Pollinations models
            { id: 'gpt-4.1', provider: 'pollinations', apiName: 'provider-3/gpt-4.1-nano', endpoint: 'https://text.pollinations.ai/openai/chat/completions' },
            { id: 'gpt-5-nano', provider: 'pollinations', apiName: 'provider-3/gpt-5-nano', endpoint: 'https://text.pollinations.ai/openai/chat/completions' },
            { id: 'gemini', provider: 'pollinations', apiName: 'gemini', endpoint: 'https://text.pollinations.ai/openai/chat/completions' },
            { id: 'deepseek-reasoning', provider: 'pollinations', apiName: 'deepseek-reasoning', endpoint: 'https://text.pollinations.ai/openai/chat/completions' },
            { id: 'openai-reasoning', provider: 'pollinations', apiName: 'openai', endpoint: 'https://text.pollinations.ai/openai/chat/completions' },
            { id: 'o4-mini-medium', provider: 'pollinations', apiName: 'openai-reasoning', endpoint: 'https://text.pollinations.ai/openai/chat/completions' },
            { id: 'o4-mini-high', provider: 'pollinations', apiName: 'openai-reasoning', endpoint: 'https://text.pollinations.ai/openai/chat/completions' },
            // A4F models
            { id: 'kimi-k2-instruct', provider: 'A4F', apiName: 'provider-5/kimi-k2-instruct', endpoint: `${process.env.AI_API_ENDPOINT_V2}/chat/completions` },
            { id: 'glm-4.5', provider: 'A4F', apiName: 'provider-1/glm-4.5-fp8', endpoint: `${process.env.AI_API_ENDPOINT_V2}/chat/completions` },
            { id: 'glm-4.5-air', provider: 'A4F', apiName: 'provider-1/glm-4.5-air-fp8', endpoint: `${process.env.AI_API_ENDPOINT_V2}/chat/completions` },
            // Pro models
            { id: 'gpt-5', provider: 'airforce', apiName: 'gpt-5', endpoint: 'https://api.airforce/v1/chat/completions' },
            { id: 'gemini-2.5-pro', provider: 'airforce', apiName: 'gemini-2.5-pro', endpoint: 'https://api.airforce/v1/chat/completions' },
            { id: 'gemini-2.5-flash', provider: 'airforce', apiName: 'gemini-2.5-flash', endpoint: 'https://api.airforce/v1/chat/completions' },
            { id: 'grok-4', provider: 'navy', apiName: 'grok-4', endpoint: 'https://api.navy/v1/chat/completions' },
            // Image models
            { id: 'imagen-4', provider: 'airforce', apiName: 'imagen-4', endpoint: 'https://api.airforce/v1/images/generations', type: 'image' }
        ];
    }

    // Intelligent caching with TTL
    getCachedResult(key) {
        const cached = this.cache.get(key);
        if (!cached) return null;

        const { result, timestamp, ttl } = cached;
        if (Date.now() - timestamp > ttl) {
            this.cache.delete(key);
            return null;
        }

        return result;
    }

    setCachedResult(key, result, ttl = 300000) { // 5 minutes default TTL
        this.cache.set(key, {
            result,
            timestamp: Date.now(),
            ttl
        });
    }

    // Request deduplication
    async deduplicateRequest(key, requestFn) {
        // Check if request is already pending
        if (this.pendingRequests.has(key)) {
            return this.pendingRequests.get(key);
        }

        // Check cache first
        const cached = this.getCachedResult(key);
        if (cached !== null) {
            return cached;
        }

        // Create new request promise
        const requestPromise = requestFn();
        this.pendingRequests.set(key, requestPromise);

        try {
            const result = await requestPromise;
            this.setCachedResult(key, result);
            return result;
        } finally {
            this.pendingRequests.delete(key);
        }
    }

    // Batch processing for multiple models
    addToBatch(modelId) {
        this.batchQueue.add(modelId);

        if (!this.batchTimeout) {
            this.batchTimeout = setTimeout(() => {
                this.processBatch();
            }, this.batchDelay);
        }
    }

    async processBatch() {
        if (this.batchQueue.size === 0) return;

        const modelsToProcess = Array.from(this.batchQueue);
        this.batchQueue.clear();
        this.batchTimeout = null;

        console.log(`🚀 Processing batch of ${modelsToProcess.length} model checks`);

        // Group models by endpoint for efficient batching
        const endpointGroups = new Map();

        modelsToProcess.forEach(modelId => {
            const model = this.modelsToCheck.find(m => m.id === modelId);
            if (model) {
                const endpoint = model.endpoint;
                if (!endpointGroups.has(endpoint)) {
                    endpointGroups.set(endpoint, []);
                }
                endpointGroups.get(endpoint).push(model);
            }
        });

        // Process each endpoint group
        for (const [endpoint, models] of endpointGroups) {
            await this.checkEndpointGroup(endpoint, models);
        }

        console.log('✅ Batch processing completed');
    }

    async checkEndpointGroup(endpoint, models) {
        try {
            // Create a test request for this endpoint
            const testRequest = {
                model: models[0].apiName,
                messages: [{ role: 'user', content: 'test' }],
                max_tokens: 1,
                stream: false
            };

            // Determine API key pool based on endpoint
            let apiKeyPool = null;
            if (endpoint.includes('airforce')) {
                apiKeyPool = airforceApiKeyPool;
            } else if (endpoint.includes('navy')) {
                apiKeyPool = navyApiKeyPool;
            } else if (endpoint.includes(process.env.AI_API_ENDPOINT_V2)) {
                apiKeyPool = v2ApiKeyPool;
            }

            // Use request deduplication for the actual API call
            const cacheKey = `availability_${endpoint}_${Date.now()}`;
            const isAvailable = await this.deduplicateRequest(cacheKey, async () => {
                try {
                    if (apiKeyPool && apiKeyPool.keys.length > 0) {
                        await makeApiRequestWithRetry(endpoint, testRequest, {
                            headers: { 'Content-Type': 'application/json' },
                            timeout: 10000 // 10 second timeout for availability checks
                        }, apiKeyPool);
                    } else {
                        await axios.post(endpoint, testRequest, {
                            headers: { 'Content-Type': 'application/json' },
                            timeout: 10000
                        });
                    }
                    return true;
                } catch (error) {
                    console.log(`❌ Endpoint ${endpoint} unavailable:`, error.message);
                    return false;
                }
            });

            // Update all models for this endpoint
            models.forEach(model => {
                this.modelStatus.set(model.id, {
                    available: isAvailable,
                    provider: model.provider,
                    apiName: model.apiName,
                    lastChecked: Date.now(),
                    endpoint: endpoint
                });
                console.log(`📊 Model ${model.id}: ${isAvailable ? '✅ Available' : '❌ Unavailable'}`);
            });

        } catch (error) {
            console.error(`❌ Error checking endpoint group ${endpoint}:`, error.message);
            // Mark all models as unavailable if we can't check
            models.forEach(model => {
                this.modelStatus.set(model.id, {
                    available: false,
                    provider: model.provider,
                    apiName: model.apiName,
                    lastChecked: Date.now(),
                    error: error.message
                });
            });
        }
    }

    async checkModelAvailability(modelId, provider) {
        const model = this.modelsToCheck.find(m => m.id === modelId);
        if (!model) return false;

        // Check cache first
        const cached = this.getCachedResult(`model_${modelId}`);
        if (cached !== null) {
            return cached.available;
        }

        // Add to batch queue instead of checking immediately
        this.addToBatch(modelId);

        // Return cached result or default to true for immediate response
        const currentStatus = this.modelStatus.get(modelId);
        return currentStatus ? currentStatus.available : true;
    }

    async checkAllModels() {
        console.log('🔍 Starting optimized model availability check...');

        // Clear existing batch and add all models
        this.batchQueue.clear();
        if (this.batchTimeout) {
            clearTimeout(this.batchTimeout);
            this.batchTimeout = null;
        }

        // Add all models to batch
        this.modelsToCheck.forEach(model => {
            this.addToBatch(model.id);
        });

        // Process the batch
        await this.processBatch();

        console.log('✅ Optimized model availability check completed');
    }

    start() {
        if (this.isRunning) {
            console.log('⚠️ Optimized model availability checker is already running');
            return;
        }

        this.isRunning = true;
        console.log('🚀 Starting optimized model availability checker...');

        // Check immediately on startup
        this.checkAllModels();

        // Set up periodic checks with optimized interval
        this.intervalId = setInterval(() => {
            this.checkAllModels();
        }, this.checkInterval);
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        if (this.batchTimeout) {
            clearTimeout(this.batchTimeout);
            this.batchTimeout = null;
        }
        this.isRunning = false;
        console.log('⏹️ Optimized model availability checker stopped');
    }

    getModelStatus(modelId) {
        const status = this.modelStatus.get(modelId);
        return status || {
            available: true,
            lastChecked: null,
            error: 'Model not found'
        };
    }

    getAllModelStatus() {
        const status = {};
        this.modelStatus.forEach((value, key) => {
            status[key] = value;
        });
        return status;
    }

    // Get cache statistics for monitoring
    getCacheStats() {
        return {
            cacheSize: this.cache.size,
            pendingRequests: this.pendingRequests.size,
            queuedBatches: this.batchQueue.size,
            isRunning: this.isRunning
        };
    }
}

// Global instance
const modelChecker = new OptimizedModelAvailabilityChecker();

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
                    timeout: 30000 // 30 second timeout to prevent hanging connections
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

                // Add error handling for the stream
                response.data.on('error', (error) => {
                    console.error(`Stream error from ${endpoint.name}:`, error);
                });

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
        const cacheStats = modelChecker.getCacheStats();

        res.json({
            status,
            cacheStats,
            lastChecked: Date.now(),
            anonymousModels: ANONYMOUS_ALLOWED_MODELS,
            optimizationEnabled: true
        });
    } catch (error) {
        console.error('❌ Error getting model status:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ====================================
// Optimization Monitoring Endpoint
// ====================================

router.get('/optimization-stats', (req, res) => {
    try {
        const cacheStats = modelChecker.getCacheStats();
        const modelStatus = modelChecker.getAllModelStatus();

        // Calculate additional statistics
        const availableModels = Object.values(modelStatus).filter(m => m.available).length;
        const unavailableModels = Object.values(modelStatus).filter(m => !m.available).length;
        const totalModels = Object.keys(modelStatus).length;

        res.json({
            cacheStats,
            modelStats: {
                total: totalModels,
                available: availableModels,
                unavailable: unavailableModels,
                availabilityPercentage: totalModels > 0 ? Math.round((availableModels / totalModels) * 100) : 0
            },
            optimizationFeatures: {
                requestBatching: true,
                intelligentCaching: true,
                requestDeduplication: true,
                endpointGrouping: true,
                ttlExpiration: true
            },
            performanceMetrics: {
                reducedInterval: '5 minutes (vs 10 minutes)',
                batchDelay: '100ms',
                cacheTTL: '5 minutes',
                timeout: '10 seconds'
            }
        });
    } catch (error) {
        console.error('❌ Error getting optimization stats:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = {
    router,
    startModelAvailabilityChecker
};

console.log('✅ ai.js module loaded successfully');
