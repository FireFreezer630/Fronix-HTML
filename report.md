(index):64 cdn.tailwindcss.com should not be used in production. To use Tailwind CSS in production, install it as a PostCSS plugin or use the Tailwind CLI: https://tailwindcss.com/docs/installation
(anonymous) @ (index):64
(index):2196 [init] Initial button state update after exitEditMode listener setup.
(index):947 [setActive] Attempting to set active chat to ID: null
(index):959 [setActive] Chat with ID null not found. Setting activeId to null.
(index):1739 🔄 Updated model selector display to: OpenAI GPT-4.1 Nano (text)
(index):963 [setActive] Calling renderSidebar and renderChat for chat ID: null
(index):967 [setActive] Active chat set to: null. State saved.
(index):672 [loadDataFromServer] Data loaded successfully. Current state.chats: (2) [{…}, {…}]
(index):673 [loadDataFromServer] Current state.activeId: 176
(index):693 [loadDataFromServer] Finished. Final state.activeId: 176
(index):1739 🔄 Updated model selector display to: Gemini 2.5 Flash Lite (text)
(index):1739 🔄 Updated model selector display to: OpenAI GPT-5 Nano (text)
(index):1107 [sendMessage] Start: isStreaming = false, isGeneratingTitle = false
(index):1214 [sendMessage] Messages optimistically added. activeChat.messages (after push): (2) [{…}, {…}]
(index):1238 🔍 Current model for request: gpt-5-nano
(index):1239 🔍 Model data: {name: 'OpenAI GPT-5 Nano', type: 'text'}
(index):1240 🔍 Is image model: false
(index):1261 💬 Routing to text chat API for model: gpt-5-nano
(index):1384 [sendMessage] State updated after AI stream completion. activeChat.messages (after update): (2) [{…}, {…}]
(index):1425 ✅ Messages successfully saved to backend.
(index):1441 [sendMessage] After AI response & save (rAF): isStreaming = false, sendBtn hidden: false, stopBtn hidden: true
(index):1448 📝 Chat title generation triggered on backend. Title will update on next data load, or has been updated by response.
(index):1107 [sendMessage] Start: isStreaming = false, isGeneratingTitle = false
(index):1214 [sendMessage] Messages optimistically added. activeChat.messages (after push): (4) [{…}, {…}, {…}, {…}]
(index):1238 🔍 Current model for request: gpt-5-nano
(index):1239 🔍 Model data: {name: 'OpenAI GPT-5 Nano', type: 'text'}
(index):1240 🔍 Is image model: false
(index):1261 💬 Routing to text chat API for model: gpt-5-nano
(index):1384 [sendMessage] State updated after AI stream completion. activeChat.messages (after update): (4) [{…}, {…}, {…}, {…}]
(index):1425 ✅ Messages successfully saved to backend.
(index):1441 [sendMessage] After AI response & save (rAF): isStreaming = false, sendBtn hidden: false, stopBtn hidden: true
(index):1448 📝 Chat title generation triggered on backend. Title will update on next data load, or has been updated by response.
(index):1739 🔄 Updated model selector display to: Gemini 2.5 Flash Lite (text)
(index):1107 [sendMessage] Start: isStreaming = false, isGeneratingTitle = false
(index):1214 [sendMessage] Messages optimistically added. activeChat.messages (after push): (6) [{…}, {…}, {…}, {…}, {…}, {…}]
(index):1238 🔍 Current model for request: gemini
(index):1239 🔍 Model data: {name: 'Gemini 2.5 Flash Lite', type: 'text'}
(index):1240 🔍 Is image model: false
(index):1261 💬 Routing to text chat API for model: gemini
(index):1278 ❌ FRONTEND HTTP Error Response:
sendMessage @ (index):1278
await in sendMessage
(anonymous) @ (index):2044
(index):1279   - Status: 500
sendMessage @ (index):1279
await in sendMessage
(anonymous) @ (index):2044
(index):1280   - Status Text: Internal Server Error
sendMessage @ (index):1280
await in sendMessage
(anonymous) @ (index):2044
(index):1281   - Headers: {cache-control: 'no-cache', content-length: '75', content-type: 'text/event-stream; charset=utf-8'}
sendMessage @ (index):1281
await in sendMessage
(anonymous) @ (index):2044
(index):1282   - URL: http://localhost:3001/api/ai/chat
sendMessage @ (index):1282
await in sendMessage
(anonymous) @ (index):2044
(index):1287   - Response Body (text): {"error":"Internal server error occurred while contacting the AI service."}
sendMessage @ (index):1287
await in sendMessage
(anonymous) @ (index):2044
(index):1291   - Response Body (parsed): {error: 'Internal server error occurred while contacting the AI service.'}
sendMessage @ (index):1291
await in sendMessage
(anonymous) @ (index):2044
(index):1472 [sendMessage] Other Error: Messages reverted. activeChat.messages: (4) [{…}, {…}, {…}, {…}]
(index):1475 [sendMessage] Other Error: State saved after rollback.
(index):1477 ❌ FRONTEND sendMessage Error: Error: Internal server error occurred while contacting the AI service.
    at sendMessage ((index):1309:23)
sendMessage @ (index):1477
await in sendMessage
(anonymous) @ (index):2044
(index):1478 ❌ FRONTEND Error message: Internal server error occurred while contacting the AI service.
sendMessage @ (index):1478
await in sendMessage
(anonymous) @ (index):2044
(index):1479 ❌ FRONTEND Error stack: Error: Internal server error occurred while contacting the AI service.
    at sendMessage (http://localhost:3000/:1309:23)
sendMessage @ (index):1479
await in sendMessage
(anonymous) @ (index):2044
(index):1517 ❌ FRONTEND Error classification:
sendMessage @ (index):1517
await in sendMessage
(anonymous) @ (index):2044
(index):1518   - Is Network Error: false
sendMessage @ (index):1518
await in sendMessage
(anonymous) @ (index):2044
(index):1519   - Is Server Error: false
sendMessage @ (index):1519
await in sendMessage
(anonymous) @ (index):2044
(index):1520   - Should Retry: false
sendMessage @ (index):1520
await in sendMessage
(anonymous) @ (index):2044
(index):1521   - Current Retry Count: 0
sendMessage @ (index):1521
await in sendMessage
(anonymous) @ (index):2044
