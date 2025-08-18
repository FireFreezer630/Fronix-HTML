const express = require('express');
const router = express.Router();
const axios = require('axios');
const supabase = require('../config/supabaseClient'); // Import supabase client
const authMiddleware = require('../middleware/authMiddleware');
const fs = require('fs');
const path = require('path');

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
        this.keys = keys.filter(key => key && key.trim() !== ''); // Remove empty keys
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
const v1ApiKeys = [process.env.AI_API_KEY].filter(Boolean);
const v2ApiKeys = [
    process.env.AI_API_KEY_V2,
    process.env.AI_API_KEY_V2_3,
    process.env.AI_API_KEY_V2_4,
    process.env.AI_API_KEY_V2_5
].filter(Boolean);

const v1ApiKeyPool = new ApiKeyPool(v1ApiKeys, 'V1');
const v2ApiKeyPool = new ApiKeyPool(v2ApiKeys, 'V2');


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
async function makeApiRequestWithRetry(url, requestBody, requestOptions, isV2) {
    const pool = isV2 ? v2ApiKeyPool : v1ApiKeyPool;
    const retryLimit = pool.maxRetries > 0 ? pool.maxRetries : 1;
    let attempt = 0;
    let lastError = null;
    
    while (attempt < retryLimit) {
        try {
            const currentKey = pool.getCurrentKey();
            
            const updatedOptions = { ...requestOptions };
            updatedOptions.headers = {
                ...requestOptions.headers,
                'Authorization': `Bearer ${currentKey}`
            };
            
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

router.post('/chat', authMiddleware, async (req, res) => {
    const { model, messages, chatId } = req.body; // Added chatId

    if (!model || !messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'Invalid request body. "model" and a "messages" array are required.' });
    }

    // Declare variables outside try block for error handling access
    let requestBody, apiHeaders, apiEndpoint, modelId, isV2Model;
    
    try {
        // Fetch study_mode status from the chats table
        let isStudyMode = false;
        if (chatId) {
            console.log(`🔍 Fetching study mode for chatId: ${chatId}, userId: ${req.user.id}`);
            const { data: chatData, error: chatError } = await supabase
                .from('chats')
                .select('study_mode')
                .eq('id', chatId)
                .eq('user_id', req.user.id) // Ensure user owns the chat
                .single();

            if (chatError) {
                console.error('Error fetching chat study mode:', chatError.message);
                // Continue without study mode if there's an error
            } else if (chatData) {
                isStudyMode = chatData.study_mode;
                console.log(`📚 Study mode for chat ${chatId}: ${isStudyMode}`);
            } else {
                console.log(`⚠️ No chat data found for chatId: ${chatId}`);
            }
        } else {
            console.log('⚠️ No chatId provided for study mode check');
        }
        
        // Prepare messages for the AI model
        let messagesForAI = JSON.parse(JSON.stringify(messages)); // Deep copy
        if (isStudyMode && studyModePrompt) {
            const systemMessage = messagesForAI.find(m => m.role === 'system');
            if (systemMessage) {
                // Merge with existing system message
                systemMessage.content = `${studyModePrompt}\n\n${systemMessage.content}`;
                console.log('📚 Study mode prompt merged with existing system message.');
            } else {
                // Prepend as a new system message
                messagesForAI.unshift({ role: 'system', content: studyModePrompt });
                console.log('📚 Study mode prompt injected into AI messages.');
            }
        }

        // Set proper SSE headers for streaming response
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        
        // Determine if model uses V2 API
        const V2_MODELS = [
            'claude-opus-4',
            'o4-mini-medium',
            'o4-mini-high',
            'gpt-4o-mini-search-preview',
            'gemini-2.5-flash-thinking',
            'kimi-k2',
            'deepseek-r1-uncensored'
        ];
        console.log('🔍 Checking if model is V2:', model);
        console.log('🔍 V2_MODELS array:', V2_MODELS);
        isV2Model = V2_MODELS.includes(model);
        console.log('🔍 isV2Model result:', isV2Model);
        
        // Select appropriate endpoint and authentication
        if (isV2Model) {
            apiEndpoint = `${process.env.AI_API_ENDPOINT_V2}/chat/completions`;
            // Map model to full provider ID for V2 API
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
            apiHeaders = {
                'Content-Type': 'application/json',
                'Accept': 'text/event-stream'
                // Authorization header will be set by makeApiRequestWithRetry
            };
        } else {
            // V1 models (Pollinations.ai)
            apiEndpoint = process.env.AI_API_ENDPOINT;
            modelId = model;
            apiHeaders = {
                'Content-Type': 'application/json',
                'Accept': 'text/event-stream'
            };
            // The specific V1 API key will be passed directly to makeApiRequestWithRetry
        }
        
        // Format request body according to OpenAI-compatible format
        requestBody = {
            model: modelId,
            messages: messagesForAI, // Use the modified messages array
            stream: true
        };

        // Enhanced debug logging for request
        console.log('🔄 API Version:', isV2Model ? 'V2' : 'V1');
        console.log('🔄 Making API request to:', apiEndpoint);
        console.log('🔄 Request model:', model);
        console.log('🔄 Mapped model ID:', modelId);
        console.log('🔄 Request messages count:', messages.length);
        console.log('🔄 Using authentication:', isV2Model ? 'Bearer Token (V2)' : 'Bearer Token (V1)');
        
        const hasImages = messages.some(msg =>
            Array.isArray(msg.content) &&
            msg.content.some(item => item.type === 'image_url')
        );
        console.log('🔄 Request contains images:', hasImages);

        const aiResponse = await makeApiRequestWithRetry(
            apiEndpoint,
            requestBody,
            {
                headers: apiHeaders,
                responseType: 'stream'
            },
            isV2Model
        );

        console.log('✅ API Response Status:', aiResponse.status);
        console.log('✅ API Response Headers:', JSON.stringify(aiResponse.headers, null, 2));

        let buffer = '';
        
        // Handle the streaming response properly
        aiResponse.data.on('data', (chunk) => {
            buffer += chunk.toString();
            const lines = buffer.split('\n');
            
            // Keep the last incomplete line in buffer
            buffer = lines.pop() || '';
            
            for (const line of lines) {
                const trimmedLine = line.trim();
                if (!trimmedLine) continue;
                
                // Forward valid SSE lines to client
                if (trimmedLine.startsWith('data: ')) {
                    try {
                        // Validate that it's proper JSON after 'data: '
                        const jsonStr = trimmedLine.slice(6);
                        if (jsonStr === '[DONE]') {
                            res.write('data: [DONE]\n\n');
                            res.end();
                            return;
                        }
                        
                        // Validate JSON format
                        const data = JSON.parse(jsonStr);
                        if (data.choices && Array.isArray(data.choices)) {
                            res.write(trimmedLine + '\n\n');
                        }
                    } catch (jsonError) {
                        console.warn('Invalid JSON in streaming response:', jsonError.message);
                        // Skip invalid JSON chunks
                    }
                } else if (trimmedLine.startsWith('event: ') || trimmedLine.startsWith('id: ') || trimmedLine.startsWith('retry: ')) {
                    // Forward other valid SSE fields
                    res.write(trimmedLine + '\n');
                }
            }
        });

        aiResponse.data.on('end', () => {
            // Process any remaining buffer content
            if (buffer.trim()) {
                const trimmedLine = buffer.trim();
                if (trimmedLine.startsWith('data: ')) {
                    try {
                        const jsonStr = trimmedLine.slice(6);
                        if (jsonStr === '[DONE]') {
                            res.write('data: [DONE]\n\n');
                        }
                    } catch (error) {
                        console.warn('Error processing final buffer:', error.message);
                    }
                }
            }
            res.end();
        });

        aiResponse.data.on('error', (streamError) => {
            console.error('Stream error:', streamError);
            res.write(`data: ${JSON.stringify({ error: 'Stream error occurred' })}\n\n`);
            res.end();
        });

    } catch (error) {
        console.error('❌ Error calling AI service:', error.message);
        
        // Handle different types of errors
        if (error.response) {
            const status = error.response.status;
            const errorData = error.response.data;
            
            // Enhanced logging for debugging
            console.error('❌ API Response Status:', status);
            console.error('❌ API Response Headers:', JSON.stringify(error.response.headers, null, 2));
            console.error('❌ API Response Config:', safeStringify({
                url: error.config?.url,
                method: error.config?.method,
                headers: error.config?.headers
            }));
            
            // Log full response data for analysis
            if (typeof errorData === 'string') {
                console.error('❌ API Response Data (string):', errorData);
            } else if (typeof errorData === 'object') {
                console.error('❌ API Response Data (object):', safeStringify(errorData));
            } else {
                console.error('❌ API Response Data (other):', errorData);
            }
            
            // Log the original request for debugging
            console.error('❌ Original Request Body:', safeStringify(requestBody));
            console.error('❌ Request Headers:', safeStringify(apiHeaders));
            console.error('❌ API Endpoint:', apiEndpoint);
            console.error('❌ Model was V2?:', isV2Model);
            
            // Special handling for 401 errors
            if (status === 401) {
                console.error('🚨 AUTHENTICATION ERROR - Possible causes:');
                if (isV2Model) {
                    console.error('  - V2 API Key invalid:', process.env.AI_API_KEY_V2 ? 'Key exists' : 'Key missing');
                    console.error('  - V2 API Endpoint:', apiEndpoint);
                } else {
                    console.error('  - V1 API may require authentication');
                }
                res.status(401).json({ error: 'Authentication failed with AI service.' });
            } else if (status === 429) {
                res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
            } else if (status === 400) {
                res.status(400).json({ error: 'Invalid request format for AI service.' });
            } else {
                res.status(status).json({
                    error: errorData?.error?.message || 'An error occurred while contacting the AI service.'
                });
            }
        } else if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND') {
            console.error('❌ Network error:', error.code);
            res.status(503).json({ error: 'AI service is temporarily unavailable. Please try again later.' });
        } else {
            console.error('❌ Unexpected error:', error);
            console.error('❌ Error stack:', error.stack);
            res.status(500).json({ error: 'Internal server error occurred while contacting the AI service.' });
        }
    }
});

