import { getCurrentUser } from '../../state/sessionManager.js';
import { uiState } from '../../state/uiStateManager.js';

const INQUIRY_CATEGORIES = ['Kiosk', 'Table', 'Cabinet', 'Custom project'];

export function createInquiryModal(): HTMLElement {
  const modal = document.createElement('div');
  modal.id = 'inquiry-modal';
  modal.className = 'inquiry-modal-backdrop';
  modal.setAttribute('aria-hidden', 'true');
  modal.innerHTML = `
    <div class="inquiry-modal-card" role="dialog" aria-modal="true" aria-labelledby="inquiry-modal-title">
      <button type="button" class="inquiry-modal-close" id="inquiry-modal-close" aria-label="Close inquiry form">&times;</button>
      <div class="inquiry-modal-header">
        <span class="inquiry-modal-eyebrow">Project inquiry</span>
        <h2 id="inquiry-modal-title">Tell us about your build</h2>
        <p>Share a few details and our workshop will follow up with a quote.</p>
      </div>
      <form id="inquiry-form" class="inquiry-form">
        <div class="inquiry-form-grid">
          <label class="inquiry-field">
            <span>Full Name</span>
            <input id="inquiry-name" name="name" type="text" readonly required>
          </label>
          <label class="inquiry-field">
            <span>Email Address</span>
            <input id="inquiry-email" name="email" type="email" readonly required>
          </label>
        </div>
        <label class="inquiry-field">
          <span>Furniture / Project Type</span>
          <select id="inquiry-category" name="category" required>
            ${INQUIRY_CATEGORIES.map((category) => `<option value="${category}">${category}</option>`).join('')}
          </select>
        </label>
        <label class="inquiry-field">
          <span>Project Details / Notes</span>
          <textarea id="inquiry-notes" name="notes" rows="5" placeholder="Dimensions, wood finish, delivery needs, or anything else we should know."></textarea>
        </label>
        <p id="inquiry-status" class="inquiry-status" role="status" aria-live="polite"></p>
        <button type="submit" class="btn btn--primary inquiry-submit">Request Quote</button>
      </form>
    </div>
  `;

  const close = (): void => {
    uiState.closeInquiryModal();
  };
  const closeButton = modal.querySelector<HTMLButtonElement>('#inquiry-modal-close');
  const form = modal.querySelector<HTMLFormElement>('#inquiry-form');
  const categoryInput = modal.querySelector<HTMLSelectElement>('#inquiry-category');
  const nameInput = modal.querySelector<HTMLInputElement>('#inquiry-name');
  const emailInput = modal.querySelector<HTMLInputElement>('#inquiry-email');
  const notesInput = modal.querySelector<HTMLTextAreaElement>('#inquiry-notes');
  const status = modal.querySelector<HTMLParagraphElement>('#inquiry-status');
  const submitButton = form?.querySelector<HTMLButtonElement>('button[type="submit"]');

  closeButton?.addEventListener('click', close);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) close();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('open')) close();
  });

  document.addEventListener('wma:open-inquiry-modal', (event) => {
    const customEvent = event as CustomEvent<{ category?: string }>;
    const user = getCurrentUser();
    if (!user) return;

    const requestedCategory = customEvent.detail?.category;
    const matchedCategory = INQUIRY_CATEGORIES.find(
      (category) => {
        const normalizedCategory = category.toLowerCase();
        const normalizedRequest = requestedCategory?.toLowerCase();
        return normalizedCategory === normalizedRequest || `${normalizedCategory}s` === normalizedRequest;
      }
    );

    if (nameInput) nameInput.value = user.fullName;
    if (emailInput) emailInput.value = user.email;
    if (categoryInput) categoryInput.value = matchedCategory ?? 'Custom project';
    if (notesInput) notesInput.value = '';
    if (status) status.textContent = '';
    submitButton?.removeAttribute('disabled');

    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    window.requestAnimationFrame(() => categoryInput?.focus());
  });

  document.addEventListener('wma:close-inquiry-modal', () => {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  });

  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    const user = getCurrentUser();
    if (!user || !categoryInput || !notesInput || !status) return;

    const payload = {
      name: user.fullName,
      email: user.email,
      category: categoryInput.value,
      notes: notesInput.value.trim(),
      submittedAt: new Date().toISOString(),
    };

    console.info('WMA inquiry submitted', payload);
    status.textContent = `Thanks, ${user.fullName}. Your inquiry has been received.`;
    submitButton?.setAttribute('disabled', 'true');

    window.setTimeout(() => {
      uiState.closeInquiryModal();
    }, 1200);
  });

  return modal;
}
