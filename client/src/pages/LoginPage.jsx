import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    setServerError('');
    setLoading(true);
    try {
      const res = await api.post('/api/auth/login', data);
      login(res.data.token, res.data.user);
      // Redirect based on role
      if (res.data.user.role === 'freelancer') {
        navigate('/dashboard');
      } else {
        navigate('/gigs');
      }
    } catch (err) {
      setServerError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.heading}>Welcome Back</h2>

        {serverError && <p style={styles.error} role="alert">{serverError}</p>}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              style={errors.email ? styles.inputErr : styles.input}
              {...register('email', {
                required: 'Email is required.',
                pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email address.' },
              })}
              placeholder="john@example.com"
              autoComplete="email"
            />
            {errors.email && <span style={styles.fieldErr}>{errors.email.message}</span>}
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              style={errors.password ? styles.inputErr : styles.input}
              {...register('password', { required: 'Password is required.' })}
              placeholder="Your password"
              autoComplete="current-password"
            />
            {errors.password && <span style={styles.fieldErr}>{errors.password.message}</span>}
          </div>

          <button type="submit" style={styles.btn} disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p style={styles.footer}>
          Don&apos;t have an account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', background: '#f5f5f5' },
  card: { background: '#fff', padding: '2rem', borderRadius: '10px', width: '100%', maxWidth: '400px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' },
  heading: { marginBottom: '1.5rem', color: '#1a1a2e', textAlign: 'center' },
  field: { marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' },
  label: { fontSize: '0.85rem', fontWeight: '600', color: '#333' },
  input: { padding: '0.6rem 0.8rem', borderRadius: '5px', border: '1px solid #ccc', fontSize: '0.95rem' },
  inputErr: { padding: '0.6rem 0.8rem', borderRadius: '5px', border: '1px solid #e94560', fontSize: '0.95rem' },
  fieldErr: { color: '#e94560', fontSize: '0.78rem' },
  error: { background: '#fff0f0', color: '#c0392b', padding: '0.6rem', borderRadius: '5px', marginBottom: '1rem', fontSize: '0.9rem' },
  btn: { width: '100%', padding: '0.75rem', background: '#e94560', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', marginTop: '0.5rem' },
  footer: { textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem' },
};
