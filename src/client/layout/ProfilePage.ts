import { getCurrentUser, updateCurrentUserProfile } from '../state/sessionManager.js';
import type { User } from '../types/auth/auth.types.js';
import { uiState } from '../state/uiStateManager.js';

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  })[character] ?? character);
}

function getDisplayName(user: User): string {
  return user.fullName?.trim() || user.username?.trim() || 'User';
}

function getInitials(name: string): string {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return initials || 'U';
}

function formatCreatedAt(user: User): string {
  if (!user.createdAt) return 'Not available';

  const createdDate = new Date(user.createdAt);
  if (Number.isNaN(createdDate.getTime())) return 'Not available';

  return createdDate.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function renderUserDetails(user: User): string {
  const displayName = getDisplayName(user);
  const email = user.email?.trim() || 'No email on file';
  const phone = user.phone?.trim() || 'Not provided';
  const shippingAddress = user.shippingAddress?.trim() || 'Not provided';
  const initials = getInitials(displayName);
  const createdDate = formatCreatedAt(user);

  return `
    <div class="profile-page__identity">
      <div class="profile-page__avatar" aria-hidden="true">${escapeHtml(initials)}</div>
      <div>
        <p class="profile-page__eyebrow">Your WMA account</p>
        <h1 class="profile-page__title">${escapeHtml(displayName)}</h1>
        <p class="profile-page__email">${escapeHtml(email)}</p>
      </div>
    </div>
    <div class="profile-page__grid">
      <section class="profile-page__panel">
        <p class="profile-page__eyebrow">Profile details</p>
        <dl class="profile-page__details">
          <div><dt>Name</dt><dd>${escapeHtml(displayName)}</dd></div>
          <div><dt>Email</dt><dd>${escapeHtml(email)}</dd></div>
          <div><dt>Phone</dt><dd>${escapeHtml(phone)}</dd></div>
          <div><dt>Shipping address</dt><dd>${escapeHtml(shippingAddress)}</dd></div>
          <div><dt>Member since</dt><dd>${escapeHtml(createdDate)}</dd></div>
        </dl>
      </section>
      <section class="profile-page__panel">
        <p class="profile-page__eyebrow">Edit account</p>
        <form id="profile-form" class="profile-page__form">
          <label>
            <span>Full name</span>
            <input name="fullName" type="text" value="${escapeHtml(displayName)}" maxlength="80" />
          </label>
          <label>
            <span>Email</span>
            <input name="email" type="email" value="${escapeHtml(email)}" maxlength="120" />
          </label>
          <label>
            <span>Contact number</span>
            <input name="phone" type="tel" value="${escapeHtml(phone === 'Not provided' ? '' : phone)}" placeholder="e.g. 0917 123 4567" maxlength="30" />
          </label>
          <label>
            <span>Shipping address</span>
            <textarea name="shippingAddress" rows="4" placeholder="Unit / House #, Street, Barangay, City, Province" maxlength="220">${escapeHtml(shippingAddress === 'Not provided' ? '' : shippingAddress)}</textarea>
          </label>

          <div class="profile-page__actions">
            <button type="submit" class="btn btn--primary">Save changes</button>
            <button type="button" class="btn btn--ghost" id="profile-cancel-btn">Cancel</button>
          </div>
          <p class="profile-page__form-status" aria-live="polite"></p>
        </form>
      </section>
    </div>
  `;
}

function bindProfileForm(content: HTMLElement): void {
  const form = content.querySelector<HTMLFormElement>('#profile-form');
  const statusEl = content.querySelector<HTMLElement>('.profile-page__form-status');

  form?.addEventListener('submit', (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const nextUser = updateCurrentUserProfile({
      fullName: String(formData.get('fullName') ?? '').trim(),
      email: String(formData.get('email') ?? '').trim(),
      phone: String(formData.get('phone') ?? '').trim(),
      shippingAddress: String(formData.get('shippingAddress') ?? '').trim(),
    });

    if (!nextUser) {
      if (statusEl) {
        statusEl.textContent = 'You must be signed in to update your profile.';
        statusEl.classList.add('is-error');
      }
      return;
    }

    if (statusEl) {
      statusEl.textContent = 'Profile updated successfully.';
      statusEl.classList.remove('is-error');
    }

    const refreshedUser = getCurrentUser();
    if (refreshedUser) {
      content.innerHTML = renderUserDetails(refreshedUser);
      bindProfileForm(content);
    }
  });

  content.querySelector<HTMLButtonElement>('#profile-cancel-btn')?.addEventListener('click', () => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      content.innerHTML = renderUserDetails(currentUser);
      bindProfileForm(content);
    }
  });
}

export function createProfilePage(): HTMLElement {
  const page = document.createElement('section');
  page.className = 'profile-page';
  page.id = 'profile-page';
  page.hidden = true;
  page.innerHTML = `
    <div class="wrap">
      <button type="button" class="btn btn--ghost profile-page__back" id="profile-back-btn">Back to collection</button>
      <div id="profile-page-content"></div>
    </div>
  `;

  page.querySelector('#profile-back-btn')?.addEventListener('click', () => uiState.closeProfile());

  const render = (): void => {
    const content = page.querySelector<HTMLElement>('#profile-page-content');
    const user = getCurrentUser();
    if (!content) return;

    if (!user) {
      content.innerHTML = '<p class="profile-page__muted">Please sign in to manage your profile.</p>';
      return;
    }

    content.innerHTML = renderUserDetails(user);
    bindProfileForm(content);
  };

  document.addEventListener('wma:open-profile', render);
  return page;
}