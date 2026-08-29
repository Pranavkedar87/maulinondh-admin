import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { supabase } from '../services/supabase';
import {
  Users,
  CheckCircle,
  Clock,
  QrCode,
  Activity,
  AlertTriangle,
  RefreshCw,
  ArrowRight
} from 'lucide-react';

const AdminOverview = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    verified: 0,
    pending: 0,
    qrGenerated: 0,
    activeScanned: 0,
    alertsCount: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);

  const fetchOverviewData = async () => {
    setRefreshing(true);
    try {
      // 1. Total Registrations
      const { count: total } = await supabase.from('varkaris').select('*', { count: 'exact', head: true });
      
      // 2. Verified Users
      const { count: verified } = await supabase.from('varkaris').select('*', { count: 'exact', head: true }).eq('status', 'VERIFIED');
      
      // 3. Pending Verification
      const { count: pending } = await supabase.from('varkaris').select('*', { count: 'exact', head: true }).eq('status', 'PENDING_VERIFICATION');
      
      // 4. QR Codes Generated
      const { count: qrGenerated } = await supabase.from('varkaris').select('*', { count: 'exact', head: true }).not('qr_token', 'is', null);

      // 5. Active Scans count
      const { count: activeScanned } = await supabase.from('qr_scans').select('*', { count: 'exact', head: true });

      // 6. Alerts Count
      const { count: alertsCount } = await supabase.from('qr_alerts').select('*', { count: 'exact', head: true }).eq('status', 'OPEN');

      setStats({
        total: total || 0,
        verified: verified || 0,
        pending: pending || 0,
        qrGenerated: qrGenerated || 0,
        activeScanned: activeScanned || 0,
        alertsCount: alertsCount || 0
      });

      // Recent Activity Feed: Combine recent scans + recent registrations
      const { data: scans } = await supabase
        .from('qr_scans')
        .select('*, varkaris(name, registration_id)')
        .order('scanned_at', { ascending: false })
        .limit(5);

      const { data: varkariList } = await supabase
        .from('varkaris')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      let activityFeed = [];
      if (scans && scans.length > 0) {
        scans.forEach((s) => {
          activityFeed.push({
            id: `scan-${s.id}`,
            time: new Date(s.scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            rawDate: new Date(s.scanned_at),
            user: s.varkaris?.name || s.registration_id,
            regId: s.registration_id,
            activity: 'QR Scanned',
            location: s.location_name || (s.latitude ? `${s.latitude.toFixed(2)}, ${s.longitude.toFixed(2)}` : 'Pandharpur'),
            status: 'Active'
          });
        });
      }

      if (varkariList && varkariList.length > 0) {
        varkariList.forEach((v) => {
          activityFeed.push({
            id: `reg-${v.id}`,
            time: new Date(v.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            rawDate: new Date(v.created_at),
            user: v.name,
            regId: v.registration_id,
            activity: v.status === 'VERIFIED' ? 'Verified' : 'Registered',
            location: '—',
            status: v.status === 'VERIFIED' ? 'Verified' : 'Pending'
          });
        });
      }

      activityFeed.sort((a, b) => b.rawDate - a.rawDate);
      setRecentActivity(activityFeed.slice(0, 7));

    } catch (err) {
      console.error('Error fetching overview data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOverviewData();
  }, []);

  return (
    <AdminLayout title="Overview">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 style={{ fontSize: '1.3rem' }}>Operational Summary</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Real-time event indicators and operational activity</p>
        </div>
        <button onClick={fetchOverviewData} className="btn btn-outline" disabled={refreshing} style={{ padding: '0.35rem 0.75rem' }}>
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid gap-4 mb-8" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="card">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL REGISTRATIONS</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '0.2rem' }}>{stats.total}</div>
        </div>

        <div className="card">
          <span style={{ fontSize: '0.8rem', color: '#166534', fontWeight: 600 }}>VERIFIED USERS</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#16a34a', marginTop: '0.2rem' }}>{stats.verified}</div>
        </div>

        <div className="card">
          <span style={{ fontSize: '0.8rem', color: '#92400e', fontWeight: 600 }}>PENDING VERIFICATION</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#d97706', marginTop: '0.2rem' }}>{stats.pending}</div>
        </div>

        <div className="card">
          <span style={{ fontSize: '0.8rem', color: '#6d28d9', fontWeight: 600 }}>QR CODES GENERATED</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#8b5cf6', marginTop: '0.2rem' }}>{stats.qrGenerated}</div>
        </div>

        <div className="card">
          <span style={{ fontSize: '0.8rem', color: '#1d4ed8', fontWeight: 600 }}>ACTIVE / SCANNED USERS</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#2563eb', marginTop: '0.2rem' }}>{stats.activeScanned}</div>
        </div>

        <div className="card">
          <span style={{ fontSize: '0.8rem', color: '#b91c1c', fontWeight: 600 }}>OPEN ALERTS</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#dc2626', marginTop: '0.2rem' }}>{stats.alertsCount}</div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="card p-0 overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center" style={{ borderColor: 'var(--border)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Recent Operational Activity</h3>
          <button onClick={() => navigate('/registrations')} className="btn btn-outline" style={{ padding: '0.25rem 0.65rem', fontSize: '0.8rem' }}>
            <span>Manage Registrations</span>
            <ArrowRight size={14} />
          </button>
        </div>

        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>User / Reg ID</th>
                <th>Activity</th>
                <th>Location</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="text-center py-4">Loading operational activity feed...</td>
                </tr>
              ) : recentActivity.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-4 text-gray-500">No activity recorded yet. Scan a QR code or submit a registration to see live logs.</td>
                </tr>
              ) : (
                recentActivity.map((item) => (
                  <tr key={item.id}>
                    <td><code style={{ fontSize: '0.85rem' }}>{item.time}</code></td>
                    <td className="font-semibold">{item.user}</td>
                    <td>{item.activity}</td>
                    <td>{item.location}</td>
                    <td>
                      {item.status === 'Active' && <span className="status-badge status-active">Active</span>}
                      {item.status === 'Verified' && <span className="status-badge status-verified">Verified</span>}
                      {item.status === 'Pending' && <span className="status-badge status-pending">Pending</span>}
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

export default AdminOverview;
