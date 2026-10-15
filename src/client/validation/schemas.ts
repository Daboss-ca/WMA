import { z } from 'zod';

const phoneSchema = z.string().trim().min(10, 'Enter a valid contact number.').max(30, 'Contact number cannot exceed 30 characters.')
  .refine((value) => /^[+\d][\d\s().-]{7,29}$/.test(value), 'Enter a valid contact number.');

export const checkoutSchema = z.object({
  shipping_address: z.string().trim().min(8, 'Enter your full delivery address.').max(500, 'Address is too long.'),
  contact_number: phoneSchema,
  payment_method: z.enum(['gcash', 'cod'], { error: 'Choose a valid payment method.' }),
  selected_items: z.array(z.string().trim().min(1)).min(1, 'Select at least one item.'),
});

export const signupSchema = z.object({
  username: z.string().trim().min(2, 'Username must contain at least 2 characters.').max(50, 'Username cannot exceed 50 characters.'),
  email: z.string().trim().email('Enter a valid email address.'),
  phone: phoneSchema,
  password: z.string().min(8, 'Password must contain at least 8 characters.').regex(/\d/, 'Password must contain at least one number.').regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character.'),
  confirmPassword: z.string(),
}).refine((value) => value.password === value.confirmPassword, {
  path: ['confirmPassword'], message: 'Passwords do not match.',
});

export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required.').max(254),
  password: z.string().min(1, 'Password is required.').max(256),
});

const imageSchema = z.string().trim().refine((value) => {
  if (!value || value.startsWith('data:image/')) return true;
  try {
    const url = new URL(value);
    return (url.protocol === 'https:' || url.protocol === 'http:') && Boolean(url.hostname);
  } catch { return false; }
}, 'Use an http(s) image URL or upload an image.');
export const productSchema = z.object({
  title: z.string().trim().min(3, 'Product name must contain at least 3 characters.').max(120, 'Product name cannot exceed 120 characters.'),
  description: z.string().trim().min(10, 'Description must contain at least 10 characters.').max(600, 'Description cannot exceed 600 characters.'),
  category: z.enum(['Kiosk', 'Table', 'Cabinet', 'Custom'], { error: 'Choose an item type.' }),
  price: z.number({ error: 'Enter a valid price.' }).finite().positive('Product price must be greater than zero.'),
  dimensions: z.object({ width: z.number().positive(), height: z.number().positive(), depth: z.number().positive(), unit: z.enum(['cm', 'in']) }),
  imageUrl: imageSchema,
});

export function firstValidationMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Please check the information and try again.';
}
