// services/taxService.js
// Estimates South African personal income tax for the 2026/27 tax year
// (1 March 2026 - 28 February 2027). Source: SARS "Rates of Tax for Individuals".

const TAX_YEAR = '2026/27';
const PRIMARY_REBATE = 17820; // under-65 rebate applied to every taxpayer
const TAX_FREE_THRESHOLD = 99000; // under 65

// "from" = lower bound of the bracket, "base" = tax payable on income up to "from"
const BRACKETS = [
  { from: 0,       upTo: 245100,   rate: 0.18, base: 0 },
  { from: 245100,  upTo: 383100,   rate: 0.26, base: 44118 },
  { from: 383100,  upTo: 530200,   rate: 0.31, base: 79998 },
  { from: 530200,  upTo: 695800,   rate: 0.36, base: 125599 },
  { from: 695800,  upTo: 887000,   rate: 0.39, base: 185215 },
  { from: 887000,  upTo: 1878600,  rate: 0.41, base: 259783 },
  { from: 1878600, upTo: Infinity, rate: 0.45, base: 666339 },
];

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Calculate estimated tax for an annual income figure.
 * Steps: find the bracket -> base + rate x (income - from) -> subtract rebate (min 0).
 */
function calculateTax(income) {
  const gross = Number.isFinite(income) && income > 0 ? income : 0;

  const bracket = BRACKETS.find((b) => gross <= b.upTo) || BRACKETS[BRACKETS.length - 1];
  const taxBeforeRebate = round2(bracket.base + (gross - bracket.from) * bracket.rate);
  const estimatedTax = Math.max(0, round2(taxBeforeRebate - PRIMARY_REBATE));

  // Slice of income that falls in each bracket (used for the dashboard chart)
  const breakdown = BRACKETS.map((b) => {
    const amountInBracket = Math.max(0, Math.min(gross, b.upTo) - b.from);
    return {
      rate: b.rate,
      from: b.from,
      upTo: b.upTo === Infinity ? null : b.upTo,
      amountInBracket: round2(amountInBracket),
      taxOnSlice: round2(amountInBracket * b.rate),
    };
  }).filter((s) => s.amountInBracket > 0);

  return {
    taxYear: TAX_YEAR,
    grossIncome: round2(gross),
    taxBeforeRebate,
    primaryRebate: PRIMARY_REBATE,
    estimatedTax,
    netIncome: round2(gross - estimatedTax),
    effectiveRate: gross > 0 ? round2((estimatedTax / gross) * 100) : 0,
    marginalRate: gross > 0 ? bracket.rate * 100 : 0,
    taxFreeThreshold: TAX_FREE_THRESHOLD,
    breakdown,
  };
}

module.exports = { calculateTax, BRACKETS, PRIMARY_REBATE, TAX_FREE_THRESHOLD, TAX_YEAR };
