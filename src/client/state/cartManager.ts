import { getCurrentUser } from "./sessionManager.js";

export interface CartItem {
  id: string; // Database cart_items ID
  productId: string;
  name: string;
  category: string;
  dimensions: string;
  unitPrice: number;
  quantity: number;
  imageUrl: string;
}

let cartItems: CartItem[] = [];

export const cartManager = {
  // Kunin ang latest state sa memory
  getItems: (): CartItem[] => [...cartItems],

  // FETCH: Kunin ang items galing database
  fetchCart: async (): Promise<void> => {
    const user = getCurrentUser();
    if (!user || !user.id) {
      cartItems = [];
      document.dispatchEvent(new CustomEvent('wma:cart-updated'));
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/cart/${user.id}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch cart.');
      }
      
      cartItems = data.items.map((item: any) => ({
        id: item.id,
        productId: item.product_id,
        quantity: item.quantity,
        name: item.product_name || item.product_id,
        category: 'Furniture',
        dimensions: 'Standard',
        unitPrice: item.price || 100, 
        imageUrl: item.image_url || '/placeholder.jpg' 
      }));

      document.dispatchEvent(new CustomEvent('wma:cart-updated'));
    } catch (error) {
      console.error('Error fetching cart:', error);
    }
  },
  
  // ADD: Magdagdag ng item papunta sa backend (tinanggal ang success alert)
  addItem: async (newItem: { id: string; [key: string]: any }): Promise<void> => {
    const user = getCurrentUser();

    if (!user || !user.id) {
      alert('You must be logged in to add to cart.');
      return;
    }

    const prodId = newItem.productId || newItem.id;
    const existing = cartItems.find(item => item.productId === prodId);
    const newQuantity = existing ? existing.quantity + 1 : 1;

    try {
      const response = await fetch('http://localhost:5000/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          productId: prodId,
          quantity: newQuantity
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add item to cart.');
      }
      
      await cartManager.fetchCart(); // I-refresh ang data at i-update ang header badge nang walang alert
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert(error instanceof Error ? error.message : 'Could not add to cart. Please try again.');
    }
  },
  
  // UPDATE: Baguhin ang dami (papunta sa backend)
  updateQuantity: async (id: string, newQuantity: number): Promise<void> => {
    const user = getCurrentUser();
    if (!user || !user.id) return;
    const targetItem = cartItems.find(item => item.id === id);
    if (!targetItem) return;

    const validQuantity = Math.max(1, Math.min(20, newQuantity));
    
    try {
      const response = await fetch('http://localhost:5000/api/cart', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          productId: targetItem.productId,
          quantity: validQuantity
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update cart quantity.');
      }

      await cartManager.fetchCart();
    } catch (error) {
      console.error('Error updating quantity:', error);
    }
  },
  
  // REMOVE: Tanggalin sa backend database
  removeItem: async (id: string): Promise<void> => {
    try {
      const response = await fetch(`http://localhost:5000/api/cart/${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove item from cart.');
      }

      await cartManager.fetchCart();
    } catch (error) {
      console.error('Error removing item:', error);
    }
  },

  clearCart: (): void => {
    cartItems = [];
    document.dispatchEvent(new CustomEvent('wma:cart-updated'));
  }
};