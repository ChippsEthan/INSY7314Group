import { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import api from '../api/axiosInstance';

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/api/bookings/me');
        setBookings(res.data.bookings || res.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) return <p style={styles.info}>Loading your bookings...</p>;
  if (error) return <p style={styles.error}>{error}</p>;

  return (
    <div style={styles.page}>
      <h2 style={styles.heading}>My Bookings</h2>

      {bookings.length === 0 ? (
        <p style={styles.empty}>You haven&apos;t made any bookings yet.</p>
      ) : (
        <div style={styles.list}>
          {bookings.map((b) => (
            <div key={b._id} style={styles.card}>
              <div>
                <strong style={styles.title}>{DOMPurify.sanitize(b.gig?.title || 'Gig')}</strong>
                <p style={styles.meta}>Freelancer: {b.freelancer?.username || 'Unknown'}</p>
                <p style={styles.meta}>Booked: {new Date(b.createdAt).toLocaleDateString()}</p>
              </div>
              <div style={styles.right}>
                <span style={styles.amount}>R{b.price?.toFixed(2)}</span>
                <span style={styles.status}>Confirmed</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { maxWidth: '800px', margin: '2rem auto', padding: '0 1rem' },
  heading: { color: '#1a1a2e', marginBottom: '1.5rem' },
  list: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  card: { background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '1.1rem 1.3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' },
  title: { color: '#1a1a2e', fontSize: '1rem' },
  meta: { color: '#888', fontSize: '0.82rem', margin: '0.15rem 0' },
  right: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem' },
  amount: { fontWeight: 'bold', fontSize: '1.1rem', color: '#1a1a2e' },
  status: { background: '#e6f9f0', color: '#27ae60', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 'bold' },
  empty: { color: '#888' },
  info: { textAlign: 'center', color: '#555', marginTop: '2rem' },
  error: { color: '#e94560', textAlign: 'center' },
};
