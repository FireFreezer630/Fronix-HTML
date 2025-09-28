const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'stream-errors.log');

function ensureLogDir() {
    if (!fs.existsSync(LOG_DIR)) {
        fs.mkdirSync(LOG_DIR, { recursive: true });
    }
}

function serializeError(error) {
    if (!error) return null;

    const serialized = {
        message: error.message || String(error),
        stack: error.stack || null,
    };

    if (error.response) {
        serialized.response = {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data ? truncate(JSON.stringify(error.response.data)) : null
        };
    }

    return serialized;
}

function truncate(value, limit = 2000) {
    if (!value) return value;
    return value.length > limit ? `${value.slice(0, limit)}…` : value;
}

function logStreamError(context = {}) {
    try {
        ensureLogDir();

        const payload = {
            timestamp: new Date().toISOString(),
            context,
        };

        if (context.error) {
            payload.error = serializeError(context.error);
            delete context.error; // Avoid circular refs if error added separately
        }

        fs.appendFileSync(LOG_FILE, `${JSON.stringify(payload)}\n`, 'utf8');
    } catch (loggingError) {
        console.error('[streamErrorLogger] Failed to write log entry:', loggingError);
    }
}

module.exports = {
    logStreamError,
};
