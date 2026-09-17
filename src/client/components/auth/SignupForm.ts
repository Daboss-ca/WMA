import { validateEmail } from '../../validation/emailValidator.js';
import { validatePassword, validateConfirmPassword } from '../../validation/passwordValidator.js';
import { findUserByEmail, saveUser, setCurrentUser } from '../../state/sessionManager.js';
import { uiState } from '../../state/uiStateManager.js';

export function renderSignupForm(): string {
  return `
    <form id="signup-form" novalidate>
      <div class="form-group form-group--floating">
        <input type="text" id="signup-fullname" placeholder=" " required>
        <label for="signup-fullname">Full Name</label>
        <span class="field-error" id="signup-fullname-error"></span>
      </div>

      <div class="form-group form-group--floating">
        <input type="email" id="signup-email" placeholder=" " required>
        <label for="signup-email">Email Address</label>
        <span class="field-error" id="signup-email-error"></span>
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
  const nameInput = document.getElementById('signup-fullname') as HTMLInputElement | null;
  const emailInput = document.getElementById('signup-email') as HTMLInputElement | null;
  const passInput = document.getElementById('signup-password') as HTMLInputElement | null;
  const confirmPassInput = document.getElementById('signup-confirm-password') as HTMLInputElement | null;
  const termsCheckbox = document.getElementById('signup-terms') as HTMLInputElement | null;

  if (!form || !nameInput || !emailInput || !passInput || !confirmPassInput) return;

  // Real-time Confirm Password check
  confirmPassInput.addEventListener('input', () => {
    const errorSpan = document.getElementById('signup-confirm-password-error');
    const result = validateConfirmPassword(passInput.value, confirmPassInput.value);
    if (errorSpan) errorSpan.textContent = result.isValid ? '' : (result.message || '');
  });

  // Form Submit Handler
  form.addEventListener('submit', (e: Event) => {
    e.preventDefault();
    uiState.clearAlert();

    const fullName = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passInput.value;
    const confirmPassword = confirmPassInput.value;

    if (!fullName) {
      uiState.showAlert({ type: 'error', text: 'Full Name is required.' });
      return;
    }

    const emailCheck = validateEmail(email);
    if (!emailCheck.isValid) {
      uiState.showAlert({ type: 'error', text: emailCheck.message || 'Invalid email.' });
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

    setTimeout(() => {
      // Check kung may katulad na email na sa database
      if (findUserByEmail(email)) {
        uiState.setLoading('signup-submit-btn', false, 'Create Account');
        uiState.showAlert({ type: 'error', text: 'This email is already registered.' });
        return;
      }

      // Save new user
      const newUser = {
        id: `user_${Date.now()}`,
        fullName,
        email,
        password,
        createdAt: new Date().toISOString()
      };

      saveUser(newUser);

      // Auto login user pagkatapos mag signup
      setCurrentUser(newUser, true);

      uiState.setLoading('signup-submit-btn', false, 'Create Account');
      uiState.showAlert({ type: 'success', text: 'Account created! Logging in...' });

      setTimeout(() => {
        uiState.closeModal();
      }, 1000);
    }, 1200);
  });
}