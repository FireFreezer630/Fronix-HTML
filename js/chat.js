// js/chat.js
// Core logic for chat interactions, AI communication, and message handling.
App.loadDataFromServer = async function(retryCount = 0) {
    const maxRetries = 3;
    const token = localStorage.getItem('authToken');
    const isUserLoggedIn = !!App.state.currentUser; // Check if App.state.currentUser is populated

    if (!isUserLoggedIn) {
        // If not logged in, just update UI and return. Chats are loaded from localStorage in App.init.
        App.updateLoginStateUI();
        return;
    }

    if (!token) {
        // This case should ideally not be reached if isUserLoggedIn is true, but as a safeguard
        App.updateLoginStateUI();
        return;
    }

    try {
        // Wrap the entire data loading process in retry mechanism
        await App.retryWithBackoff(async () => {
            // Fetch user info first
            const userResponse = await fetch(`${App.API_BASE_URL}/api/user/me`, {
                headers: { 'Authorization': `Bearer ${token}` },
                cache: 'no-cache'
            });
            
            if (userResponse.status === 401 || userResponse.status === 403) {
                throw new Error('AUTH_ERROR'); // Special error for authentication issues
            }
            if (!userResponse.ok) {
                const error = new Error(`Failed to fetch user data. Status: ${userResponse.status}`);
                error.status = userResponse.status;
                throw error;
            }
            App.state.currentUser = await userResponse.json();

            // Then fetch chats
            const chatsResponse = await fetch(`${App.API_BASE_URL}/api/chat`, {
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
            App.state.chats = chats; // Store all chats

            // Fetch messages for each chat
            for (let i = 0; i < App.state.chats.length; i++) {
                const chat = App.state.chats[i];
                const messagesResponse = await fetch(`${App.API_BASE_URL}/api/chat/${chat.id}/messages`, {
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
                chat.messages = Array.isArray(messages.messages) ? messages.messages : []; // Ensure it's an array
            }

            // Set active chat to the newest chat or create a new one
            if (App.state.chats.length > 0) {
                App.state.activeId = App.state.chats[0].id; // Always select the newest chat
            } else {
                // If no chats exist, create a new one
                await App.handleNewChat();
                return; // App.handleNewChat will set activeId and render
            }
        });

        // If we get here, everything succeeded
        App.saveState(); // Cache the newly fetched data
        console.log('[loadDataFromServer] Data loaded successfully. Current App.state.chats:', JSON.parse(JSON.stringify(App.state.chats))); // Deep copy for logging
        console.log('[loadDataFromServer] Current App.state.activeId:', App.state.activeId);
        App.renderSidebar();
        App.renderChat();

    } catch (error) {
        console.error("[loadDataFromServer] Error loading data from server:", error);
        
        // Only clear token and sign out on authentication errors
        if (error.message === 'AUTH_ERROR') {
            App.openAlertModal('Session Expired', 'Your session has expired. Please sign in again.');
            localStorage.removeItem('authToken');
            App.state.currentUser = null;
        } else {
            // For network/server errors, just show a warning but keep user signed in
            console.warn('[loadDataFromServer] Temporary network issue:', error.message);
            // Don't alert for temporary issues, just log them
        }
    } finally {
        App.updateLoginStateUI();
        App.updateProfileUI();
        console.log('[loadDataFromServer] Finished. Final App.state.activeId:', App.state.activeId);
    }
}

App.handleNewChat = async function() {
    const token = localStorage.getItem('authToken');
    const isUserLoggedIn = !!App.state.currentUser; // Check if App.state.currentUser is populated
    const FREE_MODELS = Object.keys(App.MODELS).filter(key => App.MODELS[key].free);
    const MAX_LOCAL_CHATS = 5;

    if (!isUserLoggedIn) {
        // Unauthenticated user
        if (App.state.chats.length >= MAX_LOCAL_CHATS) {
            App.openAlertModal('Trial Limit Reached', `You can create up to ${MAX_LOCAL_CHATS} chats without logging in. Please sign in to create more.`);
            return;
        }
        if (!FREE_MODELS.includes(App.state.settings.model)) {
            App.openAlertModal('Model Restricted', `Only ${FREE_MODELS.join(' and ')} models are available for trial users. Please sign in to use other models.`);
            return;
        }
    } else if (!token) {
        // Logged in user but no token (shouldn't happen with proper flow, but as a safeguard)
        App.openAlertModal('Authentication Required', 'Please sign in to create a new chat.');
        return;
    }

    // Optimistically create a new chat object with a temporary ID
    const tempChatId = `temp-${Date.now()}`;
    const newChat = {
        id: tempChatId,
        title: 'New Chat',
        messages: [],
        model: App.state.settings.model // Default model
    };

    // Add the new chat to the App.state and set it as active
    console.log('[handleNewChat] Optimistically adding new chat:', newChat);
    App.state.chats.unshift(newChat);
    App.setActive(tempChatId);
    App.renderSidebar(); // Update sidebar immediately
    App.renderChat(); // Render empty chat immediately
    App.saveState();
    console.log('[handleNewChat] State after optimistic add. App.state.chats:', JSON.parse(JSON.stringify(App.state.chats))); // Deep copy for logging
    console.log('[handleNewChat] State after optimistic add. App.state.activeId:', App.state.activeId);

    if (isUserLoggedIn) {
        try {
            const response = await fetch(`${App.API_BASE_URL}/api/chat`, {
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
            newChatFromServer.messages = []; // Initialize with an empty messages array

            // Find the optimistically added chat and update its real ID
            const index = App.state.chats.findIndex(chat => chat.id === tempChatId);
            if (index !== -1) {
                App.state.chats[index].id = newChatFromServer.id;
                App.state.chats[index].created_at = newChatFromServer.created_at; // Update timestamp if needed
                App.state.activeId = newChatFromServer.id; // Ensure activeId is the real one
            } else {
                // Fallback if optimistic chat not found (shouldn't happen)
                App.state.chats.unshift(newChatFromServer);
                App.state.activeId = newChatFromServer.id;
            }
            
            console.log('[handleNewChat] New chat created on server:', newChatFromServer);
            
            App.renderSidebar(); // Re-render to update ID in sidebar
            App.saveState(); // Save App.state with real ID
            console.log('[handleNewChat] State after successful backend save. App.state.chats:', JSON.parse(JSON.stringify(App.state.chats))); // Deep copy for logging
            console.log('[handleNewChat] State after successful backend save. App.state.activeId:', App.state.activeId);

        } catch (error) {
            console.error("[handleNewChat] Error creating new chat:", error);
            App.openAlertModal('Error', 'Could not create a new chat. Please try again.');

            // Revert optimistic update on error
            const index = App.state.chats.findIndex(chat => chat.id === tempChatId);
            if (index !== -1) {
                App.state.chats.splice(index, 1); // Remove optimistic chat
                // If the deleted chat was active, set a new active chat
                if (App.state.activeId === tempChatId) {
                    App.state.activeId = App.state.chats.length > 0 ? App.state.chats[0].id : null;
                }
                App.renderSidebar(); // Re-render sidebar after removal
                App.renderChat(); // Re-render chat area
                App.saveState();
                console.log('[handleNewChat] State after error rollback. App.state.chats:', JSON.parse(JSON.stringify(App.state.chats))); // Deep copy for logging
                console.log('[handleNewChat] State after error rollback. App.state.activeId:', App.state.activeId);
            }
        }
    }
}

App.sendMessage = async function() {
    const userInput = App.elements.userInput.value.trim();
    const activeChat = App.state.chats.find(c => c.id === App.state.activeId);
    console.log(`[sendMessage] Start: App.isStreaming = ${App.isStreaming}, isGeneratingTitle = ${App.isGeneratingTitle}`);
    if ((!userInput && !App.attachedImageData) || !activeChat || App.isStreaming || App.isGeneratingTitle) {
        console.log(`[sendMessage] Aborting due to input/chat/streaming/title gen App.state. App.isStreaming = ${App.isStreaming}, isGeneratingTitle = ${App.isGeneratingTitle}`);
        return;
    }

    const isUserLoggedIn = !!App.state.currentUser;
    let token = null;
    if (isUserLoggedIn) {
        token = await App.validateAndRefreshToken();
        if (!token) {
            App.openAlertModal('Session Expired', 'Your session has expired. Please sign in again.');
            setTimeout(() => {
                App.animateModalOpen(App.elements.signinModal.container);
            }, 1000);
            return;
        }
    }

    // Handle /study command
    if (userInput.trim().startsWith('/study')) {
        const command = userInput.trim().split(' ')[0];
        if (command === '/study') {
            App.elements.userInput.value = '';
            App.elements.userInput.style.height = 'auto';
            App.addMessage('user', '/study'); // Add user's command to chat history

            const originalStudyMode = activeChat.study_mode; // Store original for rollback
            const newStudyModeStatus = !originalStudyMode;

            // Optimistically update study_mode App.state
            activeChat.study_mode = newStudyModeStatus;
            App.saveState();
            App.addMessage('assistant', `📚 Study mode ${newStudyModeStatus ? 'enabled' : 'disabled'}.`); // Optimistic system message

            try {
                const response = await fetch(`${App.API_BASE_URL}/api/chat/${activeChat.id}/toggle-study-mode`, {
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
                // No further UI updates needed for success, as it was handled optimistically
                console.log(`Study mode toggled successfully to: ${data.study_mode}`);

            } catch (error) {
                console.error("Error toggling study mode:", error);
                App.openAlertModal('Error', `Failed to toggle study mode: ${error.message}`);

                // Revert optimistic UI update on error
                activeChat.study_mode = originalStudyMode;
                App.saveState();
                // Optionally remove the optimistic system message, or add a new error message
                // For simplicity, we'll add a new error message
                App.addMessage('assistant', `⚠️ Failed to toggle study mode. Reverting to ${originalStudyMode ? 'enabled' : 'disabled'}.`);
            } finally {
                // Reset UI elements after command execution (ensure they are always re-enabled)
                App.elements.sendIcon.classList.remove('hidden');
                App.elements.stopIcon.classList.add('hidden');
                App.elements.sendBtn.classList.remove('bg-red-600', 'hover:bg-red-700');
                App.elements.sendBtn.classList.add('bg-accent', 'hover:bg-accent-hover');
                App.updateSendButtonState(); // Update button App.state
                App.elements.userInput.disabled = false; // Ensure user input is re-enabled
                App.isStreaming = false;
            }
            return; // Exit sendMessage function after handling /study command
        }
    }

    let messagesForAI = JSON.parse(JSON.stringify(activeChat.messages));
    
    let fullSystemPrompt = App.SYSTEM_PROMPT_BASE;
    fullSystemPrompt += ` You are chatting with the user via the Fronix ${App.getDeviceType()} app.`;
    if (App.state.settings.model) {
        fullSystemPrompt += ` You are currently using the ${App.MODELS[App.state.settings.model]?.name || 'selected'} model.`;
    }

    if (App.isStudyMode && App.studyModePrompt) {
        fullSystemPrompt += `

${App.studyModePrompt}`;
    }
    messagesForAI.unshift({ role: 'system', content: fullSystemPrompt });

    // Call App.updateSendButtonState at the start of sendMessage (after /study handling)
    App.updateSendButtonState();

    App.elements.sendIcon.classList.add('hidden');
    App.elements.stopIcon.classList.remove('hidden');
    App.elements.sendBtn.classList.remove('bg-red-600', 'hover:bg-red-700');
    App.elements.sendBtn.classList.add('bg-accent', 'hover:bg-accent-hover');
    // App.elements.sendBtn.disabled = true; // No longer disable here, managed by App.updateSendButtonState
    // App.elements.userInput.disabled = true; // User input should not be disabled
    App.elements.userInput.value = '';
    App.elements.userInput.style.height = 'auto';
    App.isStreaming = true; // Indicate that AI is streaming (moved here)
    
    // Format user message with image if attached
    let userMessageContent;
    if (App.attachedImageData) {
        userMessageContent = [
            { type: 'text', text: userInput },
            {
                type: 'image_url',
                image_url: {
                    url: App.attachedImageData.dataUrl
                }
            }
        ];
    } else {
        userMessageContent = userInput;
    }
    
    const userMessageObj = { role: 'user', content: userMessageContent };
    const assistantMessageObj = { role: 'assistant', content: '...', id: 'assistant-msg-' + Date.now() }; // Temporary ID for placeholder

    // Optimistically add user and assistant placeholder messages
    activeChat.messages.push(userMessageObj);
    activeChat.messages.push(assistantMessageObj);
    console.log('[sendMessage] Messages optimistically added. activeChat.messages (after push):', JSON.parse(JSON.stringify(activeChat.messages))); // Deep copy for logging
    App.renderChat(); // Render immediately with new messages
    App.scrollToBottom();

    // Clear attached image immediately after adding to chat history
    if (App.attachedImageData) {
        App.attachedImageData = null;
        App.elements.imageUpload.value = null;
        const imagePreviewContainer = App.elements.imagePreviewContainer;
        imagePreviewContainer.innerHTML = '';
        imagePreviewContainer.classList.add('hidden');
    }
    
    const assistantMsgDiv = App.elements.chatBox.querySelector(`#${assistantMessageObj.id}`); // Get the placeholder div
    
    App.currentController = new AbortController();
    let fullResponse = "";

    try {
        // Detect model type and route accordingly
        const currentModel = activeChat.model || App.state.settings.model || 'openai-large'; // Ensure a default model
        const modelData = App.MODELS[currentModel] || { name: 'OpenAI (Default)', type: 'text', pro: false }; // Ensure default modelData
        const isImageModel = modelData.type === 'image';

        // Check if the user is unauthenticated and trying to use a pro model
        if (!isUserLoggedIn && modelData.pro) {
            App.openAlertModal('Model Restricted', `The ${modelData.name} model is only available for authenticated users with a pro plan. Please sign in or select a free model.`);
            // Revert optimistic UI update
            activeChat.messages.pop(); // Remove AI placeholder
            activeChat.messages.pop(); // Remove user message
            App.renderChat();
            App.saveState();
            return;
        }
        
        console.log('🔍 Current model for request:', currentModel);
        console.log('🔍 Model data:', modelData);
        console.log('🔍 Is image model:', isImageModel);
        
        let response;
        if (isImageModel) {
            // Route to image generation API
            console.log('🎨 Routing to image generation API for model:', currentModel);
            response = await fetch(`${App.API_BASE_URL}/api/ai/images/generations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                signal: App.currentController.signal,
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
            // Route to text chat API
            console.log('💬 Routing to text chat API for model:', currentModel);
            response = await fetch(`${App.API_BASE_URL}/api/ai/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                signal: App.currentController.signal,
                body: JSON.stringify({
                    model: currentModel,
                    messages: activeChat.messages,
                    chatId: activeChat.id // Pass chatId for study mode check
                }),
            });
        }

        if (!response.ok) {
            if (!response.ok) {
                let errorMessage = 'Failed to get response from AI service.';
                // Enhanced error logging for failed requests
                console.error("❌ FRONTEND HTTP Error Response:");
                console.error("  - Status:", response.status);
                console.error("  - Status Text:", response.statusText);
                console.error("  - Headers:", Object.fromEntries(response.headers.entries()));
                console.error("  - URL:", response.url);
                // Try to read response body for detailed error
                let responseBody = null;
                try {
                    const responseText = await response.text();
                    console.error("  - Response Body (text):", responseText);
                    // Try to parse as JSON
                    try {
                        responseBody = JSON.parse(responseText);
                        console.error("  - Response Body (parsed):", responseBody);
                    } catch (parseError) {
                        console.error("  - Response Body (not JSON):", responseText);
                    }
                } catch (readError) {
                    console.error("  - Could not read response body:", readError);
                }
                // Handle different HTTP App.state.status codes
                if (response.status === 401 || response.status === 403) {
                    errorMessage = 'Invalid or expired token';
                } else {
                    try {
                        errorMessage = responseBody?.error || responseText || `HTTP ${response.status}: ${response.statusText}`;
                    } catch (e) {
                        // If we can't parse the error response, use default message
                        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                    }
                }
                throw new Error(errorMessage);
            }
        }

        if (isImageModel) {
            // Handle image generation response (not streaming)
            const imageData = await response.json();
            console.log('🎨 Image generation response:', imageData);
            if (imageData.data && imageData.data.length > 0) {
                const imageUrl = imageData.data[0].url;
                const revisedPrompt = imageData.data[0].revised_prompt;
                fullResponse = `![Generated Image](${imageUrl})`;
                if (revisedPrompt && revisedPrompt !== userInput) {
                    fullResponse += `\n\n*Revised prompt: ${revisedPrompt}*`;
                }
                assistantMsgDiv.innerHTML = App.renderContent(fullResponse);
            } else {
                throw new Error('No image data received from API');
            }
        } else {
            // Handle text streaming response
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                
                // Keep the last incomplete line in the buffer
                buffer = lines.pop() || '';
                
                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (!trimmedLine) continue;
                    
                    if (trimmedLine === 'data: [DONE]') {
                        // Stream completed
                        break;
                    }
                    
                    if (trimmedLine.startsWith('data: ')) {
                        try {
                            const jsonStr = trimmedLine.slice(6); // Remove 'data: ' prefix
                            const data = JSON.parse(jsonStr);
                            
                            // Extract content from choices[0].delta.content
                            if (data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content) {
                                const content = data.choices[0].delta.content;
                                fullResponse += content;
                                assistantMsgDiv.innerHTML = App.renderStreamingContent(fullResponse + '<span class="blinking-cursor"></span>');
                                App.scrollToBottom();
                            }
                        } catch (error) {
                            console.warn('Failed to parse streaming chunk:', trimmedLine, error);
                        }
                    }
                }
            }

            // Update the content of the optimistic assistant message
            assistantMessageObj.content = fullResponse;
            // Update the actual message in App.state.chats after stream completes
            const currentChat = App.state.chats.find(c => c.id === activeChat.id);
            if (currentChat) {
                const messageToUpdate = currentChat.messages.find(m => m.id === assistantMessageObj.id);
                if (messageToUpdate) {
                    messageToUpdate.content = fullResponse;
                    delete messageToUpdate.id; // Remove temporary ID
                }
            }
            App.saveState(); // Save App.state after content is fully received
            console.log('[sendMessage] App.state updated after AI stream completion. activeChat.messages (after update):', JSON.parse(JSON.stringify(activeChat.messages))); // Deep copy for logging

            assistantMsgDiv.innerHTML = App.renderContent(fullResponse);
            renderMathInElement(assistantMsgDiv);
        }

        // Reset streaming App.state and button BEFORE title generation
        App.isStreaming = false;
        App.elements.stopIcon.classList.add('hidden');
        App.elements.sendIcon.classList.remove('hidden');
        App.elements.sendBtn.classList.remove('bg-red-600', 'hover:bg-red-700');
        App.elements.sendBtn.classList.add('bg-accent', 'hover:bg-accent-hover');
        App.updateSendButtonState(); // Re-enable the button using the new function
        App.elements.userInput.disabled = false; // Re-enable user input
        App.currentController = null;

        // Save messages to backend AFTER AI response is complete and processed
        // This is now in its own try-catch block to prevent aggressive rollback on save failures.
        try {
            // Find the actual user and assistant messages that were just sent/received
            const lastUserMessage = activeChat.messages.findLast(m => m.role === 'user');
            const lastAssistantMessage = activeChat.messages.findLast(m => m.role === 'assistant');

            const saveResponse = await fetch(`${App.API_BASE_URL}/api/chat/${activeChat.id}/save-messages`, {
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
            const data = await saveResponse.json(); // Parse response to JSON here

            if (!saveResponse.ok) {
                console.error("❌ FRONTEND: Failed to save messages to backend:", data);
                // Do NOT throw error here, just log. UI should not revert.
                // Optionally, display a subtle "failed to save" message to user.
            } else {
                console.log("✅ Messages successfully saved to backend.");
                // Check if a new title was generated and returned
                if (data.generatedTitle) {
                    activeChat.title = data.generatedTitle;
                    App.renderSidebar(); // Re-render sidebar to show the new title
                    App.saveState(); // Save the new title to localStorage
                    console.log(`📝 Chat title updated to: "${data.generatedTitle}"`);
                }
            }
            } catch (saveError) {
                console.error("❌ FRONTEND: Error calling save-messages API:", saveError);
                // Do NOT perform UI rollback here.
                // Optionally, display a subtle "failed to save" message to user.
            }
    
            // Ensure UI is fully updated before potentially running title generation
            requestAnimationFrame(() => {
                console.log(`[sendMessage] After AI response & save (rAF): App.isStreaming = ${App.isStreaming}, sendBtn hidden: ${App.elements.sendIcon.classList.contains('hidden')}, stopBtn hidden: ${App.elements.stopIcon.classList.contains('hidden')}`);
    
                // After the second message, check for title generation
                if (activeChat.messages.length >= 2 && activeChat.title === 'New Chat') {
                    // The backend will handle the title generation asynchronously.
                    // For now, we will rely on a full page reload or subsequent data fetch
                    // to pick up the new title. This avoids a race condition with App.loadDataFromServer.
                    console.log("📝 Chat title generation triggered on backend. Title will update on next data load, or has been updated by response.");
                }
            });
    } catch (error) {
        // This catch block now primarily handles errors during AI response generation/streaming
        // or authentication errors, without affecting message persistence errors.
        if (error.name === 'AbortError') {
            if (activeChat) {
                activeChat.messages.pop(); // Remove only AI placeholder
                App.renderChat(); // Re-render to reflect reverted App.state
                App.saveState();
            }
            assistantMsgDiv.innerHTML = App.renderContent(`${fullResponse}\n\n*Stream stopped by user.*`);
            App.isStreaming = false;
            App.elements.stopIcon.classList.add('hidden');
            App.elements.sendIcon.classList.remove('hidden');
            App.elements.sendBtn.classList.remove('bg-red-600', 'hover:bg-red-700');
            App.elements.sendBtn.classList.add('bg-accent', 'hover:bg-accent-hover');
            App.updateSendButtonState();
        } else {
            if (activeChat) {
                // For other errors, remove both user message and AI placeholder
                activeChat.messages.pop(); // Remove AI placeholder
                activeChat.messages.pop(); // Remove user message
                console.log('[sendMessage] Other Error: Messages reverted. activeChat.messages:', activeChat.messages);
                App.renderChat(); // Re-render to reflect reverted App.state
                App.saveState();
                console.log('[sendMessage] Other Error: App.state saved after rollback.');
            }
            console.error("❌ FRONTEND sendMessage Error:", error);
            console.error("❌ FRONTEND Error message:", error.message);
            console.error("❌ FRONTEND Error stack:", error.stack);
            
            if (error.response) {
                console.error("❌ FRONTEND Error response App.state.status:", error.response.status);
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
                assistantMsgDiv.innerHTML = App.renderContent('⚠️ Your session has expired. Please sign in again.');
                localStorage.removeItem('authToken');
                App.state.currentUser = null;
                App.updateLoginStateUI();
                window.sendMessageRetryCount = 0;
                setTimeout(() => {
                    App.animateModalOpen(App.elements.signinModal.container);
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
                
                assistantMsgDiv.innerHTML = App.renderContent(`🔄 Connection issue detected. Retrying... (${window.sendMessageRetryCount}/2)`);
                
                setTimeout(async () => {
                    App.elements.userInput.value = userInput;
                    await App.sendMessage();
                }, 1500 * window.sendMessageRetryCount);
                
                return;
            } else {
                window.sendMessageRetryCount = 0;
                if (shouldRetry) {
                    assistantMsgDiv.innerHTML = App.renderContent(`⚠️ Connection failed after multiple attempts. Please check your internet connection and try again.`);
                } else {
                    assistantMsgDiv.innerHTML = App.renderContent(`⚠️ An error occurred: ${error.message}`);
                }
            }
        }
    }
};

App.generateImage = async function(prompt, model = 'provider-4/imagen-4') {
    if (!prompt?.trim()) {
        console.error('❌ Image generation requires a prompt');
        return null;
    }

    try {
        console.log('🎨 Starting image generation with prompt:', prompt);
        console.log('🎨 Using model:', model);

        const response = await fetch(`${App.API_BASE_URL}/api/ai/images/generations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({
                model: model,
                prompt: prompt,
                n: 1,
                size: '1024x1024',
                quality: 'standard',
                response_format: 'url'
            }),
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
};

App.exitEditMode = function() {
        App.state.editingMessage = null;
        App.elements.userInput.value = '';
        App.elements.sendIcon.classList.remove('hidden');
        App.elements.saveIcon.classList.add('hidden');
        App.elements.editIndicator.classList.add('hidden');
        App.elements.editIndicator.classList.remove('flex');

        // Clear image preview
        App.attachedImageData = null;
        App.elements.imageUpload.value = null;
        const imagePreviewContainer = App.elements.imagePreviewContainer;
        imagePreviewContainer.innerHTML = '';
        imagePreviewContainer.classList.add('hidden');

        App.renderChat();
};
    App.toggleSidebar = function() { const isMobile = window.innerWidth < 768; App.elements.sidebar.classList.toggle(isMobile ? 'open' : 'closed'); if (isMobile) App.elements.sidebarOverlay.classList.toggle('open'); };
    
    // --- Modal Control with Anime.js ---
    App.animateModalOpen = function(modalContainer) {
        modalContainer.style.display = 'flex';
        const modalContent = modalContainer.querySelector('.modal-content');
        anime({ targets: modalContent, scale: [0.92, 1], opacity: [0, 1], duration: 250, easing: 'easeOutCubic' });
    }
    App.animateModalClose = function(modalContainer, onComplete = () => {}) {
        const modalContent = modalContainer.querySelector('.modal-content');
        anime({ targets: modalContent, scale: 0.95, opacity: 0, duration: 100, easing: 'easeInCubic', complete: () => { modalContainer.style.display = 'none'; onComplete(); } });
    }
    App.openRenameModal = function(chatId) { App.state.modalContext.chatId = chatId; const chat = App.state.chats.find(c=>c.id === chatId); if(!chat) return; App.elements.renameModal.input.value = chat.title; App.animateModalOpen(App.elements.renameModal.container); }
    App.openDeleteModal = function(chatId) { App.state.modalContext.chatId = chatId; const chat = App.state.chats.find(c=>c.id === chatId); if(!chat) return; App.elements.deleteModal.message.textContent = `Are you sure you want to delete "${chat.title}"?`; App.animateModalOpen(App.elements.deleteModal.container); }
    
    App.openAlertModal = function(title, message) {
        App.elements.alertModal.title.textContent = title;
        App.elements.alertModal.message.textContent = message;
        App.animateModalOpen(App.elements.alertModal.container);
    }

    App.closeAlertModal = function() {
        App.animateModalClose(App.elements.alertModal.container);
    }

    App.closeAllModals = function() { 
        document.querySelectorAll('.modal-container').forEach(m => { if (m.style.display === 'flex') App.animateModalClose(m); }); 
        App.elements.chatActionsDropdown.style.display = 'none';
    }
