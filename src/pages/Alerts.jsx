import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { supabase } from '../services/supabase';
import { AlertTriangle, RefreshCw, Eye, CheckCircle2 } from 'lucide-react';

const Alerts = () => {
  const navigate = useNavigate();

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('qr_alerts')
        .select(`
          *,
          varkaris (
            id,
            name,
            registration_id,
            phone,
            blood_group,
            guardian_phone
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlerts(data || []);
    } catch (err) {
      console.error('Error fetching alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleResolveAlert = async (alertId) => {
    try {
      await supabase.from('qr_alerts').update({ status: 'RESOLVED' }).eq('id', alertId);
      fetchAlerts();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <AdminLayout title="Alerts">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 style={{ fontSize: '1.3rem' }} className="flex items-center gap-2 text-red-600">
            <AlertTriangle size={20} /> Actionable Alerts & Incidents
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            System flags for emergency scans, unusual activity, and critical data gaps
          </p>
        </div>

        <button onClick={fetchAlerts} className="btn btn-outline" style={{ padding: '0.35rem 0.75rem' }}>
          <RefreshCw size={14} /> Refresh Alerts
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User / Reg ID</th>
                <th>Time</th>
                <th>Location</th>
                <th>Reason / Flag Type</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-6">Loading active alerts...</td>
                </tr>
              ) : alerts.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-6 text-gray-500">
                    🟢 Clear! No open alerts or unusual scan activity detected.
                  </td>
                </tr>
              ) : (
                alerts.map((alert) => (
                  <tr key={alert.id}>
                    <td>
                      <div className="font-semibold">{alert.varkaris?.name || alert.registration_id}</div>
                      <code className="text-xs">{alert.registration_id}</code>
                    </td>
                    <td><code style={{ fontSize: '0.825rem' }}>{new Date(alert.created_at).toLocaleString()}</code></td>
                    <td>{alert.location_name || 'Pandharpur Route'}</td>
                    <td>
                      <span className="font-bold text-red-600 text-xs bg-red-50 px-2 py-1 rounded">
                        {alert.alert_type}: {alert.message}
                      </span>
                    </td>
                    <td>
                      {alert.status === 'OPEN' ? (
                        <span className="status-badge status-rejected">🚨 OPEN</span>
                      ) : (
                        <span className="status-badge status-verified">RESOLVED</span>
                      )}
                    </td>
                    <td>
                      <div className="flex gap-1">
                        {alert.varkari_id && (
                          <button
                            onClick={() => navigate(`/registrations/${alert.varkari_id}`)}
                            className="btn btn-outline"
                            style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                          >
                            <Eye size={12} /> Profile
                          </button>
                        )}
                        {alert.status === 'OPEN' && (
                          <button
                            onClick={() => handleResolveAlert(alert.id)}
                            className="btn btn-success"
                            style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                          >
                            <CheckCircle2 size={12} /> Resolve
                          </button>
                        )}
                      </div>
                    </td>
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

export default Alerts;
