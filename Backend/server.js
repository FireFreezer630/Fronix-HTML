const express = require('express');
const cors = require('cors');
require('dotenv').config();
const rateLimit = require('express-rate-limit');
const envalid = require('envalid');

// Validate and clean environment variables
const env = envalid.cleanEnv(process.env, {
    PORT: envalid.port({ default: 3001 }),
    AI_API_KEY: envalid.str({ default: 'placeholder_key' }),
    AI_API_KEY_V2: envalid.str({ default: 'placeholder_key' }),
    AI_API_ENDPOINT: envalid.url({ default: 'https://api.example.com' }),
    AI_API_ENDPOINT_V2: envalid.url({ default: 'https://api.example.com' }),
    SUPABASE_URL: envalid.url({ default: 'https://placeholder.supabase.co' }),
    SUPABASE_SERVICE_KEY: envalid.str({ default: 'placeholder_service_key' }),
    ALLOWED_ORIGINS: envalid.str({ default: 'http://localhost:3000,http://127.0.0.1:5500,http://localhost:5500,https://fronix.netlify.app' })
});


const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const userRoutes = require('./routes/user');
const { router: aiRoutes, startModelAvailabilityChecker } = require('./routes/ai');

const app = express();
const PORT = env.PORT;

// --- ENHANCED: SECURE CORS CONFIGURATION ---
const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim());

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, curl)
        if (!origin) return callback(null, true);

        // Check if origin matches allowed origins exactly
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        // For development, allow specific localhost ports only
        const localhostMatch = origin.match(/^http:\/\/localhost:(\d+)$/);
        if (localhostMatch) {
            const port = parseInt(localhostMatch[1]);
            // Only allow specific localhost ports for development
            const allowedDevPorts = [3000, 5500, 8080, 3001];
            if (allowedDevPorts.includes(port)) {
                return callback(null, true);
            }
        }

        console.warn(`Blocked CORS request from origin: ${origin}`);
        callback(new Error('Not allowed by CORS policy'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));
// --- END: ENHANCED CORS CONFIGURATION ---

// Enhanced rate limiting to prevent abuse - applied to ALL routes
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs (more generous for general routes)
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Too many requests from this IP, please try again later.'
    },
    skipSuccessfulRequests: false, // Count successful requests too
    skip: (req) => {
        // Skip rate limiting for health checks
        return req.path === '/health';
    }
});

// Stricter rate limiting for API routes
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs for API routes
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'API rate limit exceeded, please try again later.'
    }
});

// Apply rate limiting to all routes
app.use('/', generalLimiter);
app.use('/api/', apiLimiter);

// Increase JSON body size limit to 50MB for image support
app.use(express.json({
    limit: '50mb',
    verify: (req, res, buf) => {
        // Add basic request size validation
        if (buf && buf.length > 50 * 1024 * 1024) {
            res.status(413).json({ error: 'Request body too large' });
            return;
        }
    }
}));
app.use(express.urlencoded({ limit: '50mb', extended: true, parameterLimit: 50000 }));

// Request logging middleware for security monitoring
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || 'Unknown';

    console.log(`[${timestamp}] ${req.method} ${req.path} - IP: ${ip} - UA: ${userAgent.substring(0, 50)}`);

    // Log suspicious requests
    if (req.path.includes('..') || req.path.includes('%2e%2e')) {
        console.warn(`[${timestamp}] SUSPICIOUS REQUEST DETECTED - IP: ${ip} - Path: ${req.path}`);
    }

    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: {
            port: env.PORT,
            supabaseConfigured: env.SUPABASE_URL !== 'https://placeholder.supabase.co',
            aiApiConfigured: env.AI_API_KEY !== 'placeholder_key'
        }
    });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/user', userRoutes);
app.use('/api/ai', aiRoutes);

// Enhanced Global Error Handler
app.use((err, req, res, next) => {
    const timestamp = new Date().toISOString();
    const ip = req.ip || req.connection.remoteAddress;

    console.error(`[${timestamp}] ERROR - IP: ${ip} - ${err.stack || err.message}`);

    // Specifically handle CORS errors to give a clear message
    if (err.message.includes('CORS') || err.message.includes('Not allowed by CORS')) {
        return res.status(403).json({
            error: 'Access denied by CORS policy',
            timestamp: timestamp
        });
    }

    // Handle rate limiting errors
    if (err.message.includes('rate limit') || err.message.includes('Too many requests')) {
        return res.status(429).json({
            error: 'Rate limit exceeded',
            retryAfter: Math.ceil(err.msBeforeNext / 1000) || 900,
            timestamp: timestamp
        });
    }

    // Handle validation errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Invalid request data',
            details: err.message,
            timestamp: timestamp
        });
    }

    // Generic error response
    res.status(500).json({
        error: 'Internal server error',
        timestamp: timestamp,
        requestId: req.headers['x-request-id'] || 'unknown'
    });
});

// 404 handler for unmatched routes
app.use('*', (req, res) => {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] 404 - Route not found: ${req.method} ${req.path}`);
    res.status(404).json({
        error: 'Route not found',
        timestamp: timestamp
    });
});

app.listen(PORT, () => {
    console.log(`🔒 Secure server is running on port ${PORT}`);
    console.log(`📋 Allowed origins: ${allowedOrigins.join(', ')}`);
    console.log(`🛡️ Rate limiting: General (${generalLimiter.max}/15min), API (${apiLimiter.max}/15min)`);

    // Start the model availability checker
    startModelAvailabilityChecker();
});
