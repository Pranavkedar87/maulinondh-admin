import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../services/supabase';
import {
  Users,
  Clock,
  CheckCircle,
  XCircle,
  QrCode,
  PackageCheck,
  PackageSearch,
  ArrowRight,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

const AdminDashboard = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    qrGenerated: 0,
    bandsIssued: 0,
    bandsPending: 0
  });
  const [recentPilgrims, setRecentPilgrims] = useState([]);

  const fetchStats = async () => {
    setRefreshing(true);
    setFetchError(null);
    try {
      // 1. Total
      const { count: totalCount, error: err1 } = await supabase
        .from('varkaris')
        .select('*', { count: 'exact', head: true });

      if (err1) console.warn('Supabase query warning (total):', err1);

      // 2. Pending
      const { count: pendingCount } = await supabase
        .from('varkaris')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'PENDING_VERIFICATION');

      // 3. Approved
      const { count: approvedCount } = await supabase
        .from('varkaris')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'VERIFIED');

      // 4. Rejected
      const { count: rejectedCount } = await supabase
        .from('varkaris')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'REJECTED');

      // 5. QR Generated
      const { count: qrCount } = await supabase
        .from('varkaris')
        .select('*', { count: 'exact', head: true })
        .not('qr_token', 'is', null);

      // 6. Bands Issued
      const { count: issuedCount } = await supabase
        .from('varkaris')
        .select('*', { count: 'exact', head: true })
        .not('band_issued_at', 'is', null);

      // 7. Bands Pending
      const { count: bandsPendingCount } = await supabase
        .from('varkaris')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'VERIFIED')
        .is('band_issued_at', null);

      setStats({
        total: totalCount || 0,
        pending: pendingCount || 0,
        approved: approvedCount || 0,
        rejected: rejectedCount || 0,
        qrGenerated: qrCount || 0,
        bandsIssued: issuedCount || 0,
        bandsPending: bandsPendingCount || 0
      });

      // Fetch Recent Registrations
      const { data: recent, error: recentError } = await supabase
        .from('varkaris')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (recentError) {
        console.error('Supabase fetch error:', recentError);
        setFetchError(recentError.message);
      } else if (recent) {
        setRecentPilgrims(recent);
      }
    } catch (err) {
      console.error('Error fetching admin dashboard stats:', err);
      setFetchError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING_VERIFICATION':
        return <span className="status-badge status-pending">{t('status.PENDING_VERIFICATION')}</span>;
      case 'VERIFIED':
        return <span className="status-badge status-verified">{t('status.VERIFIED')}</span>;
      case 'REJECTED':
        return <span className="status-badge status-rejected">{t('status.REJECTED')}</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  return (
    <AdminLayout title={t('admin.dashboard')}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 style={{ fontSize: '1.4rem' }}>Operational Overview</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Real-time pilgrim metrics from Supabase database</p>
        </div>
        <button
          onClick={fetchStats}
          className="btn btn-outline"
          disabled={refreshing}
          style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {fetchError && (
        <div className="card mb-6 p-4" style={{ background: '#fee2e2', borderColor: '#fecaca', color: '#991b1b' }}>
          <div className="flex items-center gap-2 font-bold mb-1">
            <AlertTriangle size={20} />
            <span>Supabase Data Access Warning: {fetchError}</span>
          </div>
          <p style={{ fontSize: '0.85rem' }}>
            If records are 0 or not loading, ensure you have run <code>admin_schema.sql</code> in Supabase SQL Editor to grant RLS read permissions to the Admin role.
          </p>
        </div>
      )}

      {/* Summary Stat Cards */}
      <div className="grid gap-4 mb-8" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div className="card flex items-center justify-between" style={{ borderLeft: '4px solid var(--primary)' }}>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>{t('admin.stats.totalPilgrims')}</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.2rem' }}>{stats.total}</div>
          </div>
          <div style={{ background: 'var(--primary-light)', padding: '0.75rem', borderRadius: '50%' }}>
            <Users size={24} color="var(--primary)" />
          </div>
        </div>

        <div className="card flex items-center justify-between" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>{t('admin.stats.pendingApps')}</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#b45309', marginTop: '0.2rem' }}>{stats.pending}</div>
          </div>
          <div style={{ background: '#fef3c7', padding: '0.75rem', borderRadius: '50%' }}>
            <Clock size={24} color="#d97706" />
          </div>
        </div>

        <div className="card flex items-center justify-between" style={{ borderLeft: '4px solid #16a34a' }}>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>{t('admin.stats.approvedApps')}</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#15803d', marginTop: '0.2rem' }}>{stats.approved}</div>
          </div>
          <div style={{ background: '#dcfce7', padding: '0.75rem', borderRadius: '50%' }}>
            <CheckCircle size={24} color="#16a34a" />
          </div>
        </div>

        <div className="card flex items-center justify-between" style={{ borderLeft: '4px solid #ef4444' }}>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>{t('admin.stats.rejectedApps')}</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#b91c1c', marginTop: '0.2rem' }}>{stats.rejected}</div>
          </div>
          <div style={{ background: '#fee2e2', padding: '0.75rem', borderRadius: '50%' }}>
            <XCircle size={24} color="#ef4444" />
          </div>
        </div>

        <div className="card flex items-center justify-between" style={{ borderLeft: '4px solid #8b5cf6' }}>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>{t('admin.stats.qrGenerated')}</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#6d28d9', marginTop: '0.2rem' }}>{stats.qrGenerated}</div>
          </div>
          <div style={{ background: '#f3e8ff', padding: '0.75rem', borderRadius: '50%' }}>
            <QrCode size={24} color="#8b5cf6" />
          </div>
        </div>

        <div className="card flex items-center justify-between" style={{ borderLeft: '4px solid #2563eb' }}>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>{t('admin.stats.bandsIssued')}</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1d4ed8', marginTop: '0.2rem' }}>{stats.bandsIssued}</div>
          </div>
          <div style={{ background: '#dbeafe', padding: '0.75rem', borderRadius: '50%' }}>
            <PackageCheck size={24} color="#2563eb" />
          </div>
        </div>

        <div className="card flex items-center justify-between" style={{ borderLeft: '4px solid #06b6d4' }}>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>{t('admin.stats.bandsPending')}</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0e7490', marginTop: '0.2rem' }}>{stats.bandsPending}</div>
          </div>
          <div style={{ background: '#cffafe', padding: '0.75rem', borderRadius: '50%' }}>
            <PackageSearch size={24} color="#0891b2" />
          </div>
        </div>
      </div>

      {/* Recent Registrations */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h3 style={{ fontSize: '1.1rem' }}>Recent Pilgrim Registrations</h3>
          <button
            onClick={() => navigate('/pilgrims')}
            className="btn btn-outline flex items-center gap-1"
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
          >
            <span>View All</span>
            <ArrowRight size={14} />
          </button>
        </div>

        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('admin.table.photo')}</th>
                <th>{t('admin.table.name')}</th>
                <th>{t('admin.table.regId')}</th>
                <th>{t('admin.table.phone')}</th>
                <th>{t('admin.table.bloodGroup')}</th>
                <th>{t('admin.table.status')}</th>
                <th>{t('admin.table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-4">Loading real database records...</td>
                </tr>
              ) : recentPilgrims.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-4" style={{ color: 'var(--text-muted)' }}>
                    No registrations found in Supabase. Register a pilgrim from the registration portal to test!
                  </td>
                </tr>
              ) : (
                recentPilgrims.map((pilgrim) => (
                  <tr key={pilgrim.id}>
                    <td>
                      {pilgrim.photo_url ? (
                        <img
                          src={pilgrim.photo_url}
                          alt={pilgrim.name}
                          style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            background: 'var(--primary-light)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            color: 'var(--primary-dark)'
                          }}
                        >
                          {pilgrim.name?.charAt(0) || 'P'}
                        </div>
                      )}
                    </td>
                    <td className="font-semibold">{pilgrim.name}</td>
                    <td><code style={{ background: 'var(--bg-color)', padding: '0.2rem 0.4rem', borderRadius: '4px', fontSize: '0.85rem' }}>{pilgrim.registration_id}</code></td>
                    <td>{pilgrim.phone}</td>
                    <td><span className="font-bold text-red-600">{pilgrim.blood_group}</span></td>
                    <td>{getStatusBadge(pilgrim.status)}</td>
                    <td>
                      <button
                        onClick={() => navigate(`/pilgrims/${pilgrim.id}`)}
                        className="btn btn-primary"
                        style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}
                      >
                        {t('admin.table.view')}
                      </button>
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

export default AdminDashboard;
