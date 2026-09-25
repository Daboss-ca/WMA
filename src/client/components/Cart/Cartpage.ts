import { cartManager, type CartItem } from "../../state/cartManager.js";

const MIN_QUANTITY = 1;
const MAX_QUANTITY = 20;

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount);
}

function getItemCount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

function getSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

function dispatchCloseCart(target: HTMLElement): void {
  target.dispatchEvent(
    new CustomEvent('wma:close-cart', { bubbles: true, composed: true })
  );
}

/* ---------- inline icons ---------- */
const icons = {
  arrowLeft:
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>',
  remove:
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m2 0-1 13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 7"/></svg>',
  emptyCart:
    '<svg viewBox="0 0 64 64" width="56" height="56" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="54" r="3"/><circle cx="46" cy="54" r="3"/><path d="M6 8h8l6 34h32l6-24H18"/></svg>',
};

export function createCartPage(): HTMLElement {
  const page = document.createElement('div');
  page.className = 'cart-page';

  function render(): void {
    const items = cartManager.getItems(); // Kunin ang fresh data
    page.innerHTML = '';
    page.appendChild(buildHeader(items));
    page.appendChild(items.length === 0 ? buildEmptyState() : buildLayout(items));
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
      row.innerHTML = `
        <img class="cart-item__thumb" src="${item.imageUrl}" alt="${item.name}" />
        <div class="cart-item__info">
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

    list.addEventListener('click', (event) => handleItemsListClick(event, items));
    return list;
  }

  function handleItemsListClick(event: Event, items: CartItem[]): void {
    const target = event.target as HTMLElement;
    const actionButton = target.closest<HTMLButtonElement>('[data-action]');
    if (!actionButton) return;

    const row = actionButton.closest<HTMLElement>('.cart-item');
    const id = row?.dataset.id;
    if (!id) return;

    const item = items.find((i) => i.id === id);
    if (!item) return;

    switch (actionButton.dataset.action) {
      case 'increase':
        cartManager.updateQuantity(id, item.quantity + 1);
        render(); // Re-render agad gamit ang updated state
        break;
      case 'decrease':
        cartManager.updateQuantity(id, item.quantity - 1);
        render();
        break;
      case 'remove':
        cartManager.removeItem(id);
        render();
        break;
    }
  }

  function buildSummary(items: CartItem[]): HTMLElement {
    const subtotal = getSubtotal(items);

    const summary = document.createElement('aside');
    summary.className = 'cart-summary';
    summary.innerHTML = `
      <h2 class="cart-summary__title">Order Summary</h2>
      <div class="cart-summary__row">
        <span>Subtotal</span>
        <span>${formatCurrency(subtotal)}</span>
      </div>
      <p class="cart-summary__note">Shipping calculated at checkout</p>
      <div class="cart-summary__divider"></div>
      <div class="cart-summary__row cart-summary__row--total">
        <span>Total</span>
        <span>${formatCurrency(subtotal)}</span>
      </div>
    `;

    const checkoutButton = document.createElement('button');
    checkoutButton.type = 'button';
    checkoutButton.className = 'btn btn--primary btn--full';
    checkoutButton.textContent = 'Proceed to Checkout';
    checkoutButton.addEventListener('click', () => {
      console.log('Proceeding to checkout with:', cartManager.getItems());
    });

    summary.appendChild(checkoutButton);
    return summary;
  }

  // Initial render setup
  render();
  return page;
}