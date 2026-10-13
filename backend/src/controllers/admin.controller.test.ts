import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { normalizeOrderRecord, normalizeProductRecord } from './admin.controller';

describe('admin controller data normalization', () => {
  it('converts a Supabase product row into the admin Product shape', () => {
    const row = {
      id: 'prod_1',
      title: 'Heritage Newspaper Kiosk',
      description: 'Hand-jointed mahogany kiosk.',
      category: 'Kiosk',
      price: 18500,
      dimensions: { width: 60, height: 180, depth: 45, unit: 'cm' },
      image_url: 'https://example.com/kiosk.jpg',
      created_at: '2024-01-02T10:00:00.000Z',
      updated_at: '2024-01-05T09:00:00.000Z',
    };

    assert.deepEqual(normalizeProductRecord(row), {
      id: 'prod_1',
      title: 'Heritage Newspaper Kiosk',
      description: 'Hand-jointed mahogany kiosk.',
      category: 'Kiosk',
      price: 18500,
      dimensions: { width: 60, height: 180, depth: 45, unit: 'cm' },
      imageUrl: 'https://example.com/kiosk.jpg',
      createdAt: '2024-01-02T10:00:00.000Z',
      updatedAt: '2024-01-05T09:00:00.000Z',
    });
  });

  it('converts a Supabase order row into the admin Order shape', () => {
    const row = {
      id: 'ord_1',
      reference: 'WMA-2610-1001',
      user_id: 'user_123',
      total_amount: 18500,
      status: 'Pending',
      shipping_address: 'Quezon City',
      contact_number: '09170001001',
      payment_method: 'GCash',
      created_at: '2024-01-02T10:00:00.000Z',
      updated_at: '2024-01-03T10:00:00.000Z',
      order_items: [
        {
          product_id: 'prod_1',
          quantity: 1,
          price: 18500,
          products: { title: 'Heritage Newspaper Kiosk' },
        },
      ],
      profiles: {
        full_name: 'Maria Santos',
        email: 'maria@example.com',
      },
    };

    assert.deepEqual(normalizeOrderRecord(row), {
      id: 'ord_1',
      reference: 'WMA-2610-1001',
      customer: {
        name: 'Maria Santos',
        email: 'maria@example.com',
        phone: '09170001001',
        address: 'Quezon City',
      },
      items: [
        {
          productId: 'prod_1',
          title: 'Heritage Newspaper Kiosk',
          unitPrice: 18500,
          quantity: 1,
        },
      ],
      total: 18500,
      status: 'pending_payment',
      paymentProof: null,
      statusHistory: [
        { status: 'pending_payment', at: '2024-01-02T10:00:00.000Z' },
      ],
      createdAt: '2024-01-02T10:00:00.000Z',
      updatedAt: '2024-01-03T10:00:00.000Z',
    });
  });
});
