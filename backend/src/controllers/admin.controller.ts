import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { getSupabaseClient } from '../config/supabaseClient.js';

const ORDER_STATUS_MAP: Record<string, string> = {
  pending_payment: 'Pending',
  to_ship: 'To Ship',
  shipping: 'Shipping',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

function parseDimensions(value: unknown): { width: number; height: number; depth: number; unit: 'cm' | 'in' } {
  const fallback = { width: 0, height: 0, depth: 0, unit: 'cm' as const };

  if (!value) return fallback;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return fallback;

    try {
      const parsed = JSON.parse(trimmed);
      return parseDimensions(parsed);
    } catch {
      const matches = trimmed.match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)(?:\s*(cm|in))?/i);
      if (!matches) return fallback;

      const [, width, height, depth, unit] = matches;
      return {
        width: Number(width),
        height: Number(height),
        depth: Number(depth),
        unit: unit && unit.toLowerCase() === 'in' ? 'in' : 'cm',
      };
    }
  }

  if (typeof value === 'object') {
    const raw = value as Record<string, unknown>;
    const width = Number(raw.width ?? 0);
    const height = Number(raw.height ?? 0);
    const depth = Number(raw.depth ?? 0);
    const unit = raw.unit === 'in' ? 'in' : 'cm';

    return {
      width: Number.isFinite(width) ? width : 0,
      height: Number.isFinite(height) ? height : 0,
      depth: Number.isFinite(depth) ? depth : 0,
      unit,
    };
  }

  return fallback;
}

export function normalizeProductRecord(raw: any) {
  const dimensions = parseDimensions(raw?.dimensions);

  return {
    id: String(raw?.id ?? ''),
    title: String(raw?.title ?? ''),
    description: String(raw?.description ?? ''),
    category: String(raw?.category ?? 'Custom'),
    dimensions,
    price: Number(raw?.price ?? 0),
    imageUrl: String(raw?.image_url ?? raw?.imageUrl ?? ''),
    createdAt: String(raw?.created_at ?? raw?.createdAt ?? new Date().toISOString()),
    updatedAt: String(raw?.updated_at ?? raw?.updatedAt ?? new Date().toISOString()),
  };
}

function normalizeOrderStatus(status: unknown): 'pending_payment' | 'to_ship' | 'shipping' | 'completed' | 'cancelled' {
  const value = String(status ?? '').trim().toLowerCase();

  if (!value) return 'pending_payment';
  if (value.includes('cancel')) return 'cancelled';
  if (value.includes('complete')) return 'completed';
  if (value.includes('to ship')) return 'to_ship';
  if (value.includes('shipping')) return 'shipping';
  if (value.includes('pending') || value.includes('pay')) return 'pending_payment';

  return 'pending_payment';
}

function buildStatusHistory(raw: any, normalizedStatus: string) {
  const history = Array.isArray(raw?.status_history) ? raw.status_history : Array.isArray(raw?.statusHistory) ? raw.statusHistory : [];

  if (history.length > 0) {
    return history.map((event: any) => ({
      status: normalizeOrderStatus(event?.status ?? event?.value ?? normalizedStatus),
      at: String(event?.at ?? event?.created_at ?? raw?.updated_at ?? raw?.createdAt ?? new Date().toISOString()),
    }));
  }

  const baseAt = String(raw?.created_at ?? raw?.createdAt ?? raw?.updated_at ?? raw?.updatedAt ?? new Date().toISOString());
  return [{ status: normalizedStatus, at: baseAt }];
}

