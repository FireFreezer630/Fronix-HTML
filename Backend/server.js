const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const userRoutes = require('./routes/user');
const aiRoutes = require('./routes/ai');

const app = express();
const PORT = process.env.PORT || 3001;

// --- START: CORRECTED CORS CONFIGURATION ---
// Add the exact origin of your index.html file to this list.
// Find it in your browser's address bar (e.g., http://127.0.0.1:5500)
const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:5500', // Example: for VS Code Live Server
    // Add any other origins you are using for development here
];

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, curl, or local files)
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('The CORS policy for this site does not allow access from your Origin.'));
        }
    },
    credentials: true,
};

app.use(cors(corsOptions));
// --- END: CORRECTED CORS CONFIGURATION ---

app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/user', userRoutes);
app.use('/api/ai', aiRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    // Specifically handle CORS errors to give a clear message
    if (err.message.includes('CORS')) {
        return res.status(403).json({ error: err.message });
    }
    res.status(500).send('Something broke!');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});