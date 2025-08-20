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

        const prompt = `You are a chat title generator. Your job is to create a short, factual title that captures the main topic of the conversation.

Rules:
- Summarize the conversation in 3 words or fewer.
- Only include the main topic.
- Ignore greetings, small talk, filler text, and emotional tone.
- Be concise and specific, including the most important keywords.
- Do not include pronouns like "you", "I", "we", or vague phrases like "venting" or "chatting".
- Output only the title, nothing else.

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