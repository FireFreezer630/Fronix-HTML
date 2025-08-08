const supabase = require('../config/supabaseClient');

async function getFirstTwoNonTrivialMessages(chatId) {
    const { data, error } = await supabase
        .from('messages')
        .select('role, content')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true })
        .limit(10); // Fetch only a limited number of messages

    if (error) {
        console.error(`Error fetching messages for chat ${chatId}:`, error);
        return [];
    }

    const nonTrivialMessages = data.filter(m => !/^(hi|hello|yo)$/i.test(m.content.trim()));
    return nonTrivialMessages.slice(0, 2);
}

module.exports = { getFirstTwoNonTrivialMessages };