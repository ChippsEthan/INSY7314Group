import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import GigBrowsePage from './pages/GigBrowsePage';
import GigDetailPage from './pages/GigDetailPage';
import CreateGigPage from './pages/CreateGigPage';
import BookingConfirmationPage from './pages/BookingConfirmationPage';
import FreelancerDashboard from './pages/FreelancerDashboard';
import MyBookingsPage from './pages/MyBookingsPage';

export default function App() {
  return (
    <>
      <Navbar />
      <main>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Navigate to="/gigs" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/gigs" element={<GigBrowsePage />} />
          <Route path="/gigs/:id" element={<GigDetailPage />} />

          {/* Protected – any authenticated user */}
          <Route
            path="/booking-confirmation"
            element={<PrivateRoute><BookingConfirmationPage /></PrivateRoute>}
          />
          <Route
            path="/my-bookings"
            element={<PrivateRoute role="client"><MyBookingsPage /></PrivateRoute>}
          />

          {/* Protected – freelancers only */}
          <Route
            path="/gigs/create"
            element={<PrivateRoute role="freelancer"><CreateGigPage /></PrivateRoute>}
          />
          <Route
            path="/dashboard"
            element={<PrivateRoute role="freelancer"><FreelancerDashboard /></PrivateRoute>}
          />

          {/* 404 fallback */}
          <Route path="*" element={<p style={{ textAlign: 'center', marginTop: '3rem' }}>Page not found.</p>} />
        </Routes>
      </main>
    </>
  );
}
