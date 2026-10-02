import { Request, Response } from 'express';
import { supabase } from '../config/supabaseClient.js';

export class CartController {
  static async getCart(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { data, error } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      return res.status(200).json({ items: data });
    } catch (error: any) {
      console.error('Get Cart Error:', error);
      return res.status(400).json({ error: error.message });
    }
  }

  static async addToCart(req: Request, res: Response) {
    try {
      const { userId, productId, quantity } = req.body;
      
      if (!userId || !productId) {
        return res.status(400).json({ error: 'Missing userId or productId.' });
      }

      const { data, error } = await supabase
        .from('cart_items')
        .upsert(
          { 
            user_id: userId, 
            product_id: productId, 
            quantity: quantity || 1 
          }, 
          { onConflict: 'user_id,product_id' }
        )
        .select();

      if (error) {
        console.error('Supabase Cart Error Details:', error);
        throw error;
      }

      return res.status(200).json({ message: 'Cart updated successfully', data });
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Unknown server error' });
    }
  }

  static async removeFromCart(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return res.status(200).json({ message: 'Item removed from cart' });
    } catch (error: any) {
      console.error('Remove Cart Error:', error);
      return res.status(400).json({ error: error.message });
    }
  }
}