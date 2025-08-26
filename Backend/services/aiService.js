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

async function benchmarkModel(modelConfig, prompt, apiKeyPool) {
    const { endpoint, modelId, type } = modelConfig;
    if (type !== 'text') return null; // Only benchmark text models

    const requestBody = {
        model: modelId || modelConfig.name, // Use modelId if available, otherwise name
        messages: [{ role: 'user', content: prompt }],
        stream: true // Enable streaming for benchmarking
    };

    const requestOptions = {
        headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
        responseType: 'stream' // Ensure axios handles as stream
    };

    const startTime = process.hrtime.bigint();
    try {
        const aiResponse = await makeApiRequestWithRetry(endpoint, requestBody, requestOptions, apiKeyPool);
        
        return new Promise((resolve, reject) => {
            let fullResponse = '';
            let buffer = '';

            aiResponse.data.on('data', (chunk) => {
                buffer += chunk.toString();
                const lines = buffer.split('\n');
                buffer = lines.pop(); // Keep the last incomplete line

                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (!trimmedLine) continue;

                    if (trimmedLine === 'data: [DONE]') {
                        // Stream completed, resolve with duration
                        const endTime = process.hrtime.bigint();
                        const duration = Number(endTime - startTime) / 1_000_000; // nanoseconds to milliseconds
                        console.log(`⏱️ Model ${modelConfig.name} benchmarked in ${duration.toFixed(2)} ms (streamed)`);
                        aiResponse.data.destroy(); // End the stream early
                        resolve(duration);
                        return;
                    }

                    if (trimmedLine.startsWith('data: ')) {
                        try {
                            const jsonStr = trimmedLine.slice(6);
                            const data = JSON.parse(jsonStr);
                            if (data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content) {
                                fullResponse += data.choices[0].delta.content;
                            }
                        } catch (error) {
                            console.warn('Failed to parse streaming chunk during benchmark:', trimmedLine, error.message);
                        }
                    }
                }
            });

            aiResponse.data.on('end', () => {
                // If stream ends without a [DONE] signal, treat as completion
                const endTime = process.hrtime.bigint();
                const duration = Number(endTime - startTime) / 1_000_000; // nanoseconds to milliseconds
                console.warn(`⚠️ Model ${modelConfig.name} stream ended without [DONE] signal. Benchmarked in ${duration.toFixed(2)} ms.`);
                resolve(duration);
            });

            aiResponse.data.on('error', (streamError) => {
                console.error(`❌ Stream error during benchmarking for model ${modelConfig.name}:`, streamError.message);
                reject(streamError);
            });
        });
    } catch (error) {
        console.error(`❌ Benchmarking failed for model ${modelConfig.name}:`, error.message);
        return null;
    }
}

module.exports = {
    v1ApiKeyPool,
    v2ApiKeyPool,
    airforceApiKeyPool,
    navyApiKeyPool,
    makeApiRequestWithRetry,
    benchmarkModel
};