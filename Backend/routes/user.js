const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const supabase = require('../config/supabaseClient');

// GET current user's details
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('username, plan, avatar_url')
            .eq('user_id', req.user.id)
            .single();

        if (error && error.code !== 'PGRST116') {
            // PGRST116 means no rows found, which is expected for new users.
            // We log other errors.
            console.error(`Error fetching profile for user ${req.user.id}:`, error.message);
            // We don't throw here, as we can still return basic user info.
        }

        res.status(200).json({
            id: req.user.id,
            email: req.user.email,
            username: profile?.username,
            plan: profile?.plan || 'basic', // Default to 'basic' if no profile
            avatar_url: profile?.avatar_url
        });
    } catch (error) {
        console.error('Error in /me route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
