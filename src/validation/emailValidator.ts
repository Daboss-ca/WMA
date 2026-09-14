import type { ValidationResult } from '../types/auth/auth.types';

export function validateEmail(email: string): ValidationResult {
  const trimmedEmail = email.trim();

  if (!trimmedEmail) {
    return { isValid: false, message: 'Email address is required.' };
  }

  // Regex check for a valid email format (contains @ and a valid domain)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(trimmedEmail)) {
    return { isValid: false, message: 'Please enter a valid email address.' };
  }

  return { isValid: true };
}