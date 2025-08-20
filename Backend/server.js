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
const aiRoutes = require('./routes/ai');

const app = express();
const PORT = env.PORT;

// --- START: CORRECTED AND FLEXIBLE CORS CONFIGURATION ---
const allowedOrigins = env.ALLOWED_ORIGINS.split(',');

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, curl)
        if (!origin) return callback(null, true);
        
        // Allow localhost with any port for development
        if (/^http:\/\/localhost:\d+$/.test(origin)) {
            return callback(null, true);
        }

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('The CORS policy for this site does not allow access from your Origin.'));
        }
    },
    credentials: true,
};

app.use(cors()); // TEMPORARY: Allow all origins for debugging
// --- END: CORRECTED AND FLEXIBLE CORS CONFIGURATION ---

// Rate limiting to prevent abuse
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api/', apiLimiter);

// Increase JSON body size limit to 50MB for image support
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true, parameterLimit: 50000 }));

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