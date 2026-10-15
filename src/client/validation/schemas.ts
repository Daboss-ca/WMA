import { z } from 'zod';

const phoneSchema = z.string().trim().min(10, 'Enter a valid contact number.').max(30, 'Contact number is too long.')
  .refine((value) => /^[+\d][\d\s().-]{7,29}$/.test(value), 'Enter a valid contact number.');

export const checkoutSchema = z.object({
  shipping_address: z.string().trim().min(8, 'Enter your full delivery address.').max(500, 'Address is too long.'),
  contact_number: phoneSchema,
  payment_method: z.enum(['gcash', 'cod'], { error: 'Choose a valid payment method.' }),
  selected_items: z.array(z.string().trim().min(1)).min(1, 'Select at least one item.'),
});

export const signupSchema = z.object({
  username: z.string().trim().min(2, 'Username must be at least 2 characters.').max(50),
  email: z.string().trim().email('Enter a valid email address.'),
  phone: phoneSchema,
  password: z.string().min(8, 'Password must be at least 8 characters.').regex(/\d/, 'Password must contain a number.').regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain a special character.'),
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
  title: z.string().trim().min(3, 'Title needs at least 3 characters.').max(120),
  description: z.string().trim().min(10, 'Add a short description (10+ characters).').max(600),
  category: z.enum(['Kiosk', 'Table', 'Cabinet', 'Custom'], { error: 'Choose an item type.' }),
  price: z.number({ error: 'Enter a valid price.' }).finite().positive('Enter a price greater than 0.'),
  dimensions: z.object({ width: z.number().positive(), height: z.number().positive(), depth: z.number().positive(), unit: z.enum(['cm', 'in']) }),
  imageUrl: imageSchema,
});

export function firstValidationMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Please check the information and try again.';
}
