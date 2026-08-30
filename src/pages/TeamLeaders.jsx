import React, { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { supabase } from '../services/supabase';
import { Search, RefreshCw, Flag, AlertTriangle } from 'lucide-react';

const TeamLeaders = () => {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [stats, setStats] = useState({ total: 0, verified: 0, pending: 0 });

  const fetchLeaders = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      // Query without ordering by created_at in SQL to prevent undefined_column errors
      const { data: tlData, error: tlErr } = await supabase
        .from('team_leaders')
        .select('*');

      if (tlErr) {
        console.error('Supabase team_leaders fetch error:', tlErr);
        setFetchError(tlErr.message || JSON.stringify(tlErr));
      }

      const rawList = (tlData || []).map(tl => ({
        id: tl.id,
        registration_id: tl.registration_id || '—',
        name: tl.full_name || tl.name || tl.leader_name || '—',
        dindi_name: tl.dindi_name || tl.group_name || tl.dindi || '—',
        phone: tl.mobile_number || tl.mobile_num || tl.phone || tl.mobile || tl.contact_phone || '—',
        district: tl.district || tl.village_name || tl.location || '—',
        status: tl.status || 'VERIFIED',
        generated_password: tl.generated_password || null,
        created_at: tl.created_at || null
      }));

      // Sort in JS safely
      rawList.sort((a, b) => {
        if (!a.created_at) return 1;
        if (!b.created_at) return -1;
        return new Date(b.created_at) - new Date(a.created_at);
      });

      setLeaders(rawList);

      const ver = rawList.filter(l => l.status === 'VERIFIED' || l.status === 'ACTIVE').length;
      const pend = rawList.filter(l => l.status === 'PENDING').length;
      setStats({
        total: rawList.length,
        verified: ver,
        pending: pend
      });

    } catch (err) {
      console.error('Error fetching team leaders:', err);
      setFetchError(err.message || 'Failed to fetch team leaders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaders();
  }, []);

  const filteredLeaders = leaders.filter(item => {
    if (filter === 'VERIFIED' && item.status !== 'VERIFIED' && item.status !== 'ACTIVE') return false;
    if (filter === 'PENDING' && item.status !== 'PENDING') return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.registration_id && item.registration_id.toLowerCase().includes(q)) ||
        (item.dindi_name && item.dindi_name.toLowerCase().includes(q)) ||
        (item.phone && item.phone.toLowerCase().includes(q)) ||
        (item.district && item.district.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <AdminLayout title="Team Leaders & Dindis">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }} className="flex items-center gap-2">
            <Flag size={20} className="text-orange-600" /> Team Leaders & Dindi Registry
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Real-time records from team_leaders database table
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-72">
            <input
              type="text"
              className="input"
              style={{ height: '36px', paddingLeft: '2rem', fontSize: '0.85rem' }}
              placeholder="Search Name, Reg ID, Mobile..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
          </div>
          <button onClick={fetchLeaders} className="btn btn-outline" style={{ height: '36px', padding: '0 0.65rem' }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {fetchError && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertTriangle size={16} />
          <span><strong>Database Warning:</strong> {fetchError}. Ensure RLS policies allow SELECT on public.team_leaders.</span>
        </div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card p-4 border-l-4 border-l-orange-500">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">TOTAL LEADERS</span>
          <span className="text-2xl font-black text-slate-900">{stats.total}</span>
          <span className="text-xs text-slate-500 block mt-1">Exact records in team_leaders table</span>
        </div>
        <div className="card p-4 border-l-4 border-l-green-600">
          <span className="text-xs font-bold text-green-700 uppercase tracking-wider block mb-1">VERIFIED / ACTIVE</span>
          <span className="text-2xl font-black text-green-700">{stats.verified}</span>
          <span className="text-xs text-slate-500 block mt-1">Authorized leader credentials</span>
        </div>
        <div className="card p-4 border-l-4 border-l-amber-500">
          <span className="text-xs font-bold text-amber-700 uppercase tracking-wider block mb-1">PENDING VERIFICATION</span>
          <span className="text-2xl font-black text-amber-600">{stats.pending}</span>
          <span className="text-xs text-slate-500 block mt-1">Awaiting identity check</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4 border-b pb-3" style={{ borderColor: 'var(--border)' }}>
        {[
          { id: 'ALL', label: `All Leaders (${leaders.length})` },
          { id: 'VERIFIED', label: 'Verified / Active' },
          { id: 'PENDING', label: 'Pending' }
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`btn ${filter === f.id ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '0.25rem 0.65rem', fontSize: '0.78rem', borderRadius: 'var(--radius-full)' }}
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
                <th>Leader Name</th>
                <th>Dindi / Group Name</th>
                <th>Mobile Number</th>
                <th>District / Base</th>
                <th>Access Code</th>
                <th>Status</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-slate-500">Fetching records from team_leaders table...</td>
                </tr>
              ) : filteredLeaders.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-10 text-slate-500">
                    {search ? 'No team leaders match your search query.' : 'No registered team leaders found in database table (team_leaders).'}
                  </td>
                </tr>
              ) : (
                filteredLeaders.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <code style={{ background: '#f1f5f9', padding: '0.2rem 0.45rem', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                        {item.registration_id}
                      </code>
                    </td>
                    <td className="font-bold text-slate-800">{item.name}</td>
                    <td className="font-semibold text-orange-700">{item.dindi_name}</td>
                    <td className="font-mono text-xs">{item.phone}</td>
                    <td className="text-slate-600">{item.district}</td>
                    <td>
                      {item.generated_password ? (
                        <code style={{ background: '#fff7ed', color: '#ea580c', border: '1px solid #ffedd5', padding: '0.15rem 0.4rem', borderRadius: '3px', fontSize: '0.75rem', fontWeight: 700 }}>
                          {item.generated_password}
                        </code>
                      ) : (
                        <span className="text-slate-400 text-xs italic">—</span>
                      )}
                    </td>
                    <td>
                      <span className={`status-badge ${item.status === 'VERIFIED' || item.status === 'ACTIVE' ? 'status-verified' : 'status-pending'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="text-xs text-slate-500 font-mono">
                      {item.created_at ? new Date(item.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
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

export default TeamLeaders;
