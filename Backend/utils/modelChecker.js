const { makeApiRequestWithRetry, v1ApiKeyPool, v2ApiKeyPool, airforceApiKeyPool, navyApiKeyPool } = require('../services/aiService');
const MODELS = require('../config/models');
const cache = require('./cache');

async function checkModelAvailability(modelKey, modelConfig) {
    console.log(`🔍 Checking availability for model: ${modelKey} at ${modelConfig.endpoint}`);
    try {
        const testPayload = {
            model: modelConfig.modelId || modelKey,
            messages: [{ role: 'user', content: 'test' }],
            max_tokens: 1,
        };

        let pool;
        if (modelConfig.endpoint.includes('api.navy')) {
            pool = navyApiKeyPool;
        } else if (modelConfig.endpoint.includes('api.airforce')) {
            pool = airforceApiKeyPool;
        } else if (modelConfig.endpoint.includes(process.env.AI_API_ENDPOINT_V2)) {
            pool = v2ApiKeyPool;
        } else {
            pool = v1ApiKeyPool;
        }

        console.log(`  - Using endpoint: ${modelConfig.endpoint}`);
        console.log(`  - Using modelId for test: ${testPayload.model}`);
        console.log(`  - Using API Key Pool: ${pool.name}`);

        await makeApiRequestWithRetry(
            modelConfig.endpoint,
            testPayload,
            { headers: { 'Content-Type': 'application/json' } },
            pool
        );

        console.log(`✅ Model ${modelKey} is available.`);
        return true;
    } catch (error) {
        console.warn(`⚠️ Model ${modelKey} is unavailable:`, error.message);
        return false;
    }
}

async function checkAllModels() {
    console.log('🔍 Starting comprehensive model availability check...');
    const availableModels = {};
    const promises = Object.entries(MODELS).map(async ([key, config]) => {
        const isAvailable = await checkModelAvailability(key, config);
        if (isAvailable) {
            availableModels[key] = config;
        }
    });
    await Promise.all(promises);
    cache.set('availableModels', availableModels);
    console.log('✅ All model availability checks completed. Cached available models:', Object.keys(availableModels));
}

module.exports = { checkAllModels };