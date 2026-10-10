import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── Mocks ────────────────────────────────────────────────────────────────────

// Mock AuthContext so components get controlled auth state
vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }) => children,
}));

// DOMPurify doesn't run in jsdom – mock it to pass strings through
vi.mock('dompurify', () => ({
  default: { sanitize: (str) => str },
}));

// ── Import after mocks ────────────────────────────────────────────────────────
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import GigCard from '../components/GigCard';
import BookingConfirmationPage from '../pages/BookingConfirmationPage';
import LoginPage from '../pages/LoginPage';

// ── Helpers ───────────────────────────────────────────────────────────────────

// Wrap in MemoryRouter so Link/useNavigate work
const renderWithRouter = (ui, { initialEntries = ['/'] } = {}) =>
  render(<MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>);

// ── 1. LoginForm renders and shows validation error when submitted empty ──────
describe('LoginPage', () => {
  it('renders email and password fields', () => {
    useAuth.mockReturnValue({ user: null, login: vi.fn() });
    renderWithRouter(<LoginPage />);
    expect(screen.getByPlaceholderText(/john@example.com/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/your password/i)).toBeInTheDocument();
  });

  it('shows validation errors when submitted with empty fields', async () => {
    useAuth.mockReturnValue({ user: null, login: vi.fn() });
    renderWithRouter(<LoginPage />);
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    // react-hook-form renders errors asynchronously
    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/password is required/i)).toBeInTheDocument();
  });
});

// ── 2. GigCard renders gig title and price from props ────────────────────────
describe('GigCard', () => {
  const mockGig = {
    _id: 'gig123',
    title: 'Build a React App',
    description: 'I will build a full React application for you.',
    category: 'Development',
    price: 1500,
  };

  it('renders the gig title', () => {
    renderWithRouter(<GigCard gig={mockGig} />);
    expect(screen.getByText('Build a React App')).toBeInTheDocument();
  });

  it('renders the gig price', () => {
    renderWithRouter(<GigCard gig={mockGig} />);
    expect(screen.getByText(/R1500\.00/)).toBeInTheDocument();
  });

  it('renders the category', () => {
    renderWithRouter(<GigCard gig={mockGig} />);
    expect(screen.getByText('Development')).toBeInTheDocument();
  });
});

// ── 3. Navbar shows login/register links when no token present ────────────────
describe('Navbar', () => {
  it('shows Login and Register links when user is not logged in', () => {
    useAuth.mockReturnValue({ user: null, logout: vi.fn() });
    renderWithRouter(<Navbar />);
    expect(screen.getByRole('link', { name: /login/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /register/i })).toBeInTheDocument();
  });

  it('shows username and Logout button when user is logged in', () => {
    useAuth.mockReturnValue({
      user: { username: 'alice', role: 'client' },
      logout: vi.fn(),
    });
    renderWithRouter(<Navbar />);
    expect(screen.getByText(/hi, alice/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
  });

  it('shows freelancer-only links for freelancer role', () => {
    useAuth.mockReturnValue({
      user: { username: 'bob', role: 'freelancer' },
      logout: vi.fn(),
    });
    renderWithRouter(<Navbar />);
    expect(screen.getByRole('link', { name: /post a gig/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
  });
});

// ── 4. BookingConfirmation displays the correct confirmation message ──────────
describe('BookingConfirmationPage', () => {
  it('renders the confirmation heading', () => {
    // Provide router state with a mock gig
    render(
      <MemoryRouter
        initialEntries={[{ pathname: '/booking-confirmation', state: { gig: { title: 'Logo Design', price: 500 } } }]}
      >
        <BookingConfirmationPage />
      </MemoryRouter>
    );
    expect(screen.getByTestId('booking-confirmation')).toBeInTheDocument();
    expect(screen.getByText(/booking confirmed/i)).toBeInTheDocument();
  });

  it('displays the gig title and price from state', () => {
    render(
      <MemoryRouter
        initialEntries={[{ pathname: '/booking-confirmation', state: { gig: { title: 'Logo Design', price: 500 } } }]}
      >
        <BookingConfirmationPage />
      </MemoryRouter>
    );
    expect(screen.getByText(/logo design/i)).toBeInTheDocument();
    expect(screen.getByText(/R500\.00/)).toBeInTheDocument();
  });
});
