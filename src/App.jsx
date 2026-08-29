import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLogin from './pages/AdminLogin';
import AdminOverview from './pages/AdminOverview';
import Registrations from './pages/Registrations';
import PilgrimDetail from './pages/PilgrimDetail';
import QRTracking from './pages/QRTracking';
import Verification from './pages/Verification';
import Alerts from './pages/Alerts';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import PublicQRScan from './pages/PublicQRScan';

function App() {
  const location = useLocation();

  // If mobile scan URL was opened, extract regId even if path matching has query parameters
  const matchRegId = location.pathname.match(/\/u\/([^\/]+)/);
  if (matchRegId && matchRegId[1] && !location.pathname.startsWith('/u/')) {
    return <PublicQRScan regIdParam={matchRegId[1]} />;
  }

  return (
    <Routes>
      {/* Public QR Scanner Landing Page */}
      <Route path="/u/:regId" element={<PublicQRScan />} />

      {/* Admin Authentication */}
      <Route path="/login" element={<AdminLogin />} />

      {/* 1. Overview */}
      <Route
        path="/overview"
        element={
          <ProtectedRoute>
            <AdminOverview />
          </ProtectedRoute>
        }
      />
      <Route path="/dashboard" element={<Navigate to="/overview" replace />} />

      {/* 2. Registrations */}
      <Route
        path="/registrations"
        element={
          <ProtectedRoute>
            <Registrations />
          </ProtectedRoute>
        }
      />
      <Route
        path="/registrations/:id"
        element={
          <ProtectedRoute>
            <PilgrimDetail />
          </ProtectedRoute>
        }
      />
      <Route path="/pilgrims/:id" element={<Navigate to="/registrations" replace />} />

      {/* 3. QR & Tracking */}
      <Route
        path="/qr-tracking"
        element={
          <ProtectedRoute>
            <QRTracking />
          </ProtectedRoute>
        }
      />

      {/* 4. Verification */}
      <Route
        path="/verification"
        element={
          <ProtectedRoute>
            <Verification />
          </ProtectedRoute>
        }
      />

      {/* 5. Alerts */}
      <Route
        path="/alerts"
        element={
          <ProtectedRoute>
            <Alerts />
          </ProtectedRoute>
        }
      />

      {/* 6. Reports */}
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <Reports />
          </ProtectedRoute>
        }
      />

      {/* 7. Settings */}
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/overview" replace />} />
    </Routes>
  );
}

export default App;
