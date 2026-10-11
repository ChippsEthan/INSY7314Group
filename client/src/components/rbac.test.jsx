import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';


vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }) => children,
}));

import { useAuth } from '../context/AuthContext';
import PrivateRoute from './PrivateRoute';
import Navbar from './Navbar';
import GigCard from './GigCard';

const renderRoutes = (element, path = '/secret') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<p>Home Page</p>} />
        <Route path="/login" element={<p>Login Screen</p>} />
        <Route path="/secret" element={element} />
      </Routes>
    </MemoryRouter>
  );

describe('PrivateRoute (route protection)', () => {
  it('redirects to /login when no user is logged in', () => {
    useAuth.mockReturnValue({ user: null, loading: false });
    renderRoutes(
      <PrivateRoute>
        <p>Secret Content</p>
      </PrivateRoute>
    );
    expect(screen.getByText('Login Screen')).toBeInTheDocument();
    expect(screen.queryByText('Secret Content')).not.toBeInTheDocument();
  });

  it('redirects a client away from a freelancer-only route', () => {
    useAuth.mockReturnValue({ user: { username: 'carl', role: 'client' }, loading: false });
    renderRoutes(
      <PrivateRoute role="freelancer">
        <p>Secret Content</p>
      </PrivateRoute>
    );
    expect(screen.getByText('Home Page')).toBeInTheDocument();
    expect(screen.queryByText('Secret Content')).not.toBeInTheDocument();
  });

  it('renders the page for a user with the required role', () => {
    useAuth.mockReturnValue({ user: { username: 'fran', role: 'freelancer' }, loading: false });
    renderRoutes(
      <PrivateRoute role="freelancer">
        <p>Secret Content</p>
      </PrivateRoute>
    );
    expect(screen.getByText('Secret Content')).toBeInTheDocument();
  });
});

describe('Role-based Navbar', () => {
  it('does not show freelancer links to a client, but shows My Bookings', () => {
    useAuth.mockReturnValue({ user: { username: 'carl', role: 'client' }, logout: vi.fn() });
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );
    expect(screen.queryByRole('link', { name: /post a gig/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /dashboard/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /my bookings/i })).toBeInTheDocument();
  });
});

describe('GigCard XSS protection', () => {
  it('removes script tags from user-supplied gig text', () => {
    const gig = {
      _id: 'g1',
      title: '<script>alert(1)</script>Safe title',
      description: '<img src=x onerror=alert(1)>Safe description',
      category: 'Design',
      price: 100,
    };
    const { container } = render(
      <MemoryRouter>
        <GigCard gig={gig} />
      </MemoryRouter>
    );
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('Safe title')).toBeInTheDocument();
    expect(screen.getByText(/Safe description/)).toBeInTheDocument();
   expect(container.innerHTML.toLowerCase()).not.toContain('onerror');
  });
});