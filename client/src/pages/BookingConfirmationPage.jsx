import { useLocation, useNavigate, Link } from 'react-router-dom';

/**
 * Simulated booking confirmation screen.
 * Receives gig details via React Router location state.
 */
export default function BookingConfirmationPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const gig = state?.gig;

  return (
    <div style={styles.page}>
      <div style={styles.card} data-testid="booking-confirmation">
        <div style={styles.icon}>✅</div>
        <h2 style={styles.heading}>Booking Confirmed!</h2>
        <p style={styles.sub}>
          Your booking has been successfully submitted and a transaction record has been created.
        </p>

        {gig && (
          <div style={styles.summary}>
            <p><strong>Gig:</strong> {gig.title}</p>
            <p><strong>Amount:</strong> R{gig.price?.toFixed(2)}</p>
          </div>
        )}

        <p style={styles.note}>
          The freelancer will be in touch shortly.
        </p>

        <div style={styles.actions}>
          <button style={styles.btn} onClick={() => navigate('/gigs')}>
            Browse More Gigs
          </button>
          <Link to="/my-bookings" style={styles.link}>View My Bookings</Link>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', background: '#f5f5f5' },
  card: { background: '#fff', padding: '2.5rem', borderRadius: '12px', maxWidth: '480px', width: '100%', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' },
  icon: { fontSize: '3rem', marginBottom: '1rem' },
  heading: { color: '#1a1a2e', marginBottom: '0.5rem' },
  sub: { color: '#555', marginBottom: '1.5rem', lineHeight: '1.5' },
  summary: { background: '#f9f9f9', border: '1px solid #eee', borderRadius: '8px', padding: '1rem', textAlign: 'left', marginBottom: '1rem' },
  note: { color: '#888', fontSize: '0.9rem', marginBottom: '1.5rem' },
  actions: { display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' },
  btn: { background: '#e94560', color: '#fff', border: 'none', padding: '0.7rem 2rem', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.95rem' },
  link: { color: '#1a1a2e', fontSize: '0.9rem' },
};
