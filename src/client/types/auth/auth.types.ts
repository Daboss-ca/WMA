import type { FormMode } from './form.types.js';

// Base User Data Structure
export interface User {
  id: string;
  email: string;
  fullName?: string;  // Nilagyan ng '?' para hindi mag-error kung wala
  username?: string;  // Idinagdag ang username
  phone?: string;     // Idinagdag ang phone
  password?: string;  // Optional na rin dahil backend na ang nagha-handle nito
  createdAt?: string;
  // (Hayaan mo lang kung may iba ka pang properties dito)
}

// Credentials para sa Login Form
export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe: boolean;
}

// Credentials para sa Signup Form
export interface SignupCredentials {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
}

// Result Object para sa Real-time Validation Checks
export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

// Global Auth State Structure
export interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  isModalOpen: boolean;
  activeMode: FormMode;
}