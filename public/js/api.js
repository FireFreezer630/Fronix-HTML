async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            const isLastAttempt = attempt === maxRetries;
            const isNetworkError = error.message.includes('fetch') || error.message.includes('network') || error.message.includes('Failed to fetch');
            const isServerError = error.status >= 500;
            const shouldRetry = !isLastAttempt && (isNetworkError || isServerError);
            
            if (shouldRetry) {
                const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
                console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`, error.message);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                throw error;
            }
        }
    }
}

async function loadDataFromServer(retryCount = 0) {
    const maxRetries = 3;
    const token = localStorage.getItem('authToken');
    if (!token) {
        updateLoginStateUI();
        return;
    }

    try {
        await retryWithBackoff(async () => {
            const userResponse = await fetch(`${API_BASE_URL}/api/user/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (userResponse.status === 401 || userResponse.status === 403) {
                throw new Error('AUTH_ERROR');
            }
            if (!userResponse.ok) {
                const error = new Error(`Failed to fetch user data. Status: ${userResponse.status}`);
                error.status = userResponse.status;
                throw error;
            }
            state.currentUser = await userResponse.json();

            const chatsResponse = await fetch(`${API_BASE_URL}/api/chat`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (chatsResponse.status === 401 || chatsResponse.status === 403) {
                throw new Error('AUTH_ERROR');
            }
            if (!chatsResponse.ok) {
                const error = new Error(`Failed to fetch chats. Status: ${chatsResponse.status}`);
                error.status = chatsResponse.status;
                throw error;
            }
            const chats = await chatsResponse.json();
            state.chats = chats;

            for (let i = 0; i < state.chats.length; i++) {
                const chat = state.chats[i];
                const messagesResponse = await fetch(`${API_BASE_URL}/api/chat/${chat.id}/messages`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (messagesResponse.status === 401 || messagesResponse.status === 403) {
                    throw new Error('AUTH_ERROR');
                }
                if (!messagesResponse.ok) {
                    const error = new Error(`Failed to fetch messages for chat ${chat.id}. Status: ${messagesResponse.status}`);
                    error.status = messagesResponse.status;
                    throw error;
                }
                const messages = await messagesResponse.json();
                chat.messages = Array.isArray(messages.messages) ? messages.messages : [];
            }

            const currentActiveIdBeforeLoad = state.activeId;
            const lastActiveChatIdFromLocalStorage = localStorage.getItem('lastActiveChatId');

            let newActiveId = null;

            if (currentActiveIdBeforeLoad && state.chats.some(chat => chat.id === currentActiveIdBeforeLoad)) {
                newActiveId = currentActiveIdBeforeLoad;
            }
            else if (lastActiveChatIdFromLocalStorage && state.chats.some(chat => chat.id === lastActiveChatIdFromLocalStorage)) {
                newActiveId = lastActiveChatIdFromLocalStorage;
            }
            else if (state.chats.length > 0) {
                newActiveId = state.chats[0].id;
            }

            if (newActiveId !== null) {
                state.activeId = newActiveId;
            } else {
                await handleNewChat();
                return;
            }
        });

        console.log('[loadDataFromServer] Data loaded successfully. Current state.chats:', JSON.parse(JSON.stringify(state.chats)));
        console.log('[loadDataFromServer] Current state.activeId:', state.activeId);
        renderSidebar();
        renderChat();

    } catch (error) {
        console.error("[loadDataFromServer] Error loading data from server:", error);
        
        if (error.message === 'AUTH_ERROR') {
            alert('Your session has expired. Please sign in again.');
            localStorage.removeItem('authToken');
            state.currentUser = null;
        } else {
            console.warn('[loadDataFromServer] Temporary network issue:', error.message);
        }
    } finally {
        updateLoginStateUI();
        updateProfileUI();
        console.log('[loadDataFromServer] Finished. Final state.activeId:', state.activeId);
    }
}

