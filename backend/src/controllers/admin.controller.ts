import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { getSupabaseClient } from '../config/supabaseClient.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_ADMIN_UUID = '00000000-0000-0000-0000-000000000001';

function normalizeUserId(rawValue: unknown): string | null {
  const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
  const normalized = typeof value === 'string' ? value.trim() : '';

  if (!normalized) return null;
  if (normalized === 'admin-wma') return DEFAULT_ADMIN_UUID;
  if (UUID_REGEX.test(normalized)) return normalized;

  return DEFAULT_ADMIN_UUID;
}

const ORDER_STATUS_MAP: Record<string, string> = {
  pending_payment: 'Pending',
  to_ship: 'To Ship',
  shipping: 'Shipping',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export type AdminOrderStatus = 'pending_payment' | 'to_ship' | 'shipping' | 'completed' | 'cancelled';

export const ORDER_STATUS_TRANSITIONS: Record<AdminOrderStatus, readonly AdminOrderStatus[]> = {
  pending_payment: ['to_ship', 'cancelled'],
  to_ship: ['shipping', 'cancelled'],
  shipping: ['completed'],
  completed: [],
  cancelled: [],
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

export function normalizeOrderStatus(status: unknown): AdminOrderStatus {
  const value = String(status ?? '').trim().toLowerCase().replace(/[_-]+/g, ' ');

  if (!value) return 'pending_payment';
  if (value.includes('cancel')) return 'cancelled';
  if (value.includes('complete')) return 'completed';
  if (value.includes('to ship')) return 'to_ship';
  if (value.includes('shipping')) return 'shipping';
  if (value.includes('pending') || value.includes('pay')) return 'pending_payment';

  return 'pending_payment';
}

export function isAllowedOrderTransition(currentStatus: unknown, nextStatus: unknown): boolean {
  const from = normalizeOrderStatus(currentStatus);
  const to = normalizeOrderStatus(nextStatus);
  return (ORDER_STATUS_TRANSITIONS[from] ?? []).includes(to);
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

function unwrapProfileData(value: unknown): Record<string, any> {
  if (!value) return {};
  if (Array.isArray(value)) {
    return (value.find((entry) => entry && typeof entry === 'object') as Record<string, any>) ?? {};
  }
  if (typeof value === 'object') {
    return value as Record<string, any>;
  }
  return {};
}

export function resolveCustomerName(raw: any, profile: Record<string, any> = {}): string {
  const normalizedProfile = unwrapProfileData(profile);
  const joinedProfile = unwrapProfileData(raw?.profiles ?? raw?.profile ?? raw?.user);

  const rawName = [
    raw?.customer?.name,
    raw?.customer_name,
    raw?.customerName,
    raw?.user?.full_name,
    raw?.user?.name,
    raw?.user?.fullName,
    raw?.user?.username,
    raw?.profile?.full_name,
    raw?.profile?.name,
    raw?.profile?.fullName,
    raw?.profile?.username,
    joinedProfile.full_name,
    joinedProfile.name,
    joinedProfile.fullName,
    joinedProfile.username,
    normalizedProfile.full_name,
    normalizedProfile.name,
    normalizedProfile.fullName,
    normalizedProfile.username,
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

  const profile = unwrapProfileData(raw?.profiles ?? raw?.profile ?? raw?.user ?? {});
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

export function normalizeProductInput(input: any) {
  const rawDimensions = input?.dimensions;
  const currentDimensions = typeof rawDimensions === 'string' && rawDimensions.trim()
    ? rawDimensions.trim()
    : JSON.stringify(parseDimensions(rawDimensions ?? { width: 0, height: 0, depth: 0, unit: 'cm' }));

  const sanitizedCategory = String(input?.category ?? 'Custom').trim() || 'Custom';
  const resolvedId = typeof input?.id === 'string' && input.id.trim() ? input.id.trim() : `prod_${randomUUID()}`;

  return {
    id: resolvedId,
    title: String(input?.title ?? '').trim(),
    category: sanitizedCategory,
    price: Number(input?.price ?? 0),
    image_url: String(input?.image_url ?? input?.imageUrl ?? '').trim(),
    dimensions: currentDimensions,
    stock: Number.isFinite(Number(input?.stock)) ? Number(input.stock) : 0,
  };
}

export function normalizeProductUpdateInput(input: any) {
  const rawDimensions = input?.dimensions;
  const currentDimensions = typeof rawDimensions === 'string' && rawDimensions.trim()
    ? rawDimensions.trim()
    : JSON.stringify(parseDimensions(rawDimensions ?? { width: 0, height: 0, depth: 0, unit: 'cm' }));

  return {
    title: String(input?.title ?? '').trim(),
    category: String(input?.category ?? 'Custom').trim() || 'Custom',
    price: Number(input?.price ?? 0),
    image_url: String(input?.image_url ?? input?.imageUrl ?? '').trim(),
    dimensions: currentDimensions,
    stock: Number.isFinite(Number(input?.stock)) ? Number(input.stock) : 0,
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

    if (!payload.title || payload.price <= 0) {
      res.status(400).json({ error: 'Product title and price are required.' });
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

    const { data: ordersData, error: ordersError } = await supabase
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
        ),
        payments (*)
      `)
      .order('created_at', { ascending: false })
      .limit(200);

    if (ordersError) {
      console.warn('Admin orders fallback triggered:', ordersError.message);
      res.status(200).json([]);
      return;
    }

    const orderRows = Array.isArray(ordersData) ? ordersData : [];
    const profileIds = [...new Set(
      orderRows
        .map((row: any) => normalizeUserId(row?.user_id))
        .filter((id): id is string => typeof id === 'string' && !!id.trim())
    )];

    let profileMap = new Map<string, Record<string, any>>();
    if (profileIds.length > 0) {
      const { data: profileRows, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, email, phone')
        .in('id', profileIds);

      if (!profileError && Array.isArray(profileRows)) {
        for (const row of profileRows) {
          if (row?.id) {
            profileMap.set(row.id, row);
          }
        }
      } else if (profileError) {
        console.warn('Admin order profile lookup warning:', profileError.message);
      }
    }

    const enriched = orderRows.map((row: any) => normalizeOrderRecord({
      ...row,
      profiles: profileMap.get(row?.user_id) ?? {},
      order_items: Array.isArray(row?.order_items) ? row.order_items : [],
      payments: Array.isArray(row?.payments) ? row.payments : [],
    }));

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

    const { data: currentOrder, error: currentError } = await supabase
      .from('orders')
      .select('id, status')
      .eq('id', id)
      .maybeSingle();

    if (currentError) throw currentError;
    if (!currentOrder) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }

    const currentStatus = normalizeOrderStatus(currentOrder.status);
    const nextNormalizedStatus = normalizeOrderStatus(status);

    if (!isAllowedOrderTransition(currentStatus, nextNormalizedStatus)) {
      res.status(400).json({
        error: `Order status cannot move from "${currentStatus}" to "${nextNormalizedStatus}".`,
      });
      return;
    }

    const persistedStatus = ORDER_STATUS_MAP[nextNormalizedStatus] ?? 'Pending';

    const { data, error } = await supabase
      .from('orders')
      .update({
        status: persistedStatus,
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
