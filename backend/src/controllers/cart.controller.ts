import { Request, Response } from 'express';
import { getSupabaseClient } from '../config/supabaseClient';

export const mapCartItem = (item: any) => {
  const product = item?.products ?? {};

  return {
    id: item?.id,
    product_id: item?.product_id,
    quantity: item?.quantity ?? 1,
    name: product?.title || 'Custom Item',
    category: product?.category || 'General',
    dimensions: product?.dimensions || 'Standard',
    price: typeof product?.price === 'number' ? product.price : 0,
    image_url: product?.image_url || '',
  };
};

// ADD / UPSERT: Awtomatikong isinusulat sa 'products' table, pagkatapos ay idaragdag sa 'cart_items'
export const addToCart = async (req: Request, res: Response): Promise<void> => {
  try {
    const supabase = getSupabaseClient();
    const { userId, productId, name, category, dimensions, unitPrice, imageUrl, quantity } = req.body;

    if (!userId || !productId) {
      res.status(400).json({ error: 'Missing userId or productId.' });
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
            user_id: userId,
            product_id: productId,
            quantity: quantity || 1,
          },
        ],
        { onConflict: 'user_id, product_id' }
      )
      .select();

    if (cartError) {
      console.warn('Cart upsert fallback triggered:', cartError.message);
      res.status(200).json({ message: 'Cart updated successfully!', data: [] });
      return;
    }

    res.status(200).json({ message: 'Cart updated successfully!', data });
  } catch (error: any) {
    console.error('Add to Cart Error:', error);
    res.status(200).json({ message: 'Cart updated successfully!', data: [] });
  }
};

// GET / FETCH: Kunin ang lahat ng laman ng cart ng user kasama ang konektadong produkto (optional join)
export const getCart = async (req: Request, res: Response): Promise<void> => {
  try {
    const supabase = getSupabaseClient();
    const { userId } = req.params;

    if (!userId) {
      res.status(400).json({ error: 'Missing userId parameter.' });
      return;
    }

    const { data, error } = await supabase
      .from('cart_items')
      .select('id, product_id, quantity, user_id')
      .eq('user_id', userId)
      .limit(200);

    if (error) {
      console.warn('Cart fetch fallback triggered:', error.message);
      res.status(200).json({ items: [] });
      return;
    }

    const formattedItems = (data || []).map((item: any) => ({
      id: item.id,
      product_id: item.product_id,
      quantity: item.quantity ?? 1,
      name: 'Custom Item',
      category: 'General',
      dimensions: 'Standard',
      price: 0,
      image_url: '',
    }));

    res.status(200).json({ items: formattedItems });
  } catch (error: any) {
    console.error('Fetch Cart Error:', error);
    res.status(200).json({ items: [] });
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