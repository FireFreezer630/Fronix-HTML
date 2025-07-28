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

router.post('/logout', authMiddleware, async (req, res) => {
    try {
        // The authMiddleware gives us the user object, so we have the user's ID.
        // This is a more reliable way to perform a server-side sign-out.
        const { error } = await supabase.auth.admin.signOut(req.user.id);

        if (error) {
            // Log the error for debugging but don't crash the server.
            console.error('Supabase admin sign out error:', error.message);
            // Even if this fails, we tell the client it succeeded so it can log out.
        }

        res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
        // This will catch any unexpected errors in the process.
        console.error('Internal server error during logout:', error);
        res.status(500).json({ error: 'Internal server error during logout' });
    }
});

module.exports = router;