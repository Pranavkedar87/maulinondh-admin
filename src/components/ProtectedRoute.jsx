import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '../hooks/useAdminAuth';

const ProtectedRoute = ({ children }) => {
  const { session, isAdmin, loading } = useAdminAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-color">
        <div className="text-center p-6 card">
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🛡️</div>
          <p style={{ fontWeight: 600, color: 'var(--primary-dark)' }}>Verifying Admin Credentials...</p>
        </div>
      </div>
    );
  }

  if (!session || !isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
