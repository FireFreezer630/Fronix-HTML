const axios = require('axios');
const API_BASE_URL = 'http://localhost:3001/api'; // Assuming your backend runs on this port

// Mock user and AI for testing
const MOCK_USER_ID = '7201deeb-5f21-41ff-86dc-94093a68ec1a'; // Replace with a valid user ID from your auth.users table
const MOCK_AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsImtpZCI6InFiVi9VbG44TWpCTE1PL3oiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2RmcmxtcnBsc2hpamJvc2F3cG1zLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI3MjAxZGVlYi01ZjIxLTQxZmYtODZkYy05NDA5M2E2OGVjMWEiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU0MzEwMDE4LCJpYXQiOjE3NTQzMDY0MTgsImVtYWlsIjoieW95aXNpMjE5MEAwdGlyZXMuY29tIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6eyJlbWFpbCI6InlveWlzaTIxOTBAMHRpcmVzLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaG9uZV92ZXJpZmllZCI6ZmFsc2UsInN1YiI6IjcyMDFkZWViLTVmMjEtNDFmZi04NmRjLTk0MDkzYTY4ZWMxYSJ9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzU0MzA2NDE4fV0sInNlc3Npb25faWQiOiI1NzAwYzQyMC1iZmVjLTRiZGEtODY3Mi1iNWY5OGNkYTE0ZDgiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.XMJCh8510I9xhwRsFgxMuaHjMssL0zNlpz6LRRdY_qY'; // Replace with a valid auth token for MOCK_USER_ID

async function createChat() {
    try {
        const response = await axios.post(`${API_BASE_URL}/chat`, { title: 'New Chat' }, {
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
    let chatId;
    try {
        console.log('--- Starting Title Generation Test ---');

        // Step 1: Create a new chat
        chatId = await createChat();
        console.log(`Created chat with ID: ${chatId}`);

        // Step 2: Send first user message and AI response
        console.log('\nSending first message pair (user: "hi", ai: "hello")...');
        await saveMessages(chatId, 'hi', 'hello');

        // Step 3: Send second user message and AI response to trigger title generation
        console.log('\nSending second message pair (user: "Explain the history of Android", ai: "Sure! The history of Android is...")...');
        await saveMessages(chatId, 'Explain the history of Android', 'Sure! The history of Android is...');

        // Wait a bit for async title generation to complete
        console.log('\nWaiting for title generation (2 seconds)...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Step 4: Verify the chat title
        console.log('\nFetching chat details to verify title...');
        const updatedChat = await getChat(chatId);

        console.log(`Final Chat Title: "${updatedChat.title}"`);
        console.log(`Title Generated Flag: ${updatedChat.title_generated}`);

        if (updatedChat.title !== 'New Chat' && updatedChat.title_generated === true) {
            console.log('✅ Test Passed: Title was successfully generated and updated!');
        } else {
            console.error('❌ Test Failed: Title was not generated or updated as expected.');
        }

    } catch (error) {
        console.error('Test encountered an error:', error);
        console.error('❌ Test Failed: An unexpected error occurred during the test.');
    } finally {
        // Optional: Clean up by deleting the chat
        if (chatId) {
            // await axios.delete(`${API_BASE_URL}/chat/${chatId}`, { headers: { 'Authorization': `Bearer ${MOCK_AUTH_TOKEN}` } });
            // console.log(`\nCleaned up chat ${chatId}`);
        }
        console.log('\n--- Test Finished ---');
    }
}

runTest();