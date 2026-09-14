import type { ValidationResult } from '../types/auth/auth.types.js';

export function validatePassword(password: string): ValidationResult {
  if (!password) {
    return { isValid: false, message: 'Password is required.' };
  }

  if (password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters long.' };
  }

  const hasNumber = /\d/.test(password);
  if (!hasNumber) {
    return { isValid: false, message: 'Must contain at least one number (0-9).' };
  }

  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/;
  if (!hasSpecialChar.test(password)) {
    return { isValid: false, message: 'Must contain at least one special character (e.g. !@#$).' };
  }

  return { isValid: true };
}

export function validateConfirmPassword(password: string, confirmPassword: string): ValidationResult {
  if (!confirmPassword) {
    return { isValid: false, message: 'Confirm password is required.' };
  }

  if (password !== confirmPassword) {
    return { isValid: false, message: 'Passwords do not match.' };
  }

  return { isValid: true };
}