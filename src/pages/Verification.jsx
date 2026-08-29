import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { supabase } from '../services/supabase';
import { CheckCheck, ShieldCheck, Eye, RefreshCw, AlertCircle } from 'lucide-react';

const Verification = () => {
  const navigate = useNavigate();

  const [pendingUsers, setPendingUsers] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('varkaris')
        .select('*')
        .eq('status', 'PENDING_VERIFICATION')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setPendingUsers(data || []);
      setSelectedIds([]);
    } catch (err) {
      console.error('Error fetching pending verification records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const toggleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(pendingUsers.map(u => u.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelectOne = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkVerify = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Bulk verify ${selectedIds.length} selected pilgrim registrations?`)) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('varkaris')
        .update({ status: 'VERIFIED' })
        .in('id', selectedIds);

      if (error) throw error;

      alert(`Successfully verified ${selectedIds.length} pilgrim records!`);
      fetchPending();
    } catch (err) {
      console.error('Error in bulk verification:', err);
      alert('Failed bulk verification: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AdminLayout title="Verification">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 style={{ fontSize: '1.3rem' }}>Verification Queue</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Structured verification workflow for pending applications requiring human review
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkVerify}
              disabled={actionLoading}
              className="btn btn-success"
              style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}
            >
              <CheckCheck size={16} /> Bulk Verify ({selectedIds.length})
            </button>
          )}

          <button onClick={fetchPending} className="btn btn-outline" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input
                    type="checkbox"
                    checked={pendingUsers.length > 0 && selectedIds.length === pendingUsers.length}
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                  />
                </th>
                <th>Registration ID</th>
                <th>Name</th>
                <th>Mobile</th>
                <th>District</th>
                <th>Auto-Validation Checks</th>
                <th>Submitted</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-6">Loading pending queue...</td>
                </tr>
              ) : pendingUsers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-6 text-gray-500">
                    🎉 Verification queue is empty! All submitted applications have been processed.
                  </td>
                </tr>
              ) : (
                pendingUsers.map((user) => {
                  const hasPhoto = Boolean(user.photo_url);
                  const hasEmergency = Boolean(user.guardian_phone);
                  const autoValid = hasPhoto && hasEmergency;

                  return (
                    <tr key={user.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(user.id)}
                          onChange={() => toggleSelectOne(user.id)}
                        />
                      </td>
                      <td><code>{user.registration_id}</code></td>
                      <td className="font-semibold">{user.name}</td>
                      <td>{user.phone}</td>
                      <td>{user.district}</td>
                      <td>
                        {autoValid ? (
                          <span className="text-xs bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded border border-emerald-200 inline-flex items-center gap-1">
                            <ShieldCheck size={12} /> Auto-Validated
                          </span>
                        ) : (
                          <span className="text-xs bg-amber-50 text-amber-800 font-bold px-2 py-0.5 rounded border border-amber-200 inline-flex items-center gap-1">
                            <AlertCircle size={12} /> Requires Review
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.8rem' }}>{new Date(user.created_at).toLocaleDateString()}</td>
                      <td>
                        <button
                          onClick={() => navigate(`/registrations/${user.id}`)}
                          className="btn btn-outline"
                          style={{ padding: '0.25rem 0.65rem', fontSize: '0.775rem' }}
                        >
                          <Eye size={14} /> Review
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Verification;
