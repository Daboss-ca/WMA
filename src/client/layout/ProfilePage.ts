import { getCurrentUser } from '../state/sessionManager.js';
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

function renderUserDetails(user: User): string {
  const initials = user.fullName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const createdDate = new Date(user.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
    <div class="profile-page__identity">
      <div class="profile-page__avatar" aria-hidden="true">${escapeHtml(initials)}</div>
      <div>
        <p class="profile-page__eyebrow">Your WMA account</p>
        <h1 class="profile-page__title">${escapeHtml(user.fullName)}</h1>
        <p class="profile-page__email">${escapeHtml(user.email)}</p>
      </div>
    </div>
    <div class="profile-page__grid">
      <section class="profile-page__panel">
        <p class="profile-page__eyebrow">Profile details</p>
        <dl class="profile-page__details">
          <div><dt>Name</dt><dd>${escapeHtml(user.fullName)}</dd></div>
          <div><dt>Email</dt><dd>${escapeHtml(user.email)}</dd></div>
          <div><dt>Member since</dt><dd>${createdDate}</dd></div>
        </dl>
      </section>
      <section class="profile-page__panel">
        <p class="profile-page__eyebrow">Saved activity</p>
        <h2>Quotes and inquiries</h2>
        <p class="profile-page__muted">Your saved quotes and inquiries will appear here as you work with WMA Wood Craft.</p>
      </section>
    </div>
  `;
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
    if (content && user) content.innerHTML = renderUserDetails(user);
  };

  document.addEventListener('wma:open-profile', render);
  return page;
}