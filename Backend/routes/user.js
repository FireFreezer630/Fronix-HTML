const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

// GET current user's details
router.get('/me', authMiddleware, async (req, res) => {
    // The user object is attached to the request by the authMiddleware
    // We can send back the relevant, non-sensitive parts of it.
    res.status(200).json({
        id: req.user.id,
        email: req.user.email,
        // Add any other user details you want to expose to the frontend here
    });
});

module.exports = router;
