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
          <div><dt>Member since</dt><dd>${escapeHtml(createdDate)}</dd></div>
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