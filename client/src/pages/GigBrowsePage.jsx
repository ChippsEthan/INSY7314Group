import { useEffect, useState } from 'react';
import api from '../api/axiosInstance';
import GigCard from '../components/GigCard';

export default function GigBrowsePage() {
  const [gigs, setGigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchGigs = async () => {
      try {
        const res = await api.get('/api/gigs');
        setGigs(res.data.gigs || res.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchGigs();
  }, []);

  const filtered = gigs.filter((g) =>
    g.title?.toLowerCase().includes(search.toLowerCase()) ||
    g.category?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <p style={styles.info}>Loading gigs...</p>;
  if (error) return <p style={styles.error}>{error}</p>;

  return (
    <div style={styles.page}>
      <h2 style={styles.heading}>Available Gigs</h2>

      <input
        style={styles.search}
        placeholder="Search by title or category..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {filtered.length === 0 ? (
        <p style={styles.info}>No gigs found.</p>
      ) : (
        <div style={styles.grid}>
          {filtered.map((gig) => (
            <GigCard key={gig._id} gig={gig} />
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { maxWidth: '1100px', margin: '2rem auto', padding: '0 1rem' },
  heading: { color: '#1a1a2e', marginBottom: '1rem' },
  search: { width: '100%', padding: '0.6rem 1rem', borderRadius: '6px', border: '1px solid #ccc', marginBottom: '1.5rem', fontSize: '0.95rem', boxSizing: 'border-box' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' },
  info: { color: '#555', textAlign: 'center', marginTop: '2rem' },
  error: { color: '#e94560', textAlign: 'center', marginTop: '2rem' },
};
