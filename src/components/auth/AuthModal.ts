import { renderLoginForm, attachLoginFormEvents } from './LoginForm.js';
import { renderSignupForm, attachSignupFormEvents } from './SignupForm.js';
import { uiState } from '../../state/uiStateManager.js';

export function createAuthModal(): HTMLElement {
  const modalContainer = document.createElement('div');
  modalContainer.id = 'auth-modal';
  modalContainer.className = 'auth-modal-backdrop';
  modalContainer.setAttribute('aria-hidden', 'true');

  modalContainer.innerHTML = `
    <div class="auth-modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <button type="button" class="modal-close-btn" id="modal-close-btn" aria-label="Close modal">&times;</button>
      
      <!-- Top Alert Badge Container -->
      <div id="auth-alert" class="status-badge" style="display: none;"></div>

      <!-- Tab Navigation Switcher -->
      <div class="auth-tabs">
        <button type="button" class="tab-btn active" id="tab-login-btn">Sign In</button>
        <button type="button" class="tab-btn" id="tab-signup-btn">Create Account</button>
        <span class="tab-indicator" aria-hidden="true"></span>
      </div>

      <!-- Forms Wrapper -->
      <div class="auth-forms-content">
        <div id="login-form-container">
          ${renderLoginForm()}
        </div>
        <div id="signup-form-container" class="hidden">
          ${renderSignupForm()}
        </div>
      </div>
    </div>
  `;

  return modalContainer;
}

export function attachAuthModalEvents(modalElement: HTMLElement): void {
  // Attach sub-form submit at input events
  attachLoginFormEvents();
  attachSignupFormEvents();

  // Close Button Click Event
  const closeBtn = modalElement.querySelector('#modal-close-btn');
  closeBtn?.addEventListener('click', () => uiState.closeModal());

  // Backdrop Click Event (Isasara ang modal kapag clinick ang labas)
  modalElement.addEventListener('click', (e: MouseEvent) => {
    if (e.target === modalElement) {
      uiState.closeModal();
    }
  });

  // Tab Button Click Events
  const loginTabBtn = modalElement.querySelector('#tab-login-btn');
  const signupTabBtn = modalElement.querySelector('#tab-signup-btn');

  loginTabBtn?.addEventListener('click', () => uiState.switchTab('login'));
  signupTabBtn?.addEventListener('click', () => uiState.switchTab('signup'));
}