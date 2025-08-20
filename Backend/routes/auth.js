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

// OAuth Callback (for Google redirect)
router.get('/callback', async (req, res) => {
  const code = req.query.code; // Google sends code
  if (!code) return res.status(400).json({ error: 'No code provided' });
  try {
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    // Redirect back to the frontend, which will handle the session from the URL hash
    res.redirect('http://localhost:3000');
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect('http://localhost:3000/auth-error');
  }
});


router.post('/refresh', async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token is required' });
    }

    try {
        const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });

        if (error) {
            return res.status(401).json({ error: 'Invalid refresh token' });
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