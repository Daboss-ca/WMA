import { Request, Response } from 'express';
import { supabase } from '../config/supabaseClient';

export class OrderController {
  // Checkout: Lumikha ng order mula sa cart items at ilipat sa order_items
  static async checkout(req: Request, res: Response) {
    try {
      const { userId, shippingAddress, items, totalAmount } = req.body;

      if (!userId || !items || items.length === 0) {
        return res.status(400).json({ error: 'Cart is empty or user is missing.' });
      }

      // 1. Gumawa ng order record (default status ay 'pay' para sa To Pay)
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: userId,
          total_amount: totalAmount,
          shipping_address: shippingAddress,
          status: 'pay'
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderId = orderData.id;

      // 2. Ilagay ang mga produktong binili sa order_items table
      const orderItemsPayload = items.map((item: any) => ({
        order_id: orderId,
        product_id: item.productId,
        quantity: item.quantity,
        price: item.price
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsPayload);

      if (itemsError) throw itemsError;

      // 3. Burahin ang mga items sa cart ng user dahil tapos na ang checkout
      const { error: clearCartError } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', userId);

      if (clearCartError) throw clearCartError;

      return res.status(201).json({
        message: 'Checkout successful!',
        order: orderData
      });
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Checkout failed.' });
    }
  }

  // Kunin ang lahat ng orders ng user kasama ang mga items nito
  static async getOrders(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return res.status(200).json({ orders: data });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }
}