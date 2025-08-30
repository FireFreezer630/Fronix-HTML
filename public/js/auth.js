function isTokenExpired(token) {
    if (!token) return true;
    
    try {
        // Parse JWT token to check expiration
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Math.floor(Date.now() / 1000);
        
        // Check if token is expired (with 30 second buffer)
        return payload.exp && (payload.exp - 30) < currentTime;
    } catch (error) {
        console.warn("Invalid token format:", error);
        return true; // Consider invalid tokens as expired
    }
}

async function validateAndRefreshToken() {
    let token = localStorage.getItem('authToken');
    const refreshToken = localStorage.getItem('refreshToken');

    if (!token) {
        return null;
    }

    if (isTokenExpired(token)) {
        console.log("Access token expired. Attempting to refresh...");
        if (!refreshToken) {
            console.log("No refresh token available. Logging out.");
            localStorage.removeItem('authToken');
            state.currentUser = null;
            updateLoginStateUI();
            return null;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken })
            });

            if (!response.ok) {
                throw new Error('Failed to refresh token');
            }

            const { session } = await response.json();
            localStorage.setItem('authToken', session.access_token);
            localStorage.setItem('refreshToken', session.refresh_token);
            token = session.access_token;
            console.log("Token refreshed successfully.");
        } catch (error) {
            console.error("Failed to refresh token:", error);
            localStorage.removeItem('authToken');
            localStorage.removeItem('refreshToken');
            state.currentUser = null;
            updateLoginStateUI();
            return null;
        }
    }
    
    return token;
}

async function handleSignIn(email, password, retryCount = 0) {
    if (!email || !password) {
        alert("Please enter both your email and password.");
        return;
    }
    const maxRetries = 2;
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/signin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Unknown sign-in error');
        }
        localStorage.setItem('authToken', data.session.access_token);
        localStorage.setItem('refreshToken', data.session.refresh_token);
        loadDataFromServer();
        closeAllModals();
        alert('Sign in successful!');
    } catch (error) {
        console.error("Sign-in failed:", error);
        if (retryCount < maxRetries && (error.message.includes('fetch failed') || error.message.includes('network'))) {
            console.log(`Retrying sign-in attempt ${retryCount + 1}/${maxRetries + 1}...`);
            setTimeout(() => {
                handleSignIn(email, password, retryCount + 1);
            }, 1000 * (retryCount + 1));
        } else {
            alert('Error signing in: ' + error.message);
        }
    }
}

async function handleSignUp(email, password) {
    if (!email || !password) {
        alert("Please provide both an email and a password.");
        return;
    }
    if (password.length < 6) {
        alert("Password must be at least 6 characters long.");
        return;
    }
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Unknown sign-up error');
        }
        alert('Sign-up successful! Please check your email for verification.');
        closeAllModals();
    } catch (error) {
        console.error("Sign-up failed:", error);
        alert('Error signing up: ' + error.message);
    }
}

async function handleGoogleLogin() {
    try {
        const { error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${API_BASE_URL}/api/auth/callback`
            }
        });
        if (error) {
            throw new Error('Supabase Google login failed: ' + error.message);
        }
    } catch (error) {
        console.error("Error during Google login:", error);
        alert(error.message);
    }
}

async function handleLogout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) {
            throw new Error("Logout failed: " + error.message);
        }
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}
