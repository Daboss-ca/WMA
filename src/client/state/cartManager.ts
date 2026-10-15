import { getCurrentUser } from "./sessionManager.js";
import { buildApiUrl } from "../config/api.js";
import { normalizeImagePath } from "../utils/imagePaths.js";

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  category: string;
  dimensions: string;
  unitPrice: number;
  quantity: number;
  imageUrl: string;
}

const CART_STORAGE_KEY_PREFIX = 'wma_cart_items';
const GUEST_CART_STORAGE_KEY = `${CART_STORAGE_KEY_PREFIX}:guest`;
let cartSyncPromise: Promise<void> | null = null;

let cartItems: CartItem[] = [];
let activeCartOwnerId = getCurrentUser()?.id ?? null;

function getActiveCartStorageKey(): string {
  const user = getCurrentUser();

  if (user?.id) {
    return `${CART_STORAGE_KEY_PREFIX}:${user.id}`;
  }
  return GUEST_CART_STORAGE_KEY;
}

const normalizeCartItem = (input: any): CartItem | null => {
  const productId = String(
    input?.productId ??
    input?.product_id ??
    input?.id ??
    ''
  ).trim();
  if (!productId) return null;

  const quantity = Number(input?.quantity ?? 1);
  const unitPrice = Number(input?.unitPrice ?? input?.price ?? input?.amount ?? 0);
  const name =
    typeof input?.name === 'string' && input.name.trim()
      ? input.name.trim()
      : typeof input?.title === 'string' && input.title.trim()
        ? input.title.trim()
        : 'Custom Item';
  const category =
    typeof input?.category === 'string' && input.category.trim()
      ? input.category.trim()
      : 'General';
  const dimensions =
    typeof input?.dimensions === 'string' && input.dimensions.trim()
      ? input.dimensions.trim()
      : 'Standard';
  const imageUrl =
    typeof input?.imageUrl === 'string' && input.imageUrl.trim()
      ? normalizeImagePath(input.imageUrl.trim())
      : typeof input?.image === 'string' && input.image.trim()
      ? normalizeImagePath(input.image.trim())
        : typeof input?.image_url === 'string' && input.image_url.trim()
          ? normalizeImagePath(input.image_url.trim())
          : '/placeholder.jpg';

  return {
    id: String(input?.id ?? productId),
    productId,
    name,
    category,
    dimensions,
    unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
    quantity: Number.isFinite(quantity) && quantity > 0 ? Math.round(quantity) : 1,
    imageUrl,
  };
};

function persistCart(): void {
  const key = getActiveCartStorageKey();

  try {
    localStorage.setItem(key, JSON.stringify(cartItems));
  } catch {
    // ignore storage failures; cart still remains in memory
  }
}

function readPersistedCart(key = getActiveCartStorageKey()): CartItem[] {
  try {
    const raw = localStorage.getItem(key) ?? sessionStorage.getItem(key);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const items = parsed
      .map((entry) => normalizeCartItem(entry))
      .filter((entry): entry is CartItem => entry !== null);

    return items;
  } catch {
    return [];
  }
}

function mergeCartItems(baseItems: CartItem[], additionalItems: CartItem[], addQuantities: boolean): CartItem[] {
  const merged = new Map<string, CartItem>();
  for (const item of baseItems) merged.set(item.productId, { ...item });

  for (const item of additionalItems) {
    const current = merged.get(item.productId);
    if (!current) {
      merged.set(item.productId, { ...item });
      continue;
    }

    const hasUsefulText = (value: string, generic: string): boolean => Boolean(value.trim() && value !== generic);
    const quantity = addQuantities ? current.quantity + item.quantity : current.quantity;
    merged.set(item.productId, {
      ...current,
      id: current.id || item.id,
      name: hasUsefulText(current.name, 'Custom Item') ? current.name : item.name,
      category: hasUsefulText(current.category, 'General') ? current.category : item.category,
      dimensions: hasUsefulText(current.dimensions, 'Standard') ? current.dimensions : item.dimensions,
      unitPrice: current.unitPrice > 0 ? current.unitPrice : item.unitPrice,
      imageUrl: current.imageUrl && current.imageUrl !== '/placeholder.jpg' ? current.imageUrl : item.imageUrl,
      quantity: Math.min(20, quantity),
    });
  }

  return [...merged.values()];
}

