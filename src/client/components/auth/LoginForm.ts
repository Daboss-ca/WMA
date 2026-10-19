import { ADMIN_PASSWORD, ADMIN_USERNAME, setAdminSession, setCurrentUser } from '../../state/sessionManager.js';
import { uiState } from '../../state/uiStateManager.js';
import { buildApiUrl } from '../../config/api.js';
import { firstValidationMessage, loginSchema } from '../../validation/schemas.js';

const LOGIN_TIMEOUT_MS = 15_000;

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

    const parsed = loginSchema.safeParse({ username: usernameVal, password: passVal });
    if (!parsed.success) {
      uiState.showAlert({ type: 'error', text: firstValidationMessage(parsed.error) });
      return;
    }

    const normalizedUsername = usernameVal.toLowerCase();
    const isAdminCredentials = (normalizedUsername === ADMIN_USERNAME || normalizedUsername === 'wma@example.com') && passVal === ADMIN_PASSWORD;

    // Set Loading state (spinner)
    uiState.setLoading('login-submit-btn', true, 'Sign In');

    let loginController: AbortController | null = null;
    let loginTimeoutId: number | undefined;

    try {
      if (isAdminCredentials) {
        setAdminSession();

        uiState.showAlert({ type: 'success', text: 'Administrator sign-in successful. Redirecting...' });

        window.location.hash = '#/admin/overview';

        setTimeout(() => {
          uiState.closeModal();
        }, 250);
        return;
      }

      if (!navigator.onLine) {
        uiState.showAlert({
          type: 'error',
          text: 'No internet connection. Please check your network and try again.',
        });
        return;
      }

      const controller = new AbortController();
      loginController = controller;
      loginTimeoutId = window.setTimeout(() => controller.abort(), LOGIN_TIMEOUT_MS);

      const response = await fetch(buildApiUrl('/auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: usernameVal, password: passVal }),
        signal: controller.signal,
      });

      const data = await response.json();

      if (!response.ok) {
        const errorCode = String(data.code ?? '').toLowerCase();
        const isCredentialFailure = response.status === 401 &&
          ['invalid_credentials', 'invalid_grant', 'invalid_login_credentials', 'incorrect_credentials'].includes(errorCode);
        const serverError = typeof data.error === 'string' ? data.error : '';
        const containsCredentialFailure = /invalid (?:login )?credentials|invalid username or password|incorrect (?:username|password|credentials)/i.test(serverError);
        let message: string;
        if (!navigator.onLine) {
          message = 'No internet connection. Please check your network and try again.';
        } else if (isCredentialFailure) {
          message = serverError || 'Invalid username or password.';
        } else if (serverError && !containsCredentialFailure) {
          message = serverError;
        } else {
          message = 'Sign-in is temporarily unavailable. Please try again.';
        }

        uiState.showAlert({ type: 'error', text: message });
        return;
      }

      // Successful Login
      const rememberMe = rememberCheckbox ? rememberCheckbox.checked : false;
      setCurrentUser(data.user, rememberMe);

      uiState.showAlert({ type: 'success', text: 'Welcome back. Signing you in...' });

      setTimeout(() => {
        uiState.closeModal();
      }, 1000);
      
    } catch (error) {
      const wasAborted = loginController?.signal.aborted || (error instanceof Error && error.name === 'AbortError');
      let message: string;
      if (!navigator.onLine) {
        message = 'No internet connection. Please check your network and try again.';
      } else if (wasAborted) {
        message = 'Connection timed out. Please check your internet connection and try again.';
      } else if (error instanceof TypeError) {
        message = 'Connection problem. Please check your internet connection and try again.';
      } else {
        message = 'We could not complete sign in because of a server issue. Please try again.';
      }

      uiState.showAlert({ type: 'error', text: message });
    } finally {
      if (loginTimeoutId !== undefined) window.clearTimeout(loginTimeoutId);
      uiState.setLoading('login-submit-btn', false, 'Sign In');
    }
  });
}
