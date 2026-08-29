import React, { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../services/supabase';
import { AlertTriangle, Shield, PhoneCall, RefreshCw, CheckCircle2 } from 'lucide-react';

const Emergency = () => {
  const { t } = useLanguage();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('incidents')
        .select(`
          *,
          varkaris (
            id,
            name,
            registration_id,
            phone,
            blood_group,
            guardian_name,
            guardian_phone,
            medical_conditions
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIncidents(data || []);
    } catch (err) {
      console.error('Error fetching incidents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  return (
    <AdminLayout title={t('admin.emergency')}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 style={{ fontSize: '1.4rem' }} className="flex items-center gap-2 text-red-600">
            <AlertTriangle size={24} /> Emergency Incident Control Center
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Real-time emergency cases triggered by scanned QR bands during Wari
          </p>
        </div>
        <button onClick={fetchIncidents} className="btn btn-outline">
          <RefreshCw size={16} /> Refresh Cases
        </button>
      </div>

      <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        <div className="card" style={{ borderLeft: '4px solid #ef4444' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Active Unresolved Emergencies</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#dc2626' }}>
            {incidents.filter(i => i.status === 'OPEN').length}
          </div>
        </div>
        <div className="card" style={{ borderLeft: '4px solid #16a34a' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Resolved Emergency Cases</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#16a34a' }}>
            {incidents.filter(i => i.status === 'RESOLVED').length}
          </div>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Incident ID</th>
                <th>Pilgrim Name</th>
                <th>Reg ID</th>
                <th>Blood Group</th>
                <th>Emergency Contact</th>
                <th>Description / Incident Type</th>
                <th>Status</th>
                <th>Reported Time</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-6">Loading incident records...</td>
                </tr>
              ) : incidents.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-6 text-gray-500">
                    🟢 No active emergency incidents reported. All QR bands operating safely.
                  </td>
                </tr>
              ) : (
                incidents.map((incident) => (
                  <tr key={incident.id}>
                    <td><code>{incident.id.slice(0, 8)}</code></td>
                    <td className="font-semibold">{incident.varkaris?.name || 'Unknown'}</td>
                    <td><code>{incident.varkaris?.registration_id}</code></td>
                    <td><span className="font-bold text-red-600">{incident.varkaris?.blood_group}</span></td>
                    <td>
                      <div>{incident.varkaris?.guardian_name}</div>
                      <a href={`tel:${incident.varkaris?.guardian_phone}`} className="text-blue-600 font-semibold text-xs">
                        {incident.varkaris?.guardian_phone}
                      </a>
                    </td>
                    <td>{incident.description || 'Emergency QR Scan Alert'}</td>
                    <td>
                      {incident.status === 'OPEN' ? (
                        <span className="status-badge status-rejected animate-pulse">🚨 OPEN</span>
                      ) : (
                        <span className="status-badge status-verified">✅ RESOLVED</span>
                      )}
                    </td>
                    <td>{new Date(incident.created_at).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Emergency;
