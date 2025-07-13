import { Message } from '../types';

const API_BASE_URL = 'https://openrouter.ai/api/v1';

export interface StreamResponse {
  choices: Array<{
    delta: {
      content?: string;
    };
    finish_reason?: string;
  }>;
}

export const sendMessage = async (
  messages: Message[],
  model: string,
  onChunk: (content: string) => void,
  onComplete: () => void,
  onError: (error: string) => void
): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY || 'sk-or-v1-your-api-key-here'}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Fronix.ai',
      },
      body: JSON.stringify({
        model,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        stream: true,
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          
          if (data === '[DONE]') {
            onComplete();
            return;
          }

          try {
            const parsed: StreamResponse = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content;
            
            if (content) {
              onChunk(content);
            }

            if (parsed.choices[0]?.finish_reason) {
              onComplete();
              return;
            }
          } catch (parseError) {
            // Ignore parsing errors for malformed chunks
            continue;
          }
        }
      }
    }

    onComplete();
  } catch (error) {
    console.error('API Error:', error);
    onError(error instanceof Error ? error.message : 'Unknown error occurred');
  }
};