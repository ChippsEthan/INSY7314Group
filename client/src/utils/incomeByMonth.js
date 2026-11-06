// utils/incomeByMonth.js
// Groups completed payment transactions into monthly totals for the income chart.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function incomeByMonth(transactions = []) {
  const totals = new Map();

  transactions.forEach((t) => {
    if (!t || t.type === 'refund' || t.status === 'failed') return;
    const date = new Date(t.createdAt);
    if (Number.isNaN(date.getTime())) return;

    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const entry = totals.get(key) || {
      key,
      month: `${MONTHS[date.getMonth()]} ${date.getFullYear()}`,
      income: 0,
    };
    entry.income += Number(t.amount) || 0;
    totals.set(key, entry);
  });

  return [...totals.values()]
    .sort((a, b) => a.key.localeCompare(b.key))
    .map(({ month, income }) => ({ month, income }));
}
