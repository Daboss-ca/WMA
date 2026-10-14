import test from 'node:test';
import assert from 'node:assert/strict';

import { buildCheckoutOrderItems, sanitizeNumericValue } from './order.controller';

test('sanitizeNumericValue rounds and bounds monetary amounts safely', () => {
  assert.equal(sanitizeNumericValue('123.456'), 123.46);
  assert.equal(sanitizeNumericValue('99999999.995'), 99999999.99);
  assert.equal(sanitizeNumericValue('NaN'), 0);
  assert.equal(sanitizeNumericValue('1e12'), 99999999.99);
});

test('buildCheckoutOrderItems sums valid item totals without overflow', () => {
  const result = buildCheckoutOrderItems([
    { product_id: 'p1', quantity: '2', products: { price: '199.995' } },
    { product_id: 'p2', quantity: '3', products: { price: '50.10' } },
    { product_id: 'p3', quantity: '0', products: { price: '999' } },
    { product_id: 'p4', quantity: '2', products: { price: 'abc' } },
  ]);

  assert.deepEqual(result.orderItems, [
    { product_id: 'p1', quantity: 2, price: 200 },
    { product_id: 'p2', quantity: 3, price: 50.1 },
  ]);
  assert.equal(result.total_amount, 550.3);
});
