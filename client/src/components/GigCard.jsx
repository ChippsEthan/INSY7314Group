import DOMPurify from 'dompurify';
import { useNavigate } from 'react-router-dom';

/**
 * Reusable card component for displaying a single gig.
 * All user-supplied text is sanitised via DOMPurify before rendering.
 */
export default function GigCard({ gig }) {
  const navigate = useNavigate();

  // Sanitise all string fields to prevent XSS
  const safeTitle = DOMPurify.sanitize(gig.title || '');
  const safeDesc = DOMPurify.sanitize(gig.description || '');
  const safeCategory = DOMPurify.sanitize(gig.category || '');

  return (
    <div style={styles.card} data-testid="gig-card">
      <div style={styles.category}>{safeCategory}</div>
      <h3 style={styles.title}>{safeTitle}</h3>
      <p style={styles.desc}>{safeDesc}</p>
      <div style={styles.footer}>
        <span style={styles.price}>R{gig.price?.toFixed(2)}</span>
        <button
          style={styles.btn}
          onClick={() => navigate(`/gigs/${gig._id}`)}
        >
          View Details
        </button>
      </div>
    </div>
  );
}

const styles = {
  card: {
    background: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    boxShadow: '0 2px 6px rgba(0,0,0,0.07)',
  },
  category: {
    fontSize: '0.75rem',
    color: '#e94560',
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  title: { margin: 0, fontSize: '1.05rem', color: '#1a1a2e' },
  desc: { fontSize: '0.9rem', color: '#555', flexGrow: 1 },
  footer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' },
  price: { fontWeight: 'bold', color: '#1a1a2e', fontSize: '1.1rem' },
  btn: {
    background: '#1a1a2e',
    color: '#fff',
    border: 'none',
    padding: '0.4rem 0.9rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.85rem',
  },
};
