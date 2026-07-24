import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import OwnerErrorBoundary from './components/OwnerErrorBoundary';
import AppShell from './layouts/AppShell';
import AdminShell from './layouts/AdminShell';
import ProtectedRoute from './components/ProtectedRoute';
import NetworkToastNotifier from './components/NetworkToastNotifier';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Bookings from './pages/Bookings';
import BookingCalendar from './pages/BookingCalendar';
import Services from './pages/Services';
import Staff from './pages/Staff';
import Customers from './pages/Customers';
import Reviews from './pages/Reviews';
import Wallet from './pages/Wallet';
import Payouts from './pages/Payouts';
import Website from './pages/Website';
import TemplateSelection from './pages/TemplateSelection';
import Gallery from './pages/Gallery';
import BusinessProfile from './pages/BusinessProfile';
import StoreLocation from './pages/StoreLocation';
import Analytics from './pages/Analytics';
import Support from './pages/Support';
import OwnerProfile from './pages/OwnerProfile';
import OwnerOfflinePage from './pages/owner/OwnerOfflinePage';

// Admin imports
import AdminDashboard from './pages/AdminDashboard';
import AdminShops from './pages/AdminShops';
import AdminPayouts from './pages/AdminPayouts';
import AdminBookings from './pages/AdminBookings';
import AdminCategories from './pages/AdminCategories';

export default function App() {
  return (
    <BrowserRouter>
      <NetworkToastNotifier />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/app/owner/offline" element={<OwnerOfflinePage />} />
        
        {/* Protected Owner Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/app/owner" element={<OwnerErrorBoundary><AppShell /></OwnerErrorBoundary>}>
            <Route index element={<Dashboard />} />
            <Route path="bookings" element={<Bookings />} />
            <Route path="calendar" element={<BookingCalendar />} />
            <Route path="services" element={<Services />} />
            <Route path="staff" element={<Staff />} />
            <Route path="customers" element={<Customers />} />
            <Route path="reviews" element={<Reviews />} />
            <Route path="wallet" element={<Wallet />} />
            <Route path="payouts" element={<Payouts />} />
            <Route path="website" element={<Website />} />
            <Route path="templates" element={<TemplateSelection />} />
            <Route path="gallery" element={<Gallery />} />
            <Route path="profile" element={<BusinessProfile />} />
            <Route path="location" element={<StoreLocation />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="support" element={<Support />} />
            <Route path="owner-profile" element={<OwnerProfile />} />
            <Route path="offline" element={<OwnerOfflinePage />} />
          </Route>

          {/* Protected Admin Routes */}
          <Route path="/app/admin" element={<AdminShell />}>
            <Route index element={<AdminDashboard />} />
            <Route path="shops" element={<AdminShops />} />
            <Route path="payouts" element={<AdminPayouts />} />
            <Route path="bookings" element={<AdminBookings />} />
            <Route key="categories" path="categories" element={<AdminCategories />} />
          </Route>
        </Route>
        
        <Route path="*" element={<Navigate to="/app/owner" replace />} />
      </Routes>
    </BrowserRouter>
  );
}