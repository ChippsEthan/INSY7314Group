import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { incomeByMonth } from '../utils/incomeByMonth';

const money = (n) => `R${(Number(n) || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Income and estimated tax overview for the freelancer dashboard.
 * Props: income (response of GET /api/users/me/income), tax (response of GET /api/users/me/tax)
 */
export default function TaxSummary({ income, tax }) {
  if (!income || !tax) return null;

  const monthly = incomeByMonth(income.transactions);
  const split = [
    { name: 'Net income', value: tax.netIncome },
    { name: 'Estimated tax', value: tax.estimatedTax },
  ];
  const hasIncome = tax.grossIncome > 0;

  return (
    <section style={styles.section} data-testid="tax-summary">
      <h3 style={styles.title}>Income and Tax Overview</h3>
      <p style={styles.sub}>Tax year {tax.taxYear} (South Africa)</p>

      <div style={styles.cards}>
        <div style={styles.card}>
          <span style={styles.label}>Total earned</span>
          <strong style={styles.value}>{money(tax.grossIncome)}</strong>
        </div>
        <div style={styles.card}>
          <span style={styles.label}>Estimated tax</span>
          <strong style={{ ...styles.value, color: '#e94560' }}>{money(tax.estimatedTax)}</strong>
        </div>
        <div style={styles.card}>
          <span style={styles.label}>Net income</span>
          <strong style={{ ...styles.value, color: '#27ae60' }}>{money(tax.netIncome)}</strong>
        </div>
        <div style={styles.card}>
          <span style={styles.label}>Effective tax rate</span>
          <strong style={styles.value}>{tax.effectiveRate}%</strong>
        </div>
      </div>

      {!hasIncome ? (
        <p style={styles.empty}>No income yet. Charts will appear once you receive bookings.</p>
      ) : (
        <div style={styles.charts}>
          <div style={styles.chartBox}>
            <h4 style={styles.chartTitle}>Income per month</h4>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(v) => money(v)} />
                <Bar dataKey="income" fill="#1a1a2e" name="Income" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={styles.chartBox}>
            <h4 style={styles.chartTitle}>Where your income goes</h4>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={split} dataKey="value" nameKey="name" outerRadius={85} label>
                  <Cell fill="#27ae60" />
                  <Cell fill="#e94560" />
                </Pie>
                <Tooltip formatter={(v) => money(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {tax.breakdown?.length > 0 && (
        <details style={styles.details}>
          <summary style={styles.summary}>How this was calculated</summary>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Rate</th>
                <th style={styles.th}>Income in bracket</th>
                <th style={styles.th}>Tax on slice</th>
              </tr>
            </thead>
            <tbody>
              {tax.breakdown.map((b) => (
                <tr key={b.rate}>
                  <td style={styles.td}>{Math.round(b.rate * 100)}%</td>
                  <td style={styles.td}>{money(b.amountInBracket)}</td>
                  <td style={styles.td}>{money(b.taxOnSlice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={styles.note}>
            Tax before rebate {money(tax.taxBeforeRebate)} minus the primary rebate of {money(tax.primaryRebate)}.
            You pay no tax on income up to {money(tax.taxFreeThreshold)}.
          </p>
        </details>
      )}

      {tax.disclaimer && <p style={styles.disclaimer}>{tax.disclaimer}</p>}
    </section>
  );
}

const styles = {
  section: { background: '#fff', border: '1px solid #e0e0e0', borderRadius: '10px', padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' },
  title: { color: '#1a1a2e', margin: 0 },
  sub: { color: '#888', fontSize: '0.85rem', marginBottom: '1rem' },
  cards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' },
  card: { background: '#f7f7fa', borderRadius: '8px', padding: '0.9rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  label: { color: '#888', fontSize: '0.78rem', textTransform: 'uppercase' },
  value: { color: '#1a1a2e', fontSize: '1.25rem' },
  charts: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' },
  chartBox: { minWidth: 0 },
  chartTitle: { color: '#1a1a2e', margin: '0 0 0.5rem' },
  empty: { color: '#888', fontSize: '0.9rem' },
  details: { marginTop: '1.25rem' },
  summary: { cursor: 'pointer', color: '#1a1a2e', fontWeight: '600' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '0.75rem', fontSize: '0.88rem' },
  th: { textAlign: 'left', padding: '0.4rem', borderBottom: '1px solid #ddd', color: '#555' },
  td: { padding: '0.4rem', borderBottom: '1px solid #f0f0f0' },
  note: { color: '#555', fontSize: '0.85rem', marginTop: '0.75rem' },
  disclaimer: { color: '#888', fontSize: '0.78rem', marginTop: '1rem' },
};
