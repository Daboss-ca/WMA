import type { User } from '../types/auth/auth.types.js';

const USERS_KEY = 'wma_registered_users';
const ACTIVE_USER_KEY = 'wma_active_user';
const ADMIN_AUTH_KEY = 'wma-admin-auth';
export const SESSION_CHANGED_EVENT = 'wma:session-changed';
export const AUTH_CHANGED_EVENT = 'wma:auth-changed';
export const LOGOUT_EVENT = 'wma:logout';

export const ADMIN_USERNAME = 'wma';
export const ADMIN_PASSWORD = 'wma';

export function isAdminSession(): boolean {
  return localStorage.getItem(ADMIN_AUTH_KEY) === 'true';
}

export function setAdminSession(): User {
  const adminUser: User = {
    id: 'admin-wma',
    fullName: 'WMA Administrator',
    username: ADMIN_USERNAME,
    email: ADMIN_USERNAME,
    phone: 'N/A',
    shippingAddress: 'N/A',
    createdAt: new Date().toISOString(),
  };

  localStorage.setItem(ADMIN_AUTH_KEY, 'true');
  localStorage.removeItem(ACTIVE_USER_KEY);
  sessionStorage.removeItem(ACTIVE_USER_KEY);
  localStorage.setItem('wma_last_active_cart_user', adminUser.id);
  sessionStorage.setItem('wma_last_active_cart_user', adminUser.id);

  localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(adminUser));
  emitAuthChanged(adminUser, 'login');
  return adminUser;
}

export function clearAdminSession(): void {
  localStorage.removeItem(ADMIN_AUTH_KEY);
  sessionStorage.removeItem(ADMIN_AUTH_KEY);
  clearSession();
}

function notifySessionChanged(): void {
  document.dispatchEvent(new CustomEvent(SESSION_CHANGED_EVENT));
}

function emitAuthChanged(nextUser: User | null, reason: 'login' | 'logout' = 'login'): void {
  document.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT, {
    detail: {
      user: nextUser,
      userId: nextUser?.id ?? null,
      reason,
      timestamp: Date.now(),
    },
  }));

  if (reason === 'logout') {
    document.dispatchEvent(new CustomEvent(LOGOUT_EVENT, {
      detail: {
        user: null,
        userId: null,
        reason: 'logout',
        timestamp: Date.now(),
      },
    }));
  }

  notifySessionChanged();
}

// --- MOCK DATABASE (Users Collection) ---

// Kunin ang lahat ng registered users mula sa localStorage
export function getRegisteredUsers(): User[] {
  const usersJson = localStorage.getItem(USERS_KEY);
  return usersJson ? JSON.parse(usersJson) : [];
}

// Mag-save ng bagong user sa listahan
export function saveUser(newUser: User): void {
  const users = getRegisteredUsers();
  users.push(newUser);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

// I-check kung may umiiral nang user gamit ang email
export function findUserByEmail(email: string): User | undefined {
  const users = getRegisteredUsers();
  return users.find(u => u.email.toLowerCase() === email.toLowerCase());
}

// --- SESSION MANAGEMENT (Active Logged-in User) ---

// Kunin ang kasalukuyang logged-in user (pwedeng sa localStorage o sessionStorage)
export function getCurrentUser(): User | null {
  const localUser = localStorage.getItem(ACTIVE_USER_KEY);
  if (localUser) return JSON.parse(localUser);

  const sessionUser = sessionStorage.getItem(ACTIVE_USER_KEY);
  if (sessionUser) return JSON.parse(sessionUser);

  return null;
}

// I-set ang active session (Remember Me = localStorage, else = sessionStorage)
export function setCurrentUser(user: User, rememberMe: boolean): void {
  localStorage.removeItem(ACTIVE_USER_KEY);
  sessionStorage.removeItem(ACTIVE_USER_KEY);

  const sessionUser: User = {
    id: user.id,
    fullName: user.fullName,
    username: user.username,
    email: user.email,
    phone: user.phone,
    shippingAddress: user.shippingAddress,
    createdAt: user.createdAt,
  };

  localStorage.setItem('wma_last_active_cart_user', sessionUser.id);
  sessionStorage.setItem('wma_last_active_cart_user', sessionUser.id);

  if (rememberMe) {
    localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(sessionUser));
  } else {
    sessionStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(sessionUser));
  }

  emitAuthChanged(sessionUser, 'login');
}

export function updateCurrentUserProfile(updates: Partial<User>): User | null {
  const currentUser = getCurrentUser();
  if (!currentUser) return null;

  const nextUser: User = {
    ...currentUser,
    ...updates,
    id: currentUser.id,
    email: updates.email ?? currentUser.email,
    fullName: updates.fullName ?? currentUser.fullName,
    username: updates.username ?? currentUser.username,
    phone: updates.phone ?? currentUser.phone,
    shippingAddress: updates.shippingAddress ?? currentUser.shippingAddress,
    createdAt: currentUser.createdAt,
  };

  localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(nextUser));
  sessionStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(nextUser));
  emitAuthChanged(nextUser, 'login');
  return nextUser;
}

// Mag-logout (linisin ang active session)
export function clearSession(): void {
  localStorage.removeItem(ADMIN_AUTH_KEY);
  sessionStorage.removeItem(ADMIN_AUTH_KEY);
  localStorage.removeItem(ACTIVE_USER_KEY);
  sessionStorage.removeItem(ACTIVE_USER_KEY);

  document.dispatchEvent(new CustomEvent('wma:session-cleared'));
  emitAuthChanged(null, 'logout');
}

// Helper function para malaman kung naka-log in ang bisita
export function isAuthenticated(): boolean {
  return getCurrentUser() !== null;
}