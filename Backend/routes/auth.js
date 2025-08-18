const express = require('express');
const router = express.Router();
const supabase = require('../config/supabaseClient');
const authMiddleware = require('../middleware/authMiddleware');

// Sign up
router.post('/signup', async (req, res) => {
    const { email, password } = req.body;

    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.status(201).json({ user: data.user, session: data.session });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Sign in
router.post('/signin', async (req, res) => {
    const { email, password } = req.body;

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.status(200).json({ user: data.user, session: data.session });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});



// Sign out
// Sign out is handled client-side via supabase.auth.signOut()
// No server-side endpoint is required for this functionality.
module.exports = router;