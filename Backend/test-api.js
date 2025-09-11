const axios = require('axios');

async function testAPI() {
    const apiKey = 'ddc-a4f-80520db8b9884d929656efdc1cd8a21b';
    const endpoint = 'https://api.a4f.co/v1/chat/completions';
    
    const requestBody = {
        model: 'gpt-4.1',
        messages: [{ role: 'user', content: 'test' }],
        stream: false
    };
    
    try {
        console.log('Testing API with:', JSON.stringify(requestBody, null, 2));
        
        const response = await axios.post(endpoint, requestBody, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            }
        });
        
        console.log('✅ Success:', response.data);
    } catch (error) {
        console.error('❌ Error:', error.response?.status, error.response?.data || error.message);
        
        // Try with different model formats
        console.log('\n🔄 Trying with provider prefix...');
        
        const modelsToTest = [
            'provider-6/gpt-4.1',
            'provider-6/gpt-5-nano',
            'provider-6/gemini-2.5-lite',
            'gpt-4o-mini',
            'gpt-3.5-turbo'
        ];
        
        for (const model of modelsToTest) {
            try {
                console.log(`\nTesting model: ${model}`);
                const testResponse = await axios.post(endpoint, {
                    ...requestBody,
                    model: model
                }, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    }
                });
                console.log(`✅ Model ${model} works!`);
                break;
            } catch (err) {
                console.log(`❌ Model ${model} failed:`, err.response?.status, err.response?.data?.detail || err.response?.data?.error || err.message);
            }
        }
    }
}

testAPI();
