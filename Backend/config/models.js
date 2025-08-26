const MODELS = {
    // Text Models
    'openai': { name: 'OpenAI GPT-4.1 Nano', type: 'text', endpoint: process.env.AI_API_ENDPOINT },
    'openai-large': { name: 'OpenAI GPT-4.1', type: 'text', endpoint: process.env.AI_API_ENDPOINT, free: true },
    'openai-fast': { name: 'OpenAI GPT-4.1 Nano', type: 'text', endpoint: process.env.AI_API_ENDPOINT },
    'gemini': { name: 'Gemini 2.5 Flash Lite', type: 'text', endpoint: process.env.AI_API_ENDPOINT, free: true },
    'gpt-5-nano': { name: 'OpenAI GPT-5 Nano', type: 'text', endpoint: process.env.AI_API_ENDPOINT },
    'deepseek-reasoning': { name: 'DeepSeek R1 0528 (Bedrock)', type: 'text', endpoint: `${process.env.AI_API_ENDPOINT_V2}/chat/completions`, modelId: 'provider-6/deepseek-r1-uncensored' },
    'openai-reasoning': { name: 'OpenAI o3 (api.navy)', type: 'text', endpoint: 'https://api.navy/v1/chat/completions' },
    'grok': { name: 'Grok', type: 'text', endpoint: process.env.AI_API_ENDPOINT },
    'elixposearch': { name: 'Elixpo Search', type: 'text', endpoint: process.env.AI_API_ENDPOINT, free: true },
    'o4-mini-medium': { name: 'O4 Mini Medium', type: 'text', endpoint: `${process.env.AI_API_ENDPOINT_V2}/chat/completions`, modelId: 'provider-6/o4-mini-medium' },
    'o4-mini-high': { name: 'O4 Mini High', type: 'text', endpoint: `${process.env.AI_API_ENDPOINT_V2}/chat/completions`, modelId: 'provider-6/o4-mini-high' },
    'provider-6/kimi-k2-instruct': { name: 'Kimi K2', type: 'text', endpoint: `${process.env.AI_API_ENDPOINT_V2}/chat/completions`, modelId: 'provider-6/kimi-k2' },
    'deepseek-r1-uncensored': { name: 'DeepSeek R1 Uncensored', type: 'text', endpoint: `${process.env.AI_API_ENDPOINT_V2}/chat/completions`, modelId: 'provider-6/deepseek-r1-uncensored' },

    // Pro Models
    'grok-4': { name: 'Grok 4', type: 'text', pro: true, endpoint: 'https://api.navy/v1/chat/completions' },
    'gpt-5': { name: 'GPT-5', type: 'text', pro: true, endpoint: 'https://api.airforce/v1/chat/completions' },
    'gemini-2.5-pro': { name: 'Gemini 2.5 Pro', type: 'text', pro: true, endpoint: 'https://api.airforce/v1/chat/completions' },
    'gemini-2.5-flash': { name: 'Gemini 2.5 Flash', type: 'text', pro: true, endpoint: 'https://api.airforce/v1/chat/completions' },
      
    // Image Generation Models
    // 'provider-4/imagen-4': { name: 'Imagen 4', type: 'image' }
};

module.exports = MODELS;