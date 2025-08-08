const axios = require('axios');
const API_BASE_URL = 'http://localhost:3001/api'; // Assuming your backend runs on this port

// Mock user and AI for testing
const MOCK_USER_ID = '7201deeb-5f21-41ff-86dc-94093a68ec1a'; // Replace with a valid user ID from your auth.users table
const MOCK_AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsImtpZCI6InFiVi9VbG44TWpCTE1PL3oiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2RmcmxtcnBsc2hpamJvc2F3cG1zLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI3MjAxZGVlYi01ZjIxLTQxZmYtODZkYy05NDA5M2E2OGVjMWEiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU0MzA4MjA0LCJpYXQiOjE3NTQzMDQ2MDQsImVtYWlsIjoieW95aXNpMjE5MEAwdGlyZXMuY29tIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6eyJlbWFpbCI6InlveWlzaTIxOTBAMHRpcmVzLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaG9uZV92ZXJpZmllZCI6ZmFsc2UsInN1YiI6IjcyMDFkZWViLTVmMjEtNDFmZi04NmRjLTk0MDkzYTY4ZWMxYSJ9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzU0MzA0NjA0fV0sInNlc3Npb25faWQiOiI0OTE0NDlhMy0xODcyLTQ0NjItYjRkMi0zM2M0MDAzYmY5MWEiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.qNQ00BQwbS7eobHYHyGKxitUi2MAAqiSIoeDwNK50kA'; // Replace with a valid auth token for MOCK_USER_ID

async function createChat(title = 'New Chat') {
    try {
        const response = await axios.post(`${API_BASE_URL}/chat`, { title }, {
            headers: { 'Authorization': `Bearer ${MOCK_AUTH_TOKEN}` }
        });
        console.log('Chat created:', response.data);
        return response.data.id;
    } catch (error) {
        console.error('Error creating chat:', error.response ? error.response.data : error.message);
        throw error;
    }
}

async function saveMessages(chatId, userMessage, assistantMessage) {
    try {
        const response = await axios.post(`${API_BASE_URL}/chat/${chatId}/save-messages`, {
            userMessage,
            assistantMessage
        }, {
            headers: { 'Authorization': `Bearer ${MOCK_AUTH_TOKEN}` }
        });
        console.log('Messages saved:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error saving messages:', error.response ? error.response.data : error.message);
        throw error;
    }
}

async function getChat(chatId) {
    try {
        const response = await axios.get(`${API_BASE_URL}/chat/${chatId}`, {
            headers: { 'Authorization': `Bearer ${MOCK_AUTH_TOKEN}` }
        });
        return response.data;
    } catch (error) {
        console.error('Error getting chat:', error.response ? error.response.data : error.message);
        throw error;
    }
}

async function runTest() {
    let chat1Id, chat2Id, chat3Id;
    try {
        console.log('--- Starting Missing Titles Generation Test ---');

        // Step 1: Create chats
        chat1Id = await createChat();
        chat2Id = await createChat();
        chat3Id = await createChat('My Custom Title');

        // Step 2: Add messages
        await saveMessages(chat1Id, 'What is the capital of France?', 'Paris');
        await saveMessages(chat2Id, 'hi', 'hello');

        // Step 3: Trigger missing titles generation
        console.log('\nTriggering missing titles generation...');
        const response = await axios.post(`${API_BASE_URL}/chat/generate-missing-titles`, {}, {
            headers: { 'Authorization': `Bearer ${MOCK_AUTH_TOKEN}` }
        });
        console.log('Missing titles generation response:', response.data);

        // Step 4: Verify titles
        console.log('\nFetching chat details to verify titles...');
        const chat1 = await getChat(chat1Id);
        const chat2 = await getChat(chat2Id);
        const chat3 = await getChat(chat3Id);

        console.log(`Chat 1 Title: "${chat1.title}"`);
        console.log(`Chat 2 Title: "${chat2.title}"`);
        console.log(`Chat 3 Title: "${chat3.title}"`);

        if (chat1.title !== 'New Chat' && chat2.title === 'New Chat' && chat3.title === 'My Custom Title') {
            console.log('✅ Test Passed: Titles were correctly generated and skipped.');
        } else {
            console.error('❌ Test Failed: Titles were not generated or skipped as expected.');
        }

    } catch (error) {
        console.error('Test encountered an error:', error);
        console.error('❌ Test Failed: An unexpected error occurred during the test.');
    } finally {
        // Optional: Clean up by deleting the chats
        if (chat1Id) await axios.delete(`${API_BASE_URL}/chat/${chat1Id}`, { headers: { 'Authorization': `Bearer ${MOCK_AUTH_TOKEN}` } });
        if (chat2Id) await axios.delete(`${API_BASE_URL}/chat/${chat2Id}`, { headers: { 'Authorization': `Bearer ${MOCK_AUTH_TOKEN}` } });
        if (chat3Id) await axios.delete(`${API_BASE_URL}/chat/${chat3Id}`, { headers: { 'Authorization': `Bearer ${MOCK_AUTH_TOKEN}` } });
        console.log('\n--- Test Finished ---');
    }
}

runTest();