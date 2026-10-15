import { validateConfirmPassword } from '../../validation/passwordValidator.js';
import { setCurrentUser } from '../../state/sessionManager.js';
import { uiState } from '../../state/uiStateManager.js';
import { buildApiUrl } from '../../config/api.js';
import { firstValidationMessage, signupSchema } from '../../validation/schemas.js';

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

    const parsed = signupSchema.safeParse({ username, email, phone, password, confirmPassword });
    if (!parsed.success) {
      const message = firstValidationMessage(parsed.error);
      const field = parsed.error.issues[0]?.path[0];
      const errorId = field === 'email' ? 'signup-email-error'
        : field === 'phone' ? 'signup-phone-error'
          : field === 'confirmPassword' ? 'signup-confirm-password-error'
            : field === 'password' ? 'signup-password-error' : 'signup-username-error';
      const errorNode = document.getElementById(errorId);
      if (errorNode) errorNode.textContent = message;
      uiState.showAlert({ type: 'error', text: message });
      return;
    }

    if (termsCheckbox && !termsCheckbox.checked) {
      uiState.showAlert({ type: 'error', text: 'You must agree to the Terms & Privacy.' });
      return;
    }

    // Set Loading Spinner State
    uiState.setLoading('signup-submit-btn', true, 'Create Account');

    try {
      const response = await fetch(buildApiUrl('/auth/register'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, phone, password, confirmPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        uiState.setLoading('signup-submit-btn', false, 'Create Account');
        uiState.showAlert({ type: 'error', text: data.error || 'We could not complete registration. Please try again.' });
        return;
      }

      // ----------------------------------------------------
      // UPDATED LOGIC FOR HANDLING EMAIL VERIFICATION REQUIREMENT
      // ----------------------------------------------------
      if (data.needsVerification) {
        uiState.setLoading('signup-submit-btn', false, 'Create Account');
        // Show success alert instructing them to check their email
      uiState.showAlert({ type: 'success', text: 'Your account has been created. Check your email to verify it.' });
        
        // Optionally switch to the login tab so they can log in after verifying
        setTimeout(() => {
          uiState.openModal('login');
          // Clear form fields
          form.reset();
        }, 3000); // 3 seconds delay before switching tabs
        
      } else {
        // If email confirmation is off, proceed to auto-login
        setCurrentUser(data.user, true);
        uiState.setLoading('signup-submit-btn', false, 'Create Account');
        uiState.showAlert({ type: 'success', text: 'Your account has been created. Signing you in...' });

        setTimeout(() => {
          uiState.closeModal();
        }, 1000);
      }
      
    } catch (error) {
      uiState.setLoading('signup-submit-btn', false, 'Create Account');
      uiState.showAlert({ type: 'error', text: 'We could not reach the server. Check your connection and try again.' });
    }
  });
}
