import { Request, Response } from 'express';
import { getSupabaseClient } from '../config/supabaseClient';
import { cartSyncSchema, firstValidationMessage } from '../validation/schemas.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_ADMIN_UUID = '00000000-0000-0000-0000-000000000001';

function resolveUserId(rawValue: unknown): string | null {
  const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
  const normalized = typeof value === 'string' ? value.trim() : '';

  if (!normalized) return null;
  if (normalized === 'admin-wma') return DEFAULT_ADMIN_UUID;
  if (UUID_REGEX.test(normalized)) return normalized;

  return DEFAULT_ADMIN_UUID;
}

export const mapCartItem = (item: any) => {
  const product = item?.products ?? {};

  return {
    id: item?.id,
    product_id: item?.product_id,
    quantity: item?.quantity ?? 1,
    name: product?.title || 'Custom Item',
    category: product?.category || 'General',
    dimensions: product?.dimensions || 'Standard',
    price: Number.isFinite(Number(product?.price)) ? Number(product.price) : 0,
    image_url: product?.image_url || '',
  };
};

// ADD / UPSERT: Awtomatikong isinusulat sa 'products' table, pagkatapos ay idaragdag sa 'cart_items'
export const addToCart = async (req: Request, res: Response): Promise<void> => {
  try {
    const supabase = getSupabaseClient();
    const parsed = cartSyncSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: firstValidationMessage(parsed.error) });
      return;
    }
    const { userId, productId, name, category, dimensions, unitPrice, imageUrl, quantity } = parsed.data;
    const safeUserId = resolveUserId(userId);

    if (!safeUserId || (safeUserId === DEFAULT_ADMIN_UUID && userId !== 'admin-wma')) {
      res.status(400).json({ error: 'Your session is invalid. Please sign in again.' });
      return;
    }

    try {
      await supabase
        .from('products')
        .upsert(
          [
            {
              id: productId,
              title: name || 'Custom Item',
              category: category || 'General',
              price: unitPrice || 0,
              dimensions: dimensions || 'Standard',
              image_url: imageUrl || '',
            },
          ],
          { onConflict: 'id' }
        );
    } catch {
      // Ignore product-table sync errors when the environment does not have the catalog table yet.
    }

    const { data, error: cartError } = await supabase
      .from('cart_items')
      .upsert(
        [
          {
            user_id: safeUserId,
            product_id: productId,
            quantity: quantity || 1,
          },
        ],
        { onConflict: 'user_id, product_id' }
      )
      .select();

    if (cartError) {
      console.warn('Cart upsert fallback triggered:', cartError.message);
      res.status(500).json({ error: 'Failed to update cart item.' });
      return;
    }

    res.status(200).json({ message: 'Cart updated successfully!', data });
  } catch (error: any) {
    console.error('Add to Cart Error:', error);
    res.status(500).json({ error: 'Failed to update cart item.' });
  }
};

// GET / FETCH: Kunin ang lahat ng laman ng cart ng user kasama ang konektadong produkto (optional join)
export const getCart = async (req: Request, res: Response): Promise<void> => {
  try {
    const supabase = getSupabaseClient();
    const userId = req.params.userId;
    const safeUserId = resolveUserId(userId);

    if (!safeUserId) {
      res.status(400).json({ error: 'Missing userId parameter.' });
      return;
    }

    const { data, error } = await supabase
      .from('cart_items')
      .select('id, product_id, quantity, user_id')
      .eq('user_id', safeUserId)
      .limit(200);

    if (error) {
      console.warn('Cart fetch fallback triggered:', error.message);
      res.status(500).json({ error: 'Failed to fetch cart.' });
      return;
    }

    const cartRows = data || [];
    const productIds = [...new Set(cartRows.map((item: any) => item.product_id).filter(Boolean))];
    let productsById = new Map<string, any>();

    if (productIds.length > 0) {
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, title, category, dimensions, price, image_url')
        .in('id', productIds);

      if (productsError) {
        console.warn('Cart product details fallback triggered:', productsError.message);
      } else {
        productsById = new Map((products || []).map((product: any) => [String(product.id), product]));
      }
    }

    const formattedItems = cartRows.map((item: any) => mapCartItem({
      ...item,
      products: productsById.get(String(item.product_id)),
    }));

    res.status(200).json({ items: formattedItems });
  } catch (error: any) {
    console.error('Fetch Cart Error:', error);
    res.status(500).json({ error: 'Failed to fetch cart.' });
  }
};

// REMOVE: Tanggalin ang isang item sa cart gamit ang cart item ID
export const removeFromCart = async (req: Request, res: Response): Promise<void> => {
  try {
    const supabase = getSupabaseClient();
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ error: 'Missing cart item ID.' });
      return;
    }

    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.status(200).json({ message: 'Item removed from cart successfully!' });
  } catch (error: any) {
    console.error('Remove Cart Item Error:', error);
    res.status(500).json({ error: 'Failed to remove cart item.', details: error.message });
  }
};
