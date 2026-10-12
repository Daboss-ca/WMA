import { Request, Response } from 'express';
import { supabase } from '../config/supabaseClient';

// CREATE ORDER: Para sa pag-checkout mula sa cart patungo sa orders at order_items
export const createOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { user_id, shipping_address, contact_number, payment_method, selected_items } = req.body;

    if (!user_id || !shipping_address || !selected_items || !Array.isArray(selected_items) || selected_items.length === 0) {
      res.status(400).json({ error: 'Missing required checkout information or selected items.' });
      return;
    }

    // Step 1: Kunin ang laman ng cart ng user para sa mga napiling items lamang
    const { data: cartItems, error: cartError } = await supabase
      .from('cart_items')
      .select(`
        *,
        products (
          price
        )
      `)
      .eq('user_id', user_id)
      .in('id', selected_items);

    if (cartError) throw cartError;

    if (!cartItems || cartItems.length === 0) {
      res.status(400).json({ error: 'No valid items found for checkout.' });
      return;
    }

    // Step 2: Kalkulahin ang total amount gamit ang totoong presyo ng produkto
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

    // Step 3: Gumawa ng order record sa 'orders' table kasama ang payment_method at contact_number
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert([
        {
          user_id,
          total_amount,
          status: 'Pending',
          shipping_address,
          contact_number: contact_number || '',
          payment_method: payment_method || 'gcash',
        },
      ])
      .select()
      .single();

    if (orderError) throw orderError;
    const order_id = orderData.id;

    // Step 4: Ilipat ang mga napiling items sa 'order_items' table
    const finalOrderItems = orderItemsToInsert.map((item) => ({
      ...item,
      order_id,
    }));

    const { error: orderItemsError } = await supabase
      .from('order_items')
      .insert(finalOrderItems);

    if (orderItemsError) throw orderItemsError;

    // Step 5: Burahin lamang sa 'cart_items' ang mga item na matagumpay na na-checkout
    const { error: clearCartError } = await supabase
      .from('cart_items')
      .delete()
      .in('id', selected_items);

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

// GET USER ORDERS: Kunin ang lahat ng orders ng user para sa Orders Page
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