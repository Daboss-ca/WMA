import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  isAllowedOrderTransition,
  normalizeOrderRecord,
  normalizeOrderStatus,
  normalizeProductInput,
  normalizeProductRecord,
} from './admin.controller';

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

  it('maps create-product payloads to the exact Supabase product column names and generates an id when absent', () => {
    const payload = {
      title: 'Classic Desk',
      category: 'Table',
      price: '5000',
      imageUrl: 'https://example.com/desk.jpg',
      dimensions: '120 x 60 x 45 cm',
      stock: 8,
    };

    const normalized = normalizeProductInput(payload);

    assert.equal(typeof normalized.id, 'string');
    assert.ok(normalized.id.length > 0);
    assert.equal(normalized.title, 'Classic Desk');
    assert.equal(normalized.category, 'Table');
    assert.equal(normalized.price, 5000);
    assert.equal(normalized.image_url, 'https://example.com/desk.jpg');
    assert.equal(normalized.dimensions, '120 x 60 x 45 cm');
    assert.equal(normalized.stock, 8);
    assert.deepEqual(Object.keys(normalized).sort(), ['category', 'dimensions', 'id', 'image_url', 'price', 'stock', 'title'].sort());
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

  it('unwraps joined profile arrays so admin orders map to real customer names', () => {
    const row = {
      id: 'ord_2',
      user_id: 'user_456',
      total_amount: 5200,
      status: 'Pending Review',
      shipping_address: 'Davao City',
      contact_number: '09181234567',
      payment_method: 'GCash',
      created_at: '2024-02-02T12:00:00.000Z',
      updated_at: '2024-02-04T03:00:00.000Z',
      order_items: [
        {
          product_id: 'prod_2',
          quantity: 2,
          price: 2600,
          products: { title: 'Cafe Table' },
        },
      ],
      profiles: [{
        full_name: 'Maria Santos',
        email: 'maria@example.com',
      }],
    };

    assert.equal(normalizeOrderRecord(row).customer.name, 'Maria Santos');
    assert.equal(normalizeOrderRecord(row).customer.email, 'maria@example.com');
  });

  it('normalizes incoming order statuses and enforces valid admin transitions', () => {
    assert.equal(normalizeOrderStatus('Pending / To Pay'), 'pending_payment');
    assert.equal(normalizeOrderStatus('To Ship'), 'to_ship');
    assert.equal(normalizeOrderStatus('Shipping'), 'shipping');
    assert.equal(isAllowedOrderTransition('pending_payment', 'to_ship'), true);
    assert.equal(isAllowedOrderTransition('pending_payment', 'shipping'), false);
    assert.equal(isAllowedOrderTransition('to_ship', 'completed'), false);
    assert.equal(isAllowedOrderTransition('shipping', 'completed'), false);
  });
});
