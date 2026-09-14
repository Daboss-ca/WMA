import type { FormMode } from './form.types.js';

// Base User Data Structure
export interface User {
  id: string;
  fullName: string;
  email: string;
  password?: string; // Optional kapag ie-exclude ang password sa session state
  createdAt: string;
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