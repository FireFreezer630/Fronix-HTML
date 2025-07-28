//
// ENTIRELY REPLACE YOUR .../routes/chat.js WITH THIS FINAL VERSION
//
const express = require('express');
const router = express.Router();
const axios = require('axios');
const supabase = require('../config/supabaseClient');
const authMiddleware = require('../middleware/authMiddleware');

// GET all chats for the logged-in user
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('chats')
            .select('*')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false }); // Show newest first

        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching chats' });
    }
});

// POST to create a new chat
router.post('/', authMiddleware, async (req, res) => {
    const { title } = req.body;
    try {
        const { data, error } = await supabase
            .from('chats')
            .insert({
                user_id: req.user.id,
                title: title || 'New Chat'
            })
            .select()
            .single(); // Get the new chat back

        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        console.error("Error creating new chat:", error);
        res.status(500).json({ error: 'Error creating new chat' });
    }
});


// GET all messages for a specific chat
router.get('/:chatId/messages', authMiddleware, async (req, res) => {
    const { chatId } = req.params;
    try {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('chat_id', chatId)
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: true });

        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching messages' });
    }
});

// POST a new message to a chat
router.post('/:chatId/messages', authMiddleware, async (req, res) => {
    const { chatId } = req.params;
    const { message } = req.body;
    const userId = req.user.id;

    try {
        // 1. Save user's message
        await supabase.from('messages').insert({
            chat_id: chatId,
            user_id: userId,
            role: 'user',
            content: message
        });

        // 2. Get AI response
        const aiResponse = await axios.post(
            process.env.AI_API_ENDPOINT,
            { model: 'openai', messages: [{ role: 'user', content: message }], stream: false },
            { headers: { 'Content-Type': 'application/json' } }
        );
        const aiMessageContent = aiResponse.data.choices[0].message.content;

        // 3. Save AI's message and send it back
        const { data: aiMessage, error: aiMessageError } = await supabase
            .from('messages')
            .insert({
                chat_id: chatId,
                user_id: userId,
                role: 'assistant',
                content: aiMessageContent
            })
            .select()
            .single();

        if (aiMessageError) throw aiMessageError;

        res.status(201).json(aiMessage);
    } catch (error) {
        console.error("Chat processing error:", error);
        res.status(500).json({ error: 'Internal server error in chat processing' });
    }
});

// DELETE a chat and its messages
router.delete('/:chatId', authMiddleware, async (req, res) => {
    const { chatId } = req.params;
    const userId = req.user.id;

    try {
        // The '.eq('user_id', userId)' clause ensures users can only delete their own chats.
        const { error } = await supabase
            .from('chats')
            .delete()
            .eq('id', chatId)
            .eq('user_id', userId);

        if (error) {
            // This could be a database error or a row-level security policy violation.
            throw error;
        }

        // The 'ON DELETE CASCADE' constraint handles deleting all associated messages.
        res.status(200).json({ message: 'Chat deleted successfully' });

    } catch (error) {
        console.error("Error deleting chat:", error);
        res.status(500).json({ error: 'Error deleting chat' });
    }
});


module.exports = router;
