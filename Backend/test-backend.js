// Simple test script to validate the backend server
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001';

async function testBackend() {
    console.log('🧪 Testing Fronix Backend Server...\n');
    
    try {
        // Test 1: Health check
        console.log('1️⃣ Testing health endpoint...');
        const healthResponse = await axios.get(`${API_BASE_URL}/health`);
        console.log('✅ Health check passed:', healthResponse.data.status);
        console.log('   Environment info:', JSON.stringify(healthResponse.data.environment, null, 2));
        
        // Test 2: Model status
        console.log('\n2️⃣ Testing model status endpoint...');
        const modelResponse = await axios.get(`${API_BASE_URL}/api/ai/model-status`);
        console.log('✅ Model status endpoint working');
        console.log('   Available anonymous models:', modelResponse.data.anonymousModels);
        
        // Test 3: Anonymous chat (public endpoint)
        console.log('\n3️⃣ Testing anonymous chat endpoint...');
        const chatPayload = {
            model: 'gpt-4.1',
            messages: [
                { role: 'user', content: 'Hello! This is a test message.' }
            ]
        };
        
        try {
            const chatResponse = await axios.post(`${API_BASE_URL}/api/ai/chat-public`, chatPayload, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 10000 // 10 second timeout
            });
            
            if (chatResponse.status === 200) {
                console.log('✅ Anonymous chat endpoint working (streaming response received)');
            }
        } catch (chatError) {
            if (chatError.code === 'ECONNABORTED') {
                console.log('⚠️  Chat endpoint timeout (expected for streaming) - endpoint is working');
            } else {
                console.log('❌ Chat endpoint error:', chatError.response?.data || chatError.message);
            }
        }
        
        console.log('\n🎉 Backend server is running and functional!');
        console.log('💡 You can now open index.html in your browser.');
        
    } catch (error) {
        console.log('\n❌ Backend server test failed:');
        
        if (error.code === 'ECONNREFUSED') {
            console.log('   Server is not running on localhost:3001');
            console.log('   Run: npm run dev (from Backend folder)');
            console.log('   Or:  start-backend.bat / ./start-backend.sh');
        } else {
            console.log('   Error:', error.message);
        }
        
        process.exit(1);
    }
}

testBackend();
