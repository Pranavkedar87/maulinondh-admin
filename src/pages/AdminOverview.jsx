import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { supabase } from '../services/supabase';
import {
  Users, CheckCircle, Clock, ShieldAlert, AlertTriangle, RefreshCw, ArrowRight,
  Activity, MapPin, Search
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const AdminOverview = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    verified: 0,
    pending: 0,
    activeIncidents: 0,
    criticalIncidents: 0,
    todayIncidents: 0
  });
  const [incidentFeed, setIncidentFeed] = useState([]);
  const [trendData, setTrendData] = useState([]);

  const fetchOverviewData = async () => {
    setRefreshing(true);
    try {
      // Varkari Stats
      const { count: total } = await supabase.from('varkaris').select('*', { count: 'exact', head: true });
      const { count: verified } = await supabase.from('varkaris').select('*', { count: 'exact', head: true }).eq('status', 'VERIFIED');
      const { count: pending } = await supabase.from('varkaris').select('*', { count: 'exact', head: true }).eq('status', 'PENDING_VERIFICATION');

      // Incident Stats (unified from both tables)
      const { data: qrAlerts } = await supabase.from('qr_alerts').select('id, created_at, status, location_name, alert_type, varkaris(name)');
      const { data: incidents } = await supabase.from('incidents').select('id, created_at, status, priority, type, address, varkaris(name)');

      const allIncidents = [
        ...(qrAlerts || []).map(a => ({ ...a, source: 'QR', priority: 'STANDARD' })),
        ...(incidents || []).map(i => ({ ...i, source: 'WEB/IVR' }))
      ];

      const activeIncidents = allIncidents.filter(i => i.status === 'OPEN' || i.status === 'REPORTED');
      const criticalIncidents = activeIncidents.filter(i => i.priority === 'CRITICAL');
      
      const todayStr = new Date().toISOString().split('T')[0];
      const todayIncidents = allIncidents.filter(i => i.created_at.startsWith(todayStr));

      setStats({
        total: total || 0,
        verified: verified || 0,
        pending: pending || 0,
        activeIncidents: activeIncidents.length,
        criticalIncidents: criticalIncidents.length,
        todayIncidents: todayIncidents.length
      });

      // Incident Feed (Last 6 active or recent)
      const feed = allIncidents
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 6)
        .map(i => ({
          id: i.id,
          time: new Date(i.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: i.type || i.alert_type || 'Alert',
          location: i.address || i.location_name || 'Unknown Route',
          status: i.status,
          user: i.varkaris?.name || 'Unknown',
          priority: i.priority
        }));
      setIncidentFeed(feed);

      // Trend Data (Incidents over last 7 days)
      const days = [...Array(7)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split('T')[0];
      }).reverse();

      const trend = days.map(day => {
        const count = allIncidents.filter(i => i.created_at.startsWith(day)).length;
        return { date: new Date(day).toLocaleDateString('en-US', { weekday: 'short' }), incidents: count };
      });
      setTrendData(trend);

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

  const isCritical = stats.criticalIncidents > 0;
  const isElevated = stats.activeIncidents > 0;

  return (
    <AdminLayout title="Operational Summary">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Executive Dashboard</h2>
          <p className="text-slate-500 text-sm">Real-time situational awareness and command controls</p>
        </div>
        <button onClick={fetchOverviewData} className="btn bg-white border border-slate-300 text-slate-700 hover:bg-slate-50" disabled={refreshing}>
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Top KPI Section */}
      <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="card text-center p-5 relative overflow-hidden" style={{ borderLeft: '4px solid #ea580c' }}>
          <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Varkaris</span>
          <span className="text-3xl font-extrabold text-slate-900">{stats.total}</span>
        </div>
        <div className="card text-center p-5 relative overflow-hidden" style={{ borderLeft: '4px solid #16a34a' }}>
          <span className="block text-xs font-bold text-green-700 uppercase tracking-wider mb-1">Verified</span>
          <span className="text-3xl font-extrabold text-green-700">{stats.verified}</span>
        </div>
        <div className="card text-center p-5 relative overflow-hidden" style={{ borderLeft: '4px solid #eab308' }}>
          <span className="block text-xs font-bold text-amber-700 uppercase tracking-wider mb-1">Pending</span>
          <span className="text-3xl font-extrabold text-amber-600">{stats.pending}</span>
        </div>
        
        <div className="card text-center p-5 relative overflow-hidden" style={{ borderLeft: '4px solid #dc2626', background: isCritical ? '#fef2f2' : '#fff' }}>
          <span className="block text-xs font-bold text-red-700 uppercase tracking-wider mb-1">Critical Incidents</span>
          <span className="text-3xl font-extrabold text-red-700 flex items-center justify-center gap-2">
            {isCritical && <span className="w-3 h-3 rounded-full bg-red-600 animate-pulse"></span>}
            {stats.criticalIncidents}
          </span>
        </div>
        <div className="card text-center p-5 relative overflow-hidden" style={{ borderLeft: '4px solid #ea580c' }}>
          <span className="block text-xs font-bold text-orange-700 uppercase tracking-wider mb-1">Active Incidents</span>
          <span className="text-3xl font-extrabold text-orange-600">{stats.activeIncidents}</span>
        </div>
        <div className="card text-center p-5 relative overflow-hidden" style={{ borderLeft: '4px solid #64748b' }}>
          <span className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Today's Incidents</span>
          <span className="text-3xl font-extrabold text-slate-800">{stats.todayIncidents}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        
        {/* Main Center Area: Pulse & Trend */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Live Safety Pulse */}
          <div className="card p-6 flex items-center justify-between" style={{ background: isCritical ? '#7f1d1d' : (isElevated ? '#fffbeb' : '#f0fdf4'), borderColor: isCritical ? '#7f1d1d' : (isElevated ? '#fde68a' : '#bbf7d0') }}>
            <div className="flex items-center gap-4">
              <Activity size={32} color={isCritical ? '#fca5a5' : (isElevated ? '#d97706' : '#15803d')} />
              <div>
                <h3 className={`font-bold uppercase tracking-wider text-sm ${isCritical ? 'text-red-200' : (isElevated ? 'text-amber-800' : 'text-green-800')}`}>
                  Live Safety Pulse
                </h3>
                <div className={`text-2xl font-black tracking-tight ${isCritical ? 'text-white' : (isElevated ? 'text-amber-900' : 'text-green-900')}`}>
                  {isCritical ? 'CRITICAL SITUATION' : (isElevated ? 'ELEVATED ACTIVITY' : 'NORMAL / SECURE')}
                </div>
              </div>
            </div>
            {stats.activeIncidents > 0 && (
              <button onClick={() => navigate('/incidents')} className={`btn ${isCritical ? 'btn-outline border-red-400 text-white hover:bg-red-800' : 'btn-primary'}`}>
                Manage Incidents
              </button>
            )}
          </div>

          {/* Incident Trend Chart */}
          <div className="card p-6 flex-1">
            <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Activity size={18} className="text-orange-600" />
              Incident Trend (Last 7 Days)
            </h3>
            <div style={{ height: '250px', width: '100%' }}>
              <ResponsiveContainer>
                <LineChart data={trendData} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{fontSize: 12, fill: '#64748b'}} tickLine={false} axisLine={false} />
                  <YAxis tick={{fontSize: 12, fill: '#64748b'}} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '4px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                  <Line type="monotone" dataKey="incidents" stroke="#ea580c" strokeWidth={3} dot={{ r: 4, fill: '#ea580c', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Sidebar Area: Live Feed */}
        <div className="card p-0 overflow-hidden flex flex-col h-full border-slate-200">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-600" />
              Live Incident Feed
            </h3>
          </div>
          <div className="p-0 overflow-y-auto" style={{ maxHeight: '400px' }}>
            {loading ? (
              <div className="p-8 text-center text-slate-500 text-sm">Syncing live feed...</div>
            ) : incidentFeed.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">No incidents reported recently.</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {incidentFeed.map(item => (
                  <li key={item.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                        {item.priority === 'CRITICAL' ? (
                          <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        )}
                        <span className="font-bold text-slate-800 text-sm">{item.type}</span>
                      </div>
                      <span className="text-xs font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{item.time}</span>
                    </div>
                    <div className="text-xs text-slate-600 mb-2 font-medium">
                      {item.user}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <MapPin size={12} />
                      <span className="truncate">{item.location}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="p-3 border-t border-slate-200 bg-slate-50 text-center">
            <button onClick={() => navigate('/incidents')} className="text-sm font-bold text-orange-600 hover:text-orange-700 flex items-center justify-center gap-1 w-full">
              View All Incidents <ArrowRight size={14} />
            </button>
          </div>
        </div>

      </div>
    </AdminLayout>
  );
};

export default AdminOverview;
