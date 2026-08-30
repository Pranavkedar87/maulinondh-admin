import React, { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { supabase } from '../services/supabase';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { Activity, Map, Users, HeartPulse, ShieldAlert, Timer, TrendingUp } from 'lucide-react';

const MIX_COLORS = ['#dc2626', '#ea580c', '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981'];
const STATUS_COLORS = { 'VERIFIED': '#16a34a', 'PENDING_VERIFICATION': '#d97706', 'REJECTED': '#dc2626' };

const SectionLabel = ({ icon: Icon, text, color = '#ea580c' }) => (
  <div style={{ fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: 5 }}>
    {Icon && <Icon size={12} style={{ color }} />}
    {text}
  </div>
);

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [regTrend, setRegTrend] = useState([]);
  const [districtData, setDistrictData] = useState([]);
  const [ageData, setAgeData] = useState([]);
  const [statusData, setStatusData] = useState([]);
  const [medicalData, setMedicalData] = useState([]);
  const [incidentMix, setIncidentMix] = useState([]);
  const [resolutionStats, setResolutionStats] = useState({});
  const [insights, setInsights] = useState({});

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const { data: varkaris } = await supabase.from('varkaris').select('*');
        const { data: qrAlerts } = await supabase.from('qr_alerts').select('*');
        const { data: incidents } = await supabase.from('incidents').select('*');

        const allIncidents = [
          ...(qrAlerts || []).map(a => ({ ...a, source: 'QR', priority: 'STANDARD' })),
          ...(incidents || []).map(i => ({ ...i, source: 'WEB/IVR' }))
        ];

        if (!varkaris?.length) { setLoading(false); return; }

        // Registration trend (last 14 days)
        const dateMap = {};
        varkaris.forEach(v => {
          const d = new Date(v.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
          dateMap[d] = (dateMap[d] || 0) + 1;
        });
        setRegTrend(Object.entries(dateMap).map(([date, count]) => ({ date, count })).slice(-14));

        // District distribution
        const distMap = {};
        varkaris.forEach(v => { const d = v.district || 'Unknown'; distMap[d] = (distMap[d] || 0) + 1; });
        setDistrictData(Object.entries(distMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8));

        // Age buckets
        const ageBuckets = { '≤20': 0, '21–40': 0, '41–60': 0, '60+': 0 };
        varkaris.forEach(v => {
          const age = parseInt(v.age, 10);
          if (isNaN(age)) return;
          if (age <= 20) ageBuckets['≤20']++;
          else if (age <= 40) ageBuckets['21–40']++;
          else if (age <= 60) ageBuckets['41–60']++;
          else ageBuckets['60+']++;
        });
        setAgeData(Object.entries(ageBuckets).map(([name, value]) => ({ name, value })));

        // Status breakdown
        const statMap = {};
        varkaris.forEach(v => { statMap[v.status] = (statMap[v.status] || 0) + 1; });
        setStatusData(Object.entries(statMap).map(([k, value]) => ({ name: k.replace(/_/g, ' '), value, original: k })));

        // Medical
        let dia = 0, bp = 0, none = 0, other = 0;
        varkaris.forEach(v => {
          const m = (v.medical_conditions || '').toLowerCase();
          if (!m || m === 'none' || m === 'na' || m === 'no') none++;
          else if (m.includes('diabet') || m.includes('sugar')) dia++;
          else if (m.includes('bp') || m.includes('blood pressure')) bp++;
          else other++;
        });
        setMedicalData([
          { name: 'None', value: none, color: '#cbd5e1' },
          { name: 'Diabetes', value: dia, color: '#ef4444' },
          { name: 'Blood Pressure', value: bp, color: '#f59e0b' },
          { name: 'Other', value: other, color: '#3b82f6' }
        ].filter(d => d.value > 0));

        // Incident mix
        const typeMap = {};
        allIncidents.forEach(i => { const t = i.type || i.alert_type || 'Unknown'; typeMap[t] = (typeMap[t] || 0) + 1; });
        setIncidentMix(Object.entries(typeMap).map(([name, value]) => ({ name, value })));

        // Resolution performance
        const resolved = allIncidents.filter(i => i.status === 'RESOLVED');
        const open = allIncidents.filter(i => i.status !== 'RESOLVED');
        const times = resolved.filter(i => i.resolved_at).map(i => new Date(i.resolved_at) - new Date(i.created_at)).filter(t => t > 0);
        const avgMs = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0;
        const avgMin = Math.round(avgMs / 60000);
        const resolvedToday = resolved.filter(i => i.resolved_at?.startsWith(new Date().toISOString().split('T')[0]));
        const rate = allIncidents.length ? Math.round((resolved.length / allIncidents.length) * 100) : 0;
        setResolutionStats({ avgTime: avgMin > 0 ? `${avgMin}m` : 'N/A', open: open.length, resolved: resolved.length, resolvedToday: resolvedToday.length, rate: allIncidents.length ? `${rate}%` : 'N/A' });

        // Insights
        const topDistrict = districtData[0];
        setInsights({
          topDistrict: topDistrict ? `${topDistrict.name}: ${topDistrict.value} varkaris` : 'N/A',
          verifiedPct: statMap['VERIFIED'] ? `${Math.round((statMap['VERIFIED'] / varkaris.length) * 100)}% verified` : 'N/A',
          diabetesInsight: dia > 0 ? `${dia} participants have Diabetes` : 'Low medical risk profile',
        });

      } catch (err) {
        console.error('Analytics error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) return (
    <AdminLayout title="Analytics">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        Computing analytics...
      </div>
    </AdminLayout>
  );

  return (
    <AdminLayout title="Analytics">

      <div style={{ marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 800 }}>MAULINONDH ANALYTICS WORKSPACE</h2>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Deep operational insights from real Supabase data</p>
      </div>

      {/* ROW 1: Incident Mix + Resolution Performance */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>

        <div className="card" style={{ padding: '0.85rem 1rem' }}>
          <SectionLabel icon={ShieldAlert} text="Incident Mix" color="#dc2626" />
          {incidentMix.length === 0 ? (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>No incident data available</div>
          ) : (
            <div style={{ height: 200 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={incidentMix} cx="50%" cy="50%" innerRadius={50} outerRadius={72} dataKey="value" paddingAngle={3}>
                    {incidentMix.map((_, i) => <Cell key={i} fill={MIX_COLORS[i % MIX_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: '0.75rem', borderRadius: 4, border: '1px solid #e7e5e4' }} />
                  <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '0.7rem' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card" style={{ padding: '0.85rem 1rem' }}>
          <SectionLabel icon={Timer} text="Resolution Performance" color="#3b82f6" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: 4 }}>
            {[
              { label: 'AVG RESOLUTION', value: resolutionStats.avgTime, color: '#1c1917', large: true },
              { label: 'RESOLUTION RATE', value: resolutionStats.rate, color: '#3b82f6', large: true },
              { label: 'OPEN CASES', value: resolutionStats.open, color: '#f97316' },
              { label: 'RESOLVED TOTAL', value: resolutionStats.resolved, color: '#16a34a' },
              { label: 'RESOLVED TODAY', value: resolutionStats.resolvedToday, color: '#10b981' },
              { label: 'TOTAL INCIDENTS', value: (resolutionStats.open || 0) + (resolutionStats.resolved || 0), color: '#6b7280' },
            ].map(({ label, value, color, large }) => (
              <div key={label} style={{ padding: '0.5rem 0.65rem', background: '#fafaf9', borderRadius: 4, border: '1px solid #e7e5e4' }}>
                <div style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: large ? '1.5rem' : '1.2rem', fontWeight: 900, color, fontFamily: 'Outfit,sans-serif', lineHeight: 1 }}>{value ?? 'N/A'}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ROW 2: Medical Risk + Verification Status */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>

        <div className="card" style={{ padding: '0.85rem 1rem' }}>
          <SectionLabel icon={HeartPulse} text="Medical Risk Distribution" color="#ef4444" />
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ width: 160, height: 160, flexShrink: 0 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={medicalData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value">
                    {medicalData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: '0.75rem', borderRadius: 4 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              {medicalData.map(d => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, flex: 1 }}>{d.name}</span>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: d.color }}>{d.value}</span>
                </div>
              ))}
              {medicalData.length === 0 && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>No medical data</div>}
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '0.85rem 1rem' }}>
          <SectionLabel icon={Users} text="Verification Status" color="#16a34a" />
          {statusData.length === 0 ? (
            <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>No data</div>
          ) : (
            <div style={{ height: 160 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" paddingAngle={3}>
                    {statusData.map((entry, i) => <Cell key={i} fill={STATUS_COLORS[entry.original] || MIX_COLORS[i]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: '0.75rem', borderRadius: 4 }} />
                  <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '0.7rem' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* ROW 3: Registration Growth + Age Distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '0.75rem', marginBottom: '0.75rem' }}>

        <div className="card" style={{ padding: '0.85rem 1rem' }}>
          <SectionLabel icon={TrendingUp} text="Registration Growth Volume (Last 14 Days)" color="#16a34a" />
          <div style={{ height: 200 }}>
            <ResponsiveContainer>
              <AreaChart data={regTrend} margin={{ top: 5, right: 10, bottom: 0, left: -25 }}>
                <defs>
                  <linearGradient id="regGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#78716c' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#78716c' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 4, border: '1px solid #e7e5e4', fontSize: '0.75rem' }} />
                <Area type="monotone" dataKey="count" stroke="#16a34a" strokeWidth={2.5} fillOpacity={1} fill="url(#regGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card" style={{ padding: '0.85rem 1rem' }}>
          <SectionLabel icon={Users} text="Age Distribution" color="#8b5cf6" />
          <div style={{ height: 200 }}>
            <ResponsiveContainer>
              <BarChart data={ageData} margin={{ top: 5, right: 10, bottom: 0, left: -25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#78716c' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#78716c' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: '#f5f5f4' }} contentStyle={{ borderRadius: 4, border: '1px solid #e7e5e4', fontSize: '0.75rem' }} />
                <Bar dataKey="value" fill="#8b5cf6" radius={[3, 3, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ROW 4: Top Districts (full width) */}
      <div className="card" style={{ padding: '0.85rem 1rem' }}>
        <SectionLabel icon={Map} text="Top Districts by Registration Count" color="#8b5cf6" />
        <div style={{ height: 220 }}>
          <ResponsiveContainer>
            <BarChart data={districtData} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e7e5e4" />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#78716c' }} tickLine={false} axisLine={false} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#1c1917', fontWeight: 600 }} tickLine={false} axisLine={false} width={100} />
              <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: 4, border: '1px solid #e7e5e4', fontSize: '0.75rem' }} />
              <Bar dataKey="value" fill="#8b5cf6" radius={[0, 3, 3, 0]} barSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </AdminLayout>
  );
};

export default Analytics;
