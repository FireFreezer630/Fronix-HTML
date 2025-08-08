const axios = require('axios');
const supabase = require('../config/supabaseClient');

async function generateChatTitle(chatId, messages) {
    try {
        const chatResponse = await supabase
            .from('chats')
            .select('title, title_generated')
            .eq('id', chatId)
            .single();

        if (chatResponse.error) {
            console.error('Error fetching chat:', chatResponse.error);
            return;
        }

        const { title, title_generated } = chatResponse.data;
        console.log(`[Generate Title] Chat ${chatId} current title: "${title}", title_generated: ${title_generated}`);

        if (title_generated || title !== 'New Chat') {
            console.log('Title already generated or manually set. Skipping generation.');
            return;
        }

        const prompt = `You are a title generator for chat conversations.
Your job is to create a short, factual title (3–6 words) that captures the main topic of the conversation.

Rules:
1. Focus only on the main subject being discussed.
2. Ignore greetings, small talk, and emotional tone.
3. Be specific — include the most important keywords.
4. Do not include pronouns like "you", "I", "we", or vague phrases like "venting" or "chatting".
5. Output only the title, no explanation.
6. Keep it between 3–6 words.

---

${messages.map(m => `${m.role}: ${m.content}`).join('\n')}`;
        console.log('Generating title with prompt:', prompt);

        const response = await axios.post(process.env.AI_API_ENDPOINT, {
            model: 'mistral',
            messages: [{ role: 'user', content: prompt }],
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.AI_API_KEY}`
            }
        });

        const generatedTitle = response.data.choices[0].message.content.trim();
        console.log('Generated title:', generatedTitle);

        if (generatedTitle) {
            await supabase
                .from('chats')
                .update({ title: generatedTitle, title_generated: true })
                .eq('id', chatId);
        }
    } catch (error) {
        console.error('Error generating chat title:', error);
    }
}

module.exports = { generateChatTitle };