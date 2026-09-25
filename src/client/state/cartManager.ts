export interface CartItem {
  id: string;
  name: string;
  category: string;
  dimensions: string;
  unitPrice: number;
  quantity: number;
  imageUrl: string;
}

// Dito maiipon ang mga idinagdag na furniture
let cartItems: CartItem[] = [];

export const cartManager = {
  // Kunin ang lahat ng nasa cart
  getItems: (): CartItem[] => [...cartItems],
  
  // Magdagdag ng item mula sa catalog
  addItem: (newItem: Omit<CartItem, 'quantity'>): void => {
    const existing = cartItems.find(item => item.id === newItem.id);
    if (existing) {
      existing.quantity += 1; // Dagdagan ang quantity kung nandun na
    } else {
      cartItems.push({ ...newItem, quantity: 1 }); // Idagdag bilang bagong item
    }
    document.dispatchEvent(new CustomEvent('wma:cart-updated'));
  },
  
  // Baguhin ang dami (gamit ang + / - buttons sa cart)
  updateQuantity: (id: string, newQuantity: number): void => {
    const item = cartItems.find(item => item.id === id);
    if (item) {
      item.quantity = Math.max(1, Math.min(20, newQuantity));
      document.dispatchEvent(new CustomEvent('wma:cart-updated'));
    }
  },
  
  // Tanggalin ang item sa cart
  removeItem: (id: string): void => {
    cartItems = cartItems.filter(item => item.id !== id);
    document.dispatchEvent(new CustomEvent('wma:cart-updated'));
  },

  // Linisin ang buong cart (hal. pagkatapos mag-checkout)
  clearCart: (): void => {
    cartItems = [];
    document.dispatchEvent(new CustomEvent('wma:cart-updated'));
  }
};