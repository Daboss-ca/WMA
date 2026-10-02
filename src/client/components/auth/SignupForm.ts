import { validateEmail } from '../../validation/emailValidator.js';
import { validatePassword, validateConfirmPassword } from '../../validation/passwordValidator.js';
import { setCurrentUser } from '../../state/sessionManager.js';
import { uiState } from '../../state/uiStateManager.js';

export function renderSignupForm(): string {
  return `
    <form id="signup-form" novalidate>
      <div class="form-group form-group--floating">
        <input type="text" id="signup-username" placeholder=" " required>
        <label for="signup-username">Username</label>
        <span class="field-error" id="signup-username-error"></span>
      </div>

      <div class="form-group form-group--floating">
        <input type="email" id="signup-email" placeholder=" " required>
        <label for="signup-email">Email Address</label>
        <span class="field-error" id="signup-email-error"></span>
      </div>

      <div class="form-group form-group--floating">
        <input type="tel" id="signup-phone" placeholder=" " required>
        <label for="signup-phone">Phone Number (+63...)</label>
        <span class="field-error" id="signup-phone-error"></span>
      </div>

      <div class="form-group form-group--floating">
        <input type="password" id="signup-password" placeholder=" " required>
        <label for="signup-password">Password</label>
        <span class="field-error" id="signup-password-error"></span>
      </div>

      <div class="form-group form-group--floating">
        <input type="password" id="signup-confirm-password" placeholder=" " required>
        <label for="signup-confirm-password">Confirm Password</label>
        <span class="field-error" id="signup-confirm-password-error"></span>
      </div>

      <div class="form-actions-row">
        <label class="checkbox-label">
          <input type="checkbox" id="signup-terms" required>
          <span class="checkbox-box" aria-hidden="true"></span>
          <span class="checkbox-text">I agree to the Terms & Privacy</span>
        </label>
      </div>

      <button type="submit" id="signup-submit-btn" class="btn btn--primary btn-full">Create Account</button>
    </form>
  `;
}

export function attachSignupFormEvents(): void {
  const form = document.getElementById('signup-form') as HTMLFormElement | null;
  const usernameInput = document.getElementById('signup-username') as HTMLInputElement | null;
  const emailInput = document.getElementById('signup-email') as HTMLInputElement | null;
  const phoneInput = document.getElementById('signup-phone') as HTMLInputElement | null;
  const passInput = document.getElementById('signup-password') as HTMLInputElement | null;
  const confirmPassInput = document.getElementById('signup-confirm-password') as HTMLInputElement | null;
  const termsCheckbox = document.getElementById('signup-terms') as HTMLInputElement | null;

  if (!form || !usernameInput || !emailInput || !phoneInput || !passInput || !confirmPassInput) return;

  // Real-time Confirm Password check
  confirmPassInput.addEventListener('input', () => {
    const errorSpan = document.getElementById('signup-confirm-password-error');
    const result = validateConfirmPassword(passInput.value, confirmPassInput.value);
    if (errorSpan) errorSpan.textContent = result.isValid ? '' : (result.message || '');
  });

  // Form Submit Handler
  form.addEventListener('submit', async (e: Event) => {
    e.preventDefault();
    uiState.clearAlert();

    const username = usernameInput.value.trim();
    const email = emailInput.value.trim();
    const phone = phoneInput.value.trim();
    const password = passInput.value;
    const confirmPassword = confirmPassInput.value;

    if (!username || !phone) {
      uiState.showAlert({ type: 'error', text: 'Username and Phone Number are required.' });
      return;
    }

    const emailCheck = validateEmail(email);
    if (!emailCheck.isValid) {
      uiState.showAlert({ type: 'error', text: emailCheck.message || 'Invalid email format.' });
      return;
    }

    const passCheck = validatePassword(password);
    if (!passCheck.isValid) {
      uiState.showAlert({ type: 'error', text: passCheck.message || 'Invalid password.' });
      return;
    }

    const confirmCheck = validateConfirmPassword(password, confirmPassword);
    if (!confirmCheck.isValid) {
      uiState.showAlert({ type: 'error', text: confirmCheck.message || 'Passwords do not match.' });
      return;
    }

    if (termsCheckbox && !termsCheckbox.checked) {
      uiState.showAlert({ type: 'error', text: 'You must agree to the Terms & Privacy.' });
      return;
    }

    // Set Loading Spinner State
    uiState.setLoading('signup-submit-btn', true, 'Create Account');

    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, phone, password, confirmPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        uiState.setLoading('signup-submit-btn', false, 'Create Account');
        uiState.showAlert({ type: 'error', text: data.error || 'Registration failed.' });
        return;
      }

      // Auto login user after successful signup
      setCurrentUser(data.user, true);

      uiState.setLoading('signup-submit-btn', false, 'Create Account');
      uiState.showAlert({ type: 'success', text: 'Account created! Logging in...' });

      setTimeout(() => {
        uiState.closeModal();
      }, 1000);
      
    } catch (error) {
      uiState.setLoading('signup-submit-btn', false, 'Create Account');
      uiState.showAlert({ type: 'error', text: 'Network error. Please try again later.' });
    }
  });
}