// Image generation endpoint
router.post('/images/generations', authMiddleware, async (req, res) => {
    const { model, prompt, n = 1, size = '1024x1024', quality = 'standard', response_format = 'url', style = 'vivid', user } = req.body;

    if (!model || !prompt) {
        return res.status(400).json({ error: 'Invalid request body. "model" and "prompt" are required.' });
    }

    // Declare variables outside try block for error handling access
    let requestBody, apiHeaders, apiEndpoint;
    
    try {
        // A4F Image Generation API configuration
        apiEndpoint = `${process.env.AI_API_ENDPOINT_V2}/images/generations`;
        apiHeaders = {
            'Content-Type': 'application/json'
            // Authorization header will be set by makeApiRequestWithRetry
        };

        // Format request body according to OpenAI Images API format
        requestBody = {
            model,
            prompt,
            n,
            size,
            quality,
            response_format,
            style
        };

        if (user) {
            requestBody.user = user;
        }

        // Enhanced debug logging for image generation request
        console.log('🎨 Image Generation API Request');
        console.log('🎨 Making API request to:', apiEndpoint);
        console.log('🎨 Request model:', model);
        console.log('🎨 Request prompt:', prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''));
        console.log('🎨 Image count:', n);
        console.log('🎨 Image size:', size);
        console.log('🎨 Quality:', quality);
        console.log('🎨 Response format:', response_format);
        console.log('🎨 Style:', style);

        const aiResponse = await makeApiRequestWithRetry(
            apiEndpoint,
            requestBody,
            {
                headers: apiHeaders,
                responseType: 'json'
            }
        );

        console.log('✅ Image Generation API Response Status:', aiResponse.status);
        console.log('✅ Generated images count:', aiResponse.data?.data?.length);

        // Return the response data directly (OpenAI compatible format)
        res.json(aiResponse.data);

    } catch (error) {
        console.error('❌ Error calling Image Generation service:', error.message);
        
        // Handle different types of errors
        if (error.response) {
            const status = error.response.status;
            const errorData = error.response.data;
            
            // Enhanced logging for debugging
            console.error('❌ Image API Response Status:', status);
            console.error('❌ Image API Response Headers:', JSON.stringify(error.response.headers, null, 2));
            
            // Log full response data for analysis
            if (typeof errorData === 'string') {
                console.error('❌ Image API Response Data (string):', errorData);
            } else if (typeof errorData === 'object') {
                console.error('❌ Image API Response Data (object):', safeStringify(errorData));
            } else {
                console.error('❌ Image API Response Data (other):', errorData);
            }
            
            // Log the original request for debugging
            console.error('❌ Original Image Request Body:', safeStringify(requestBody));
            console.error('❌ Image Request Headers:', safeStringify(apiHeaders));
            console.error('❌ Image API Endpoint:', apiEndpoint);
            
            if (status === 429) {
                res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
            } else if (status === 400) {
                res.status(400).json({ error: 'Invalid request format for Image Generation service.' });
            } else {
                res.status(status).json({
                    error: errorData?.error?.message || 'An error occurred while contacting the Image Generation service.'
                });
            }
        } else if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND') {
            console.error('❌ Network error:', error.code);
            res.status(503).json({ error: 'Image Generation service is temporarily unavailable. Please try again later.' });
        } else {
            console.error('❌ Unexpected error:', error);
            console.error('❌ Error stack:', error.stack);
            res.status(500).json({ error: 'Internal server error occurred while contacting the Image Generation service.' });
        }
    }
});

module.exports = router;