function resolveCustomerName(raw: any, profile: Record<string, any> = {}): string {
  const rawName = [
    raw?.customer?.name,
    raw?.customer_name,
    raw?.customerName,
    raw?.user?.full_name,
    raw?.user?.name,
    raw?.user?.fullName,
    profile.full_name,
    profile.name,
    profile.fullName,
    raw?.profiles?.full_name,
    raw?.profiles?.name,
    raw?.profiles?.fullName,
  ].find((value) => typeof value === 'string' && value.trim());

  if (typeof rawName === 'string' && rawName.trim()) return rawName.trim();

  const fallbackEmail = [raw?.customer_email, raw?.user_email, raw?.email].find((value) => typeof value === 'string' && value.trim());
  if (typeof fallbackEmail === 'string' && fallbackEmail.trim()) {
    return fallbackEmail.trim().split('@')[0].replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  return 'Guest customer';
}

export function normalizeOrderRecord(raw: any) {
  const normalizedStatus = normalizeOrderStatus(raw?.status);
  const items = (Array.isArray(raw?.order_items) ? raw.order_items : []).map((item: any) => ({
    productId: String(item?.product_id ?? item?.products?.id ?? ''),
    title: String(item?.products?.title ?? item?.title ?? 'Custom item'),
    unitPrice: Number(item?.price ?? item?.unit_price ?? item?.products?.price ?? 0),
    quantity: Number(item?.quantity ?? 1),
  }));

  const payments = Array.isArray(raw?.payments) ? raw.payments : [];
  const latestPayment = payments[0] ?? null;
  const paymentProof = latestPayment
    ? {
        fileName: String(latestPayment.file_name ?? latestPayment.fileName ?? 'receipt'),
        dataUrl: String(latestPayment.proof_url ?? latestPayment.dataUrl ?? ''),
        referenceNo: String(latestPayment.reference_number ?? latestPayment.referenceNo ?? ''),
        submittedAt: String(latestPayment.created_at ?? latestPayment.submittedAt ?? raw?.created_at ?? new Date().toISOString()),
      }
    : null;

  const profile = raw?.profiles ?? raw?.profile ?? raw?.user ?? {};
  const customerName = resolveCustomerName(raw, profile);
  const customerEmail = String(
    profile.email ?? raw?.customer_email ?? raw?.user_email ?? raw?.email ?? ''
  );

  return {
    id: String(raw?.id ?? ''),
    reference: String(raw?.reference ?? `WMA-${String(raw?.id ?? '').slice(-6) || 'ORDER'}`),
    customer: {
      name: customerName,
      email: customerEmail,
      phone: String(raw?.contact_number ?? raw?.customer_phone ?? ''),
      address: String(raw?.shipping_address ?? raw?.customer_address ?? ''),
    },
    items,
    total: Number(raw?.total_amount ?? raw?.total ?? items.reduce((sum: number, item: any) => sum + item.unitPrice * item.quantity, 0)),
    status: normalizedStatus,
    paymentProof,
    statusHistory: buildStatusHistory(raw, normalizedStatus),
    createdAt: String(raw?.created_at ?? raw?.createdAt ?? new Date().toISOString()),
    updatedAt: String(raw?.updated_at ?? raw?.updatedAt ?? raw?.created_at ?? raw?.createdAt ?? new Date().toISOString()),
  };
}

function normalizeProductInput(input: any) {
  const dimensions = parseDimensions(input?.dimensions ?? { width: 0, height: 0, depth: 0, unit: 'cm' });

  return {
    id: String(input?.id ?? `prd_${randomUUID()}`),
    title: String(input?.title ?? '').trim(),
    description: String(input?.description ?? '').trim(),
    category: String(input?.category ?? 'Custom'),
    price: Number(input?.price ?? 0),
    dimensions: JSON.stringify(dimensions),
    image_url: String(input?.imageUrl ?? input?.image_url ?? ''),
  };
}

function normalizeProductUpdateInput(input: any) {
  const dimensions = parseDimensions(input?.dimensions ?? { width: 0, height: 0, depth: 0, unit: 'cm' });

  return {
    title: String(input?.title ?? '').trim(),
    description: String(input?.description ?? '').trim(),
    category: String(input?.category ?? 'Custom'),
    price: Number(input?.price ?? 0),
    dimensions: JSON.stringify(dimensions),
    image_url: String(input?.imageUrl ?? input?.image_url ?? ''),
  };
}

export const listAdminProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .limit(200);

    if (error) {
      console.warn('Admin products fallback triggered:', error.message);
      res.status(200).json([]);
      return;
    }

    const products = (data ?? []).map((row: any) => normalizeProductRecord(row));
    products.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.status(200).json(products);
  } catch (error: any) {
    console.error('Admin list products error:', error);
    res.status(200).json([]);
  }
};

export const createAdminProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const supabase = getSupabaseClient();
    const payload = normalizeProductInput(req.body ?? {});

    if (!payload.title || !payload.description || payload.price <= 0) {
      res.status(400).json({ error: 'Product title, description and price are required.' });
      return;
    }

    const { data, error } = await supabase
      .from('products')
      .insert([payload])
      .select('*')
      .single();

    if (error) throw error;
    res.status(201).json(normalizeProductRecord(data));
  } catch (error: any) {
    console.error('Admin create product error:', error);
    res.status(500).json({ error: 'Failed to create product.', details: error.message });
  }
};

export const updateAdminProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const supabase = getSupabaseClient();
    const { id } = req.params;
    const payload = normalizeProductUpdateInput(req.body ?? {});

    if (!id) {
      res.status(400).json({ error: 'Product id is required.' });
      return;
    }

    const { data, error } = await supabase
      .from('products')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    res.status(200).json(normalizeProductRecord(data));
  } catch (error: any) {
    console.error('Admin update product error:', error);
    res.status(500).json({ error: 'Failed to update product.', details: error.message });
  }
};

export const deleteAdminProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const supabase = getSupabaseClient();
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ error: 'Product id is required.' });
      return;
    }

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.status(200).json({ success: true, id });
  } catch (error: any) {
    console.error('Admin delete product error:', error);
    res.status(500).json({ error: 'Failed to delete product.', details: error.message });
  }
};

export const listAdminOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .limit(200);

    if (error) {
      console.warn('Admin orders fallback triggered:', error.message);
      res.status(200).json([]);
      return;
    }

    const enriched = await Promise.all(
      (data ?? []).map(async (row: any) => {
        const profileQuery = row.user_id
          ? await supabase.from('profiles').select('full_name, name, email').eq('id', row.user_id).maybeSingle()
          : { data: null };

        const childQuery = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', row.id)
          .limit(50);

        const paymentQuery = await supabase
          .from('payments')
          .select('*')
          .eq('order_id', row.id)
          .limit(20);

        return normalizeOrderRecord({
          ...row,
          profiles: profileQuery.data ?? row.profiles ?? {},
          order_items: childQuery.data ?? [],
          payments: paymentQuery.data ?? [],
        });
      })
    );

    enriched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.status(200).json(enriched);
  } catch (error: any) {
    console.error('Admin list orders error:', error);
    res.status(200).json([]);
  }
};

export const updateAdminOrderStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const supabase = getSupabaseClient();
    const { id } = req.params;
    const { status } = req.body ?? {};

    if (!id) {
      res.status(400).json({ error: 'Order id is required.' });
      return;
    }

    const normalizedStatus = normalizeOrderStatus(status);
    const nextStatus = ORDER_STATUS_MAP[normalizedStatus] ?? 'Pending';

    const { data, error } = await supabase
      .from('orders')
      .update({
        status: nextStatus,
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    res.status(200).json(normalizeOrderRecord(data));
  } catch (error: any) {
    console.error('Admin update order status error:', error);
    res.status(500).json({ error: 'Failed to update order status.', details: error.message });
  }
};
