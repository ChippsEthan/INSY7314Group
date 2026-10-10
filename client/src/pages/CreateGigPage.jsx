import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosInstance';

export default function CreateGigPage() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    setServerError('');
    setLoading(true);
    try {
      await api.post('/api/gigs', {
        ...data,
        price: parseFloat(data.price),
      });
      navigate('/dashboard');
    } catch (err) {
      setServerError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.heading}>Post a New Gig</h2>

        {serverError && <p style={styles.error}>{serverError}</p>}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div style={styles.field}>
            <label style={styles.label}>Title</label>
            <input
              style={errors.title ? styles.inputErr : styles.input}
              {...register('title', { required: 'Title is required.', maxLength: { value: 100, message: 'Title must be under 100 characters.' } })}
              placeholder="e.g. I will design a professional logo"
            />
            {errors.title && <span style={styles.fieldErr}>{errors.title.message}</span>}
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Description</label>
            <textarea
              rows={4}
              style={errors.description ? { ...styles.input, ...styles.inputErr } : styles.input}
              {...register('description', { required: 'Description is required.', minLength: { value: 20, message: 'Description must be at least 20 characters.' } })}
              placeholder="Describe what you will deliver..."
            />
            {errors.description && <span style={styles.fieldErr}>{errors.description.message}</span>}
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Category</label>
            <select style={styles.input} {...register('category', { required: 'Category is required.' })}>
              <option value="">Select a category</option>
              <option value="Design">Design</option>
              <option value="Development">Development</option>
              <option value="Writing">Writing</option>
              <option value="Marketing">Marketing</option>
              <option value="Video">Video</option>
              <option value="Other">Other</option>
            </select>
            {errors.category && <span style={styles.fieldErr}>{errors.category.message}</span>}
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Price (R)</label>
            <input
              type="number"
              min="1"
              step="0.01"
              style={errors.price ? styles.inputErr : styles.input}
              {...register('price', {
                required: 'Price is required.',
                min: { value: 1, message: 'Price must be at least R1.' },
              })}
              placeholder="250.00"
            />
            {errors.price && <span style={styles.fieldErr}>{errors.price.message}</span>}
          </div>

          <button type="submit" style={styles.btn} disabled={loading}>
            {loading ? 'Posting...' : 'Post Gig'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  page: { display: 'flex', justifyContent: 'center', padding: '2rem 1rem', background: '#f5f5f5', minHeight: '80vh' },
  card: { background: '#fff', padding: '2rem', borderRadius: '10px', width: '100%', maxWidth: '540px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', height: 'fit-content' },
  heading: { color: '#1a1a2e', marginBottom: '1.5rem' },
  field: { marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' },
  label: { fontSize: '0.85rem', fontWeight: '600', color: '#333' },
  input: { padding: '0.6rem 0.8rem', borderRadius: '5px', border: '1px solid #ccc', fontSize: '0.95rem', fontFamily: 'inherit' },
  inputErr: { padding: '0.6rem 0.8rem', borderRadius: '5px', border: '1px solid #e94560', fontSize: '0.95rem' },
  fieldErr: { color: '#e94560', fontSize: '0.78rem' },
  error: { background: '#fff0f0', color: '#c0392b', padding: '0.6rem', borderRadius: '5px', marginBottom: '1rem', fontSize: '0.9rem' },
  btn: { width: '100%', padding: '0.75rem', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', marginTop: '0.5rem' },
};
