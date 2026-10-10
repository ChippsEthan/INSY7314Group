import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav style={styles.nav}>
      <Link to="/" style={styles.brand}>HustleHub+</Link>

      <div style={styles.links}>
        {!user ? (
          <>
            <Link to="/login" style={styles.link}>Login</Link>
            <Link to="/register" style={styles.link}>Register</Link>
          </>
        ) : (
          <>
            <Link to="/gigs" style={styles.link}>Browse Gigs</Link>

            {/* Freelancer-only links */}
            {user.role === 'freelancer' && (
              <>
                <Link to="/gigs/create" style={styles.link}>Post a Gig</Link>
                <Link to="/dashboard" style={styles.link}>Dashboard</Link>
              </>
            )}

            {/* Client-only links */}
            {user.role === 'client' && (
              <Link to="/my-bookings" style={styles.link}>My Bookings</Link>
            )}

            <span style={styles.username}>Hi, {user.username}</span>
            <button onClick={handleLogout} style={styles.logoutBtn}>
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.75rem 2rem',
    background: '#1a1a2e',
    color: '#fff',
  },
  brand: {
    color: '#e94560',
    fontWeight: 'bold',
    fontSize: '1.3rem',
    textDecoration: 'none',
  },
  links: { display: 'flex', gap: '1rem', alignItems: 'center' },
  link: { color: '#fff', textDecoration: 'none', fontSize: '0.95rem' },
  username: { color: '#aaa', fontSize: '0.9rem' },
  logoutBtn: {
    background: '#e94560',
    color: '#fff',
    border: 'none',
    padding: '0.4rem 0.9rem',
    borderRadius: '4px',
    cursor: 'pointer',
  },
};
