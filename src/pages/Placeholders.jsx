import React from 'react';
import AdminLayout from '../components/AdminLayout';

export const Panchayats = () => (
  <AdminLayout title="Gram Panchayats">
    <div className="card text-center p-12" style={{ marginTop: '2rem' }}>
      <h3 className="text-xl font-bold mb-2 text-slate-800">No Gram Panchayats Registered</h3>
      <p className="text-slate-500">Gram Panchayat data is currently being aggregated from Varkari addresses. Check back later.</p>
    </div>
  </AdminLayout>
);

export const Dindis = () => (
  <AdminLayout title="Team Leaders / Dindis">
    <div className="card text-center p-12" style={{ marginTop: '2rem' }}>
      <h3 className="text-xl font-bold mb-2 text-slate-800">No Dindis Active</h3>
      <p className="text-slate-500">Dindi and Team Leader information will appear here once group registrations begin.</p>
    </div>
  </AdminLayout>
);

export const IvrManagement = () => (
  <AdminLayout title="IVR Logs">
    <div className="card text-center p-12" style={{ marginTop: '2rem' }}>
      <h3 className="text-xl font-bold mb-2 text-slate-800">IVR System Logs</h3>
      <p className="text-slate-500">No recent automated voice calls recorded in the system.</p>
    </div>
  </AdminLayout>
);
