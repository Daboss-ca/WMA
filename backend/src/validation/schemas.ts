import { z } from 'zod';

const phone = z.string().trim().min(10, 'Enter a valid contact number.').max(30, 'Contact number cannot exceed 30 characters.')
  .regex(/^[+\d][\d\s().-]{7,29}$/, 'Enter a valid contact number.');

export const checkoutSchema = z.object({
  user_id: z.string().trim().min(1, 'Sign in before checkout.'),
  shipping_address: z.string().trim().min(8, 'Enter your full delivery address.').max(500, 'Address is too long.'),
  contact_number: phone,
  payment_method: z.enum(['gcash', 'cod'], { error: 'Choose a valid payment method.' }),
  selected_items: z.array(z.union([z.string(), z.number()]).transform(String).pipe(z.string().trim().min(1))).min(1, 'Select at least one item.'),
});

export const registerSchema = z.object({
  username: z.string().trim().min(2, 'Username must contain at least 2 characters.').max(50, 'Username cannot exceed 50 characters.'),
  email: z.string().trim().email('Enter a valid email address.'),
  phone,
  password: z.string().min(8, 'Password must contain at least 8 characters.').regex(/\d/, 'Password must contain at least one number.').regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character.'),
  confirmPassword: z.string(),
}).refine((value) => value.password === value.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match.' });

export const loginSchema = z.object({ username: z.string().trim().min(1, 'Username is required.').max(254), password: z.string().min(1, 'Password is required.').max(256) });

const image = z.string().trim().refine((value) => {
  if (!value || value.startsWith('data:image/')) return true;
  try {
    const url = new URL(value);
    return (url.protocol === 'https:' || url.protocol === 'http:') && Boolean(url.hostname);
  } catch { return false; }
}, 'Use an http(s) image URL or upload an image.');
const productFields = {
  title: z.string().trim().min(3, 'Product name must contain at least 3 characters.').max(120, 'Product name cannot exceed 120 characters.'),
  category: z.string().trim().toLowerCase().pipe(z.enum(['kiosk', 'table', 'cabinet', 'custom'], { error: 'Select a valid product category.' })).transform((value) => value[0].toUpperCase() + value.slice(1)),
  price: z.coerce.number({ error: 'Enter a valid price.' }).finite().positive('Product price must be greater than zero.'),
  image_url: image,
  imageUrl: image.optional(),
  description: z.string().trim().max(600, 'Description cannot exceed 600 characters.').optional(),
  dimensions: z.unknown().optional(),
  stock: z.coerce.number().int().nonnegative().optional(),
};
export const productSchema = z.object(productFields).passthrough();

export const cartSyncSchema = z.object({
  userId: z.string().trim().min(1, 'Sign in to sync your cart.'),
  productId: z.string().trim().min(1, 'Cart item is missing a product ID.').max(100, 'Product ID is too long.'),
  name: z.string().trim().min(1, 'Product name is required.').max(120, 'Product name cannot exceed 120 characters.').optional(),
  category: z.string().trim().min(1, 'Product category is required.').max(40, 'Product category cannot exceed 40 characters.').optional(),
  dimensions: z.string().trim().min(1, 'Product dimensions are required.').max(100, 'Product dimensions cannot exceed 100 characters.').optional(),
  unitPrice: z.coerce.number().finite().nonnegative('Price cannot be negative.').max(99_999_999.99, 'Price exceeds the maximum allowed amount.'),
  imageUrl: image.optional(),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1.').max(20, 'Quantity cannot exceed 20.'),
});

export function firstValidationMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Please check the information and try again.';
}