async function fetchServerCart(userId: string): Promise<CartItem[]> {
  const response = await fetch(buildApiUrl(`/cart/${userId}`));
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || 'Failed to fetch cart.');

  return (Array.isArray(data?.items) ? data.items : [])
    .map((item: any) => mergeFetchedCartItem(item))
    .filter((item: CartItem | null): item is CartItem => item !== null);
}

async function writeCartItemToServer(userId: string, item: CartItem): Promise<void> {
  const response = await fetch(buildApiUrl('/cart'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      productId: item.productId,
      name: item.name,
      category: item.category,
      dimensions: item.dimensions,
      unitPrice: item.unitPrice,
      imageUrl: item.imageUrl,
      quantity: item.quantity,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || 'Failed to sync cart item.');
}

async function syncAuthenticatedCart(userId: string): Promise<void> {
  const userStorageKey = `${CART_STORAGE_KEY_PREFIX}:${userId}`;
  const guestItems = readPersistedCart(GUEST_CART_STORAGE_KEY);
  const localUserItems = readPersistedCart(userStorageKey);

  try {
    const serverItems = await fetchServerCart(userId);
    let mergedItems = mergeCartItems(serverItems, localUserItems, false);
    mergedItems = mergeCartItems(mergedItems, guestItems, true);

    cartItems = mergedItems;
    notifyCartUpdate();

    // The endpoint upserts quantity, so write the final merged quantity once per product.
    // Remove each guest entry only after its final quantity has reached the server.
    const guestProductIds = new Set(guestItems.map((item) => item.productId));
    const remainingGuestItems = new Map(guestItems.map((item) => [item.productId, item]));
    for (const item of mergedItems) {
      await writeCartItemToServer(userId, item);
      if (guestProductIds.has(item.productId)) {
        remainingGuestItems.delete(item.productId);
        localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify([...remainingGuestItems.values()]));
      }
    }

    localStorage.removeItem(GUEST_CART_STORAGE_KEY);
    sessionStorage.removeItem(GUEST_CART_STORAGE_KEY);
    persistCart();
    try {
      const refreshedItems = await fetchServerCart(userId);
      cartItems = mergeCartItems(refreshedItems, mergedItems, false);
    } catch (error) {
      console.error('Error refreshing synced cart:', error);
    }
    emitCartUpdate();
  } catch (error) {
    // Keep both the merged local cart and guest copy so a later login can retry.
    cartItems = mergeCartItems(localUserItems, readPersistedCart(GUEST_CART_STORAGE_KEY), true);
    notifyCartUpdate();
    console.error('Error syncing guest cart:', error);
  }
}

function emitCartUpdate(): void {
  persistCart();
  notifyCartUpdate();
}

function notifyCartUpdate(): void {
  document.dispatchEvent(new CustomEvent('wma:cart-updated'));
}

/**
 * Some cart API responses contain only cart-row data or placeholder product
 * details. Keep the real product details already saved by the client when the
 * server response does not provide a meaningful value.
 */
