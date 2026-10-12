import { Request, Response } from 'express';
import { supabase } from '../config/supabaseClient';

// ADD / UPSERT: Awtomatikong isinusulat sa 'products' table, pagkatapos ay idaragdag sa 'cart_items'
export const addToCart = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, productId, name, category, dimensions, unitPrice, imageUrl, quantity } = req.body;

    if (!userId || !productId) {
      res.status(400).json({ error: 'Missing userId or productId.' });
      return;
    }

    // Hakbang 1: Awtomatikong i-upsert muna ang produkto sa 'products' table para maiwasan ang foreign key error
    const { error: productError } = await supabase
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

    if (productError) {
      console.error('Auto-product upsert warning:', productError.message);
    }

    // Hakbang 2: Isunod na idagdag o i-update sa 'cart_items' table
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

    if (cartError) throw cartError;

    res.status(200).json({ message: 'Cart updated successfully!', data });
  } catch (error: any) {
    console.error('Add to Cart Error:', error);
    res.status(500).json({ error: 'Failed to add item to cart.', details: error.message });
  }
};

// GET / FETCH: Kunin ang lahat ng laman ng cart ng user kasama ang konektadong produkto (optional join)
export const getCart = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    if (!userId) {
      res.status(400).json({ error: 'Missing userId parameter.' });
      return;
    }

    const { data, error } = await supabase
      .from('cart_items')
      .select(`
        *,
        products (
          title,
          category,
          price,
          dimensions,
          image_url
        )
      `)
      .eq('user_id', userId);

    if (error) throw error;

    // I-format ang data para madaling basahin ng frontend
    const formattedItems = (data || []).map((item: any) => ({
      id: item.id,
      product_id: item.product_id,
      quantity: item.quantity,
      name: item.products?.title || 'Custom Item',
      category: item.products?.category || 'General',
      dimensions: item.products?.dimensions || 'Standard',
      price: item.products?.price || 0,
      image_url: item.products?.image_url || '',
    }));

    res.status(200).json({ items: formattedItems });
  } catch (error: any) {
    console.error('Fetch Cart Error:', error);
    res.status(500).json({ error: 'Failed to fetch cart items.', details: error.message });
  }
};

// REMOVE: Tanggalin ang isang item sa cart gamit ang cart item ID
export const removeFromCart = async (req: Request, res: Response): Promise<void> => {
  try {
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