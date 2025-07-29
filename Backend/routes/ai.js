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
        const headers = {
            'Content-Type': 'application/json',
            // Make sure AI_API_KEY is set in your .env file if the API requires it
            // 'Authorization': `Bearer ${process.env.AI_API_KEY}`
        };

        const aiResponse = await axios.post(
            process.env.AI_API_ENDPOINT, // Make sure AI_API_ENDPOINT is set in your .env file
            {
                model: model,
                messages: messages,
                stream: true
            },
            {
                headers: headers,
                responseType: 'stream'
            }
        );

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        aiResponse.data.pipe(res);

    } catch (error) {
        const errorData = error.response ? error.response.data : {};
        const errorMessage = (errorData.error && errorData.error.message) ? errorData.error.message : 'An internal server error occurred while contacting the AI service.';
        console.error('Error calling AI service:', errorMessage);
        
        const status = error.response ? error.response.status : 500;
        res.status(status).json({ error: errorMessage });
    }
});

module.exports = router;