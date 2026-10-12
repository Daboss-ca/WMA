import type { User } from '../types/auth/auth.types.js';

const USERS_KEY = 'wma_registered_users';
const ACTIVE_USER_KEY = 'wma_active_user';
const CART_CACHE_KEYS = ['wma_cart_items'];
export const SESSION_CHANGED_EVENT = 'wma:session-changed';
export const AUTH_CHANGED_EVENT = 'wma:auth-changed';
export const LOGOUT_EVENT = 'wma:logout';

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

function clearCachedCartState(): void {
  for (const key of CART_CACHE_KEYS) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
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
  clearCachedCartState();

  // Tanggalin ang password bago i-save sa session para sa security
  const sessionUser: User = {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    createdAt: user.createdAt
  };

  if (rememberMe) {
    localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(sessionUser));
  } else {
    sessionStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(sessionUser));
  }

  emitAuthChanged(sessionUser, 'login');
}

// Mag-logout (linisin ang active session)
export function clearSession(): void {
  localStorage.removeItem(ACTIVE_USER_KEY);
  sessionStorage.removeItem(ACTIVE_USER_KEY);
  clearCachedCartState();
  document.dispatchEvent(new CustomEvent('wma:session-cleared'));
  emitAuthChanged(null, 'logout');
}

// Helper function para malaman kung naka-log in ang bisita
export function isAuthenticated(): boolean {
  return getCurrentUser() !== null;
}