import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Wraps a route so only authenticated users can access it.
 * Optionally restrict by role: <PrivateRoute role="freelancer" />
 */
export default function PrivateRoute({ children, role }) {
  const { user, loading } = useAuth();

  if (loading) return <p>Loading...</p>;

  if (!user) return <Navigate to="/login" replace />;

  if (role && user.role !== role) {
    return <Navigate to="/" replace />;
  }

  return children;
}
