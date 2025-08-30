const API_BASE_URL = 'https://fronix-html.onrender.com'; // Your Node.js backend URL
const SUPABASE_URL = 'https://dfrlmrplshijbosawpms.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmcmxtcnBsc2hpamJvc2F3cG1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyNzEzMDYsImV4cCI6MjA2ODg0NzMwNn0.BzsC5u2LGbq3QydQCAKnIiJvrRHTdjx3HzNGdCzf_ac';

const MODELS = {
  // Text Models
  'openai': { name: 'OpenAI GPT-4.1 Nano', type: 'text' },
  'openai-large': { name: 'OpenAI GPT-4.1', type: 'text' },
  'openai-fast': { name: 'OpenAI GPT-4.1 Nano', type: 'text' },
  'gemini': { name: 'Gemini 2.5 Flash Lite', type: 'text' },
  'gpt-5-nano': { name: 'OpenAI GPT-5 Nano', type: 'text' },
  'deepseek-reasoning': { name: 'DeepSeek R1 0528 (Bedrock)', type: 'text' },
  'openai-reasoning': { name: 'OpenAI o3 (api.navy)', type: 'text' },
  'grok': { name: 'Grok', type: 'text' },
  'elixposearch': { name: 'Elixpo Search', type: 'text' },
  'o4-mini-medium': { name: 'O4 Mini Medium', type: 'text' },
  'o4-mini-high': { name: 'O4 Mini High', type: 'text' },
  'provider-6/kimi-k2-instruct': { name: 'Kimi K2', type: 'text' },
  'deepseek-r1-uncensored': { name: 'DeepSeek R1 Uncensored', type: 'text' },

  // Pro Models
  'grok-4': { name: 'Grok 4', type: 'text', pro: true },
  'gpt-5': { name: 'GPT-5', type: 'text', pro: true },
  'gemini-2.5-pro': { name: 'Gemini 2.5 Pro', type: 'text', pro: true },
  'gemini-2.5-flash': { name: 'Gemini 2.5 Flash', type: 'text', pro: true },
  
  // Image Generation Models
  // 'provider-4/imagen-4': { name: 'Imagen 4', type: 'image' }
};

const FONTS = { 'inter': 'Inter', 'sans-serif': 'Sans Serif', 'work-sans': 'Work Sans', 'yu-gothic': 'Yu Gothic' };
const FONT_WEIGHTS = { '300': 'Thin', '400': 'Regular', '500': 'Medium', '600': 'Semibold', '700': 'Bold' };

const SYSTEM_PROMPT = { role: 'system', content: `You are Fronix, a large language model. You are chatting with the user via the Fronix iOS app. This means most of the time your lines should be a sentence or two, unless the user's request requires reasoning or long-form outputs. Never use emojis, unless explicitly asked to. 
Knowledge cutoff: 2024-06
Current date: 2025-05-15

Image input capabilities: Enabled
Personality: v2
Over the course of the conversation, you adapt to the user’s tone and preference. Try to match the user’s vibe, tone, and generally how they are speaking. You want the conversation to feel natural. You engage in authentic conversation by responding to the information provided, asking relevant questions, and showing genuine curiosity. If natural, continue the conversation with casual conversation.
`};
