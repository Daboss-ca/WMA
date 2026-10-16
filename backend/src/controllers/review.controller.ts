import type { Request, Response } from 'express';
import { getSupabaseClient } from '../config/supabaseClient.js';
import { firstValidationMessage, reviewSchema } from '../validation/schemas.js';

export const createReview = async (req: Request, res: Response): Promise<void> => {
  const parsed = reviewSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: firstValidationMessage(parsed.error) });
    return;
  }

  try {
    const { user_id, product_id, order_id, rating, comment } = parsed.data;
    const supabase = getSupabaseClient();

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, user_id, status')
      .eq('id', order_id)
      .maybeSingle();
    if (orderError) throw orderError;
    if (!order || order.user_id !== user_id) {
      res.status(404).json({ error: 'The order could not be found for this account.' });
      return;
    }
    const status = String(order.status ?? '').toLowerCase();
    if (!status.includes('complete') && !status.includes('deliver')) {
      res.status(400).json({ error: 'You can review an item after its order has been completed.' });
      return;
    }

    const { data: orderItem, error: itemError } = await supabase
      .from('order_items')
      .select('id')
      .eq('order_id', order_id)
      .eq('product_id', product_id)
      .limit(1)
      .maybeSingle();
    if (itemError) throw itemError;
    if (!orderItem) {
      res.status(400).json({ error: 'This product is not part of the selected order.' });
      return;
    }

    const { data: existingReview, error: existingError } = await supabase
      .from('reviews')
      .select('id')
      .eq('user_id', user_id)
      .eq('order_id', order_id)
      .eq('product_id', product_id)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existingReview) {
      res.status(409).json({ error: 'This order item has already been reviewed.' });
      return;
    }

    const { data: review, error: insertError } = await supabase
      .from('reviews')
      .insert({ user_id, product_id, order_id, rating, comment })
      .select('id, user_id, product_id, order_id, rating, comment, created_at')
      .single();
    if (insertError) {
      if (insertError.code === '23505') {
        res.status(409).json({ error: 'This order item has already been reviewed.' });
        return;
      }
      throw insertError;
    }

    res.status(201).json({ message: 'Your review has been submitted successfully.', review });
  } catch (error) {
    console.error('Review submission error:', error);
    res.status(500).json({ error: 'We could not submit your review. Please try again later.' });
  }
};

export const listPublicReviews = async (_req: Request, res: Response): Promise<void> => {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('reviews')
      .select('id, user_id, product_id, order_id, rating, comment, created_at')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;

    const rows = Array.isArray(data) ? data : [];
    const profileIds = [...new Set(rows.map((row: any) => String(row.user_id ?? '')).filter(Boolean))];
    const productIds = [...new Set(rows.map((row: any) => String(row.product_id ?? '')).filter(Boolean))];

    const [profilesResult, productsResult] = await Promise.all([
      profileIds.length
        ? supabase.from('profiles').select('id, username').in('id', profileIds)
        : Promise.resolve({ data: [], error: null }),
      productIds.length
        ? supabase.from('products').select('id, title, category, image_url').in('id', productIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (profilesResult.error) throw profilesResult.error;
    if (productsResult.error) throw productsResult.error;

    const profileMap = new Map((profilesResult.data ?? []).map((profile: any) => [String(profile.id), profile]));
    const productMap = new Map((productsResult.data ?? []).map((product: any) => [String(product.id), product]));

    res.status(200).json(rows.map((row: any) => {
      const profile = profileMap.get(String(row.user_id));
      const product = productMap.get(String(row.product_id));
      return {
        id: row.id,
        rating: row.rating,
        comment: row.comment,
        created_at: row.created_at,
        reviewer_name: profile?.username || 'Customer',
        product: product ? {
          id: product.id,
          title: product.title,
          category: product.category,
          image_url: product.image_url,
        } : null,
      };
    }));
  } catch (error) {
    console.error('Public reviews retrieval error:', error);
    res.status(500).json({ error: 'We could not retrieve customer reviews. Please try again later.' });
  }
};
