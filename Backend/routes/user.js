const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const supabase = require('../config/supabaseClient');
const cache = require('../utils/cache');

// Pre-fetch user data and cache it (unauthenticated; uses Admin API)
router.post('/pre-fetch', async (req, res) => {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: 'Email is required' });
    }

    try {
        // If already cached by email, short-circuit
        if (cache.has(email)) {
            return res.status(200).json({ message: 'Data already cached' });
        }
        // If a warm-up is in progress, quickly return
        if (cache.isWarming(email)) {
            return res.status(202).json({ message: 'Warming in progress' });
        }
        cache.markWarming(email);

        // Launch background warm-up and return immediately
        (async () => {
            try {
                // Resolve user by email using Supabase Admin API with server-side filter (if supported)
                let usersList, listError;
                try {
                    ({ data: usersList, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1, filter: `email.eq.${email}` }));
                } catch (e) {
                    // Fallback for SDKs that don't support filter
                    ({ data: usersList, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }));
                }
                if (listError) {
                    console.error('Error listing users:', listError);
                    cache.clearWarming(email);
                    return;
                }

                const match = usersList?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
                if (!match) {
                    // Do not reveal whether an email exists; store an empty warm cache
                    const bootstrapData = { userId: null, profile: null, preferences: null, chats: [] };
                    cache.set(email, bootstrapData);
                    cache.clearWarming(email);
                    return;
                }

                const userId = match.id;

                // Fetch user data (bootstrap payload) scoped by user_id
                const { data: chats, error: chatsError } = await supabase
                    .from('chats')
                    .select('id, title, study_mode, title_generated, created_at, messages(id, role, content, created_at)')
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false });

                if (chatsError) {
                    console.error('Error fetching chats for prefetch:', chatsError);
                    cache.clearWarming(email);
                    return;
                }

                // Fetch profile and preferences if present
                const [{ data: profile, error: profileError }, { data: preferences, error: prefError }] = await Promise.all([
                    supabase.from('profiles').select('user_id, username, avatar_url, plan').eq('user_id', userId).single(),
                    supabase.from('user_preferences').select('user_id, theme, font_family, font_weight, updated_at').eq('user_id', userId).single()
                ]);
                if (profileError) console.warn('Prefetch profile error:', profileError.message);
                if (prefError) console.warn('Prefetch preferences error:', prefError.message);

                const bootstrapData = { userId, profile: profile || null, preferences: preferences || null, chats: chats || [] };

                // Cache by both email and userId for quick post-login retrieval
                cache.set(email, bootstrapData, 60); // short-lived email cache (pre-login)
                cache.set(userId, bootstrapData, 300); // longer for immediate post-login use
                console.log(`Prefetch cached for ${email} (userId: ${userId}).`);
            } catch (e) {
                console.error('Background prefetch error:', e);
            } finally {
                cache.clearWarming(email);
            }
        })();

        return res.status(202).json({ message: 'Warming started' });
    } catch (error) {
        console.error('Prefetch error:', error);
        cache.clearWarming(email);
        return res.status(500).json({ error: 'Error pre-fetching user data' });
    }
});

// Authenticated bootstrap endpoint to return cached (or fresh) data post-login
router.get('/bootstrap', authMiddleware, async (req, res) => {
    try {
        const cachedById = cache.get(req.user.id);
        const cachedByEmail = cache.get(req.user.email);
        let payload = cachedById || cachedByEmail;

        if (!payload) {
            // Fallback to fresh fetch if nothing cached
            const [
                { data: chats, error: chatsError },
                { data: profile, error: profileError },
                { data: preferences, error: prefError }
            ] = await Promise.all([
                supabase
                    .from('chats')
                    .select('id, title, study_mode, title_generated, created_at, messages(id, role, content, created_at)')
                    .eq('user_id', req.user.id)
                    .order('created_at', { ascending: false }),
                supabase.from('profiles').select('user_id, username, avatar_url, plan').eq('user_id', req.user.id).single(),
                supabase.from('user_preferences').select('user_id, theme, font_family, font_weight, updated_at').eq('user_id', req.user.id).single()
            ]);
            if (chatsError) {
                console.error('Bootstrap fetch error:', chatsError);
                return res.status(500).json({ error: 'Failed to load user data' });
            }
            if (profileError) console.warn('Bootstrap profile fetch error:', profileError.message);
            if (prefError) console.warn('Bootstrap preferences fetch error:', prefError.message);

            payload = { userId: req.user.id, profile: profile || null, preferences: preferences || null, chats: chats || [] };
            cache.set(req.user.id, payload);
        }

        // Normalize keying and avoid duplication
        cache.set(req.user.id, payload);
        if (req.user.email) cache.del(req.user.email);

        return res.status(200).json(payload);
    } catch (error) {
        console.error('Bootstrap error:', error);
        return res.status(500).json({ error: 'Failed to load user data' });
    }
});

// GET current user's details
router.get('/me', authMiddleware, async (req, res) => {
    res.status(200).json({
        id: req.user.id,
        email: req.user.email,
    });
});

module.exports = router;
