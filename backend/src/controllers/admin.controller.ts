import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { getSupabaseClient } from '../config/supabaseClient.js';
import { firstValidationMessage, productSchema } from '../validation/schemas.js';

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
  shipping: [],
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

  const fallbackEmail = [
    raw?.customer_email,
    raw?.user_email,
    raw?.email,
    joinedProfile.email,
    normalizedProfile.email,
  ].find((value) => typeof value === 'string' && value.trim());
  if (typeof fallbackEmail === 'string' && fallbackEmail.trim()) {
    return fallbackEmail.trim().split('@')[0].replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  return 'Guest customer';
}

export function normalizeOrderRecord(raw: any) {
  const normalizedStatus = normalizeOrderStatus(raw?.status);
  const items = (Array.isArray(raw?.order_items) ? raw.order_items : []).map((item: any) => {
    const product = Array.isArray(item?.products) ? item.products[0] : item?.products;
    const rawPrice = Number(item?.price ?? item?.unit_price ?? product?.price ?? 0);
    const rawQuantity = Number(item?.quantity ?? 1);

    return {
      productId: String(item?.product_id ?? product?.id ?? ''),
      title: String(product?.title ?? item?.title ?? 'Custom item'),
      unitPrice: Number.isFinite(rawPrice) ? rawPrice : 0,
      quantity: Number.isFinite(rawQuantity) && rawQuantity > 0 ? rawQuantity : 1,
    };
  });

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

function resolveMimeExtension(mimeType: string): string {
  const mapping: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
  };

  return mapping[mimeType] ?? 'jpg';
}

function parseDataUrl(rawValue: string): { mimeType: string; buffer: Buffer } | null {
  const match = rawValue.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/i);
  if (!match) return null;

  const [, mimeType, base64Data] = match;
  try {
    return {
      mimeType,
      buffer: Buffer.from(base64Data, 'base64'),
    };
  } catch {
    return null;
  }
}

