import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { supabase } from '../services/supabase';
import { Search, RefreshCw, Eye, ChevronLeft, ChevronRight } from 'lucide-react';

const Registrations = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialFilter = searchParams.get('filter') || 'ALL';

  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState(initialFilter);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 15;

  const fetchRegistrations = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('varkaris')
        .select('*', { count: 'exact' });

      // Apply Filters
      if (filter === 'VERIFIED') {
        query = query.eq('status', 'VERIFIED');
      } else if (filter === 'PENDING') {
        query = query.eq('status', 'PENDING_VERIFICATION');
      } else if (filter === 'REJECTED') {
        query = query.eq('status', 'REJECTED');
      } else if (filter === 'QR_GENERATED') {
        query = query.not('qr_token', 'is', null);
      } else if (filter === 'QR_NOT_GENERATED') {
        query = query.is('qr_token', null);
      } else if (filter === 'RECENTLY_ACTIVE') {
        query = query.not('band_issued_at', 'is', null);
      }

      // Apply Debounced / Direct Search
      if (search.trim()) {
        const s = `%${search.trim()}%`;
        query = query.or(
          `name.ilike.${s},registration_id.ilike.${s},phone.ilike.${s},blood_group.ilike.${s},guardian_phone.ilike.${s},qr_token.ilike.${s}`
        );
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      setRegistrations(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Error fetching registrations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, [filter, page, search]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <AdminLayout title="Registrations">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 style={{ fontSize: '1.3rem' }}>Registration Management</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Unified directory for searching, reviewing, and accessing user profiles
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-80">
            <input
              type="text"
              className="input"
              style={{ height: '38px' }}
              placeholder="Search Name, Reg ID, Mobile, Blood, QR..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <button onClick={fetchRegistrations} className="btn btn-outline" style={{ height: '38px', padding: '0 0.65rem' }}>
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b pb-3" style={{ borderColor: 'var(--border)' }}>
        {[
          { id: 'ALL', label: 'All Registrations' },
          { id: 'VERIFIED', label: 'Verified' },
          { id: 'PENDING', label: 'Pending' },
          { id: 'REJECTED', label: 'Rejected' },
          { id: 'QR_GENERATED', label: 'QR Generated' },
          { id: 'QR_NOT_GENERATED', label: 'QR Not Generated' },
          { id: 'RECENTLY_ACTIVE', label: 'Recently Active' }
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => { setFilter(f.id); setPage(1); }}
            className={`btn ${filter === f.id ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem', borderRadius: 'var(--radius-full)' }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden mb-6">
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Registration ID</th>
                <th>Name</th>
                <th>Mobile</th>
                <th>Age</th>
                <th>Blood Group</th>
                <th>Verification</th>
                <th>QR Code</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-6">Loading records from database...</td>
                </tr>
              ) : registrations.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-6 text-gray-500">
                    No registrations found matching search criteria.
                  </td>
                </tr>
              ) : (
                registrations.map((item) => (
                  <tr key={item.id}>
                    <td><code style={{ background: '#f1f5f9', padding: '0.2rem 0.4rem', borderRadius: '4px', fontSize: '0.825rem', fontWeight: 600 }}>{item.registration_id}</code></td>
                    <td className="font-semibold">{item.name}</td>
                    <td>{item.phone}</td>
                    <td>{item.age}</td>
                    <td><span className="font-bold text-red-600">{item.blood_group}</span></td>
                    <td>
                      {item.status === 'VERIFIED' && <span className="status-badge status-verified">Verified</span>}
                      {item.status === 'PENDING_VERIFICATION' && <span className="status-badge status-pending">Pending</span>}
                      {item.status === 'REJECTED' && <span className="status-badge status-rejected">Rejected</span>}
                    </td>
                    <td>
                      {item.qr_token ? (
                        <span className="text-green-700 font-bold text-xs bg-green-50 px-2 py-0.5 rounded border border-green-200">
                          ✓ Generated
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs font-italic">— Not Generated</span>
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => navigate(`/registrations/${item.id}`)}
                        className="btn btn-outline flex items-center gap-1"
                        style={{ padding: '0.25rem 0.65rem', fontSize: '0.775rem' }}
                      >
                        <Eye size={14} /> View
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
              className="btn btn-outline"
              style={{ padding: '0.3rem 0.6rem' }}
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn btn-outline"
              style={{ padding: '0.3rem 0.6rem' }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default Registrations;
