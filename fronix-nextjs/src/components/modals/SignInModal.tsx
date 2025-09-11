import React, { useState } from 'react';
import XIcon from '@/src/components/icons/XIcon';
import EyeOpenIcon from '@/src/components/icons/EyeOpenIcon';
import EyeClosedIcon from '@/src/components/icons/EyeClosedIcon';
import { signIn, signUp } from '@/src/lib/api';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignInSuccess: () => void;
}

const SignInModal: React.FC<SignInModalProps> = ({ isOpen, onClose, onSignInSuccess }) => {
  if (!isOpen) return null;

  const [isSignInView, setIsSignInView] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    const result = await signIn(email, password);
    if (result.success) {
      onSignInSuccess();
      onClose();
    } else {
      setError(result.error || 'An unknown error occurred during sign-in.');
    }
    setIsLoading(false);
  };

  const handleSignUp = async () => {
    setIsLoading(true);
    setError(null);
    const result = await signUp(email, password);
    if (result.success) {
      onSignInSuccess();
      onClose();
    } else {
      setError(result.error || 'An unknown error occurred during sign-up.');
    }
    setIsLoading(false);
  };

  return (
    <div id="signin-modal" className="modal-container">
      <div className="modal-content bg-light-sidebar dark:bg-dark-sidebar p-10 rounded-2xl shadow-xl w-full max-w-md border border-light-border dark:border-dark-border">
          <div className="flex justify-between items-start mb-6">
              <div className="flex border-b border-light-border dark:border-dark-border">
                  <button id="signin-tab-btn" className={`px-4 py-2 text-lg font-semibold ${isSignInView ? 'text-accent border-b-2 border-accent' : 'text-light-text-subtle dark:text-dark-text-subtle border-b-2 border-transparent'}`} onClick={() => setIsSignInView(true)}>Sign In</button>
                  <button id="signup-tab-btn" className={`px-4 py-2 text-lg font-semibold ${!isSignInView ? 'text-accent border-b-2 border-accent' : 'text-light-text-subtle dark:text-dark-text-subtle border-b-2 border-transparent'}`} onClick={() => setIsSignInView(false)}>Sign Up</button>
              </div>
              <button id="close-signin-btn" className="p-1 rounded-full hover:bg-light-border-hover dark:hover:bg-dark-border-hover transition-colors" onClick={onClose}>
                  <XIcon width="22" height="22" />
              </button>
          </div>

          {/* Error message display */}
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

          {/* Sign In View */}
          {isSignInView ? (
            <div id="signin-view" className="space-y-5">
                <input id="signin-email" type="email" placeholder="Enter your email" className="w-full p-3 rounded-md bg-light-user-bubble dark:bg-dark-user-bubble focus:outline-none focus:ring-2 focus:ring-accent" value={email} onChange={(e) => setEmail(e.target.value)} />
                <div className="relative">
                    <input id="password-input" type={showPassword ? 'text' : 'password'} placeholder="Enter your password" className="w-full p-3 pr-10 rounded-md bg-light-user-bubble dark:bg-dark-user-bubble focus:outline-none focus:ring-2 focus:ring-accent" value={password} onChange={(e) => setPassword(e.target.value)} />
                    <button id="password-toggle-btn" className="absolute inset-y-0 right-0 flex items-center px-3 text-light-text-subtle dark:text-dark-text-subtle" onClick={handleTogglePasswordVisibility}>
                        {showPassword ? <EyeOpenIcon id="eye-open-icon" /> : <EyeClosedIcon id="eye-closed-icon" />}
                    </button>
                </div>
                 <a href="#" className="text-xs text-accent hover:underline text-right block -mt-2">Forgot password?</a>
                <button id="signin-email-btn" className="w-full px-4 py-3 rounded-md bg-accent text-white font-semibold hover:bg-accent-hover transition-colors" onClick={handleSignIn} disabled={isLoading}>Sign In</button>
                <div className="flex items-center text-xs text-light-text-subtle dark:text-dark-text-subtle">
                    <div className="flex-grow border-t border-light-border dark:border-dark-border"></div>
                    <span className="flex-shrink mx-4">OR</span>
                    <div className="flex-grow border-t border-light-border dark:border-dark-border"></div>
                </div>
                <button id="signin-google-btn" className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-md bg-white dark:bg-dark-user-bubble border border-light-border dark:border-dark-border hover:bg-light-border-hover dark:hover:bg-dark-border-hover transition-colors font-medium" disabled={isLoading}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/><path fill="none" d="M1 1h22v22H1z"/></svg>
                    Continue with Google
                </button>
            </div>
          ) : (
            /* Sign Up View */
            <div id="signup-view" className="space-y-5">
                <input id="signup-email" type="email" placeholder="Enter your email" className="w-full p-3 rounded-md bg-light-user-bubble dark:bg-dark-user-bubble focus:outline-none focus:ring-2 focus:ring-accent" value={email} onChange={(e) => setEmail(e.target.value)} />
                <input id="signup-password" type="password" placeholder="Create a password" className="w-full p-3 rounded-md bg-light-user-bubble dark:bg-dark-user-bubble focus:outline-none focus:ring-2 focus:ring-accent" value={password} onChange={(e) => setPassword(e.target.value)} />
                <button id="signup-email-btn" className="w-full px-4 py-3 rounded-md bg-accent text-white font-semibold hover:bg-accent-hover transition-colors" onClick={handleSignUp} disabled={isLoading}>Continue with Email</button>
                <div className="flex items-center text-xs text-light-text-subtle dark:text-dark-text-subtle">
                    <div className="flex-grow border-t border-light-border dark:border-dark-border"></div>
                    <span className="flex-shrink mx-4">OR</span>
                    <div className="flex-grow border-t border-light-border dark:border-dark-border"></div>
                </div>
                <button id="signup-google-btn" className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-md bg-white dark:bg-dark-user-bubble border border-light-border dark:border-dark-border hover:bg-light-border-hover dark:hover:bg-dark-border-hover transition-colors font-medium" disabled={isLoading}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/><path fill="none" d="M1 1h22v22H1z"/></svg>
                    Continue with Google
                </button>
            </div>
          )}
      </div>
    </div>
  );
};

export default SignInModal;
