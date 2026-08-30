import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { supabase } from '../services/supabase';
import { AlertTriangle, RefreshCw, Eye, CheckCircle2, Phone, MapPin } from 'lucide-react';

const Alerts = () => {
  const navigate = useNavigate();

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      // 1. Fetch QR Alerts (Old structure)
      const { data: qrAlertsData, error: qrErr } = await supabase
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

      if (qrErr && qrErr.code !== '42P01') console.error('Error fetching qr_alerts:', qrErr);

      // 2. Fetch Incidents (New unified structure)
      const { data: incidentsData, error: incErr } = await supabase
        .from('incidents')
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

      if (incErr && incErr.code !== '42P01') console.error('Error fetching incidents:', incErr);

      // Normalize and merge data
      const normalizedQrAlerts = (qrAlertsData || []).map(a => ({
        id: a.id,
        table: 'qr_alerts',
        type: a.alert_type,
        message: a.message,
        location: a.location_name || 'Pandharpur Route',
        priority: 'STANDARD',
        source: 'QR_SCAN',
        status: a.status,
        created_at: a.created_at,
        varkari: a.varkaris,
        reporter_phone: null,
        latitude: a.latitude,
        longitude: a.longitude
      }));

      const normalizedIncidents = (incidentsData || []).map(i => ({
        id: i.id,
        table: 'incidents',
        type: i.type,
        message: i.description || 'Emergency Reported',
        location: i.address || 'Unknown',
        priority: i.priority || 'HIGH',
        source: i.source || 'WEB',
        status: i.status,
        created_at: i.created_at,
        varkari: i.varkaris,
        reporter_phone: i.reporter_phone,
        latitude: i.latitude,
        longitude: i.longitude
      }));

      const combined = [...normalizedQrAlerts, ...normalizedIncidents].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );

      setAlerts(combined);
    } catch (err) {
      console.error('Error in fetchAlerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleResolveAlert = async (alertId, table) => {
    try {
      if (table === 'qr_alerts') {
        await supabase.from('qr_alerts').update({ status: 'RESOLVED' }).eq('id', alertId);
      } else {
        await supabase.from('incidents').update({ status: 'RESOLVED', resolved_at: new Date().toISOString() }).eq('id', alertId);
      }
      fetchAlerts();
    } catch (e) {
      console.error(e);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'CRITICAL': return 'bg-red-600 text-white border-red-700';
      case 'HIGH': return 'bg-orange-500 text-white border-orange-600';
      default: return 'bg-yellow-500 text-white border-yellow-600';
    }
  };

  return (
    <AdminLayout title="Emergency Dashboard">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 style={{ fontSize: '1.3rem' }} className="flex items-center gap-2 text-red-600 font-bold">
            <AlertTriangle size={20} /> Unified Incident & Alert Dashboard
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            System flags, QR scans, and IVR Emergency Calls
          </p>
        </div>

        <button onClick={fetchAlerts} className="btn btn-outline" style={{ padding: '0.35rem 0.75rem' }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="text-center py-6 text-gray-500">Loading open incidents...</div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-6 text-green-600 font-semibold bg-green-50 rounded-lg">
            🟢 Clear! No open alerts or unusual scan activity detected.
          </div>
        ) : (
          alerts.map((alert) => (
            <div key={alert.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.2rem' }}>{alert.source === 'IVR' ? '📞' : '🚨'}</span>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                    {alert.source === 'IVR' ? `IVR ${alert.type}` : alert.type}
                  </h3>
                  <span className={`text-[0.65rem] px-1.5 py-0.5 rounded font-bold border ${getPriorityColor(alert.priority)}`}>
                    {alert.priority}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  {new Date(alert.created_at).toLocaleString()}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem' }}>
                <div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700 }}>INCIDENT ID</div>
                  <div style={{ fontFamily: 'monospace' }}>{alert.id.split('-')[0].toUpperCase()}</div>
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700 }}>VARKARI</div>
                  <div style={{ fontWeight: 600 }}>
                    {alert.varkari?.name || 'Unknown'} <code style={{ fontSize: '0.75rem', marginLeft: '0.25rem' }}>{alert.varkari?.registration_id}</code>
                  </div>
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700 }}>SOURCE</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600 }}>
                    {alert.source}
                  </div>
                </div>
                {alert.reporter_phone && (
                  <div>
                    <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700 }}>REPORTER PHONE</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600 }}>
                      <Phone size={14} /> {alert.reporter_phone}
                    </div>
                  </div>
                )}
                <div style={{ gridColumn: 'span 2' }}>
                  <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700 }}>LOCATION</div>
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>{alert.location}</div>
                </div>
                {alert.message && alert.message !== 'Emergency Reported' && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700 }}>DESCRIPTION</div>
                    <div>{alert.message}</div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                <div>
                  <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700, marginRight: '0.5rem' }}>STATUS</span>
                  {alert.status === 'OPEN' || alert.status === 'REPORTED' ? (
                    <span className="status-badge status-rejected" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>🚨 {alert.status}</span>
                  ) : (
                    <span className="status-badge status-verified" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>✅ RESOLVED</span>
                  )}
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => {
                      if (alert.latitude && alert.longitude) {
                        window.open(`https://www.google.com/maps/search/?api=1&query=${alert.latitude},${alert.longitude}`, '_blank');
                      } else {
                        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(alert.location)}`, '_blank');
                      }
                    }}
                    className="btn btn-outline"
                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', color: '#ea580c', borderColor: '#fed7aa', background: '#fff7ed' }}
                  >
                    <MapPin size={14} /> View Map
                  </button>
                  {alert.varkari?.id && (
                    <button
                      onClick={() => navigate(`/registrations/${alert.varkari.id}`)}
                      className="btn btn-outline"
                      style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                    >
                      <Eye size={14} /> View Profile
                    </button>
                  )}
                  {(alert.status === 'OPEN' || alert.status === 'REPORTED') && (
                    <button
                      onClick={() => handleResolveAlert(alert.id, alert.table)}
                      className="btn btn-success"
                      style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                    >
                      <CheckCircle2 size={14} /> Mark Resolved
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </AdminLayout>
  );
};

export default Alerts;
