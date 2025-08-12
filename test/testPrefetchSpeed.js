const axios = require('axios');

// Adjust if your backend runs elsewhere
const API_BASE_URL = 'http://localhost:3001';

// Read test credentials from environment
const TEST_EMAIL = process.env.TEST_EMAIL || '';
const TEST_PASSWORD = process.env.TEST_PASSWORD || '';

let AUTH_TOKEN = '';
const headers = () => ({
  'Authorization': `Bearer ${AUTH_TOKEN}`,
  'Content-Type': 'application/json'
});

async function getOrCreateChat() {
  const list = await axios.get(`${API_BASE_URL}/api/chat`, { headers: headers() });
  if (list.data && list.data.length > 0) return list.data[0];
  const created = await axios.post(`${API_BASE_URL}/api/chat`, { title: 'Prefetch Speed Test' }, { headers: headers() });
  return created.data;
}

async function invalidateBootstrapCache(chatId, currentTitle) {
  // Our backend invalidates the cache on chat update. We can set the same title safely.
  await axios.put(`${API_BASE_URL}/api/chat/${chatId}`, { title: currentTitle, title_generated: false }, { headers: headers() });
}

async function measureBootstrapOnce({ usePrefetch }) {
  const chat = await getOrCreateChat();
  await invalidateBootstrapCache(chat.id, chat.title || 'Prefetch Speed Test');

  if (usePrefetch) {
    // Fire prefetch and give the server a brief moment to warm up
    await axios.post(`${API_BASE_URL}/api/user/pre-fetch`, { email: TEST_EMAIL }, { headers: { 'Content-Type': 'application/json' } });
    await new Promise(r => setTimeout(r, 250));
  }

  const start = Date.now();
  const resp = await axios.get(`${API_BASE_URL}/api/user/bootstrap`, { headers: headers() });
  const ms = Date.now() - start;
  return { ms, payloadSize: JSON.stringify(resp.data).length };
}

async function run() {
  console.log('--- Prefetch Speed Test ---');
  console.log('Base URL:', API_BASE_URL);
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    console.error('Please set TEST_EMAIL and TEST_PASSWORD environment variables to run this test.');
    process.exit(1);
  }
  console.log('Email used:', TEST_EMAIL);

  // Sign in to obtain a fresh token
  const signin = await axios.post(`${API_BASE_URL}/api/auth/signin`, { email: TEST_EMAIL, password: TEST_PASSWORD }, { headers: { 'Content-Type': 'application/json' } });
  AUTH_TOKEN = signin.data?.session?.access_token || '';
  if (!AUTH_TOKEN) {
    console.error('Failed to obtain auth token from /api/auth/signin response.');
    process.exit(1);
  }

  const samples = 3;
  let withoutPrefetchTimes = [];
  let withPrefetchTimes = [];

  for (let i = 0; i < samples; i++) {
    const a = await measureBootstrapOnce({ usePrefetch: false });
    console.log(`Run ${i + 1} (no prefetch): ${a.ms} ms (payload ~${a.payloadSize} bytes)`);
    withoutPrefetchTimes.push(a.ms);

    const b = await measureBootstrapOnce({ usePrefetch: true });
    console.log(`Run ${i + 1} (with prefetch): ${b.ms} ms (payload ~${b.payloadSize} bytes)`);
    withPrefetchTimes.push(b.ms);
  }

  const avg = arr => Math.round(arr.reduce((s, v) => s + v, 0) / arr.length);
  console.log('\nAverages over', samples, 'runs');
  console.log('Without prefetch:', avg(withoutPrefetchTimes), 'ms');
  console.log('With prefetch   :', avg(withPrefetchTimes), 'ms');
}

run().catch(err => {
  console.error('Speed test failed:', err.response?.data || err.message);
  process.exit(1);
});


