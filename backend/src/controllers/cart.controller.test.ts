import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { mapCartItem } from './cart.controller';

describe('mapCartItem', () => {
  it('falls back to custom item values when the product relation is missing', () => {
    const item = {
      id: 'cart_1',
      product_id: 'prod_missing',
      quantity: 1,
      products: null,
    };

    assert.deepEqual(mapCartItem(item), {
      id: 'cart_1',
      product_id: 'prod_missing',
      quantity: 1,
      name: 'Custom Item',
      category: 'General',
      dimensions: 'Standard',
      price: 0,
      image_url: '',
    });
  });

  it('maps product data when the join succeeds', () => {
    const item = {
      id: 'cart_2',
      product_id: 'prod_123',
      quantity: 2,
      products: {
        title: 'Oak Table',
        category: 'Living Room',
        price: 4999,
        dimensions: '120x60',
        image_url: 'https://example.com/oak-table.jpg',
      },
    };

    assert.deepEqual(mapCartItem(item), {
      id: 'cart_2',
      product_id: 'prod_123',
      quantity: 2,
      name: 'Oak Table',
      category: 'Living Room',
      dimensions: '120x60',
      price: 4999,
      image_url: 'https://example.com/oak-table.jpg',
    });
  });
});
