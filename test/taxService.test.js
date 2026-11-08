// test/taxService.test.js - run with: npm test
const test = require('node:test');
const assert = require('node:assert');
const { calculateTax } = require('../services/taxService');

test('zero or invalid income gives zero tax', () => {
  assert.strictEqual(calculateTax(0).estimatedTax, 0);
  assert.strictEqual(calculateTax(-500).estimatedTax, 0);
  assert.strictEqual(calculateTax(NaN).estimatedTax, 0);
});

test('income at the R99 000 threshold is fully covered by the rebate', () => {
  assert.strictEqual(calculateTax(99000).estimatedTax, 0);
});

test('first bracket boundary (R245 100)', () => {
  assert.strictEqual(calculateTax(245100).estimatedTax, 1); // 44 118 - 17 820
});

test('second bracket boundary (R383 100)', () => {
  assert.strictEqual(calculateTax(383100).estimatedTax, 62178); // 79 998 - 17 820
});

test('mid-bracket income (R500 000)', () => {
  assert.strictEqual(calculateTax(500000).estimatedTax, 98417); // 79 998 + 31% x 116 900 - 17 820
});

test('top bracket uses 45%', () => {
  const r = calculateTax(2000000);
  assert.strictEqual(r.marginalRate, 45);
  assert.strictEqual(r.estimatedTax, 666339 + 0.45 * (2000000 - 1878600) - 17820);
});

test('net income plus tax equals gross income', () => {
  const r = calculateTax(1000);
  assert.strictEqual(r.netIncome + r.estimatedTax, r.grossIncome);
});

test('breakdown slices add up to gross income', () => {
  const r = calculateTax(500000);
  const total = r.breakdown.reduce((sum, s) => sum + s.amountInBracket, 0);
  assert.strictEqual(Math.round(total), 500000);
});
