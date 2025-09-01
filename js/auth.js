// js/auth.js
// Contains all logic related to user authentication and session management.
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
        // This function CORRECTLY calls your backend.
        const response = await fetch(`${App.API_BASE_URL}/api/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Unknown sign-up error');
        }
        App.openAlertModal('Sign-up Successful', 'Please check your email for verification.');
        App.closeAllModals();
    } catch (error) {
        console.error("Sign-up failed:", error);
        App.openAlertModal('Sign-up Error', error.message);
    }
}

async function handleGoogleLogin() {
        try {
            const { error } = await App.supabaseClient.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${App.API_BASE_URL}/api/auth/callback`
                }
            });
            if (error) {
                throw new Error('Supabase Google login failed: ' + error.message);
            }
        } catch (error) {
            console.error("Error during Google login:", error);
            App.openAlertModal('Google Login Error', error.message);
        }
    }

async function handleSignIn(email, password, retryCount = 0) {
    if (!email || !password) {
        App.openAlertModal("Please enter both your email and password.");
        return;
    }
    const maxRetries = 2;
    const signinBtn = App.elements.signinEmailBtn;
    const buttonText = signinBtn.querySelector('.button-text');
    const spinner = signinBtn.querySelector('svg');

    signinBtn.disabled = true;
    buttonText.classList.add('hidden');
    spinner.classList.remove('hidden');

    try {
        const response = await fetch(`${App.API_BASE_URL}/api/auth/signin`, {
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
        await App.loadDataFromServer();
        App.closeAllModals();
        App.openAlertModal('Success', 'You have successfully signed in.');
    } catch (error) {
        console.error("Sign-in failed:", error);
        if (retryCount < maxRetries && (error.message.includes('fetch failed') || error.message.includes('network'))) {
            console.log(`Retrying sign-in attempt ${retryCount + 1}/${maxRetries + 1}...`);
            setTimeout(() => {
                handleSignIn(email, password, retryCount + 1);
            }, 1000 * (retryCount + 1));
        } else {
            App.openAlertModal('Sign-in Error', error.message);
        }
    } finally {
        signinBtn.disabled = false;
        buttonText.classList.remove('hidden');
        spinner.classList.add('hidden');
    }
}

function updateProfileUI() {
    if (App.state.currentUser) {
        App.elements.profileUsername.textContent = App.state.currentUser.username || 'User';
        App.elements.profileEmail.textContent = App.state.currentUser.email;
        App.elements.profilePlan.textContent = App.state.currentUser.plan || 'basic';
        App.elements.profileBtnUsername.textContent = App.state.currentUser.username || 'User';
    }
}

// Expose functions and variables to the global App scope
App.handleGoogleLogin = handleGoogleLogin;
App.handleSignUp = handleSignUp;
App.handleSignIn = handleSignIn;
App.updateProfileUI = updateProfileUI;