function mergeFetchedCartItem(input: any, localItem?: CartItem): CartItem | null {
  const productId = String(
    input?.productId ?? input?.product_id ?? localItem?.productId ?? input?.id ?? ''
  ).trim();

  if (!productId) return null;

  const serverName = [input?.name, input?.title, input?.productName].find(
    (value) => typeof value === 'string' && value.trim() && value.trim() !== 'Custom Item'
  );
  const serverCategory = typeof input?.category === 'string'
    && input.category.trim()
    && input.category.trim() !== 'General'
    ? input.category.trim()
    : undefined;
  const serverDimensions = typeof input?.dimensions === 'string'
    && input.dimensions.trim()
    && input.dimensions.trim() !== 'Standard'
    ? input.dimensions.trim()
    : undefined;

  const rawPrice = input?.unitPrice ?? input?.price ?? input?.amount;
  const parsedPrice = Number(rawPrice);
  const serverPrice = rawPrice !== null && rawPrice !== undefined
    && rawPrice !== '' && Number.isFinite(parsedPrice) && parsedPrice > 0
    ? parsedPrice
    : undefined;

  const rawImage = input?.imageUrl ?? input?.image_url ?? input?.image ?? input?.thumbnail;
  const serverImage = typeof rawImage === 'string'
    && rawImage.trim()
    && rawImage.trim() !== '/placeholder.jpg'
    ? rawImage.trim()
    : undefined;

  return normalizeCartItem({
    ...input,
    id: input?.id ?? localItem?.id ?? productId,
    productId,
    name: serverName ?? localItem?.name ?? input?.name,
    category: serverCategory ?? localItem?.category ?? input?.category,
    dimensions: serverDimensions ?? localItem?.dimensions ?? input?.dimensions,
    unitPrice: serverPrice ?? localItem?.unitPrice ?? parsedPrice,
    imageUrl: serverImage ?? localItem?.imageUrl ?? rawImage,
    quantity: input?.quantity ?? localItem?.quantity ?? 1,
  });
}

const hydrateCart = (): void => {
  const stored = readPersistedCart();
  if (stored.length > 0) {
    cartItems = stored;
  }
};

hydrateCart();

