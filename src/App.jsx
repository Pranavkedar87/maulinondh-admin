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
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import PublicQRScan from './pages/PublicQRScan';
import IvrDemo from './pages/IvrDemo';
import { Panchayats, Dindis, LiveMap, IvrManagement } from './pages/Placeholders';

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

      {/* IVR Browser Demo */}
      <Route path="/ivr-demo" element={<IvrDemo />} />

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

      {/* 2. Varkaris (Registrations) */}
      <Route
        path="/varkaris"
        element={
          <ProtectedRoute>
            <Registrations />
          </ProtectedRoute>
        }
      />
      <Route
        path="/varkaris/:id"
        element={
          <ProtectedRoute>
            <PilgrimDetail />
          </ProtectedRoute>
        }
      />
      <Route path="/registrations" element={<Navigate to="/varkaris" replace />} />
      <Route path="/registrations/:id" element={<Navigate to="/varkaris" replace />} />
      <Route path="/pilgrims/:id" element={<Navigate to="/varkaris" replace />} />

      {/* Placeholders */}
      <Route path="/panchayats" element={<ProtectedRoute><Panchayats /></ProtectedRoute>} />
      <Route path="/dindis" element={<ProtectedRoute><Dindis /></ProtectedRoute>} />
      <Route path="/map" element={<ProtectedRoute><LiveMap /></ProtectedRoute>} />
      <Route path="/ivr" element={<ProtectedRoute><IvrManagement /></ProtectedRoute>} />

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

      {/* 5. Incidents (Alerts & Emergencies) */}
      <Route
        path="/incidents"
        element={
          <ProtectedRoute>
            <Alerts />
          </ProtectedRoute>
        }
      />
      <Route path="/alerts" element={<Navigate to="/incidents" replace />} />

      {/* 5. Analytics */}
      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <Analytics />
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
