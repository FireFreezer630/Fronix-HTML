const supabase = require('../config/supabaseClient');

const authMiddleware = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        req.user = null;
        return next();
    }

    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            // If token is present but invalid, we can choose to either deny access
            // or treat as unauthenticated. For now, let's treat as unauthenticated.
            req.user = null;
            return next();
        }

        req.user = user;
        next();
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = authMiddleware;
