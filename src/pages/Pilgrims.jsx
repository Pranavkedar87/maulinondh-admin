import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../services/supabase';
import { Search, Filter, RefreshCw, Eye, ChevronLeft, ChevronRight } from 'lucide-react';

const Pilgrims = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialStatus = searchParams.get('status') || 'ALL';

  const [pilgrims, setPilgrims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 15;

  const fetchPilgrims = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('varkaris')
        .select('*', { count: 'exact' });

      // Apply Filter Tabs
      if (statusFilter === 'PENDING') {
        query = query.eq('status', 'PENDING_VERIFICATION');
      } else if (statusFilter === 'APPROVED') {
        query = query.eq('status', 'VERIFIED');
      } else if (statusFilter === 'REJECTED') {
        query = query.eq('status', 'REJECTED');
      } else if (statusFilter === 'QR_GENERATED') {
        query = query.not('qr_token', 'is', null);
      } else if (statusFilter === 'BAND_ISSUED') {
        query = query.not('band_issued_at', 'is', null);
      }

      // Apply Search (name, registration_id, phone)
      if (search.trim()) {
        const s = `%${search.trim()}%`;
        query = query.or(`name.ilike.${s},registration_id.ilike.${s},phone.ilike.${s}`);
      }

      // Pagination & Order
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      setPilgrims(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Error fetching pilgrims:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPilgrims();
  }, [statusFilter, page, search]);

  const getStatusBadge = (status, qrToken, bandIssuedAt) => {
    if (bandIssuedAt) {
      return <span className="status-badge status-issued">🔵 Band Issued</span>;
    }
    if (qrToken) {
      return <span className="status-badge status-verified">💜 QR Ready</span>;
    }
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

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <AdminLayout title={t('admin.pilgrims')}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 style={{ fontSize: '1.4rem' }}>{t('admin.pilgrims')} Management</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Review, verify, and issue QR bands for submitted pilgrim applications
          </p>
        </div>

        {/* Search Input */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-72" style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="input"
              style={{ paddingLeft: '36px', height: '40px' }}
              placeholder={t('admin.filters.searchPlaceholder')}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <button onClick={fetchPilgrims} className="btn btn-outline" style={{ height: '40px', padding: '0 0.75rem' }}>
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b pb-3" style={{ borderColor: 'var(--border)' }}>
        {[
          { id: 'ALL', label: t('admin.filters.all') },
          { id: 'PENDING', label: t('admin.filters.pending') },
          { id: 'APPROVED', label: t('admin.filters.approved') },
          { id: 'REJECTED', label: t('admin.filters.rejected') },
          { id: 'QR_GENERATED', label: t('admin.filters.qrGenerated') },
          { id: 'BAND_ISSUED', label: t('admin.filters.bandIssued') }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setStatusFilter(tab.id); setPage(1); }}
            className={`btn ${statusFilter === tab.id ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '0.35rem 0.85rem', fontSize: '0.85rem', borderRadius: 'var(--radius-full)' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card mb-6 p-0 overflow-hidden">
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('admin.table.photo')}</th>
                <th>{t('admin.table.name')}</th>
                <th>{t('admin.table.regId')}</th>
                <th>{t('admin.table.phone')}</th>
                <th>District / Location</th>
                <th>{t('admin.table.bloodGroup')}</th>
                <th>{t('admin.table.status')}</th>
                <th>{t('admin.table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-6">Loading pilgrims from Supabase...</td>
                </tr>
              ) : pilgrims.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-6" style={{ color: 'var(--text-muted)' }}>
                    No pilgrim records found matching criteria.
                  </td>
                </tr>
              ) : (
                pilgrims.map((pilgrim) => (
                  <tr key={pilgrim.id}>
                    <td>
                      {pilgrim.photo_url ? (
                        <img
                          src={pilgrim.photo_url}
                          alt={pilgrim.name}
                          style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
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
                    <td>
                      <div className="font-semibold">{pilgrim.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Age: {pilgrim.age} • {pilgrim.gender}</div>
                    </td>
                    <td><code style={{ background: 'var(--bg-color)', padding: '0.2rem 0.4rem', borderRadius: '4px', fontSize: '0.85rem' }}>{pilgrim.registration_id}</code></td>
                    <td>{pilgrim.phone}</td>
                    <td>{pilgrim.district || pilgrim.address || '—'}</td>
                    <td><span className="font-bold text-red-600">{pilgrim.blood_group}</span></td>
                    <td>{getStatusBadge(pilgrim.status, pilgrim.qr_token, pilgrim.band_issued_at)}</td>
                    <td>
                      <button
                        onClick={() => navigate(`/pilgrims/${pilgrim.id}`)}
                        className="btn btn-primary flex items-center gap-1"
                        style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
                      >
                        <Eye size={14} />
                        <span>{t('admin.table.view')}</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center">
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} records
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn btn-outline p-2"
              style={{ padding: '0.35rem 0.65rem' }}
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn btn-outline p-2"
              style={{ padding: '0.35rem 0.65rem' }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default Pilgrims;
