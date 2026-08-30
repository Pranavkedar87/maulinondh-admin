import React, { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { supabase } from '../services/supabase';
import { Search, RefreshCw, Eye, Flag, Shield, Users, CheckCircle, Clock } from 'lucide-react';

const TeamLeaders = () => {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [stats, setStats] = useState({ total: 0, verified: 0, pending: 0 });

  const fetchLeaders = async () => {
    setLoading(true);
    try {
      // 1. Fetch from team_leaders table
      const { data: tlData, error: tlErr } = await supabase
        .from('team_leaders')
        .select('*')
        .order('created_at', { ascending: false });

      // 2. Fetch fallback from dindis if present
      const { data: dindiData } = await supabase
        .from('dindis')
        .select('*');

      let combined = (tlData || []).map(tl => ({
        id: tl.id,
        registration_id: tl.registration_id || 'N/A',
        name: tl.full_name || tl.name || tl.leader_name || 'Leader ' + (tl.registration_id || '').slice(-6),
        dindi_name: tl.dindi_name || tl.group_name || 'Dindi Group',
        phone: tl.phone || tl.mobile || tl.contact_phone || '—',
        district: tl.district || tl.location || 'Maharashtra',
        status: tl.status || 'VERIFIED',
        generated_password: tl.generated_password || null,
        created_at: tl.created_at || new Date().toISOString()
      }));

      if (dindiData && dindiData.length > 0) {
        const dindiMapped = dindiData.map(d => ({
          id: d.id,
          registration_id: d.registration_id || 'DINDI-' + d.id.slice(0, 6).toUpperCase(),
          name: d.leader_name || d.name || 'Dindi Leader',
          dindi_name: d.dindi_name || d.name || 'Dindi',
          phone: d.phone || '—',
          district: d.district || 'Maharashtra',
          status: d.status || 'ACTIVE',
          generated_password: null,
          created_at: d.created_at || new Date().toISOString()
        }));
        combined = [...combined, ...dindiMapped];
      }

      setLeaders(combined);

      const ver = combined.filter(l => l.status === 'VERIFIED' || l.status === 'ACTIVE').length;
      const pend = combined.filter(l => l.status === 'PENDING').length;
      setStats({
        total: combined.length,
        verified: ver,
        pending: pend
      });

    } catch (err) {
      console.error('Error fetching team leaders:', err);
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
            Manage registered Dindi heads, group leaders, and assigned pilgrim contingents
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-72">
            <input
              type="text"
              className="input"
              style={{ height: '36px', paddingLeft: '2rem', fontSize: '0.85rem' }}
              placeholder="Search Leader, Reg ID, Dindi, Mobile..."
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

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card p-4 border-l-4 border-l-orange-500">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">TOTAL LEADERS</span>
          <span className="text-2xl font-black text-slate-900">{stats.total}</span>
          <span className="text-xs text-slate-500 block mt-1">Registered Dindi heads</span>
        </div>
        <div className="card p-4 border-l-4 border-l-green-600">
          <span className="text-xs font-bold text-green-700 uppercase tracking-wider block mb-1">VERIFIED / ACTIVE</span>
          <span className="text-2xl font-black text-green-700">{stats.verified}</span>
          <span className="text-xs text-slate-500 block mt-1">Authorized leadership credentials</span>
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
                <th>Contact Number</th>
                <th>District / Base</th>
                <th>Access Code</th>
                <th>Status</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-slate-500">Loading team leader records from Supabase...</td>
                </tr>
              ) : filteredLeaders.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-10 text-slate-500">
                    {search ? 'No team leaders match your search query.' : 'No registered team leaders found in database.'}
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
                      {new Date(item.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
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
