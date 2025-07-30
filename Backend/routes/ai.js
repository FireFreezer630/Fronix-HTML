const express = require('express');
const router = express.Router();
const axios = require('axios');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/chat', authMiddleware, async (req, res) => {
    const { model, messages } = req.body;

    if (!model || !messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'Invalid request body. "model" and a "messages" array are required.' });
    }

    try {
        // Set proper SSE headers for streaming response
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        
        // Format request body according to Pollinations.AI OpenAI-compatible format
        const requestBody = {
            model: model,
            messages: messages,
            stream: true
        };

        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream'
        };

        // Debug logging for request
        console.log('🔄 Making API request to:', process.env.AI_API_ENDPOINT);
        console.log('🔄 Request model:', model);
        console.log('🔄 Request messages count:', messages.length);
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
            process.env.AI_API_ENDPOINT, // https://text.pollinations.ai/openai
            requestBody,
            {
                headers: headers,
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
            
            // Log full response data for analysis
            if (typeof errorData === 'string') {
                console.error('❌ API Response Data (string):', errorData);
            } else if (typeof errorData === 'object') {
                console.error('❌ API Response Data (object):', JSON.stringify(errorData, null, 2));
            } else {
                console.error('❌ API Response Data (other):', errorData);
            }
            
            // Log the original request for debugging
            console.error('❌ Original Request Body:', JSON.stringify(requestBody, null, 2));
            console.error('❌ Request Headers:', JSON.stringify(headers, null, 2));
            console.error('❌ API Endpoint:', process.env.AI_API_ENDPOINT);
            
            if (status === 429) {
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