function extractProductImageStorageKey(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null;

  try {
    const parsed = new URL(imageUrl);
    const pathname = decodeURIComponent(parsed.pathname);
    const publicPrefix = '/storage/v1/object/public/product-images/';
    const bucketPrefix = '/storage/v1/object/public/';

    if (pathname.includes(publicPrefix)) {
      return pathname.slice(pathname.indexOf(publicPrefix) + publicPrefix.length);
    }

    if (pathname.includes(bucketPrefix)) {
      const remaining = pathname.slice(pathname.indexOf(bucketPrefix) + bucketPrefix.length);
      const parts = remaining.split('/').filter(Boolean);
      if (parts[0] === 'product-images') {
        return parts.slice(1).join('/');
      }
      return remaining || null;
    }
  } catch {
    // Fall through to the string-based cleanup below.
  }

  const normalized = imageUrl
    .replace(/^https?:\/\/[^/]+\/+/, '')
    .replace(/^storage\/v1\/object\/public\/product-images\//i, '')
    .replace(/^product-images\//i, '');

  return normalized || null;
}

async function uploadProductImageToStorage(
  supabase: ReturnType<typeof getSupabaseClient>,
  rawValue: unknown,
  fallbackName = 'product-image'
): Promise<string> {
  const value = typeof rawValue === 'string' ? rawValue.trim() : '';

  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('blob:')) return '';

  const dataUrl = value.startsWith('data:image/') ? parseDataUrl(value) : null;
  if (!dataUrl) return value;

  const extension = resolveMimeExtension(dataUrl.mimeType);
  const filePath = `products/${Date.now()}-${randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase
    .storage
    .from('product-images')
    .upload(filePath, dataUrl.buffer, {
      contentType: dataUrl.mimeType,
      cacheControl: '3600',
      upsert: true,
      duplex: 'half',
    });

  if (uploadError) {
    throw new Error(`Failed to upload product image to Supabase Storage: ${uploadError.message}`);
  }

  const { data: publicUrlData } = supabase.storage.from('product-images').getPublicUrl(filePath);
  if (!publicUrlData?.publicUrl) {
    throw new Error('Failed to generate public URL for uploaded product image.');
  }

  return publicUrlData.publicUrl;
}

export async function resolveProductImageUrl(
  supabase: ReturnType<typeof getSupabaseClient>,
  input: any,
  file?: { buffer?: Buffer; originalname?: string; mimetype?: string }
): Promise<string> {
  const rawValue = typeof input?.image_url === 'string'
    ? input.image_url
    : typeof input?.imageUrl === 'string'
      ? input.imageUrl
      : '';

  if (file?.buffer && file.buffer.length > 0) {
    const mimeType = file.mimetype || 'image/jpeg';
    const extension = resolveMimeExtension(mimeType);
    const filePath = `products/${Date.now()}-${randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase
      .storage
      .from('product-images')
      .upload(filePath, file.buffer, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: true,
        duplex: 'half',
      });

    if (uploadError) {
      throw new Error(`Failed to upload product image to Supabase Storage: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabase.storage.from('product-images').getPublicUrl(filePath);
    if (!publicUrlData?.publicUrl) {
      throw new Error('Failed to generate public URL for uploaded product image.');
    }

    return publicUrlData.publicUrl;
  }

  if (!rawValue) return '';
  return uploadProductImageToStorage(supabase, rawValue, file?.originalname || 'product-image');
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
    const rawBody = req.body ?? {};
    const parsed = productSchema.safeParse({ ...rawBody, image_url: rawBody.image_url ?? rawBody.imageUrl ?? '' });
    if (!parsed.success) {
      res.status(400).json({ error: firstValidationMessage(parsed.error) });
      return;
    }
    const payload = normalizeProductInput({ ...rawBody, ...parsed.data });

    const resolvedImageUrl = await resolveProductImageUrl(supabase, rawBody, req.file as any);
    if (resolvedImageUrl) {
      payload.image_url = resolvedImageUrl;
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
    if (error instanceof Error && error.message.startsWith('Failed to upload product image')) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Failed to create product.', details: error.message });
  }
};

export const updateAdminProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const supabase = getSupabaseClient();
    const { id } = req.params;
    const rawBody = req.body ?? {};
    const parsed = productSchema.safeParse({ ...rawBody, image_url: rawBody.image_url ?? rawBody.imageUrl ?? '' });
    if (!parsed.success) {
      res.status(400).json({ error: firstValidationMessage(parsed.error) });
      return;
    }
    const payload = normalizeProductUpdateInput({ ...rawBody, ...parsed.data });

    if (!id) {
      res.status(400).json({ error: 'Product id is required.' });
      return;
    }

    const resolvedImageUrl = await resolveProductImageUrl(supabase, rawBody, req.file as any);
    if (resolvedImageUrl) {
      payload.image_url = resolvedImageUrl;
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
    if (error instanceof Error && error.message.startsWith('Failed to upload product image')) {
      res.status(400).json({ error: error.message });
      return;
    }
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

    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('id, image_url')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!product) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }

    const storageKey = extractProductImageStorageKey(product.image_url);
    if (storageKey) {
      const { error: storageError } = await supabase
        .storage
        .from('product-images')
        .remove([storageKey]);

      if (storageError) {
        console.warn('Product image cleanup warning:', storageError.message);
      }
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
        .map((row: any) => typeof row?.user_id === 'string' ? row.user_id.trim() : '')
        .filter((id: string) => id.length > 0)
    )];

    let profileMap = new Map<string, Record<string, any>>();
    if (profileIds.length > 0) {
      const { data: profileRows, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, email')
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
      profiles: profileMap.get(typeof row?.user_id === 'string' ? row.user_id.trim() : '') ?? {},
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

export const getAdminOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const supabase = getSupabaseClient();
    const { id } = req.params;
    const { data: order, error } = await supabase
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
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }

    let profile: Record<string, any> = {};
    if (typeof order.user_id === 'string' && order.user_id.trim()) {
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, email')
        .eq('id', order.user_id)
        .maybeSingle();
      if (profileError) console.warn('Admin order profile lookup warning:', profileError.message);
      else profile = data ?? {};
    }

    res.status(200).json(normalizeOrderRecord({ ...order, profiles: profile }));
  } catch (error: any) {
    console.error('Admin get order error:', error);
    res.status(500).json({ error: 'Failed to fetch order.', details: error.message });
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
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (currentError) throw currentError;
    if (!currentOrder) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }

    const currentStatus = normalizeOrderStatus(currentOrder.status);
    const nextNormalizedStatus = normalizeOrderStatus(status);

    if (currentStatus === nextNormalizedStatus) {
      res.status(200).json(normalizeOrderRecord(currentOrder));
      return;
    }

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
