const express = require('express');
const router = express.Router();
const supabase = require('../config/supabaseClient');
const authMiddleware = require('../middleware/authMiddleware');
const crypto = require('crypto');
const { generateChatTitle } = require('../utils/titleGenerator');
const { getFirstTwoNonTrivialMessages } = require('../utils/messageUtils');
const cache = require('../utils/cache');

// GET all chats for the logged-in user
router.get('/', authMiddleware, async (req, res) => {
    const cacheKey = `chats_${req.user.id}`;
    const cachedData = cache.get(cacheKey);

    if (cachedData) {
        console.log(`[Cache] HIT for key: ${cacheKey}`);
        return res.status(200).json(cachedData);
    }

    console.log(`[Cache] MISS for key: ${cacheKey}`);
    try {
        const { data, error } = await supabase
            .from('chats')
            .select('*')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        cache.set(cacheKey, data, 300); // Cache for 5 minutes
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching chats' });
    }
});

// GET a single chat by ID
router.get('/:chatId', authMiddleware, async (req, res) => {
    const { chatId } = req.params;
    const cacheKey = `chat_${chatId}`;
    const cachedData = cache.get(cacheKey);

    if (cachedData) {
        console.log(`[Cache] HIT for key: ${cacheKey}`);
        return res.status(200).json(cachedData);
    }

    console.log(`[Cache] MISS for key: ${cacheKey}`);
    try {
        const { data, error } = await supabase
            .from('chats')
            .select('*')
            .eq('id', chatId)
            .eq('user_id', req.user.id)
            .single();

        if (error) throw error;
        if (!data) {
            return res.status(404).json({ error: 'Chat not found or unauthorized.' });
        }

        cache.set(cacheKey, data, 300); // Cache for 5 minutes
        res.status(200).json(data);
    } catch (error) {
        console.error("Error fetching single chat:", error);
        res.status(500).json({ error: 'Error fetching chat' });
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
            .single();

        if (error) throw error;

        // Invalidate chats list cache
        const cacheKey = `chats_${req.user.id}`;
        cache.del(cacheKey);
        console.log(`[Cache] INVALIDATED for key: ${cacheKey}`);

        res.status(201).json(data);
    } catch (error) {
        console.error("Error creating new chat:", error);
        res.status(500).json({ error: 'Error creating new chat' });
    }
});

// GET all messages for a specific chat
router.get('/:chatId/messages', authMiddleware, async (req, res) => {
    const { chatId } = req.params;
    const { page = 1, limit = 50 } = req.query; // Increased limit
    const offset = (page - 1) * limit;
    const cacheKey = `messages_${chatId}_page_${page}`;
    const cachedData = cache.get(cacheKey);

    if (cachedData) {
        console.log(`[Cache] HIT for key: ${cacheKey}`);
        return res.status(200).json(cachedData);
    }

    console.log(`[Cache] MISS for key: ${cacheKey}`);
    try {
        const { data, error, count } = await supabase
            .from('messages')
            .select('*', { count: 'exact' })
            .eq('chat_id', chatId)
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: true })
            .order('id', { ascending: true })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        const totalPages = Math.ceil(count / limit);
        if (page > totalPages && count > 0) {
            return res.status(404).json({ error: 'Page not found' });
        }

        const responseData = {
            messages: data,
            currentPage: Number(page),
            totalPages,
            totalMessages: count
        };

        cache.set(cacheKey, responseData, 300); // Cache for 5 minutes
        res.status(200).json(responseData);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching messages' });
    }
});

// POST to save messages after an AI stream is complete
router.post('/:chatId/save-messages', authMiddleware, async (req, res) => {
    const { chatId } = req.params;
    const { userMessage, assistantMessage } = req.body;
    const userId = req.user.id;

    if (!userMessage || !assistantMessage || !userMessage.content || !assistantMessage.content) {
        return res.status(400).json({ error: 'Both user and assistant messages with content are required.' });
    }

    try {
        const { error } = await supabase.from('messages').insert([
            { chat_id: chatId, user_id: userId, role: 'user', content: userMessage.content },
            { chat_id: chatId, user_id: userId, role: 'assistant', content: assistantMessage.content }
        ]);
        
        if (error) throw error;

        // Invalidate message cache for this chat
        const keys = cache.keys();
        keys.forEach(key => {
            if (key.startsWith(`messages_${chatId}`)) {
                cache.del(key);
                console.log(`[Cache] INVALIDATED for key: ${key}`);
            }
        });

        const { data: chat, error: chatError } = await supabase
            .from('chats')
            .select('title, title_generated')
            .eq('id', chatId)
            .single();

        if (chatError) {
            console.error('Error fetching chat for title generation check:', chatError);
        } else if (!chat.title_generated && chat.title === 'New Chat') {
            const messages = await getFirstTwoNonTrivialMessages(chatId);
            if (messages.length >= 2) {
                try {
                    await generateChatTitle(chatId, messages);
                } catch (titleError) {
                    console.error('Error generating title, but continuing:', titleError);
                }
            }
        }
        
        let responsePayload = { success: true, message: 'Conversation saved.' };

        const { data: updatedChat, error: updatedChatError } = await supabase
            .from('chats')
            .select('title')
            .eq('id', chatId)
            .single();

        if (updatedChatError) {
            console.error('Error fetching updated chat title:', updatedChatError);
        } else if (updatedChat) {
            responsePayload.title = updatedChat.title;
            // Invalidate single chat cache
            cache.del(`chat_${chatId}`);
            // Invalidate chats list cache
            cache.del(`chats_${userId}`);
        }

        res.status(201).json(responsePayload);
    } catch (error) {
        console.error("Error saving conversation:", error);
        res.status(500).json({ error: 'Internal server error while saving conversation.' });
    }
});

