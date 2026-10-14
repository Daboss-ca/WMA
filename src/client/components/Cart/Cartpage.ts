import { cartManager, type CartItem } from "../../state/cartManager.js";
import { getCurrentUser } from "../../state/sessionManager.js";
import { buildApiUrl } from "../../config/api.js";

const MIN_QUANTITY = 1;
const MAX_QUANTITY = 20;

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'PHP',
});

function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount);
}

function getItemCount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

// Binago para tanggapin ang filter ng mga napiling items
function getSubtotal(items: CartItem[], selectedIds: Set<string>): number {
  return items
    .filter(item => selectedIds.has(item.id))
    .reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

function dispatchCloseCart(target: HTMLElement): void {
  target.dispatchEvent(
    new CustomEvent('wma:close-cart', { bubbles: true, composed: true })
  );
}

const icons = {
  arrowLeft:
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>',
  remove:
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m2 0-1 13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 7"/></svg>',
  emptyCart:
    '<svg viewBox="0 0 64 64" width="56" height="56" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="54" r="3"/><circle cx="46" cy="54" r="3"/><path d="M6 8h8l6 34h32l6-24H18"/></svg>',
  gcash:
    '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>',
  cod:
    '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M12 12h.01"/><path d="M17 12h.01"/><path d="M7 12h.01"/></svg>'
};

export function createCartPage(): HTMLElement {
  const page = document.createElement('div');
  page.className = 'cart-page';

  // Set para i-track kung aling items ang naka-check para sa checkout
  let selectedItems = new Set<string>();

  async function render(): Promise<void> {
    page.innerHTML = '<div style="padding: 4rem; text-align: center;">Loading your cart...</div>';
    
    await cartManager.fetchCart();
    const items = cartManager.getItems();
    
    // Auto-select lahat ng items sa simula
    selectedItems.clear();
    items.forEach(item => selectedItems.add(item.id));
    
    page.innerHTML = '';
    page.appendChild(buildHeader(items));
    page.appendChild(items.length === 0 ? buildEmptyState() : buildLayout(items));
  }

  // Pang-update ng Order Summary (Subtotal at Total) nang hindi nag-rerefresh ng page
  function updateSummaryUI() {
    const items = cartManager.getItems();
    const subtotal = getSubtotal(items, selectedItems);
    const summaryNode = page.querySelector('.cart-summary');
    
    if (summaryNode) {
      const amountEls = summaryNode.querySelectorAll('.summary-amount');
      amountEls.forEach(el => {
        el.textContent = formatCurrency(subtotal);
      });
    }
  }

  function buildHeader(items: CartItem[]): HTMLElement {
    const header = document.createElement('div');
    header.className = 'cart-page__header';

    const backButton = document.createElement('button');
    backButton.type = 'button';
    backButton.className = 'cart-back-btn';
    backButton.innerHTML = `${icons.arrowLeft}<span>Continue Shopping</span>`;
    backButton.addEventListener('click', () => dispatchCloseCart(page));

    const count = getItemCount(items);
    const title = document.createElement('h1');
    title.className = 'cart-page__title';
    title.append('Your Cart');

    const countSpan = document.createElement('span');
    countSpan.className = 'cart-page__count';
    countSpan.setAttribute('aria-live', 'polite');
    countSpan.textContent = `(${count} ${count === 1 ? 'item' : 'items'})`;
    title.appendChild(countSpan);

    header.appendChild(backButton);
    header.appendChild(title);
    return header;
  }

  function buildEmptyState(): HTMLElement {
    const empty = document.createElement('div');
    empty.className = 'cart-empty';
    empty.innerHTML = `
      <div class="cart-empty__icon">${icons.emptyCart}</div>
      <h2 class="cart-empty__title">Your cart is currently empty</h2>
      <p class="cart-empty__text">Pieces you add will show up here, ready for checkout.</p>
    `;

    const exploreButton = document.createElement('button');
    exploreButton.type = 'button';
    exploreButton.className = 'btn btn--primary';
    exploreButton.textContent = 'Explore the Collection';
    exploreButton.addEventListener('click', () => dispatchCloseCart(page));

    empty.appendChild(exploreButton);
    return empty;
  }

  function buildLayout(items: CartItem[]): HTMLElement {
    const layout = document.createElement('div');
    layout.className = 'cart-page__layout';
    layout.appendChild(buildItemsList(items));
    layout.appendChild(buildSummary(items));
    return layout;
  }

  function buildItemsList(items: CartItem[]): HTMLElement {
    const list = document.createElement('div');
    list.className = 'cart-items';

    items.forEach((item) => {
      const row = document.createElement('div');
      row.className = 'cart-item';
      row.dataset.id = item.id;
      // Dinagdag: Checkbox container at inline styles para sa display flex alignment
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.gap = '1rem';
      
      row.innerHTML = `
        <div class="cart-item__select">
          <input type="checkbox" class="cart-item__checkbox" data-id="${item.id}" ${selectedItems.has(item.id) ? 'checked' : ''} style="width: 20px; height: 20px; cursor: pointer; accent-color: #2563eb;" />
        </div>
        <img class="cart-item__thumb" src="${item.imageUrl}" alt="${item.name}" style="margin: 0;" />
        <div class="cart-item__info" style="flex: 1;">
          <h3 class="cart-item__name">${item.name}</h3>
          <p class="cart-item__meta">${item.category}, ${item.dimensions}</p>
          <p class="cart-item__price">${formatCurrency(item.unitPrice)}</p>
        </div>
        <div class="cart-item__actions">
          <div class="qty-stepper">
            <button type="button" class="qty-stepper__btn" data-action="decrease" aria-label="Decrease quantity" ${
              item.quantity <= MIN_QUANTITY ? 'disabled' : ''
            }>−</button>
            <span class="qty-stepper__value">${item.quantity}</span>
            <button type="button" class="qty-stepper__btn" data-action="increase" aria-label="Increase quantity" ${
              item.quantity >= MAX_QUANTITY ? 'disabled' : ''
            }>+</button>
          </div>
          <button type="button" class="cart-item__remove" data-action="remove">
            ${icons.remove}<span>Remove</span>
          </button>
        </div>
      `;
      list.appendChild(row);
    });

    // Event listener para sa checkboxes
    list.addEventListener('change', (event) => {
      const target = event.target as HTMLInputElement;
      if (target.classList.contains('cart-item__checkbox')) {
        const id = target.dataset.id;
        if (id) {
          if (target.checked) selectedItems.add(id);
          else selectedItems.delete(id);
          updateSummaryUI();
        }
      }
    });

    list.addEventListener('click', (event) => handleItemsListClick(event, items));
    return list;
  }

  async function handleItemsListClick(event: Event, items: CartItem[]): Promise<void> {
    const target = event.target as HTMLElement;
    const actionButton = target.closest<HTMLButtonElement>('[data-action]');
    if (!actionButton) return;

    const row = actionButton.closest<HTMLElement>('.cart-item');
    const id = row?.dataset.id;
    if (!id) return;

    const item = items.find((i) => i.id === id);
    if (!item) return;

    actionButton.style.opacity = '0.5';
    actionButton.style.pointerEvents = 'none';

    switch (actionButton.dataset.action) {
      case 'increase':
        item.quantity += 1;
        await cartManager.updateQuantity(id, item.quantity);
        break;
      case 'decrease':
        item.quantity -= 1;
        await cartManager.updateQuantity(id, item.quantity);
        break;
      case 'remove':
        await cartManager.removeItem(id);
        selectedItems.delete(id);
        render(); // Kapag nag-remove, kailangan talaga i-re-render
        return;
    }
    
    // Targeted DOM update para sa quantity (Walang page refresh!)
    if (row) {
      const valSpan = row.querySelector('.qty-stepper__value');
      if (valSpan) valSpan.textContent = item.quantity.toString();
      
      const decreaseBtn = row.querySelector('[data-action="decrease"]');
      if (decreaseBtn) decreaseBtn.toggleAttribute('disabled', item.quantity <= MIN_QUANTITY);
      
      const increaseBtn = row.querySelector('[data-action="increase"]');
      if (increaseBtn) increaseBtn.toggleAttribute('disabled', item.quantity >= MAX_QUANTITY);
    }
    
    updateSummaryUI();

    actionButton.style.opacity = '1';
    actionButton.style.pointerEvents = 'auto';
  }

  function buildSummary(items: CartItem[]): HTMLElement {
    const subtotal = getSubtotal(items, selectedItems);

    const summary = document.createElement('aside');
    summary.className = 'cart-summary';
    
    summary.innerHTML = `
      <h2 class="cart-summary__title">Order Summary</h2>
      <div class="cart-summary__row">
        <span>Subtotal</span>
        <span class="summary-amount">${formatCurrency(subtotal)}</span>
      </div>
      <p class="cart-summary__note">Shipping calculated at checkout</p>
      <div class="cart-summary__divider"></div>
      <div class="cart-summary__row cart-summary__row--total">
        <span>Total</span>
        <span class="summary-amount">${formatCurrency(subtotal)}</span>
      </div>
      
      <!-- Checkout Form Section -->
      <div class="cart-summary__checkout-form" style="margin-top: 1.5rem; text-align: left;">
        
        <!-- Contact Number (+63 Lock) -->
        <label for="contact-number" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--text-main, #f4ece1);">Contact Number</label>
        <input type="tel" id="contact-number" placeholder="+63 9XX XXX XXXX" value="+63 " style="width: 100%; box-sizing: border-box; padding: 0.85rem; border: 1px solid var(--color-border-strong, rgba(212, 163, 115, 0.32)); border-radius: 8px; background: var(--bg-surface, #261c14); color: var(--text-main, #f4ece1); font-family: inherit; font-size: 0.875rem; outline: none; transition: border-color 0.2s; margin-bottom: 1.25rem;" />

        <!-- Detailed Address Field -->
        <label for="shipping-address" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--text-main, #f4ece1);">Shipping Address</label>
        <textarea id="shipping-address" rows="3" placeholder="Enter Full Delivery Address (e.g., Unit/House #, Street, Barangay, City, Province, Zip Code)" style="width: 100%; box-sizing: border-box; padding: 0.85rem; border: 1px solid var(--color-border-strong, rgba(212, 163, 115, 0.32)); border-radius: 8px; background: var(--bg-surface, #261c14); color: var(--text-main, #f4ece1); font-family: inherit; font-size: 0.875rem; outline: none; transition: border-color 0.2s; margin-bottom: 1.25rem; resize: none;"></textarea>
        
        <!-- Payment Method (Modern Radio Cards) -->
        <label style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.75rem; color: var(--text-main, #f4ece1);">Payment Method</label>
        <div class="payment-methods" style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1.5rem;">
          
          <label class="payment-option" style="cursor: pointer;">
            <input type="radio" name="payment_method" value="gcash" checked style="display: none;" />
            <div class="payment-card" data-selected="true" style="border: 2px solid var(--accent-primary, #d4a373); background: rgba(212, 163, 115, 0.12); border-radius: 10px; padding: 1rem 0.5rem; text-align: center; transition: all 0.2s;">
              <div style="color: var(--accent-primary, #d4a373); margin-bottom: 0.5rem;">${icons.gcash}</div>
              <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-main, #f4ece1);">GCash</div>
            </div>
          </label>

          <label class="payment-option" style="cursor: pointer;">
            <input type="radio" name="payment_method" value="cod" style="display: none;" />
            <div class="payment-card" data-selected="false" style="border: 2px solid var(--color-border, rgba(212, 163, 115, 0.18)); background: var(--bg-surface, #261c14); border-radius: 10px; padding: 1rem 0.5rem; text-align: center; transition: all 0.2s;">
              <div style="color: var(--text-muted, #d4a373); margin-bottom: 0.5rem;">${icons.cod}</div>
              <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-main, #f4ece1);">COD</div>
            </div>
          </label>
          
        </div>

        <!-- Inline Message Container -->
        <div id="checkout-message" style="display: none; padding: 0.85rem; border-radius: 8px; margin-bottom: 1rem; font-size: 0.875rem; text-align: center; font-weight: 500; transition: all 0.3s ease;"></div>
      </div>
    `;

    const checkoutForm = summary.querySelector('.cart-summary__checkout-form') as HTMLElement;
    const addressInput = summary.querySelector('#shipping-address') as HTMLTextAreaElement;
    const contactInput = summary.querySelector('#contact-number') as HTMLInputElement;
    const messageBox = summary.querySelector('#checkout-message') as HTMLElement;
    const radioInputs = summary.querySelectorAll<HTMLInputElement>('input[name="payment_method"]');

    // Force "+63 " formatting sa contact number
    contactInput.addEventListener('input', () => {
      if (!contactInput.value.startsWith('+63')) {
        contactInput.value = '+63 ';
      }
    });

    // UI Logic para sa Radio Cards (modern toggle effect)
    radioInputs.forEach(radio => {
      radio.addEventListener('change', (e) => {
        summary.querySelectorAll('.payment-card').forEach(card => {
          const el = card as HTMLElement;
          el.style.borderColor = 'var(--color-border, rgba(212, 163, 115, 0.18))';
          el.style.backgroundColor = 'var(--bg-surface, #261c14)';
          const textEl = el.querySelector('div:last-child') as HTMLElement;
          textEl.style.color = 'var(--text-main, #f4ece1)';
          const iconEl = el.querySelector('div:first-child') as HTMLElement;
          iconEl.style.color = 'var(--text-muted, #d4a373)';
        });

        const target = e.target as HTMLInputElement;
        const parentCard = target.nextElementSibling as HTMLElement;
        if (parentCard) {
          parentCard.style.borderColor = 'var(--accent-primary, #d4a373)';
          parentCard.style.backgroundColor = 'rgba(212, 163, 115, 0.12)';
          const textEl = parentCard.querySelector('div:last-child') as HTMLElement;
          textEl.style.color = 'var(--text-main, #f4ece1)';
          const iconEl = parentCard.querySelector('div:first-child') as HTMLElement;
          iconEl.style.color = 'var(--accent-primary, #d4a373)';
        }
      });
    });

    const checkoutButton = document.createElement('button');
    checkoutButton.type = 'button';
    checkoutButton.className = 'btn btn--primary btn--full';
    checkoutButton.textContent = 'Proceed to Checkout';
    checkoutButton.style.padding = '0.85rem';
    checkoutButton.style.borderRadius = '8px';
    checkoutButton.style.fontWeight = '600';
    checkoutForm.appendChild(checkoutButton);

    const showMessage = (type: 'success' | 'error', text: string) => {
      messageBox.style.display = 'block';
      messageBox.textContent = text;
      if (type === 'success') {
        messageBox.style.backgroundColor = '#dcfce7'; 
        messageBox.style.color = '#166534'; 
        messageBox.style.border = '1px solid #bbf7d0';
      } else {
        messageBox.style.backgroundColor = '#fee2e2'; 
        messageBox.style.color = '#991b1b'; 
        messageBox.style.border = '1px solid #fecaca';
      }
    };

    checkoutButton.addEventListener('click', async () => {
      const user = getCurrentUser();
      
      if (!user) {
        showMessage('error', 'Please log in first to proceed with checkout.');
        return;
      }

      if (selectedItems.size === 0) {
        showMessage('error', 'Please select at least one item to checkout.');
        return;
      }

      const contactNumber = contactInput.value.trim();
      if (contactNumber.length < 10) {
        showMessage('error', 'Please provide a valid contact number.');
        contactInput.focus();
        contactInput.style.borderColor = 'var(--color-danger, #ef4444)';
        return;
      }
      contactInput.style.borderColor = 'var(--color-border-strong, rgba(212, 163, 115, 0.32))';

      const shippingAddress = addressInput.value.trim();
      if (!shippingAddress) {
        showMessage('error', 'Please provide your full shipping address.');
        addressInput.focus();
        addressInput.style.borderColor = 'var(--color-danger, #ef4444)';
        return;
      }
      addressInput.style.borderColor = 'var(--color-border-strong, rgba(212, 163, 115, 0.32))'; 

      const selectedPaymentMethod = Array.from(radioInputs).find(r => r.checked)?.value || 'gcash';

      checkoutButton.disabled = true;
      checkoutButton.textContent = 'Processing order...';
      checkoutButton.style.opacity = '0.7';
      messageBox.style.display = 'none';

      try {
        const response = await fetch(buildApiUrl('/orders/checkout'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user.id,
            shipping_address: shippingAddress,
            contact_number: contactNumber,
            payment_method: selectedPaymentMethod,
            selected_items: Array.from(selectedItems)
          }),
        });

        const result = await response.json();

        if (response.ok) {
          showMessage('success', 'Order placed successfully!');
          document.dispatchEvent(new CustomEvent('wma:order-created'));
          document.dispatchEvent(new CustomEvent('wma:cart-updated'));
          await cartManager.fetchCart();
          await render();
        } else {
          showMessage('error', result.error || 'Checkout failed. Please try again.');
          checkoutButton.disabled = false;
          checkoutButton.textContent = 'Proceed to Checkout';
          checkoutButton.style.opacity = '1';
        }
      } catch (error) {
        console.error('Checkout Error:', error);
        showMessage('error', 'Network error. Please check your connection.');
        checkoutButton.disabled = false;
        checkoutButton.textContent = 'Proceed to Checkout';
        checkoutButton.style.opacity = '1';
      }
    });

    return summary;
  }

  render();

  return page;
}