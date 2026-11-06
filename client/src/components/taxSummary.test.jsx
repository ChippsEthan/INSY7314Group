import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Charts need real browser layout, so stub recharts with simple elements
vi.mock('recharts', () => {
  const Stub = ({ children }) => <div>{children}</div>;
  return {
    ResponsiveContainer: Stub,
    BarChart: ({ data }) => <div data-testid="bar-chart" data-points={data.length} />,
    PieChart: Stub,
    Pie: Stub,
    Bar: Stub,
    Cell: Stub,
    XAxis: Stub,
    YAxis: Stub,
    Tooltip: Stub,
    Legend: Stub,
    CartesianGrid: Stub,
  };
});

import TaxSummary from './TaxSummary';
import { incomeByMonth } from '../utils/incomeByMonth';

const tax = {
  taxYear: '2026/27',
  grossIncome: 500000,
  estimatedTax: 98417,
  netIncome: 401583,
  effectiveRate: 19.68,
  taxBeforeRebate: 116237,
  primaryRebate: 17820,
  taxFreeThreshold: 99000,
  breakdown: [{ rate: 0.18, from: 0, upTo: 245100, amountInBracket: 245100, taxOnSlice: 44118 }],
  disclaimer: 'Estimate only.',
};

const income = {
  totalIncome: 500000,
  transactionCount: 2,
  transactions: [
    { amount: 300000, type: 'payment', status: 'completed', createdAt: '2026-10-05T10:00:00Z' },
    { amount: 200000, type: 'payment', status: 'completed', createdAt: '2026-11-02T10:00:00Z' },
  ],
};

describe('TaxSummary', () => {
  it('renders income, estimated tax and net income', () => {
    render(<TaxSummary income={income} tax={tax} />);
    expect(screen.getByText(/Total earned/i)).toBeInTheDocument();
    expect(screen.getByText(/Estimated tax/i, { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByText(/19.68%/)).toBeInTheDocument();
    expect(screen.getByText(/Tax year 2026\/27/)).toBeInTheDocument();
  });

  it('draws one bar per month of income', () => {
    render(<TaxSummary income={income} tax={tax} />);
    expect(screen.getByTestId('bar-chart')).toHaveAttribute('data-points', '2');
  });

  it('shows an empty message and no charts when there is no income', () => {
    const empty = { ...tax, grossIncome: 0, estimatedTax: 0, netIncome: 0, effectiveRate: 0, breakdown: [] };
    render(<TaxSummary income={{ transactions: [] }} tax={empty} />);
    expect(screen.getByText(/No income yet/i)).toBeInTheDocument();
    expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
  });

  it('renders nothing when data is missing', () => {
    const { container } = render(<TaxSummary income={null} tax={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('incomeByMonth', () => {
  it('sums payments by month in date order', () => {
    const result = incomeByMonth([
      { amount: 100, createdAt: '2026-11-10T00:00:00Z' },
      { amount: 50, createdAt: '2026-11-20T00:00:00Z' },
      { amount: 70, createdAt: '2026-10-01T00:00:00Z' },
    ]);
    expect(result).toEqual([
      { month: 'Oct 2026', income: 70 },
      { month: 'Nov 2026', income: 150 },
    ]);
  });

  it('ignores refunds and failed transactions', () => {
    const result = incomeByMonth([
      { amount: 100, type: 'refund', createdAt: '2026-11-10T00:00:00Z' },
      { amount: 100, status: 'failed', createdAt: '2026-11-10T00:00:00Z' },
    ]);
    expect(result).toEqual([]);
  });
});