// UPDATE a chat's title
router.put('/:chatId', authMiddleware, async (req, res) => {
    const { chatId } = req.params;
    const { title, title_generated } = req.body;
    const userId = req.user.id;
    
    if (!title) {
        return res.status(400).json({ error: 'Title is required' });
    }
    
    try {
        const { data, error } = await supabase
            .from('chats')
            .update({ title, title_generated })
            .eq('id', chatId)
            .eq('user_id', userId)
            .select()
            .single();
            
        if (error) throw error;
        
        if (!data) {
            return res.status(404).json({ error: 'Chat not found or you do not have permission to edit it.' });
        }

        // Invalidate caches
        cache.del(`chat_${chatId}`);
        cache.del(`chats_${userId}`);
        console.log(`[Cache] INVALIDATED for keys: chat_${chatId}, chats_${userId}`);
        
        res.status(200).json(data);
    } catch (error) {
        console.error("Error updating chat title:", error);
        res.status(500).json({ error: 'Error updating chat title' });
    }
});

// DELETE a chat and its messages
router.delete('/:chatId', authMiddleware, async (req, res) => {
    const { chatId } = req.params;
    const userId = req.user.id;

    try {
        const { error } = await supabase
            .from('chats')
            .delete()
            .eq('id', chatId)
            .eq('user_id', userId);

        if (error) throw error;

        // Invalidate caches
        cache.del(`chat_${chatId}`);
        cache.del(`chats_${userId}`);
        const keys = cache.keys();
        keys.forEach(key => {
            if (key.startsWith(`messages_${chatId}`)) {
                cache.del(key);
            }
        });
        console.log(`[Cache] INVALIDATED for chat ${chatId} and user ${userId}`);

        res.status(200).json({ message: 'Chat deleted successfully' });
    } catch (error) {
        console.error("Error deleting chat:", error);
        res.status(500).json({ error: 'Error deleting chat' });
    }
});

// POST upload image to Supabase storage
router.post('/upload-image', authMiddleware, async (req, res) => {
    try {
        const { imageData, fileName, mimeType } = req.body;
        
        if (!imageData || !fileName) {
            return res.status(400).json({ error: 'Image data and filename are required.' });
        }
        
        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        
        const timestamp = Date.now();
        const randomId = crypto.randomBytes(8).toString('hex');
        const fileExtension = fileName.split('.').pop() || 'jpg';
        const uniqueFileName = `${timestamp}-${randomId}.${fileExtension}`;
        
        const { data, error } = await supabase.storage
            .from('chat_images')
            .upload(`${req.user.id}/${uniqueFileName}`, buffer, {
                contentType: mimeType || 'image/jpeg',
                upsert: false
            });
            
        if (error) {
            console.error('Supabase upload error:', error);
            throw error;
        }
        
        const { data: publicUrl } = supabase.storage
            .from('chat_images')
            .getPublicUrl(`${req.user.id}/${uniqueFileName}`);
            
        res.status(200).json({
            success: true,
            url: publicUrl.publicUrl,
            path: data.path
        });
        
    } catch (error) {
        console.error('Error uploading image:', error);
        res.status(500).json({ error: 'Failed to upload image to storage.' });
    }
});

// DELETE cleanup orphaned images for a user
router.delete('/cleanup-images', authMiddleware, async (req, res) => {
    try {
        const { data: files, error: listError } = await supabase.storage
            .from('chat_images')
            .list(`${req.user.id}/`, { limit: 1000 });
        if (listError) throw listError;
        
        if (!files || files.length === 0) {
            return res.status(200).json({ message: 'No images to cleanup.', deleted: 0 });
        }
        
        const { data: messages, error: msgError } = await supabase
            .from('messages')
            .select('content')
            .eq('user_id', req.user.id)
            .ilike('content', '%chat_images%');

        if (msgError) throw msgError;
        
        const referencedUrls = new Set();
        messages.forEach(msg => {
            try {
                let content = msg.content;
                if (typeof content === 'string' && (content.startsWith('[') || content.startsWith('{'))) {
                    content = JSON.parse(content);
                }
                if (Array.isArray(content)) {
                    content.forEach(part => {
                        if (part.type === 'image_url' && part.image_url?.url) {
                            referencedUrls.add(part.image_url.url);
                        }
                    });
                }
            } catch (e) { /* Skip invalid JSON */ }
        });
        
        const orphanedFiles = files.filter(file => {
            const { data: publicUrl } = supabase.storage
                .from('chat_images')
                .getPublicUrl(`${req.user.id}/${file.name}`);
            return !referencedUrls.has(publicUrl.publicUrl);
        });
        
        if (orphanedFiles.length > 0) {
            const pathsToDelete = orphanedFiles.map(file => `${req.user.id}/${file.name}`);
            const { error: deleteError } = await supabase.storage
                .from('chat_images')
                .remove(pathsToDelete);
            if (deleteError) throw deleteError;
        }
        
        res.status(200).json({
            message: 'Cleanup completed.',
            deleted: orphanedFiles.length,
            orphanedFiles: orphanedFiles.map(f => f.name)
        });
        
    } catch (error) {
        console.error('Error during image cleanup:', error);
        res.status(500).json({ error: 'Image cleanup failed.' });
    }
});

