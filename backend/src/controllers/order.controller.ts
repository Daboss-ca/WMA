import { Request, Response } from 'express';
import { supabase } from '../config/supabaseClient';


export const createOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { user_id, shipping_address } = req.body;

    if (!user_id || !shipping_address) {
      res.status(400).json({ error: 'Missing user_id or shipping_address.' });
      return;
    }

    const { data: cartItems, error: cartError } = await supabase
      .from('cart_items')
      .select(`
        *,
        products (
          price
        )
      `)
      .eq('user_id', user_id);

    if (cartError) throw cartError;

    if (!cartItems || cartItems.length === 0) {
      res.status(400).json({ error: 'Cart is empty.' });
      return;
    }

    let total_amount = 0;
    const orderItemsToInsert = cartItems.map((item: any) => {
      const unitPrice = item.products?.price || item.price || 0;
      total_amount += unitPrice * item.quantity;

      return {
        product_id: item.product_id,
        quantity: item.quantity,
        price: unitPrice,
      };
    });

    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert([
        {
          user_id,
          total_amount,
          status: 'Pending',
          shipping_address,
        },
      ])
      .select()
      .single();

    if (orderError) throw orderError;
    const order_id = orderData.id;

    const finalOrderItems = orderItemsToInsert.map((item) => ({
      ...item,
      order_id,
    }));

    const { error: orderItemsError } = await supabase
      .from('order_items')
      .insert(finalOrderItems);

    if (orderItemsError) throw orderItemsError;

    const { error: clearCartError } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', user_id);

    if (clearCartError) throw clearCartError;

    res.status(201).json({
      message: 'Checkout completed successfully!',
      order_id,
    });
  } catch (error: any) {
    console.error('Checkout Error:', error);
    res.status(500).json({ error: 'Failed to process order.', details: error.message });
  }
};

export const getUserOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      res.status(400).json({ error: 'Missing user_id query parameter.' });
      return;
    }

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          products (
            id,
            title,
            category,
            price,
            image_url,
            dimensions
          )
        )
      `)
      .eq('user_id', user_id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.status(200).json(data || []);
  } catch (error: any) {
    console.error('Fetch Orders Error:', error);
    res.status(500).json({ error: 'Failed to fetch orders.', details: error.message });
  }
};