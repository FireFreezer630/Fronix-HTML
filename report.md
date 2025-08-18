PS C:\Users\surya\VS Code\fronix-html\Backend> npm start

> fronix-ai-backend@1.0.0 start
> node server.js

🔑 V1 API Key Pool initialized with 1 keys
🔑 V2 API Key Pool initialized with 4 keys
📚 Study mode prompt loaded and cached successfully.
C:\Users\surya\VS Code\fronix-html\Backend\server.js:29
const allowedOrigins = process.env.ALLOWED_ORIGINS.split(',');
                                                   ^

TypeError: Cannot read properties of undefined (reading 'split')
    at Object.<anonymous> (C:\Users\surya\VS Code\fronix-html\Backend\server.js:29:52)
    at Module._compile (node:internal/modules/cjs/loader:1723:14)
    at Object..js (node:internal/modules/cjs/loader:1888:10)
    at Module.load (node:internal/modules/cjs/loader:1458:32)
    at Function._load (node:internal/modules/cjs/loader:1275:12)
    at TracingChannel.traceSync (node:diagnostics_channel:322:14)
    at wrapModuleLoad (node:internal/modules/cjs/loader:234:24)
    at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:151:5)
    at node:internal/main/run_main_module:33:47

Node.js v23.7.0