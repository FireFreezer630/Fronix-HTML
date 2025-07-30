const express = require('express');
const router = express.Router();
const axios = require('axios');
const authMiddleware = require('../middleware/authMiddleware');

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

router.post('/chat', authMiddleware, async (req, res) => {
    const { model, messages } = req.body;

    if (!model || !messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'Invalid request body. "model" and a "messages" array are required.' });
    }

    // Declare variables outside try block for error handling access
    let requestBody, apiHeaders, apiEndpoint, modelId, isV2Model;
    
    try {
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
        isV2Model = V2_MODELS.includes(model);
        
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
                'Accept': 'text/event-stream',
                'Authorization': `Bearer ${process.env.AI_API_KEY_V2}`
            };
        } else {
            apiEndpoint = process.env.AI_API_ENDPOINT;
            modelId = model;
            apiHeaders = {
                'Content-Type': 'application/json',
                'Accept': 'text/event-stream'
            };
        }
        
        // Format request body according to OpenAI-compatible format
        requestBody = {
            model: modelId,
            messages: messages,
            stream: true
        };

        // Enhanced debug logging for request
        console.log('🔄 API Version:', isV2Model ? 'V2' : 'V1');
        console.log('🔄 Making API request to:', apiEndpoint);
        console.log('🔄 Request model:', model);
        console.log('🔄 Mapped model ID:', modelId);
        console.log('🔄 Request messages count:', messages.length);
        console.log('🔄 Using authentication:', isV2Model ? 'Bearer Token (V2)' : 'No Auth (V1)');
        if (isV2Model) {
            console.log('🔄 V2 API Key (first 20 chars):', process.env.AI_API_KEY_V2?.substring(0, 20) + '...');
            console.log('🔄 V2 API Headers:', JSON.stringify(apiHeaders, null, 2));
        }
        // Log if any message contains images
        const hasImages = messages.some(msg =>
            Array.isArray(msg.content) &&
            msg.content.some(item => item.type === 'image_url')
        );
        console.log('🔄 Request contains images:', hasImages);
        if (hasImages) {
            console.log('🔄 Image message structure:', JSON.stringify(messages.find(msg =>
                Array.isArray(msg.content) &&
                msg.content.some(item => item.type === 'image_url')
            ), null, 2));
        }

        const aiResponse = await axios.post(
            apiEndpoint,
            requestBody,
            {
                headers: apiHeaders,
                responseType: 'stream'
            }
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

module.exports = router;