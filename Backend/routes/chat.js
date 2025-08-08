//
// ENTIRELY REPLACE YOUR .../routes/chat.js WITH THIS FINAL VERSION
//
const express = require('express');
const router = express.Router();
const supabase = require('../config/supabaseClient');
const authMiddleware = require('../middleware/authMiddleware');
const crypto = require('crypto');
const { generateChatTitle } = require('../utils/titleGenerator');
const { getFirstTwoNonTrivialMessages } = require('../utils/messageUtils');

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
// GET a single chat by ID
router.get('/:chatId', authMiddleware, async (req, res) => {
    const { chatId } = req.params;
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

// POST to save messages after an AI stream is complete
router.post('/:chatId/save-messages', authMiddleware, async (req, res) => {
    const { chatId } = req.params;
    const { userMessage, assistantMessage } = req.body;
    const userId = req.user.id;

    console.log(`[Save Messages] Received request for chatId: ${chatId}`);
    console.log(`[Save Messages] User message:`, userMessage);
    console.log(`[Save Messages] Assistant message:`, assistantMessage);
    
    if (!userMessage || !assistantMessage) {
        return res.status(400).json({ error: 'Both user and assistant messages are required.' });
    }
    
    try {
        // Prepare messages with proper content structure
        const userContent = typeof userMessage === 'object' ? JSON.stringify(userMessage) : userMessage;
        const assistantContent = typeof assistantMessage === 'object' ? JSON.stringify(assistantMessage) : assistantMessage;
        
        const { error } = await supabase.from('messages').insert([
            { chat_id: chatId, user_id: userId, role: 'user', content: userContent },
            { chat_id: chatId, user_id: userId, role: 'assistant', content: assistantContent }
        ]);
        
        if (error) throw error;

        // Check if it's time to generate a title
        const { data: messages, error: messagesError } = await supabase
            .from('messages')
            .select('*')
            .eq('chat_id', chatId);

        let nonTrivialMessages = [];
        if (messagesError) {
            console.error('Error fetching messages for title generation:', messagesError);
        } else {
            nonTrivialMessages = messages.filter(m => !/^(hi|hello|yo)$/i.test(m.content.trim()));
            console.log(`Message count for chat ${chatId}: ${messages.length}, Non-trivial messages: ${nonTrivialMessages.length}`);
            if (nonTrivialMessages.length >= 2) {
                console.log('Triggering title generation...');
                await generateChatTitle(chatId, nonTrivialMessages);
            }
        }
        let responsePayload = { success: true, message: 'Conversation saved.' };
        if (nonTrivialMessages.length >= 2) {
            // After title generation, fetch the updated chat to get the new title
            const { data: updatedChat, error: updatedChatError } = await supabase
                .from('chats')
                .select('title')
                .eq('id', chatId)
                .single();

            if (updatedChatError) {
                console.error('Error fetching updated chat title:', updatedChatError);
            } else if (updatedChat && updatedChat.title !== 'New Chat') {
                responsePayload.generatedTitle = updatedChat.title;
                console.log(`[Save Messages] Returning generated title: "${updatedChat.title}"`);
            }
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

// POST upload image to Supabase storage
router.post('/upload-image', authMiddleware, async (req, res) => {
    try {
        const { imageData, fileName, mimeType } = req.body;
        
        if (!imageData || !fileName) {
            return res.status(400).json({ error: 'Image data and filename are required.' });
        }
        
        // Convert base64 to buffer
        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Generate unique filename
        const timestamp = Date.now();
        const randomId = crypto.randomBytes(8).toString('hex');
        const fileExtension = fileName.split('.').pop() || 'jpg';
        const uniqueFileName = `${timestamp}-${randomId}.${fileExtension}`;
        
        // Upload to Supabase storage
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
        
        // Get public URL
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

// DELETE cleanup orphaned images for a user (optional maintenance endpoint)
router.delete('/cleanup-images', authMiddleware, async (req, res) => {
    try {
        // Get all images for this user from storage
        const { data: files, error: listError } = await supabase.storage
            .from('chat_images')
            .list(`${req.user.id}/`, { limit: 1000 });
        if (listError) {
            console.error('Error listing user images:', listError);
            return res.status(500).json({ error: 'Failed to list user images.' });
        }
        
        if (!files || files.length === 0) {
            return res.status(200).json({ message: 'No images to cleanup.', deleted: 0 });
        }
        
        // Get all messages for this user to find referenced images
        const { data: messages, error: msgError } = await supabase
            .from('messages')
            .select('content')
            .eq('user_id', req.user.id);
        if (msgError) {
            console.error('Error fetching user messages:', msgError);
            return res.status(500).json({ error: 'Failed to fetch user messages.' });
        }
        
        // Extract all image URLs from messages
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
            } catch (e) {
                // Skip invalid JSON
            }
        });
        
        // Find orphaned images
        const orphanedFiles = files.filter(file => {
            const { data: publicUrl } = supabase.storage
                .from('chat_images')
                .getPublicUrl(`${req.user.id}/${file.name}`);
            return !referencedUrls.has(publicUrl.publicUrl);
        });
        
        // Delete orphaned images
        if (orphanedFiles.length > 0) {
            const pathsToDelete = orphanedFiles.map(file => `${req.user.id}/${file.name}`);
            const { error: deleteError } = await supabase.storage
                .from('chat_images')
                .remove(pathsToDelete);
            if (deleteError) {
                console.error('Error deleting orphaned images:', deleteError);
                return res.status(500).json({ error: 'Failed to delete orphaned images.' });
            }
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
    const userId = req.user.id;

    console.log(`[Toggle Study Mode] Received request for chatId: ${chatId}, userId: ${userId}`);

    try {
        // Fetch the current study_mode status
        const { data: chat, error: fetchError } = await supabase
            .from('chats')
            .select('study_mode')
            .eq('id', chatId)
            .eq('user_id', userId) // Ensure user owns the chat
            .single();

        if (fetchError) {
            console.error(`[Toggle Study Mode] Error fetching chat ${chatId} for user ${userId}:`, fetchError);
            throw fetchError;
        }
        if (!chat) {
            console.warn(`[Toggle Study Mode] Chat ${chatId} not found or unauthorized for user ${userId}.`);
            return res.status(404).json({ error: 'Chat not found or unauthorized.' });
        }

        const newStudyModeStatus = !chat.study_mode;
        console.log(`[Toggle Study Mode] Current study_mode for chat ${chatId}: ${chat.study_mode}. New status will be: ${newStudyModeStatus}`);

        // Update the study_mode status
        const { data, error: updateError } = await supabase
            .from('chats')
            .update({ study_mode: newStudyModeStatus })
            .eq('id', chatId)
            .eq('user_id', userId)
            .select()
            .single();

        if (updateError) {
            console.error(`[Toggle Study Mode] Error updating study_mode for chat ${chatId} for user ${userId}:`, updateError);
            throw updateError;
        }

        console.log(`[Toggle Study Mode] Successfully updated chat ${chatId} to study_mode: ${newStudyModeStatus}`);
        res.status(200).json({
            success: true,
            study_mode: newStudyModeStatus,
            message: `Study mode ${newStudyModeStatus ? 'enabled' : 'disabled'} for chat ${chatId}.`
        });

    } catch (error) {
        console.error("[Toggle Study Mode] Unhandled error:", error);
        res.status(500).json({ error: 'Failed to toggle study mode.' });
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

        res.status(200).json({ success: true, message: `${titlesGenerated} titles generated.` });
    } catch (error) {
        console.error('Error generating missing titles:', error);
        res.status(500).json({ error: 'Error generating missing titles' });
    }
});

module.exports = router;