router.post('/:chatId/toggle-study-mode', authMiddleware, async (req, res) => {
    const { chatId } = req.params;
    const userId = req.user?.id;

    try {
        // First, try to get the chat (works for both authenticated and anonymous)
        let chatQuery = supabase
            .from('chats')
            .select('study_mode, user_id')
            .eq('id', chatId);

        // If user is authenticated, ensure they own the chat
        if (userId) {
            chatQuery = chatQuery.eq('user_id', userId);
        }

        const { data: chat, error: fetchError } = await chatQuery.single();

        if (fetchError) {
            console.error('Error fetching chat for study mode toggle:', fetchError);
            return res.status(404).json({
                error: 'Chat not found or unauthorized.',
                timestamp: new Date().toISOString()
            });
        }

        if (!chat) {
            return res.status(404).json({
                error: 'Chat not found or unauthorized.',
                timestamp: new Date().toISOString()
            });
        }

        // If user is authenticated but doesn't own the chat, deny access
        if (userId && chat.user_id !== userId) {
            return res.status(403).json({
                error: 'Access denied. You do not own this chat.',
                timestamp: new Date().toISOString()
            });
        }

        const newStudyModeStatus = !chat.study_mode;

        // Update the study mode
        let updateQuery = supabase
            .from('chats')
            .update({ study_mode: newStudyModeStatus })
            .eq('id', chatId);

        // If user is authenticated, include user_id filter
        if (userId) {
            updateQuery = updateQuery.eq('user_id', userId);
        }

        const { data, error: updateError } = await updateQuery.select().single();

        if (updateError) {
            console.error('Error updating study mode:', updateError);
            throw updateError;
        }

        // Invalidate caches
        if (userId) {
            cache.del(`chat_${chatId}`);
            cache.del(`chats_${userId}`);
        }

        res.status(200).json({
            success: true,
            study_mode: newStudyModeStatus,
            message: `Study mode ${newStudyModeStatus ? 'enabled' : 'disabled'} for chat ${chatId}.`,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error toggling study mode:', error);
        res.status(500).json({
            error: 'Failed to toggle study mode.',
            timestamp: new Date().toISOString()
        });
    }
});

// Anonymous study mode toggle (for non-authenticated users with local chats)
router.post('/anonymous/:chatId/toggle-study-mode', async (req, res) => {
    const { chatId } = req.params;
    const clientId = req.headers['x-client-id'] || req.ip || 'anonymous';

    try {
        // For anonymous users, we need to handle localStorage-based chat IDs
        // Since we can't verify ownership securely, we'll add basic protection
        if (!chatId || !chatId.startsWith('anon-')) {
            return res.status(400).json({
                error: 'Invalid chat ID for anonymous study mode toggle.',
                timestamp: new Date().toISOString()
            });
        }

        // For now, we'll allow the toggle but log it for security monitoring
        console.log(`[${new Date().toISOString()}] Anonymous study mode toggle - Client: ${clientId}, Chat: ${chatId}`);

        // Since anonymous chats are stored locally, we can't actually update them on the server
        // The frontend will handle the local state update
        res.status(200).json({
            success: true,
            study_mode: true, // Frontend will manage the actual state
            message: 'Study mode toggled locally. Changes are not synced to server.',
            timestamp: new Date().toISOString(),
            anonymous: true
        });

    } catch (error) {
        console.error('Error in anonymous study mode toggle:', error);
        res.status(500).json({
            error: 'Failed to toggle study mode.',
            timestamp: new Date().toISOString()
        });
    }
});

router.post('/generate-missing-titles', authMiddleware, async (req, res) => {
    try {
        const { data: chats, error } = await supabase
            .from('chats')
            .select('id')
            .eq('title_generated', false)
            .eq('user_id', req.user.id);

        if (error) throw error;

        let titlesGenerated = 0;
        for (const chat of chats) {
            const messages = await getFirstTwoNonTrivialMessages(chat.id);
            if (messages.length === 2) {
                await generateChatTitle(chat.id, messages);
                titlesGenerated++;
            }
        }

        // Invalidate chats list cache
        cache.del(`chats_${req.user.id}`);

        res.status(200).json({ success: true, message: `${titlesGenerated} titles generated.` });
    } catch (error) {
        console.error('Error generating missing titles:', error);
        res.status(500).json({ error: 'Error generating missing titles' });
    }
});

module.exports = router;

