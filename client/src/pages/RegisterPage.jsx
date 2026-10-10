import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    setServerError('');
    setLoading(true);
    try {
      const res = await api.post('/api/auth/register', data);
      // Auto-login after successful registration
      const loginRes = await api.post('/api/auth/login', {
        email: data.email,
        password: data.password,
      });
      login(loginRes.data.token, loginRes.data.user);
      navigate('/gigs');
    } catch (err) {
      setServerError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.heading}>Create an Account</h2>

        {serverError && <p style={styles.error}>{serverError}</p>}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {/* Username */}
          <div style={styles.field}>
            <label style={styles.label}>Username</label>
            <input
              style={errors.username ? styles.inputErr : styles.input}
              {...register('username', {
                required: 'Username is required.',
                minLength: { value: 3, message: 'Username must be at least 3 characters.' },
                pattern: { value: /^[a-zA-Z0-9]+$/, message: 'Username must be alphanumeric.' },
              })}
              placeholder="johndoe"
              autoComplete="username"
            />
            {errors.username && <span style={styles.fieldErr}>{errors.username.message}</span>}
          </div>

          {/* Email */}
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

          {/* Password */}
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              style={errors.password ? styles.inputErr : styles.input}
              {...register('password', {
                required: 'Password is required.',
                minLength: { value: 8, message: 'Password must be at least 8 characters.' },
                validate: {
                  hasUpper: (v) => /[A-Z]/.test(v) || 'Password must contain an uppercase letter.',
                  hasLower: (v) => /[a-z]/.test(v) || 'Password must contain a lowercase letter.',
                  hasNumber: (v) => /[0-9]/.test(v) || 'Password must contain a number.',
                },
              })}
              placeholder="Min 8 chars, upper, lower, number"
              autoComplete="new-password"
            />
            {errors.password && <span style={styles.fieldErr}>{errors.password.message}</span>}
          </div>

          {/* Role */}
          <div style={styles.field}>
            <label style={styles.label}>I am a...</label>
            <select style={styles.input} {...register('role')}>
              <option value="client">Client (I want to hire)</option>
              <option value="freelancer">Freelancer (I want to work)</option>
            </select>
          </div>

          <button type="submit" style={styles.btn} disabled={loading}>
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <p style={styles.footer}>
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', background: '#f5f5f5' },
  card: { background: '#fff', padding: '2rem', borderRadius: '10px', width: '100%', maxWidth: '420px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' },
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
