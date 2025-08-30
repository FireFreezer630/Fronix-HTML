// js/config.js
// Contains global application configuration constants.
window.App = window.App || {};
const API_BASE_URL = 'http://localhost:3001';

const config = { API_ENDPOINT: 'https://text.pollinations.ai/openai' };

const SUPABASE_URL = 'https://dfrlmrplshijbosawpms.supabase.co';

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmcmxtcnBsc2hpamJvc2F3cG1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyNzEzMDYsImV4cCI6MjA2ODg0NzMwNn0.BzsC5u2LGbq3QydQCAKnIiJvrRHTdjx3HzNGdCzf_ac';

// Expose functions and variables to the global App scope
App.API_BASE_URL = API_BASE_URL;
App.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
App.SUPABASE_URL = SUPABASE_URL;
App.config = config;

App.MODELS = {};
App.FONTS = { 'inter': 'Inter', 'sans-serif': 'Sans Serif', 'work-sans': 'Work Sans', 'yu-gothic': 'Yu Gothic' };
App.FONT_WEIGHTS = { '300': 'Thin', '400': 'Regular', '500': 'Medium', '600': 'Semibold', '700': 'Bold' };
App.SYSTEM_PROMPT_BASE = `You are Fronix, a large language model. This means most of the time your lines should be a sentence or two, unless the user\'s request requires reasoning or long-form outputs. Never use emojis, unless explicitly asked to. 
Knowledge cutoff: 2024-06
Current date: 2025-05-15

Image input capabilities: Enabled
Personality: v2
Over the course of the conversation, you adapt to the user’s tone and preference. Try to match the user’s vibe, tone, and generally how they are speaking. You want the conversation to feel natural. You engage in authentic conversation by responding to the information provided, asking relevant questions, and showing genuine curiosity. If natural, continue the conversation with casual conversation.
`;