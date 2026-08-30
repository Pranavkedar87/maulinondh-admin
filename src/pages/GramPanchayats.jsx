import React, { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { supabase } from '../services/supabase';
import { Search, RefreshCw, Home } from 'lucide-react';

const GramPanchayats = () => {
  const [panchayats, setPanchayats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState({ total: 0, villages: 0, districts: 0 });

  const fetchPanchayats = async () => {
    setLoading(true);
    try {
      // Fetch exact records from gram_panchayats table
      const { data: gpData, error: gpErr } = await supabase
        .from('gram_panchayats')
        .select('*')
        .order('created_at', { ascending: false });

      if (gpErr) console.error('Error fetching gram_panchayats:', gpErr);

      const list = (gpData || []).map(gp => ({
        id: gp.id,
        registration_id: gp.registration_id || '—',
        panchayat_name: gp.panchayat_name || gp.name || '—',
        village_name: gp.village_name || gp.village || '—',
        district: gp.district || gp.location || '—',
        taluka: gp.taluka || '—',
        contact_phone: gp.phone || gp.contact_phone || '—',
        status: gp.status || 'VERIFIED',
        created_at: gp.created_at || null
      }));

      setPanchayats(list);

      const uniqueVillages = new Set(list.map(p => p.village_name).filter(v => v !== '—')).size;
      const uniqueDistricts = new Set(list.map(p => p.district).filter(d => d !== '—')).size;

      setStats({
        total: list.length,
        villages: uniqueVillages,
        districts: uniqueDistricts
      });

    } catch (err) {
      console.error('Error fetching gram panchayats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPanchayats();
  }, []);

  const filteredPanchayats = panchayats.filter(item => {
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        (item.panchayat_name && item.panchayat_name.toLowerCase().includes(q)) ||
        (item.village_name && item.village_name.toLowerCase().includes(q)) ||
        (item.district && item.district.toLowerCase().includes(q)) ||
        (item.registration_id && item.registration_id.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <AdminLayout title="Gram Panchayats">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }} className="flex items-center gap-2">
            <Home size={20} className="text-purple-600" /> Gram Panchayat Directory
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Real-time records from gram_panchayats database table
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-72">
            <input
              type="text"
              className="input"
              style={{ height: '36px', paddingLeft: '2rem', fontSize: '0.85rem' }}
              placeholder="Search Panchayat, Village, District, ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
          </div>
          <button onClick={fetchPanchayats} className="btn btn-outline" style={{ height: '36px', padding: '0 0.65rem' }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card p-4 border-l-4 border-l-purple-600">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">TOTAL GRAM PANCHAYATS</span>
          <span className="text-2xl font-black text-slate-900">{stats.total}</span>
          <span className="text-xs text-slate-500 block mt-1">Active administrative centers</span>
        </div>
        <div className="card p-4 border-l-4 border-l-indigo-600">
          <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider block mb-1">VILLAGES COVERED</span>
          <span className="text-2xl font-black text-indigo-700">{stats.villages}</span>
          <span className="text-xs text-slate-500 block mt-1">Local village sectors</span>
        </div>
        <div className="card p-4 border-l-4 border-l-blue-600">
          <span className="text-xs font-bold text-blue-700 uppercase tracking-wider block mb-1">DISTRICTS COVERED</span>
          <span className="text-2xl font-black text-blue-600">{stats.districts}</span>
          <span className="text-xs text-slate-500 block mt-1">Regional administrative zones</span>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden mb-6">
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Registration ID</th>
                <th>Panchayat Name</th>
                <th>Village Name</th>
                <th>District</th>
                <th>Taluka</th>
                <th>Contact</th>
                <th>Status</th>
                <th>Registered At</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-slate-500">Fetching Gram Panchayat records from Supabase...</td>
                </tr>
              ) : filteredPanchayats.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-10 text-slate-500">
                    {search ? 'No Gram Panchayats match your search query.' : 'No registered Gram Panchayats found in database table (gram_panchayats).'}
                  </td>
                </tr>
              ) : (
                filteredPanchayats.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <code style={{ background: '#f1f5f9', padding: '0.2rem 0.45rem', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                        {item.registration_id}
                      </code>
                    </td>
                    <td className="font-bold text-slate-800">{item.panchayat_name}</td>
                    <td className="font-semibold text-purple-700">{item.village_name}</td>
                    <td className="text-slate-700">{item.district}</td>
                    <td className="text-slate-600">{item.taluka}</td>
                    <td className="font-mono text-xs">{item.contact_phone}</td>
                    <td>
                      <span className="status-badge status-verified">
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

export default GramPanchayats;
