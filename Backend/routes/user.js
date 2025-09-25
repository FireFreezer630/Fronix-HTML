const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const supabase = require('../config/supabaseClient');
const cache = require('../utils/cache');

// GET current user's details
router.get('/me', authMiddleware, async (req, res) => {
    const cacheKey = `user_${req.user.id}`;
    const cachedData = cache.get(cacheKey);

    if (cachedData) {
        console.log(`[Cache] HIT for key: ${cacheKey}`);
        return res.status(200).json(cachedData);
    }

    console.log(`[Cache] MISS for key: ${cacheKey}`);
    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('username, plan, avatar_url')
            .eq('user_id', req.user.id)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error(`Error fetching profile for user ${req.user.id}:`, error.message);
        }

        const userData = {
            id: req.user.id,
            email: req.user.email,
            username: profile?.username,
            plan: profile?.plan || 'basic',
            avatar_url: profile?.avatar_url
        };

        cache.set(cacheKey, userData, 900); // Cache for 15 minutes
        res.status(200).json(userData);
    } catch (error) {
        console.error('Error in /me route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET user preferences
router.get('/preferences', authMiddleware, async (req, res) => {
    const cacheKey = `preferences_${req.user.id}`;
    const cachedData = cache.get(cacheKey);

    if (cachedData) {
        console.log(`[Cache] HIT for key: ${cacheKey}`);
        return res.status(200).json(cachedData);
    }

    console.log(`[Cache] MISS for key: ${cacheKey}`);
    try {
        const { data, error } = await supabase
            .from('user_preferences')
            .select('*')
            .eq('user_id', req.user.id)
            .single();

        if (error && error.code !== 'PGRST116') {
            throw error;
        }

        const preferences = data || {
            theme: 'dark',
            font_family: 'inter',
            font_weight: '400'
        };

        cache.set(cacheKey, preferences, 900); // Cache for 15 minutes
        res.status(200).json(preferences);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching user preferences' });
    }
});

// POST/PUT to update user preferences
router.post('/preferences', authMiddleware, async (req, res) => {
    const { theme, font_family, font_weight } = req.body;
    const updateData = {};

    if (theme) updateData.theme = theme;
    if (font_family) updateData.font_family = font_family;
    if (font_weight) updateData.font_weight = font_weight;

    if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: 'No preferences provided to update.' });
    }

    updateData.user_id = req.user.id;
    updateData.updated_at = new Date().toISOString();

    try {
        const { data, error } = await supabase
            .from('user_preferences')
            .upsert(updateData, { onConflict: 'user_id' })
            .select()
            .single();

        if (error) throw error;

        // Invalidate caches
        cache.del(`preferences_${req.user.id}`);
        cache.del(`user_${req.user.id}`);
        console.log(`[Cache] INVALIDATED for keys: preferences_${req.user.id}, user_${req.user.id}`);

        res.status(200).json(data);
    } catch (error) {
        console.error("Error updating preferences:", error);
        res.status(500).json({ error: 'Error updating user preferences' });
    }
});

module.exports = router;

