const axios = require('axios');

class ApiKeyPool {
    constructor(keys, name) {
        this.keys = keys.filter(key => key && key.trim() !== '');
        this.name = name;
        this.currentIndex = 0;
        this.maxRetries = this.keys.length;
        
        console.log(`🔑 ${this.name} API Key Pool initialized with ${this.keys.length} keys`);
        if (this.keys.length === 0) {
            console.error(`❌ No valid ${this.name} API keys found in environment variables!`);
        }
    }
    
    getCurrentKey() {
        if (this.keys.length === 0) {
            if (this.name === 'Airforce') {
                return null; // airforce.ai can work without a key
            }
            throw new Error(`No API keys available for ${this.name}`);
        }
        return this.keys[this.currentIndex];
    }
    
    rotateToNextKey() {
        if (this.keys.length <= 1) {
            console.warn(`⚠️ Only one API key available in ${this.name}, cannot rotate`);
            return false;
        }
        
        const previousIndex = this.currentIndex;
        this.currentIndex = (this.currentIndex + 1) % this.keys.length;
        
        console.log(`🔄 ${this.name} API Key rotated from index ${previousIndex} to ${this.currentIndex}`);
        return true;
    }
    
    resetToFirstKey() {
        this.currentIndex = 0;
        console.log(`🔄 ${this.name} API Key pool reset to first key`);
    }
}

const v1ApiKeys = (process.env.AI_API_KEY || '').split(',').filter(Boolean);
const v2ApiKeys = [
    process.env.AI_API_KEY_V2,
    process.env.AI_API_KEY_V2_3,
    process.env.AI_API_KEY_V2_4,
    process.env.AI_API_KEY_V2_5
].filter(Boolean);
const airforceApiKeys = (process.env.AIRFORCE_API_KEYS || '').split(',').filter(Boolean);
const navyApiKeys = (process.env.NAVY_API_KEYS || '').split(',').filter(Boolean);

const v1ApiKeyPool = new ApiKeyPool(v1ApiKeys, 'V1');
const v2ApiKeyPool = new ApiKeyPool(v2ApiKeys, 'V2');
const airforceApiKeyPool = new ApiKeyPool(airforceApiKeys, 'Airforce');
const navyApiKeyPool = new ApiKeyPool(navyApiKeys, 'Navy');

async function makeApiRequestWithRetry(url, requestBody, requestOptions, pool) {
    const retryLimit = pool.maxRetries > 0 ? pool.maxRetries : 1;
    let attempt = 0;
    let lastError = null;
    
    while (attempt < retryLimit) {
        try {
            const currentKey = pool.getCurrentKey();
            
            const updatedOptions = { ...requestOptions };
            updatedOptions.headers = {
                ...requestOptions.headers,
            };

            if (currentKey) {
                updatedOptions.headers['Authorization'] = `Bearer ${currentKey}`;
            }
            
            console.log(`🔑 Attempt ${attempt + 1}/${retryLimit} using ${pool.name} API key index: ${pool.currentIndex}`);
            
            const response = await axios.post(url, requestBody, updatedOptions);
            
            if (attempt > 0) {
                pool.resetToFirstKey();
            }
            
            return response;
            
        } catch (error) {
            lastError = error;
            
            if (error.response && error.response.status === 429) {
                console.log(`⚠️ Rate limit hit on key ${pool.currentIndex + 1}/${pool.keys.length} for ${pool.name}`);
                
                const rotated = pool.rotateToNextKey();
                if (rotated) {
                    console.log(`🔄 Retrying with next API key...`);
                    attempt++;
                    continue;
                } else {
                    console.error(`❌ No more API keys to try in ${pool.name} pool`);
                    break;
                }
            } else {
                console.error(`❌ API request failed with non-retryable error:`, error.response?.status, error.message);
                break;
            }
        }
        attempt++;
    }
    
    console.error(`❌ All API key retries exhausted for ${pool.name}. Last error:`, lastError.message);
    throw lastError;
}

const MODELS = require('../config/models').MODELS; // Import MODELS

async function checkModelAvailability() {
    const availableModels = [];
    for (const modelId in MODELS) {
        const model = MODELS[modelId];
        const apiEndpoint = model.endpoint;
        let apiKeyPool;
        let requestBody;

        if (!apiEndpoint) {
            console.warn(`⚠️ Model ${model.name} (${modelId}) is missing an endpoint.`);
            continue;
        }

        // Infer API key pool from endpoint
        if (apiEndpoint.includes('api.navy')) {
            apiKeyPool = navyApiKeyPool;
        } else if (apiEndpoint.includes('api.airforce')) {
            apiKeyPool = airforceApiKeyPool;
        } else if (apiEndpoint.includes(process.env.AI_API_ENDPOINT_V2)) {
            apiKeyPool = v2ApiKeyPool;
        } else {
            apiKeyPool = v1ApiKeyPool;
        }

        if (model.type === 'image') {
            requestBody = {
                model: model.modelId || modelId,
                prompt: "test",
                n: 1,
                size: "256x256",
                response_format: "url"
            };
        } else { // Text models
            requestBody = {
                model: model.modelId || modelId,
                messages: [{ role: "user", content: "ping" }],
                stream: false
            };
        }

        try {
            const response = await makeApiRequestWithRetry(
                apiEndpoint,
                requestBody,
                {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 3000 // 3 second timeout
                },
                apiKeyPool
            );

            if (response.status === 200) {
                availableModels.push({ id: modelId, name: model.name, type: model.type, pro: model.pro, free: model.free });
                console.log(`✅ Model ${model.name} (${modelId}) is available.`);
            } else {
                console.warn(`⚠️ Model ${model.name} (${modelId}) returned status ${response.status}.`);
            }
        } catch (error) {
            console.error(`❌ Model ${model.name} (${modelId}) is not available. Error: ${error.message}`);
        }
    }
    return availableModels;
}

module.exports = {
    v1ApiKeyPool,
    v2ApiKeyPool,
    airforceApiKeyPool,
    navyApiKeyPool,
    makeApiRequestWithRetry,
    checkModelAvailability // Export the new function
};