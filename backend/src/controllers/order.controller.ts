import { Request, Response } from 'express';
import { getSupabaseClient } from '../config/supabaseClient';
import { normalizeOrderStatus } from './admin.controller';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_ADMIN_UUID = '00000000-0000-0000-0000-000000000001';
const MAX_MONEY_VALUE = 99_999_999.99;

export function sanitizeNumericValue(value: unknown, fallback = 0): number {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return fallback;

  const roundedValue = Number(Math.round((numericValue + Number.EPSILON) * 100) / 100);
  if (!Number.isFinite(roundedValue)) return fallback;

  if (Math.abs(roundedValue) >= 1e8) {
    return Number((Math.sign(roundedValue) * MAX_MONEY_VALUE).toFixed(2));
  }

  return Number(roundedValue.toFixed(2));
}

export function sanitizeQuantity(value: unknown): number {
  const quantity = Number(value);
  if (!Number.isFinite(quantity) || quantity <= 0) return 0;

  return Math.floor(quantity);
}

export function buildCheckoutOrderItems(cartItems: any[]) {
  let totalAmount = 0;

  const orderItems = cartItems.flatMap((item: any) => {
    const quantity = sanitizeQuantity(item?.quantity);
    const unitPrice = sanitizeNumericValue(item?.products?.price ?? item?.price ?? 0);

    if (!item?.product_id || quantity <= 0 || unitPrice <= 0) {
      return [];
    }

    const subtotal = sanitizeNumericValue(unitPrice * quantity);
    totalAmount = sanitizeNumericValue(totalAmount + subtotal);

    return [{
      product_id: item.product_id,
      quantity,
      price: unitPrice,
    }];
  });

  return {
    orderItems,
    total_amount: sanitizeNumericValue(totalAmount),
  };
}

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

    const selectedItemIds = [...new Set(selected_items
      .map((id) => (typeof id === 'string' || typeof id === 'number' ? String(id).trim() : ''))
      .filter(Boolean))];

    if (selectedItemIds.length === 0) {
      res.status(400).json({ error: 'No valid cart item IDs were provided for checkout.' });
      return;
    }

    const { data: orderId, error: checkoutError } = await supabase.rpc('create_checkout_order', {
      p_user_id: safeUserId,
      p_shipping_address: String(shipping_address).trim(),
      p_contact_number: String(contact_number ?? '').trim(),
      p_payment_method: String(payment_method || 'gcash'),
      p_cart_item_ids: selectedItemIds,
    });

    if (checkoutError) throw checkoutError;
    if (!orderId) throw new Error('Checkout completed without returning an order id.');

    res.status(201).json({
      message: 'Checkout completed successfully!',
      order_id: String(orderId),
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

export const updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const supabase = getSupabaseClient();
    const { id } = req.params;
    const { status, user_id } = req.body ?? {};
    const safeUserId = resolveUserId(user_id ?? req.query.user_id ?? null);

    if (!id) {
      res.status(400).json({ error: 'Order id is required.' });
      return;
    }

    const { data: currentOrder, error: currentError } = await supabase
      .from('orders')
      .select('id, status, user_id')
      .eq('id', id)
      .maybeSingle();

    if (currentError) throw currentError;
    if (!currentOrder) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }

    if (safeUserId && currentOrder.user_id && safeUserId !== currentOrder.user_id) {
      res.status(403).json({ error: 'You do not have permission to update this order.' });
      return;
    }

    const currentStatus = normalizeOrderStatus(currentOrder.status);
    const nextStatus = normalizeOrderStatus(status);

    const isAllowed =
      (currentStatus === 'shipping' && nextStatus === 'completed') ||
      (currentStatus === 'completed' && nextStatus === 'completed');

    if (!isAllowed) {
      res.status(400).json({
        error: `Order status cannot move from "${currentStatus}" to "${nextStatus}".`,
      });
      return;
    }

    const persistedStatus = nextStatus === 'completed' ? 'Completed' : 'Shipping';

    const { data, error } = await supabase
      .from('orders')
      .update({ status: persistedStatus })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    res.status(200).json({
      success: true,
      order: data,
    });
  } catch (error: any) {
    console.error('Update Order Status Error:', error);
    res.status(500).json({ error: 'Failed to update order status.', details: error.message });
  }
};