async function handleNewChat() {
    if (!state.currentUser) {
        if (state.anonymousChats.length >= 5) {
            alert("You can create up to 5 chats without logging in. Please sign in to create more.");
            return;
        }
        const newChat = createChat();
        state.anonymousChats.unshift(newChat);
        setActive(newChat.id);
        saveState();
        renderSidebar();
        renderChat();
        return;
    }

    const token = localStorage.getItem('authToken');
    if (!token) {
        alert("Please sign in to create a new chat.");
        return;
    }

    const tempChatId = `temp-${Date.now()}`;
    const newChat = {
        id: tempChatId,
        title: 'New Chat',
        messages: [],
        model: state.settings.model
    };

    console.log('[handleNewChat] Optimistically adding new chat:', newChat);
    state.chats.unshift(newChat);
    setActive(tempChatId);
    renderSidebar();
    renderChat();
    saveState();
    console.log('[handleNewChat] State after optimistic add. state.chats:', JSON.parse(JSON.stringify(state.chats)));
    console.log('[handleNewChat] State after optimistic add. state.activeId:', state.activeId);

    try {
        const response = await fetch(`${API_BASE_URL}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ title: 'New Chat' })
        });

        if (!response.ok) {
            throw new Error('Failed to create chat on server');
        }

        const newChatFromServer = await response.json();
        newChatFromServer.messages = [];

        const index = state.chats.findIndex(chat => chat.id === tempChatId);
        if (index !== -1) {
            state.chats[index].id = newChatFromServer.id;
            state.chats[index].created_at = newChatFromServer.created_at;
            state.activeId = newChatFromServer.id;
        } else {
            state.chats.unshift(newChatFromServer);
            state.activeId = newChatFromServer.id;
        }
        
        console.log('[handleNewChat] New chat created on server:', newChatFromServer);
        
        renderSidebar();
        saveState();
        console.log('[handleNewChat] State after successful backend save. state.chats:', JSON.parse(JSON.stringify(state.chats)));
        console.log('[handleNewChat] State after successful backend save. state.activeId:', state.activeId);

    } catch (error) {
        console.error("[handleNewChat] Error creating new chat:", error);
        alert("Could not create a new chat. Please try again.");

        const index = state.chats.findIndex(chat => chat.id === tempChatId);
        if (index !== -1) {
            state.chats.splice(index, 1);
            if (state.activeId === tempChatId) {
                state.activeId = state.chats.length > 0 ? state.chats[0].id : null;
            }
            renderSidebar();
            renderChat();
            saveState();
            console.log('[handleNewChat] State after error rollback. state.chats:', JSON.parse(JSON.stringify(state.chats)));
            console.log('[handleNewChat] State after error rollback. state.activeId:', state.activeId);
        }
    }
}

async function sendMessage() {
    let token;
    const userInput = elements.userInput.value.trim();
    const chats = state.currentUser ? state.chats : state.anonymousChats;
    const activeChat = chats.find(c => c.id === state.activeId);
    console.log(`[sendMessage] Start: isStreaming = ${isStreaming}, isGeneratingTitle = ${isGeneratingTitle}`);
    if ((!userInput && !attachedImageData) || !activeChat || isStreaming || isGeneratingTitle) {
        console.log(`[sendMessage] Aborting due to input/chat/streaming/title gen state. isStreaming = ${isStreaming}, isGeneratingTitle = ${isGeneratingTitle}`);
        return;
    }

    if(state.currentUser) {
        token = await validateAndRefreshToken();
        if (!token) {
            alert("Your session has expired. Please sign in again.");
            setTimeout(() => {
                animateModalOpen(elements.signinModal.container);
            }, 1000);
            return;
        }
    }

    if (userInput.trim().startsWith('/study')) {
        const command = userInput.trim().split(' ')[0];
        if (command === '/study') {
            elements.userInput.value = '';
            elements.userInput.style.height = 'auto';
            addMessage('user', '/study');

            const originalStudyMode = activeChat.study_mode;
            const newStudyModeStatus = !originalStudyMode;

            activeChat.study_mode = newStudyModeStatus;
            saveState();
            addMessage('assistant', `📚 Study mode ${newStudyModeStatus ? 'enabled' : 'disabled'}.`);

            try {
                const response = await fetch(`${API_BASE_URL}/api/chat/${activeChat.id}/toggle-study-mode`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to toggle study mode.');
                }
                console.log(`Study mode toggled successfully to: ${data.study_mode}`);

            } catch (error) {
                console.error("Error toggling study mode:", error);
                alert(`Failed to toggle study mode: ${error.message}`);

                activeChat.study_mode = originalStudyMode;
                saveState();
                addMessage('assistant', `⚠️ Failed to toggle study mode. Reverting to ${originalStudyMode ? 'enabled' : 'disabled'}.`);
            } finally {
                elements.sendIcon.classList.remove('hidden');
                elements.stopIcon.classList.add('hidden');
                elements.sendBtn.classList.remove('bg-red-600', 'hover:bg-red-700');
                elements.sendBtn.classList.add('bg-accent', 'hover:bg-accent-hover');
                updateSendButtonState();
                elements.userInput.disabled = false;
                isStreaming = false;
            }
            return;
    }
}

    updateSendButtonState();

    elements.sendIcon.classList.add('hidden');
    elements.stopIcon.classList.remove('hidden');
    elements.sendBtn.classList.remove('bg-accent', 'hover:bg-accent-hover');
    elements.sendBtn.classList.add('bg-red-600', 'hover:bg-red-700');
    elements.userInput.value = '';
    elements.userInput.style.height = 'auto';
    isStreaming = true;
    
    let userMessageContent;
    if (attachedImageData) {
        userMessageContent = [
            { type: 'text', text: userInput },
            {
                type: 'image_url',
                image_url: {
                    url: attachedImageData.dataUrl
                }
            }
        ];
    } else {
        userMessageContent = userInput;
    }
    
    const userMessageObj = { role: 'user', content: userMessageContent };
    const assistantMessageObj = { role: 'assistant', content: '...', id: 'assistant-msg-' + Date.now() };

    activeChat.messages.push(userMessageObj);
    activeChat.messages.push(assistantMessageObj);
    console.log('[sendMessage] Messages optimistically added. activeChat.messages (after push):', JSON.parse(JSON.stringify(activeChat.messages)));
    renderChat();
    scrollToBottom();

    if (attachedImageData) {
        attachedImageData = null;
        document.getElementById('image-upload').value = null;
        const imagePreviewContainer = document.getElementById('image-preview-container');
        imagePreviewContainer.innerHTML = '';
        imagePreviewContainer.classList.add('hidden');
    }
    
    const assistantMsgDiv = document.getElementById(assistantMessageObj.id);
    
    currentController = new AbortController();
    let fullResponse = "";

    try {
        const currentModel = activeChat.model || state.settings.model || 'openai';
        const modelData = MODELS[currentModel] || { name: 'OpenAI (Default)', type: 'text' };
        const isImageModel = modelData.type === 'image';
        
        console.log('🔍 Current model for request:', currentModel);
        console.log('🔍 Model data:', modelData);
        console.log('🔍 Is image model:', isImageModel);
        
        let response;
        if (isImageModel) {
            console.log('🎨 Routing to image generation API for model:', currentModel);
            response = await fetch(`${API_BASE_URL}/api/ai/images/generations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                signal: currentController.signal,
                body: JSON.stringify({
                    model: currentModel,
                    prompt: userInput,
                    n: 1,
                    size: '1024x1024',
                    quality: 'standard',
                    response_format: 'url'
                }),
            });
        } else {
            console.log('💬 Routing to text chat API for model:', currentModel);
            const headers = { 'Content-Type': 'application/json' };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            response = await fetch(`${API_BASE_URL}/api/ai/chat`, {
                method: 'POST',
                headers: headers,
                signal: currentController.signal,
                body: JSON.stringify({
                    model: currentModel,
                    messages: activeChat.messages,
                    chatId: activeChat.id
                }),
            });
        }

        if (!response.ok) {
            let errorMessage = 'Failed to get response from AI service.';
            console.error("❌ FRONTEND HTTP Error Response:");
            console.error("  - Status:", response.status);
            console.error("  - Status Text:", response.statusText);
            console.error("  - Headers:", Object.fromEntries(response.headers.entries()));
            console.error("  - URL:", response.url);
            let responseBody = null;
            try {
                const responseText = await response.text();
                console.error("  - Response Body (text):", responseText);
                try {
                    responseBody = JSON.parse(responseText);
                    console.error("  - Response Body (parsed):", responseBody);
                } catch (parseError) {
                    console.error("  - Response Body (not JSON):", responseText);
                }
            } catch (readError) {
                console.error("  - Could not read response body:", readError);
            }
            if (response.status === 401 || response.status === 403) {
                errorMessage = 'Invalid or expired token';
            } else {
                try {
                    errorMessage = responseBody?.error || responseText || `HTTP ${response.status}: ${response.statusText}`;
                } catch (e) {
                    errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                }
            }
            throw new Error(errorMessage);
        }

        if (isImageModel) {
            const imageData = await response.json();
            console.log('🎨 Image generation response:', imageData);
            if (imageData.data && imageData.data.length > 0) {
                const imageUrl = imageData.data[0].url;
                const revisedPrompt = imageData.data[0].revised_prompt;
                fullResponse = `![Generated Image](${imageUrl})`;
                if (revisedPrompt && revisedPrompt !== userInput) {
                    fullResponse += `\n\n*Revised prompt: ${revisedPrompt}*`;
                }
                assistantMsgDiv.innerHTML = renderContent(fullResponse);
            } else {
                throw new Error('No image data received from API');
            }
        } else {
            // Handle text streaming response with batching
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let contentBuffer = '';
            let updateInterval = 50; // ms

            let intervalId = setInterval(() => {
                if (contentBuffer.length > 0) {
                    fullResponse += contentBuffer;
                    contentBuffer = '';
                    assistantMsgDiv.innerHTML = renderStreamingContent(fullResponse + '<span class="blinking-cursor"></span>');
                    scrollToBottom();
                }
            }, updateInterval);

            while (true) {
                const { value, done } = await reader.read();
                if (done) {
                    clearInterval(intervalId);
                    // Final render for any remaining content
                    if (contentBuffer.length > 0) {
                        fullResponse += contentBuffer;
                        assistantMsgDiv.innerHTML = renderStreamingContent(fullResponse);
                        scrollToBottom();
                    }
                    break;
                }
                
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const jsonStr = line.slice(6);
                        if (jsonStr.trim() === '[DONE]') continue;
                        try {
                            const data = JSON.parse(jsonStr);
                            if (data.choices && data.choices[0].delta && data.choices[0].delta.content) {
                                contentBuffer += data.choices[0].delta.content;
                            }
                        } catch (error) {
                            console.warn('Failed to parse streaming chunk:', jsonStr, error);
                        }
                    }
                }
            }

            assistantMessageObj.content = fullResponse;
            const currentChat = state.chats.find(c => c.id === activeChat.id) || state.anonymousChats.find(c => c.id === activeChat.id);
            if (currentChat) {
                const messageToUpdate = currentChat.messages.find(m => m.id === assistantMessageObj.id);
                if (messageToUpdate) {
                    messageToUpdate.content = fullResponse;
                    delete messageToUpdate.id;
                }
            }
            saveState();
            assistantMsgDiv.innerHTML = renderContent(fullResponse);
            renderMathInElement(assistantMsgDiv);
        }

        isStreaming = false;
        elements.stopIcon.classList.add('hidden');
        elements.sendIcon.classList.remove('hidden');
        elements.sendBtn.classList.remove('bg-red-600', 'hover:bg-red-700');
        elements.sendBtn.classList.add('bg-accent', 'hover:bg-accent-hover');
        updateSendButtonState();
        elements.userInput.disabled = false;
        currentController = null;

        if (state.currentUser) {
            try {
                const lastUserMessage = activeChat.messages.findLast(m => m.role === 'user');
                const lastAssistantMessage = activeChat.messages.findLast(m => m.role === 'assistant');

                const saveResponse = await fetch(`${API_BASE_URL}/api/chat/${activeChat.id}/save-messages`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        userMessage: lastUserMessage,
                        assistantMessage: lastAssistantMessage
                    })
                });
                const data = await saveResponse.json();

                if (!saveResponse.ok) {
                    console.error("❌ FRONTEND: Failed to save messages to backend:", data);
                } else {
                    console.log("✅ Messages successfully saved to backend.");
                    if (data.generatedTitle) {
                        activeChat.title = data.generatedTitle;
                        renderSidebar();
                        console.log(`📝 Chat title updated to: "${data.generatedTitle}"`);
                    }
                }
            } catch (saveError) {
                console.error("❌ FRONTEND: Error calling save-messages API:", saveError);
            }
        }
    
        requestAnimationFrame(() => {
            console.log(`[sendMessage] After AI response & save (rAF): isStreaming = ${isStreaming}, sendBtn hidden: ${elements.sendIcon.classList.contains('hidden')}, stopBtn hidden: ${elements.stopIcon.classList.contains('hidden')}`);
    
            if (activeChat.messages.length >= 2 && activeChat.title === 'New Chat') {
                console.log("📝 Chat title generation triggered on backend. Title will update on next data load, or has been updated by response.");
            }
        });
    } catch (error) {
        if (error.name === 'AbortError') {
            if (activeChat) {
                activeChat.messages.pop();
                renderChat();
                saveState();
            }
            assistantMsgDiv.innerHTML = renderContent(fullResponse + '\n\n*Stream stopped by user.*');
            isStreaming = false;
            elements.stopIcon.classList.add('hidden');
            elements.sendIcon.classList.remove('hidden');
            elements.sendBtn.classList.remove('bg-red-600', 'hover:bg-red-700');
            elements.sendBtn.classList.add('bg-accent', 'hover:bg-accent-hover');
            updateSendButtonState();
        } else {
            if (activeChat) {
                activeChat.messages.pop();
                activeChat.messages.pop();
                console.log('[sendMessage] Other Error: Messages reverted. activeChat.messages:', activeChat.messages);
                renderChat();
                saveState();
                console.log('[sendMessage] Other Error: State saved after rollback.');
            }
            console.error("❌ FRONTEND sendMessage Error:", error);
            console.error("❌ FRONTEND Error message:", error.message);
            console.error("❌ FRONTEND Error stack:", error.stack);
            
            if (error.response) {
                console.error("❌ FRONTEND Error response status:", error.response.status);
                console.error("❌ FRONTEND Error response data:", error.response.data);
            }
            
            if (typeof error.text === 'function') {
                try {
                    const errorText = await error.text();
                    console.error("❌ FRONTEND Error response text:", errorText);
                } catch (e) {
                    console.error("❌ FRONTEND Could not read error text:", e);
                }
            }
            
            const isAuthError = error.message.includes('Invalid or expired token') ||
                               error.message.includes('401') ||
                               error.message.includes('403') ||
                               error.message.includes('Unauthorized') ||
                               error.message.includes('Authentication failed');
            
            if (isAuthError) {
                assistantMsgDiv.innerHTML = renderContent('⚠️ Your session has expired. Please sign in again.');
                localStorage.removeItem('authToken');
                state.currentUser = null;
                updateLoginStateUI();
                window.sendMessageRetryCount = 0;
                setTimeout(() => {
                    animateModalOpen(elements.signinModal.container);
                }, 1500);
                return;
            }
            
            const isNetworkError = error.message.includes('fetch') || error.message.includes('Failed to get response') || error.message.includes('network');
            const isServerError = error.message.includes('500') || error.message.includes('502') || error.message.includes('503');
            const shouldRetry = isNetworkError || isServerError;
            
            console.error("❌ FRONTEND Error classification:");
            console.error("  - Is Network Error:", isNetworkError);
            console.error("  - Is Server Error:", isServerError);
            console.error("  - Should Retry:", shouldRetry);
            console.error("  - Current Retry Count:", window.sendMessageRetryCount || 0);
            
            if (shouldRetry && (!window.sendMessageRetryCount || window.sendMessageRetryCount < 2)) {
                window.sendMessageRetryCount = (window.sendMessageRetryCount || 0) + 1;
                
                assistantMsgDiv.innerHTML = renderContent(`🔄 Connection issue detected. Retrying... (${window.sendMessageRetryCount}/2)`);
                
                setTimeout(async () => {
                    elements.userInput.value = userInput;
                    await sendMessage();
                }, 1500 * window.sendMessageRetryCount);
                
                return;
            } else {
                window.sendMessageRetryCount = 0;
                if (shouldRetry) {
                    assistantMsgDiv.innerHTML = renderContent("⚠️ Connection failed after multiple attempts. Please check your internet connection and try again.");
                } else {
                    assistantMsgDiv.innerHTML = renderContent(`⚠️ An error occurred: ${error.message}`);
                }
            }
        }
    }
}

async function generateImage(prompt, model = 'provider-4/imagen-4') {
    if (!prompt?.trim()) {
        console.error('❌ Image generation requires a prompt');
        return null;
    }

    try {
        console.log('🎨 Starting image generation with prompt:', prompt);
        console.log('🎨 Using model:', model);

        const response = await fetch(`${API_BASE}/api/ai/images/generations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                model: model,
                prompt: prompt,
                n: 1,
                size: '1024x1024',
                quality: 'standard',
                response_format: 'url'
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Image generation failed:', response.status, errorText);
            throw new Error(`Image generation failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('✅ Image generated successfully:', data);

        if (data.data && data.data.length > 0) {
            return {
                url: data.data[0].url,
                revised_prompt: data.data[0].revised_prompt
            };
        } else {
            throw new Error('No image data received from API');
        }

    } catch (error) {
        console.error('❌ Image generation error:', error);
        throw error;
    }
}