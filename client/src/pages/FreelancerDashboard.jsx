import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import DOMPurify from 'dompurify';
import api from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';

export default function FreelancerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [gigs, setGigs] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [income, setIncome] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [gigsRes, bookingsRes, incomeRes] = await Promise.all([
          api.get('/api/gigs'),
          api.get('/api/bookings/me'),
          api.get('/api/users/me/income'),
        ]);
        // Filter to only this freelancer's gigs using their user ID from localStorage
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        const allGigs = gigsRes.data.gigs || gigsRes.data;
        setGigs(allGigs.filter((g) => g.freelancer === storedUser._id || g.freelancer?._id === storedUser._id));
        setBookings(bookingsRes.data.bookings || bookingsRes.data);
        setIncome(incomeRes.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const handleDelete = async (gigId) => {
    if (!window.confirm('Are you sure you want to delete this gig?')) return;
    try {
      await api.delete(`/api/gigs/${gigId}`);
      setGigs((prev) => prev.filter((g) => g._id !== gigId));
    } catch (err) {
      setDeleteError(err.message);
    }
  };

  if (loading) return <p style={styles.info}>Loading dashboard...</p>;
  if (error) return <p style={styles.error}>{error}</p>;

  return (
    <div style={styles.page}>
      <h2 style={styles.heading}>Freelancer Dashboard</h2>
      <p style={styles.welcome}>Welcome, {user?.username}</p>

      {/* Income summary */}
      {income && (
        <div style={styles.incomeCard}>
          <h3 style={styles.sectionTitle}>💰 Income Summary</h3>
          <p style={styles.incomeAmount}>Total Earned: <strong>R{(income.totalIncome || 0).toFixed(2)}</strong></p>
          <p style={styles.incomeAmount}>Total Bookings: <strong>{income.transactionCount || 0}</strong></p>
        </div>
      )}

      {/* My Gigs */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h3 style={styles.sectionTitle}>My Gigs</h3>
          <Link to="/gigs/create" style={styles.addBtn}>+ New Gig</Link>
        </div>

        {deleteError && <p style={styles.error}>{deleteError}</p>}

        {gigs.length === 0 ? (
          <p style={styles.empty}>You haven&apos;t posted any gigs yet. <Link to="/gigs/create">Post your first gig</Link></p>
        ) : (
          <div style={styles.table}>
            {gigs.map((gig) => (
              <div key={gig._id} style={styles.gigRow}>
                <div>
                  <strong>{DOMPurify.sanitize(gig.title)}</strong>
                  <span style={styles.badge}>{gig.category}</span>
                </div>
                <div style={styles.gigActions}>
                  <span style={styles.gigPrice}>R{gig.price?.toFixed(2)}</span>
                  <button style={styles.editBtn} onClick={() => navigate(`/gigs/${gig._id}/edit`)}>Edit</button>
                  <button style={styles.deleteBtn} onClick={() => handleDelete(gig._id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bookings received */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Bookings Received</h3>
        {bookings.length === 0 ? (
          <p style={styles.empty}>No bookings yet.</p>
        ) : (
          <div style={styles.table}>
            {bookings.map((b) => (
              <div key={b._id} style={styles.bookingRow}>
                <div>
                  <strong>{DOMPurify.sanitize(b.gig?.title || 'Gig')}</strong>
                  <span style={styles.clientLabel}>Client: {b.client?.username || 'Unknown'}</span>
                </div>
                <span style={styles.gigPrice}>R{b.price?.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: { maxWidth: '900px', margin: '2rem auto', padding: '0 1rem' },
  heading: { color: '#1a1a2e', marginBottom: '0.25rem' },
  welcome: { color: '#888', marginBottom: '1.5rem' },
  incomeCard: { background: '#1a1a2e', color: '#fff', padding: '1.5rem', borderRadius: '10px', marginBottom: '2rem' },
  incomeAmount: { margin: '0.25rem 0', fontSize: '1rem' },
  section: { marginBottom: '2.5rem' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' },
  sectionTitle: { color: '#1a1a2e', margin: 0 },
  addBtn: { background: '#e94560', color: '#fff', padding: '0.4rem 1rem', borderRadius: '5px', textDecoration: 'none', fontSize: '0.85rem' },
  table: { display: 'flex', flexDirection: 'column', gap: '0.6rem' },
  gigRow: { background: '#fff', border: '1px solid #e0e0e0', borderRadius: '7px', padding: '0.9rem 1.1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  bookingRow: { background: '#fff', border: '1px solid #e0e0e0', borderRadius: '7px', padding: '0.9rem 1.1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  badge: { marginLeft: '0.5rem', background: '#f0f0f0', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', color: '#555' },
  clientLabel: { display: 'block', fontSize: '0.8rem', color: '#888', marginTop: '0.2rem' },
  gigPrice: { fontWeight: 'bold', color: '#1a1a2e' },
  gigActions: { display: 'flex', gap: '0.5rem', alignItems: 'center' },
  editBtn: { background: '#f0f0f0', border: 'none', padding: '0.35rem 0.75rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.82rem' },
  deleteBtn: { background: '#fff0f0', color: '#e94560', border: 'none', padding: '0.35rem 0.75rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.82rem' },
  empty: { color: '#888', fontSize: '0.9rem' },
  info: { textAlign: 'center', marginTop: '2rem', color: '#555' },
  error: { color: '#e94560', fontSize: '0.9rem' },
};
