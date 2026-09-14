import type { User } from '../types/auth/auth.types.js';

const USERS_KEY = 'wma_registered_users';
const ACTIVE_USER_KEY = 'wma_active_user';

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
  // Siguraduhing malinis muna ang parehong storage
  clearSession();

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
}

// Mag-logout (linisin ang active session)
export function clearSession(): void {
  localStorage.removeItem(ACTIVE_USER_KEY);
  sessionStorage.removeItem(ACTIVE_USER_KEY);
}

// Helper function para malaman kung naka-log in ang bisita
export function isAuthenticated(): boolean {
  return getCurrentUser() !== null;
}