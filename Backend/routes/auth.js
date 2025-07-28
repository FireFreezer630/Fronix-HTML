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

// Google OAuth
router.get('/google', async (req, res) => {
    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                // This is the URL Google will redirect back to after the user signs in.
                // It MUST be the URL of your frontend application.
                redirectTo: 'http://localhost:3000' 
            },
        });
        if (error) throw error;
        // Send the URL to the frontend so it can perform the redirect.
        res.status(200).json({ url: data.url });
    } catch (error) {
        console.error('Error creating Google sign-in URL:', error);
        res.status(500).json({ error: 'Internal server error during Google sign-in' });
    }
});

// Sign out
router.post('/logout', authMiddleware, async (req, res) => {
    try {
        // The authMiddleware ensures we have a valid user session.
        // We get the token from the header to invalidate the specific session.
        const token = req.headers.authorization?.split(' ')[1];

        const { error } = await supabase.auth.signOut(token);

        if (error) {
            // Log the error for debugging but still return a success response,
            // as the client will proceed with logging out regardless.
            console.error('Supabase sign out error:', error.message);
        }

        res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error during logout' });
    }
});


module.exports = router;
