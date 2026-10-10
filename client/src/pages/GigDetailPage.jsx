import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import api from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';

export default function GigDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [gig, setGig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get(`/api/gigs/${id}`);
        setGig(res.data.gig || res.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  const handleBook = async () => {
    setBooking(true);
    try {
      await api.post('/api/bookings', { gigId: id });
      navigate('/booking-confirmation', { state: { gig } });
    } catch (err) {
      setError(err.message);
      setBooking(false);
    }
  };

  if (loading) return <p style={styles.info}>Loading gig...</p>;
  if (error) return <p style={styles.error}>{error}</p>;
  if (!gig) return <p style={styles.info}>Gig not found.</p>;

  return (
    <div style={styles.page}>
      <button style={styles.back} onClick={() => navigate('/gigs')}>← Back to Gigs</button>

      <div style={styles.card}>
        <span style={styles.category}>{DOMPurify.sanitize(gig.category || '')}</span>
        <h2 style={styles.title}>{DOMPurify.sanitize(gig.title || '')}</h2>
        <p style={styles.desc}>{DOMPurify.sanitize(gig.description || '')}</p>

        <div style={styles.priceRow}>
          <span style={styles.priceLabel}>Price</span>
          <span style={styles.price}>R{gig.price?.toFixed(2)}</span>
        </div>

        {error && <p style={styles.error}>{error}</p>}

        {/* Only clients see the Book Now button */}
        {user?.role === 'client' && (
          <button style={styles.bookBtn} onClick={handleBook} disabled={booking}>
            {booking ? 'Booking...' : 'Book Now'}
          </button>
        )}

        {user?.role === 'freelancer' && (
          <p style={styles.note}>You are viewing this as a freelancer. Only clients can book gigs.</p>
        )}

        {!user && (
          <p style={styles.note}>
            <a href="/login">Log in</a> to book this gig.
          </p>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: { maxWidth: '700px', margin: '2rem auto', padding: '0 1rem' },
  back: { background: 'none', border: 'none', color: '#1a1a2e', cursor: 'pointer', marginBottom: '1rem', fontSize: '0.95rem' },
  card: { background: '#fff', padding: '2rem', borderRadius: '10px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' },
  category: { fontSize: '0.75rem', color: '#e94560', textTransform: 'uppercase', fontWeight: 'bold' },
  title: { color: '#1a1a2e', margin: '0.5rem 0' },
  desc: { color: '#555', lineHeight: '1.6', marginBottom: '1.5rem' },
  priceRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
  priceLabel: { color: '#888', fontSize: '0.9rem' },
  price: { fontWeight: 'bold', fontSize: '1.4rem', color: '#1a1a2e' },
  bookBtn: { width: '100%', padding: '0.8rem', background: '#e94560', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' },
  note: { color: '#888', fontSize: '0.9rem', textAlign: 'center', marginTop: '1rem' },
  info: { textAlign: 'center', marginTop: '2rem', color: '#555' },
  error: { color: '#e94560', textAlign: 'center', marginTop: '1rem' },
};
