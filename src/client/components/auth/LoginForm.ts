import { validateEmail } from '../../validation/emailValidator.js';
import { validatePassword } from '../../validation/passwordValidator.js';
import { findUserByEmail, setCurrentUser } from '../../state/sessionManager.js';
import { uiState } from '../../state/uiStateManager.js';

export function renderLoginForm(): string {
  return `
    <form id="login-form" novalidate>
      <div class="form-group form-group--floating">
        <input type="email" id="login-email" placeholder=" " required>
        <label for="login-email">Email Address</label>
        <span class="field-error" id="login-email-error"></span>
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
  const emailInput = document.getElementById('login-email') as HTMLInputElement | null;
  const passwordInput = document.getElementById('login-password') as HTMLInputElement | null;
  const rememberCheckbox = document.getElementById('login-remember') as HTMLInputElement | null;

  if (!form || !emailInput || !passwordInput) return;

  // Real-time Email Validation on blur/input
  emailInput.addEventListener('blur', () => {
    const errorSpan = document.getElementById('login-email-error');
    const result = validateEmail(emailInput.value);
    if (errorSpan) errorSpan.textContent = result.isValid ? '' : (result.message || '');
  });

  // Form Submit Handler
  form.addEventListener('submit', (e: Event) => {
    e.preventDefault();
    uiState.clearAlert();

    const emailVal = emailInput.value;
    const passVal = passwordInput.value;

    const emailCheck = validateEmail(emailVal);
    const passCheck = validatePassword(passVal);

    if (!emailCheck.isValid) {
      uiState.showAlert({ type: 'error', text: emailCheck.message || 'Invalid email.' });
      return;
    }

    if (!passCheck.isValid) {
      uiState.showAlert({ type: 'error', text: passCheck.message || 'Invalid password.' });
      return;
    }

    // Set Loading state (spinner)
    uiState.setLoading('login-submit-btn', true, 'Sign In');

    setTimeout(() => {
      const existingUser = findUserByEmail(emailVal);

      if (!existingUser || existingUser.password !== passVal) {
        uiState.setLoading('login-submit-btn', false, 'Sign In');
        uiState.showAlert({ type: 'error', text: 'Invalid email or password.' });
        return;
      }

      // Successful Login
      const rememberMe = rememberCheckbox ? rememberCheckbox.checked : false;
      setCurrentUser(existingUser, rememberMe);

      uiState.setLoading('login-submit-btn', false, 'Sign In');
      uiState.showAlert({ type: 'success', text: 'Welcome back! Logging in...' });

      setTimeout(() => {
        uiState.closeModal();
      }, 1000);
    }, 1200);
  });
}