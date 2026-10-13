import { Request, Response } from 'express';
import { getSupabaseClient } from '../config/supabaseClient';

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

export const createOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const supabase = getSupabaseClient();
    const { user_id, shipping_address, contact_number, payment_method, selected_items } = req.body;
    const safeUserId = resolveUserId(user_id);

    if (!safeUserId || !shipping_address || !selected_items || !Array.isArray(selected_items) || selected_items.length === 0) {
      res.status(400).json({ error: 'Missing required checkout information or selected items.' });
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
      .eq('user_id', safeUserId)
      .in('id', selected_items);

    if (cartError) throw cartError;

    if (!cartItems || cartItems.length === 0) {
      res.status(400).json({ error: 'No valid items found for checkout.' });
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
          user_id: safeUserId,
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

export const getUserOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const supabase = getSupabaseClient();
    const rawUserId = req.query.user_id;
    const safeUserId = resolveUserId(rawUserId);

    if (!safeUserId) {
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
      .eq('user_id', safeUserId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.status(200).json(Array.isArray(data) ? data : []);
  } catch (error: any) {
    console.error('Fetch Orders Error:', error);
    res.status(500).json({ error: 'Failed to fetch orders.', details: error.message });
  }
};

export const uploadPaymentProof = async (req: Request, res: Response): Promise<void> => {
  try {
    const supabase = getSupabaseClient();
    const { order_id, user_id, proof_url, reference_number } = req.body;
    const safeUserId = resolveUserId(user_id);

    if (!order_id || !safeUserId || !proof_url || !reference_number) {
      res.status(400).json({ error: 'Please provide all required payment details (Order ID, Proof URL, and Reference Number).' });
      return;
    }

    const { data: existingRef, error: refCheckError } = await supabase
      .from('payments')
      .select('id')
      .eq('reference_number', reference_number)
      .maybeSingle();

    if (refCheckError) throw refCheckError;

    if (existingRef) {
      res.status(400).json({ error: 'This Reference Number has already been used for another transaction. Please enter a valid unique reference number.' });
      return;
    }

    const { error: paymentError } = await supabase
      .from('payments')
      .insert([
        {
          order_id,
          user_id: safeUserId,
          proof_url,
          reference_number,
          status: 'Pending Review',
        },
      ]);

    if (paymentError) throw paymentError;

    const { error: orderUpdateError } = await supabase
      .from('orders')
      .update({ status: 'Pending Review' })
      .eq('id', order_id);

    if (orderUpdateError) throw orderUpdateError;

    res.status(201).json({
      message: 'Payment proof uploaded successfully! Awaiting admin review.',
    });
  } catch (error: any) {
    console.error('Payment Upload Error:', error);
    res.status(500).json({ error: 'Failed to upload payment proof.', details: error.message });
  }
};