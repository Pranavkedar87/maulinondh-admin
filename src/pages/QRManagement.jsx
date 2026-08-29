import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../services/supabase';
import { QrCode, Search, RefreshCw, Eye, CheckCircle2, Clock } from 'lucide-react';

const QRManagement = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [pilgrims, setPilgrims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('ALL');

  const fetchQRList = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('varkaris')
        .select('*');

      if (tab === 'GENERATED') {
        query = query.not('qr_token', 'is', null);
      } else if (tab === 'PENDING') {
        query = query.eq('status', 'VERIFIED').is('qr_token', null);
      } else if (tab === 'ISSUED') {
        query = query.not('band_issued_at', 'is', null);
      }

      if (search.trim()) {
        const s = `%${search.trim()}%`;
        query = query.or(`name.ilike.${s},registration_id.ilike.${s},qr_token.ilike.${s}`);
      }

      const { data, error } = await query
        .order('updated_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setPilgrims(data || []);
    } catch (err) {
      console.error('Error fetching QR list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQRList();
  }, [tab, search]);

  return (
    <AdminLayout title={t('admin.qrManagement')}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 style={{ fontSize: '1.4rem' }}>QR & Safety Band Directory</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Monitor and track generated QR identities for verified pilgrims
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-72">
            <input
              type="text"
              className="input"
              placeholder="Search QR Token, Reg ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button onClick={fetchQRList} className="btn btn-outline">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b pb-3" style={{ borderColor: 'var(--border)' }}>
        {[
          { id: 'ALL', label: 'All Records' },
          { id: 'GENERATED', label: 'QR Generated' },
          { id: 'PENDING', label: 'QR Pending Generation' },
          { id: 'ISSUED', label: 'Physical Band Issued' }
        ].map((tItem) => (
          <button
            key={tItem.id}
            onClick={() => setTab(tItem.id)}
            className={`btn ${tab === tItem.id ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '0.35rem 0.85rem', fontSize: '0.85rem' }}
          >
            {tItem.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Pilgrim Name</th>
                <th>Registration ID</th>
                <th>QR Token</th>
                <th>QR Generated Date</th>
                <th>Band Issued Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-6">Loading QR records...</td>
                </tr>
              ) : pilgrims.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-6 text-gray-500">No records found.</td>
                </tr>
              ) : (
                pilgrims.map((item) => (
                  <tr key={item.id}>
                    <td className="font-semibold">{item.name}</td>
                    <td><code>{item.registration_id}</code></td>
                    <td>
                      {item.qr_token ? (
                        <span className="font-mono text-purple-700 font-bold bg-purple-50 px-2 py-1 rounded">
                          {item.qr_token}
                        </span>
                      ) : (
                        <span className="text-gray-400 font-italic">Not Generated</span>
                      )}
                    </td>
                    <td>
                      {item.qr_generated_at ? new Date(item.qr_generated_at).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      {item.band_issued_at ? (
                        <span className="status-badge status-issued flex items-center gap-1">
                          <CheckCircle2 size={14} /> Issued
                        </span>
                      ) : (
                        <span className="status-badge status-pending flex items-center gap-1">
                          <Clock size={14} /> Pending Issue
                        </span>
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => navigate(`/pilgrims/${item.id}`)}
                        className="btn btn-outline"
                        style={{ padding: '0.25rem 0.65rem', fontSize: '0.8rem' }}
                      >
                        <Eye size={14} /> View Details
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

export default QRManagement;
