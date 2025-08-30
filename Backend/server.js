const express = require('express');
const cors = require('cors');
require('dotenv').config();
const rateLimit = require('express-rate-limit');
const envalid = require('envalid');

// Validate and clean environment variables
const env = envalid.cleanEnv(process.env, {
    PORT: envalid.port({ default: 3001 }),
    AI_API_KEY: envalid.str(),
    AI_API_KEY_V2: envalid.str(),
    AI_API_ENDPOINT: envalid.url(),
    AI_API_ENDPOINT_V2: envalid.url(),
    SUPABASE_URL: envalid.url(),
    SUPABASE_SERVICE_KEY: envalid.str(),
    ALLOWED_ORIGINS: envalid.str({ default: 'http://localhost:3000,http://127.0.0.1:5500' })
});


const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const userRoutes = require('./routes/user');
const { router: aiRouter, benchmarkAllModels } = require('./routes/ai'); // Destructure aiRouter
const { checkAllModels } = require('./utils/modelChecker');

const app = express();
const PORT = env.PORT;

// --- START: CORRECTED AND FLEXIBLE CORS CONFIGURATION ---
const allowedOrigins = env.ALLOWED_ORIGINS.split(',');

const corsOptions = {
    origin: function (origin, callback) {
        // Allow all origins for development (REMOVE FOR PRODUCTION)
        return callback(null, true); // Temporarily allow all origins

        // Original restrictive logic (uncomment for production)
        /*
        if (!origin) return callback(null, true);
        
        if (/^http:\/\/localhost:\d+$/.test(origin)) {
            return callback(null, true);
        }

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('The CORS policy for this site does not allow access from your Origin.'));
        }
        */
    },
    credentials: true,
};

app.use(cors(corsOptions));
// --- END: CORRECTED AND FLEXIBLE CORS CONFIGURATION ---

// Rate limiting to prevent abuse
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip rate limiting for unauthenticated trial requests to the chat endpoint
        if (req.originalUrl === '/api/ai/chat' && !req.headers.authorization) {
            return true;
        }
        return false;
    }
});

app.use('/api/', apiLimiter);

// Increase JSON body size limit to 50MB for image support
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true, parameterLimit: 50000 }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/user', userRoutes);
app.use('/api/ai', aiRouter); // Use the destructured aiRouter

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    // Specifically handle CORS errors to give a clear message
    if (err.message.includes('CORS')) {
        return res.status(403).json({ error: err.message });
    }
    res.status(500).send('Something broke!');
});

const { checkModelAvailability } = require('./services/aiService');
const cache = require('./utils/cache');

app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);
    try {
        console.log('Performing initial model availability check...');
        const availableModels = await checkModelAvailability();
        cache.set('available_models', availableModels, 3600); // Cache for 1 hour
        console.log(`Cached ${availableModels.length} available models.`);
    } catch (error) {
        console.error('Error during initial model availability check:', error);
    }
});