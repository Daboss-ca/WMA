import type { FormMode, AlertMessage } from '../types/auth/form.types.js';

class UIStateManager {
  private activeMode: FormMode = 'login';

  // Modal Open/Close Controls
  public openModal(initialMode: FormMode = 'login'): void {
    this.activeMode = initialMode;
    const modalElement = document.getElementById('auth-modal');
    if (modalElement) {
      modalElement.classList.add('open');
      modalElement.setAttribute('aria-hidden', 'false');
    }
    this.switchTab(initialMode);
  }

  public closeModal(): void {
    const modalElement = document.getElementById('auth-modal');
    if (modalElement) {
      modalElement.classList.remove('open');
      modalElement.setAttribute('aria-hidden', 'true');
    }
    this.clearAlert();
  }

  public openInquiryModal(category?: string): void {
    document.dispatchEvent(
      new CustomEvent('wma:open-inquiry-modal', {
        detail: { category },
      })
    );
  }

  public closeInquiryModal(): void {
    document.dispatchEvent(new CustomEvent('wma:close-inquiry-modal'));
  }

  // Tab Switcher Logic ('login' <-> 'signup')
  public switchTab(mode: FormMode): void {
    this.activeMode = mode;
    this.clearAlert();

    const loginTabBtn = document.getElementById('tab-login-btn');
    const signupTabBtn = document.getElementById('tab-signup-btn');
    const loginFormContainer = document.getElementById('login-form-container');
    const signupFormContainer = document.getElementById('signup-form-container');

    if (mode === 'login') {
      loginTabBtn?.classList.add('active');
      signupTabBtn?.classList.remove('active');
      loginFormContainer?.classList.remove('hidden');
      signupFormContainer?.classList.add('hidden');
    } else {
      signupTabBtn?.classList.add('active');
      loginTabBtn?.classList.remove('active');
      signupFormContainer?.classList.remove('hidden');
      loginFormContainer?.classList.add('hidden');
    }
  }

  // Alert Badge Manager (Top Status Messages)
  public showAlert(message: AlertMessage): void {
    const alertBox = document.getElementById('auth-alert');
    if (alertBox) {
      alertBox.textContent = message.text;
      alertBox.className = `status-badge ${message.type}`;
      alertBox.style.display = 'block';
    }
  }

  public clearAlert(): void {
    const alertBox = document.getElementById('auth-alert');
    if (alertBox) {
      alertBox.textContent = '';
      alertBox.className = 'status-badge';
      alertBox.style.display = 'none';
    }
  }

  // Submit Button Loading & Disabled State Manager
  public setLoading(buttonId: string, isLoading: boolean, defaultText: string): void {
    const button = document.getElementById(buttonId) as HTMLButtonElement | null;
    if (!button) return;

    if (isLoading) {
      button.disabled = true;
      button.classList.add('loading');
      button.innerHTML = `<span class="spinner"></span> Please Wait...`;
    } else {
      button.disabled = false;
      button.classList.remove('loading');
      button.textContent = defaultText;
    }
  }

  public getActiveMode(): FormMode {
    return this.activeMode;
  }
}

export const uiState = new UIStateManager();