export const cartManager = {
  getItems: (): CartItem[] => [...cartItems],

  fetchCart: async (): Promise<void> => {
    if (cartSyncPromise) await cartSyncPromise;
    const user = getCurrentUser();
    if (!user || !user.id) {
      cartItems = readPersistedCart();
      notifyCartUpdate();
      return;
    }

    try {
      const fetchedItems = await fetchServerCart(user.id);

      // Match API cart rows with locally saved product details by product ID.
      // The API may currently return generic values such as Custom Item / 0.
      const localItems = readPersistedCart();
      const localByProductId = new Map<string, CartItem>();
      [...localItems, ...cartItems].forEach((item) => {
        localByProductId.set(item.productId, item);
      });

      const nextItems = fetchedItems.map((item) => {
        const localItem = localByProductId.get(item.productId);
        return localItem ? mergeCartItems([item], [localItem], false)[0] : item;
      });

      cartItems = nextItems;
      emitCartUpdate();
    } catch (error) {
      console.error('Error fetching cart:', error);
      const userId = getCurrentUser()?.id;
      cartItems = userId
        ? mergeCartItems(
            readPersistedCart(`${CART_STORAGE_KEY_PREFIX}:${userId}`),
            readPersistedCart(GUEST_CART_STORAGE_KEY),
            true,
          )
        : readPersistedCart(GUEST_CART_STORAGE_KEY);
      notifyCartUpdate();
    }
  },

  addItem: async (newItem: any): Promise<void> => {
    if (cartSyncPromise) await cartSyncPromise;
    const user = getCurrentUser();
    const normalized = normalizeCartItem({
      ...newItem,
      id: newItem?.id ?? newItem?.productId ?? newItem?.product_id,
      productId: newItem?.productId ?? newItem?.product_id ?? newItem?.id,
      name: newItem?.name ?? newItem?.title ?? newItem?.productName ?? 'Custom Item',
      title: newItem?.title ?? newItem?.name ?? newItem?.productName ?? 'Custom Item',
      category: newItem?.category ?? 'General',
      dimensions: newItem?.dimensions ?? 'Standard',
      unitPrice: newItem?.unitPrice ?? newItem?.price ?? newItem?.amount ?? 0,
      price: newItem?.price ?? newItem?.unitPrice ?? newItem?.amount ?? 0,
      imageUrl: newItem?.imageUrl ?? newItem?.image ?? newItem?.image_url ?? newItem?.thumbnail ?? '/placeholder.jpg',
    });

    if (!normalized) {
      console.warn('Cart add ignored: missing product id.', newItem);
      return;
    }

    const existing = cartItems.find((item) => item.productId === normalized.productId);
    const nextItems = existing
      ? cartItems.map((item) =>
          item.productId === normalized.productId
            ? { ...item, quantity: item.quantity + normalized.quantity, unitPrice: normalized.unitPrice || item.unitPrice }
            : item
        )
      : [...cartItems, normalized];

    cartItems = nextItems;
    persistCart();

    if (!user || !user.id) {
      emitCartUpdate();
      return;
    }

    try {
      const response = await fetch(buildApiUrl('/cart'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          productId: normalized.productId,
          name: normalized.name,
          category: normalized.category,
          dimensions: normalized.dimensions,
          unitPrice: normalized.unitPrice,
          imageUrl: normalized.imageUrl,
          quantity: normalized.quantity,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to add item to cart.');
      }

      await cartManager.fetchCart();
    } catch (error) {
      console.error('Error adding to cart:', error);
      emitCartUpdate();
    }
  },

  updateQuantity: async (id: string, newQuantity: number): Promise<void> => {
    if (cartSyncPromise) await cartSyncPromise;
    const user = getCurrentUser();
    const targetItem = cartItems.find((item) => item.id === id || item.productId === id);
    if (!targetItem) return;

    const validQuantity = Math.max(1, Math.min(20, Number(newQuantity) || 1));
    const nextItems = cartItems.map((item) =>
      item.id === id || item.productId === id ? { ...item, quantity: validQuantity } : item
    );

    cartItems = nextItems;
    persistCart();

    if (!user || !user.id) {
      emitCartUpdate();
      return;
    }

    try {
      const response = await fetch(buildApiUrl('/cart'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          productId: targetItem.productId,
          name: targetItem.name,
          category: targetItem.category,
          dimensions: targetItem.dimensions,
          unitPrice: targetItem.unitPrice,
          imageUrl: targetItem.imageUrl,
          quantity: validQuantity,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to update cart quantity.');

      await cartManager.fetchCart();
    } catch (error) {
      console.error('Error updating quantity:', error);
      emitCartUpdate();
    }
  },

  removeItem: async (id: string): Promise<void> => {
    if (cartSyncPromise) await cartSyncPromise;
    const nextItems = cartItems.filter((item) => item.id !== id && item.productId !== id);
    cartItems = nextItems;
    persistCart();

    try {
      const response = await fetch(buildApiUrl(`/cart/${id}`), {
        method: 'DELETE',
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to remove item from cart.');

      await cartManager.fetchCart();
    } catch (error) {
      console.error('Error removing item:', error);
      emitCartUpdate();
    }
  },

  clearCart: (): void => {
    cartItems = [];
    const activeKey = getActiveCartStorageKey();
    localStorage.removeItem(activeKey);
    sessionStorage.removeItem(activeKey);
    document.dispatchEvent(new CustomEvent('wma:cart-updated'));
  },
};

document.addEventListener('wma:session-cleared', () => {
  if (cartItems.length > 0) {
    const persistedKey = activeCartOwnerId
      ? `${CART_STORAGE_KEY_PREFIX}:${activeCartOwnerId}`
      : GUEST_CART_STORAGE_KEY;
    localStorage.setItem(persistedKey, JSON.stringify(cartItems));
  }
});

document.addEventListener('wma:auth-changed', (event: Event) => {
  const detail = (event as CustomEvent).detail as { user?: { id?: string } | null; userId?: string | null; reason?: string } | undefined;
  const nextUserId = detail?.userId ?? detail?.user?.id ?? null;

  if (nextUserId) {
    activeCartOwnerId = nextUserId;
    const syncPromise = syncAuthenticatedCart(nextUserId);
    cartSyncPromise = syncPromise;
    void syncPromise.finally(() => {
      if (cartSyncPromise === syncPromise) cartSyncPromise = null;
    });
    return;
  }

  activeCartOwnerId = null;
  cartItems = readPersistedCart(GUEST_CART_STORAGE_KEY);
  emitCartUpdate();
});

const initialUser = getCurrentUser();
if (initialUser?.id) {
  const syncPromise = syncAuthenticatedCart(initialUser.id);
  cartSyncPromise = syncPromise;
  void syncPromise.finally(() => {
    if (cartSyncPromise === syncPromise) cartSyncPromise = null;
  });
}
