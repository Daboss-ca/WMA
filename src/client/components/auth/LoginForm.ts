import { validatePassword } from '../../validation/passwordValidator.js';
import { setCurrentUser } from '../../state/sessionManager.js';
import { uiState } from '../../state/uiStateManager.js';

export function renderLoginForm(): string {
  return `
    <form id="login-form" novalidate>
      <div class="form-group form-group--floating">
        <input type="text" id="login-username" placeholder=" " required>
        <label for="login-username">Username</label>
        <span class="field-error" id="login-username-error"></span>
      </div>

      <div class="form-group form-group--floating">
        <input type="password" id="login-password" placeholder=" " required>
        <label for="login-password">Password</label>
        <span class="field-error" id="login-password-error"></span>
      </div>

      <div class="form-actions-row">
        <label class="checkbox-label">
          <input type="checkbox" id="login-remember">
          <span class="checkbox-box" aria-hidden="true"></span>
          <span class="checkbox-text">Remember Me</span>
        </label>
        <a href="#" id="forgot-password-link" class="forgot-link">Forgot Password?</a>
      </div>

      <button type="submit" id="login-submit-btn" class="btn btn--primary btn-full">Sign In</button>
    </form>
  `;
}

export function attachLoginFormEvents(): void {
  const form = document.getElementById('login-form') as HTMLFormElement | null;
  const usernameInput = document.getElementById('login-username') as HTMLInputElement | null;
  const passwordInput = document.getElementById('login-password') as HTMLInputElement | null;
  const rememberCheckbox = document.getElementById('login-remember') as HTMLInputElement | null;

  if (!form || !usernameInput || !passwordInput) return;

  // Form Submit Handler
  form.addEventListener('submit', async (e: Event) => {
    e.preventDefault();
    uiState.clearAlert();

    const usernameVal = usernameInput.value.trim();
    const passVal = passwordInput.value;

    if (!usernameVal) {
      uiState.showAlert({ type: 'error', text: 'Username is required.' });
      return;
    }

    const passCheck = validatePassword(passVal);
    if (!passCheck.isValid) {
      uiState.showAlert({ type: 'error', text: passCheck.message || 'Invalid password.' });
      return;
    }

    // Set Loading state (spinner)
    uiState.setLoading('login-submit-btn', true, 'Sign In');

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: usernameVal, password: passVal }),
      });

      const data = await response.json();

      if (!response.ok) {
        uiState.setLoading('login-submit-btn', false, 'Sign In');
        uiState.showAlert({ type: 'error', text: data.error || 'Invalid username or password.' });
        return;
      }

      // Successful Login
      const rememberMe = rememberCheckbox ? rememberCheckbox.checked : false;
      setCurrentUser(data.user, rememberMe);

      uiState.setLoading('login-submit-btn', false, 'Sign In');
      uiState.showAlert({ type: 'success', text: 'Welcome back! Logging in...' });

      setTimeout(() => {
        uiState.closeModal();
      }, 1000);
      
    } catch (error) {
      uiState.setLoading('login-submit-btn', false, 'Sign In');
      uiState.showAlert({ type: 'error', text: 'Network error. Please try again later.' });
    }
  });
}