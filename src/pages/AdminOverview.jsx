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
  ArrowRight,
  ShieldAlert,
  Search
} from 'lucide-react';

const AdminOverview = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Dashboard Stats
  const [stats, setStats] = useState({
    total: 0,
    verified: 0,
    pending: 0,
    rejected: 0,
    activeAlerts: 0,
    emergencyCases: 0
  });

  // Action Required Data
  const [actionRequired, setActionRequired] = useState({
    pendingVerifications: 0,
    flaggedRegistrations: 0,
    activeEmergencies: 0
  });

  const [recentActivity, setRecentActivity] = useState([]);

  const fetchOverviewData = async () => {
    setRefreshing(true);
    try {
      // 1. Core KPIs
      const { count: total } = await supabase.from('varkaris').select('*', { count: 'exact', head: true });
      const { count: verified } = await supabase.from('varkaris').select('*', { count: 'exact', head: true }).eq('status', 'VERIFIED');
      const { count: pending } = await supabase.from('varkaris').select('*', { count: 'exact', head: true }).eq('status', 'PENDING_VERIFICATION');
      const { count: rejected } = await supabase.from('varkaris').select('*', { count: 'exact', head: true }).eq('status', 'REJECTED');
      
      const { count: activeAlerts } = await supabase.from('qr_alerts').select('*', { count: 'exact', head: true }).eq('status', 'OPEN');
      const { count: emergencyCases } = await supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('status', 'OPEN');

      setStats({
        total: total || 0,
        verified: verified || 0,
        pending: pending || 0,
        rejected: rejected || 0,
        activeAlerts: activeAlerts || 0,
        emergencyCases: emergencyCases || 0
      });

      setActionRequired({
        pendingVerifications: pending || 0,
        flaggedRegistrations: rejected || 0,
        activeEmergencies: emergencyCases || 0
      });

      // Recent Activity Feed: Combine recent scans, incidents, and registrations
      const { data: scans } = await supabase
        .from('qr_scans')
        .select('*, varkaris(name, registration_id)')
        .order('scanned_at', { ascending: false })
        .limit(3);

      const { data: varkariList } = await supabase
        .from('varkaris')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);
        
      const { data: incidentList } = await supabase
        .from('incidents')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);

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
            location: v.address || '—',
            status: v.status === 'VERIFIED' ? 'Verified' : 'Pending'
          });
        });
      }
      
      if (incidentList && incidentList.length > 0) {
        incidentList.forEach((i) => {
          activityFeed.push({
            id: `inc-${i.id}`,
            time: new Date(i.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            rawDate: new Date(i.created_at),
            user: i.reporter_phone,
            regId: i.varkari_id || 'Unknown',
            activity: `Emergency: ${i.type}`,
            location: i.address || '—',
            status: 'Critical'
          });
        });
      }

      activityFeed.sort((a, b) => b.rawDate - a.rawDate);
      setRecentActivity(activityFeed.slice(0, 8));

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
          <h2 style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--text-h)' }}>MAULINOND Command Center</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Real-time operational overview and intelligence</p>
        </div>
        <button onClick={fetchOverviewData} className="btn btn-outline" disabled={refreshing} style={{ padding: '0.4rem 0.85rem' }}>
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* 1. TOP KPI SUMMARY SECTION */}
      <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="card border-l-4 border-blue-600">
          <div className="flex justify-between items-start">
             <div>
               <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Total Registrations</span>
               <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.2rem', color: '#1e3a8a' }}>{stats.total}</div>
             </div>
             <Users size={20} className="text-blue-500" />
          </div>
        </div>

        <div className="card border-l-4 border-green-600">
          <div className="flex justify-between items-start">
             <div>
               <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Verified</span>
               <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.2rem', color: '#14532d' }}>{stats.verified}</div>
             </div>
             <CheckCircle size={20} className="text-green-500" />
          </div>
        </div>

        <div className="card border-l-4 border-yellow-500">
          <div className="flex justify-between items-start">
             <div>
               <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Pending Review</span>
               <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.2rem', color: '#78350f' }}>{stats.pending}</div>
             </div>
             <Clock size={20} className="text-yellow-500" />
          </div>
        </div>

        <div className="card border-l-4 border-red-600">
          <div className="flex justify-between items-start">
             <div>
               <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Rejected / Flagged</span>
               <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.2rem', color: '#7f1d1d' }}>{stats.rejected}</div>
             </div>
             <AlertTriangle size={20} className="text-red-500" />
          </div>
        </div>
        
        <div className="card border-l-4 border-purple-600">
          <div className="flex justify-between items-start">
             <div>
               <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Active Alerts</span>
               <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.2rem', color: '#4c1d95' }}>{stats.activeAlerts}</div>
             </div>
             <Activity size={20} className="text-purple-500" />
          </div>
        </div>

        <div className="card border-l-4 border-red-800" style={{ background: '#fef2f2' }}>
          <div className="flex justify-between items-start">
             <div>
               <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Emergency Cases</span>
               <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.2rem', color: '#7f1d1d' }}>{stats.emergencyCases}</div>
             </div>
             <ShieldAlert size={20} className="text-red-700" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* 2. ACTION REQUIRED SECTION */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-h)' }} className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-orange-500" />
            Action Required
          </h3>
          
          <div className="card p-4 border border-yellow-200 bg-yellow-50 flex justify-between items-center">
            <div>
              <div className="font-bold text-yellow-900">{actionRequired.pendingVerifications} Pending Verifications</div>
              <div className="text-xs text-yellow-700">Registrations awaiting manual review</div>
            </div>
            <button onClick={() => navigate('/verification')} className="btn btn-primary bg-yellow-600 hover:bg-yellow-700 text-white text-xs px-3 py-1.5">
              Review
            </button>
          </div>
          
          <div className="card p-4 border border-red-200 bg-red-50 flex justify-between items-center">
            <div>
              <div className="font-bold text-red-900">{actionRequired.activeEmergencies} Active Emergencies</div>
              <div className="text-xs text-red-700">Critical incidents requiring dispatch</div>
            </div>
            <button onClick={() => navigate('/alerts')} className="btn btn-primary bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1.5">
              Resolve
            </button>
          </div>
          
          <div className="card p-4 border border-orange-200 bg-orange-50 flex justify-between items-center">
            <div>
              <div className="font-bold text-orange-900">{actionRequired.flaggedRegistrations} Flagged Cases</div>
              <div className="text-xs text-orange-700">Rejected profiles requiring audit</div>
            </div>
            <button onClick={() => navigate('/registrations')} className="btn btn-primary bg-orange-600 hover:bg-orange-700 text-white text-xs px-3 py-1.5">
              Inspect
            </button>
          </div>
        </div>

        {/* 3. LIVE / RECENT ACTIVITY */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-h)' }} className="flex items-center gap-2">
              <Activity size={18} className="text-blue-500" />
              Live / Recent Activity
            </h3>
            <button onClick={() => navigate('/registrations')} className="text-sm font-semibold text-blue-600 hover:underline flex items-center gap-1">
              View All <ArrowRight size={14} />
            </button>
          </div>

          <div className="card p-0 overflow-hidden border border-gray-200 flex-1">
            <div className="table-container">
              <table className="admin-table w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">User / Target</th>
                    <th className="px-4 py-3">Activity</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="text-center py-8 text-gray-500">Loading operational activity feed...</td>
                    </tr>
                  ) : recentActivity.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-8 text-gray-500">No activity recorded yet in the database.</td>
                    </tr>
                  ) : (
                    recentActivity.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3"><code className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">{item.time}</code></td>
                        <td className="px-4 py-3 font-semibold text-gray-900">{item.user}</td>
                        <td className="px-4 py-3 text-gray-700">{item.activity}</td>
                        <td className="px-4 py-3 text-gray-500 truncate max-w-xs">{item.location}</td>
                        <td className="px-4 py-3">
                          {item.status === 'Critical' && <span className="bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded">CRITICAL</span>}
                          {item.status === 'Active' && <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded">ACTIVE</span>}
                          {item.status === 'Verified' && <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded">VERIFIED</span>}
                          {item.status === 'Pending' && <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded">PENDING</span>}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminOverview;
