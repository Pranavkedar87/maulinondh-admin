import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { supabase } from '../services/supabase';
import {
  Users, CheckCircle, Clock, ShieldAlert, AlertTriangle, RefreshCw, ArrowRight,
  Activity, MapPin, Phone, Zap, TrendingUp, Eye
} from 'lucide-react';
import {
  LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';

const MIX_COLORS = ['#dc2626','#ea580c','#f59e0b','#3b82f6','#8b5cf6','#10b981'];
const PANDHARPUR = { lat: 17.6775, lng: 75.3262 };

// --- Sub-components ---

const KpiCard = ({ label, value, sub, accentColor = '#ea580c', pulse = false }) => (
  <div className="kpi-card" style={{ borderTop: `3px solid ${accentColor}` }}>
    <div className="kpi-label">{label}</div>
    <div className="kpi-value" style={{ color: accentColor }}>
      {pulse && value > 0 && (
        <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: accentColor, marginRight: 6, animation: 'pulse 2s infinite' }} />
      )}
      {value}
    </div>
    {sub && <div className="kpi-sub">{sub}</div>}
  </div>
);

const SectionHeader = ({ icon: Icon, title, color = '#ea580c', action, onAction }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
    <div className="card-header" style={{ marginBottom: 0 }}>
      {Icon && <Icon size={13} style={{ color }} />}
      {title}
    </div>
    {action && (
      <button onClick={onAction} style={{ fontSize: '0.72rem', fontWeight: 700, color, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
        {action} <ArrowRight size={11} />
      </button>
    )}
  </div>
);

const PriorityDot = ({ priority }) => {
  const colors = { CRITICAL: '#dc2626', HIGH: '#f97316', STANDARD: '#eab308' };
  return (
    <span style={{ width: 7, height: 7, borderRadius: '50%', background: colors[priority] || '#94a3b8', display: 'inline-block', flexShrink: 0 }} />
  );
};

// Inline Mini Map
const MiniMap = ({ incidents, selected, onSelect }) => {
  const mapRef = useRef(null);
  const [infoOpen, setInfoOpen] = useState(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  });

  const onLoad = useCallback((map) => {
    mapRef.current = map;
    if (incidents.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      incidents.forEach(i => bounds.extend({ lat: i.lat, lng: i.lng }));
      map.fitBounds(bounds);
      const listener = window.google.maps.event.addListener(map, 'idle', () => {
        if (map.getZoom() > 15) map.setZoom(15);
        window.google.maps.event.removeListener(listener);
      });
    } else {
      map.setCenter(PANDHARPUR);
      map.setZoom(11);
    }
  }, [incidents]);

  useEffect(() => {
    if (mapRef.current && selected) {
      mapRef.current.panTo({ lat: selected.lat, lng: selected.lng });
      mapRef.current.setZoom(15);
      setInfoOpen(selected);
    }
  }, [selected]);

  const getMarkerIcon = (priority) => {
    const color = priority === 'CRITICAL' ? '#dc2626' : priority === 'HIGH' ? '#f97316' : '#eab308';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="28px" height="28px" stroke="#ffffff" stroke-width="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3" fill="#ffffff"/></svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  };

  if (loadError) return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fef2f2', borderRadius: 6, color: '#dc2626', fontSize: '0.8rem', fontWeight: 600, padding: '1rem', textAlign: 'center' }}>
      Maps API key not configured.<br/>Set VITE_GOOGLE_MAPS_API_KEY.
    </div>
  );

  if (!isLoaded) return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f7f4', borderRadius: 6, color: '#78716c', fontSize: '0.8rem' }}>
      Loading safety map...
    </div>
  );

  return (
    <GoogleMap
      mapContainerStyle={{ width: '100%', height: '100%', borderRadius: 6 }}
      center={PANDHARPUR}
      zoom={11}
      options={{ disableDefaultUI: true, zoomControl: true, clickableIcons: false }}
      onLoad={onLoad}
      onClick={() => setInfoOpen(null)}
    >
      {incidents.map(inc => (
        <Marker
          key={inc.id}
          position={{ lat: inc.lat, lng: inc.lng }}
          icon={getMarkerIcon(inc.priority)}
          onClick={() => { setInfoOpen(inc); onSelect(inc); }}
        />
      ))}
      {infoOpen && (
        <InfoWindow
          position={{ lat: infoOpen.lat, lng: infoOpen.lng }}
          onCloseClick={() => setInfoOpen(null)}
        >
          <div style={{ fontFamily: 'Inter,sans-serif', fontSize: '0.78rem', maxWidth: 180 }}>
            <div style={{ fontWeight: 800, color: '#1c1917', marginBottom: 2 }}>{infoOpen.type}</div>
            <div style={{ color: '#78716c' }}>{infoOpen.varkari?.name || 'Unknown'}</div>
            <div style={{ color: '#78716c', marginTop: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
              <span>📍</span>{infoOpen.location}
            </div>
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
};

// --- Main Component ---

const AdminOverview = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const [stats, setStats] = useState({ total: 0, verified: 0, pending: 0, activeIncidents: 0, criticalIncidents: 0, todayIncidents: 0 });
  const [criticalAlerts, setCriticalAlerts] = useState([]);
  const [incidentFeed, setIncidentFeed] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [incidentMix, setIncidentMix] = useState([]);
  const [resolutionStats, setResolutionStats] = useState({ avgTime: 'N/A', open: 0, resolved: 0, rate: 'N/A' });
  const [regTrend, setRegTrend] = useState([]);
  const [districtTop, setDistrictTop] = useState([]);
  const [dindisTop, setDindisTop] = useState([]);
  const [medicalData, setMedicalData] = useState([]);
  const [mappedIncidents, setMappedIncidents] = useState([]);
  const [selectedMapInc, setSelectedMapInc] = useState(null);
  const [activity, setActivity] = useState([]);

  const fetchAll = async () => {
    setRefreshing(true);
    try {
      // --- Varkaris ---
      const { count: total } = await supabase.from('varkaris').select('*', { count: 'exact', head: true });
      const { count: verified } = await supabase.from('varkaris').select('*', { count: 'exact', head: true }).eq('status', 'VERIFIED');
      const { count: pending } = await supabase.from('varkaris').select('*', { count: 'exact', head: true }).eq('status', 'PENDING_VERIFICATION');
      const { data: varkaris } = await supabase.from('varkaris').select('created_at, district, dindi_name, medical_conditions, status').limit(1000);

      // --- Incidents ---
      const { data: qrRaw } = await supabase.from('qr_alerts').select('id,created_at,status,alert_type,location_name,latitude,longitude,varkaris(name,registration_id)');
      const { data: incRaw } = await supabase.from('incidents').select('id,created_at,status,priority,type,address,latitude,longitude,source,resolved_at,varkaris(name,registration_id)');

      const allIncidents = [
        ...(qrRaw || []).map(a => ({ id: a.id, type: a.alert_type || 'Alert', priority: 'STANDARD', source: 'QR_SCAN', status: a.status, location: a.location_name || 'Route', varkari: a.varkaris, created_at: a.created_at, lat: parseFloat(a.latitude), lng: parseFloat(a.longitude), resolved_at: null })),
        ...(incRaw || []).map(i => ({ id: i.id, type: i.type || 'Emergency', priority: i.priority || 'HIGH', source: i.source || 'WEB', status: i.status, location: i.address || 'Unknown', varkari: i.varkaris, created_at: i.created_at, lat: parseFloat(i.latitude), lng: parseFloat(i.longitude), resolved_at: i.resolved_at }))
      ];

      allIncidents.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      const active = allIncidents.filter(i => i.status === 'OPEN' || i.status === 'REPORTED');
      const critical = active.filter(i => i.priority === 'CRITICAL');
      const todayStr = new Date().toISOString().split('T')[0];
      const today = allIncidents.filter(i => i.created_at?.startsWith(todayStr));

      setStats({ total: total || 0, verified: verified || 0, pending: pending || 0, activeIncidents: active.length, criticalIncidents: critical.length, todayIncidents: today.length });

      // Critical alerts feed
      setCriticalAlerts(critical.slice(0, 4));

      // Live incident feed
      setIncidentFeed(allIncidents.slice(0, 8));

      // Mapped incidents
      const mapped = allIncidents.filter(i => !isNaN(i.lat) && !isNaN(i.lng));
      setMappedIncidents(mapped);

      // 7-day trend
      const days = [...Array(7)].map((_, k) => {
        const d = new Date(); d.setDate(d.getDate() - (6 - k));
        return d.toISOString().split('T')[0];
      });
      setTrendData(days.map(day => ({
        date: new Date(day).toLocaleDateString('en-US', { weekday: 'short' }),
        incidents: allIncidents.filter(i => i.created_at?.startsWith(day)).length
      })));

      // Incident mix
      const typeMap = {};
      allIncidents.forEach(i => { typeMap[i.type] = (typeMap[i.type] || 0) + 1; });
      setIncidentMix(Object.entries(typeMap).map(([name, value]) => ({ name, value })));

      // Resolution performance
      const resolved = allIncidents.filter(i => i.status === 'RESOLVED');
      const times = resolved.filter(i => i.resolved_at).map(i => new Date(i.resolved_at) - new Date(i.created_at)).filter(t => t > 0);
      const avgMs = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0;
      const avgMin = Math.round(avgMs / 60000);
      const rate = allIncidents.length ? Math.round((resolved.length / allIncidents.length) * 100) : 0;
      setResolutionStats({ avgTime: avgMin > 0 ? `${avgMin}m` : 'N/A', open: active.length, resolved: resolved.length, rate: allIncidents.length ? `${rate}%` : 'N/A' });

      // Registration growth (last 7 days)
      const regMap = {};
      (varkaris || []).forEach(v => {
        const d = new Date(v.created_at).toISOString().split('T')[0];
        regMap[d] = (regMap[d] || 0) + 1;
      });
      setRegTrend(days.map(day => ({ date: new Date(day).toLocaleDateString('en-US', { weekday: 'short' }), count: regMap[day] || 0 })));

      // Top districts / Gram Panchayats
      const { data: gpRaw } = await supabase.from('gram_panchayats').select('panchayat_name, village_name, district, registration_id');
      if (gpRaw && gpRaw.length > 0) {
        setDistrictTop(gpRaw.slice(0, 5).map(g => ({
          name: g.panchayat_name || g.village_name || g.district,
          count: g.registration_id
        })));
      } else {
        setDistrictTop([]);
      }

      // Top dindis / Team Leaders
      const { data: tlRaw } = await supabase.from('team_leaders').select('full_name, name, registration_id, dindi_name, district');
      if (tlRaw && tlRaw.length > 0) {
        setDindisTop(tlRaw.slice(0, 5).map(t => ({
          name: t.full_name || t.name || t.registration_id,
          count: t.registration_id || t.dindi_name
        })));
      } else {
        setDindisTop([]);
      }

      // Medical risk
      let dia = 0, bp = 0, none = 0, other = 0;
      (varkaris || []).forEach(v => {
        const m = (v.medical_conditions || '').toLowerCase();
        if (!m || m === 'none' || m === 'na' || m === 'no') none++;
        else if (m.includes('diabet') || m.includes('sugar')) dia++;
        else if (m.includes('bp') || m.includes('blood pressure')) bp++;
        else other++;
      });
      setMedicalData([{ name: 'None', value: none, color: '#cbd5e1' }, { name: 'Diabetes', value: dia, color: '#ef4444' }, { name: 'BP', value: bp, color: '#f59e0b' }, { name: 'Other', value: other, color: '#3b82f6' }].filter(d => d.value > 0));

      // Activity feed (merge incidents + recent varkaris)
      const actItems = allIncidents.slice(0, 5).map(i => ({
        time: new Date(i.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        label: i.priority === 'CRITICAL' ? `🚨 ${i.type} (CRITICAL)` : `⚠️ ${i.type}`,
        color: i.priority === 'CRITICAL' ? '#dc2626' : '#f97316',
        created_at: i.created_at
      }));
      setActivity(actItems);

      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      console.error('Overview fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const isCritical = stats.criticalIncidents > 0;
  const isElevated = stats.activeIncidents > 0;
  const pulseStatus = isCritical ? 'CRITICAL SITUATION' : isElevated ? 'ELEVATED ACTIVITY' : 'NORMAL / SECURE';
  const pulseClass = isCritical ? 'status-pulse-critical' : isElevated ? 'status-pulse-elevated' : 'status-pulse-normal';
  const pulseColor = isCritical ? '#dc2626' : isElevated ? '#d97706' : '#16a34a';

  if (loading) return (
    <AdminLayout title="Command Center">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        Loading operational data...
      </div>
    </AdminLayout>
  );

  return (
    <AdminLayout title="Command Center">

      {/* ── PAGE HEADER ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>MAULINOND ADMIN COMMAND CENTER</h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Real-time situational awareness · {lastUpdated ? `Updated ${lastUpdated}` : 'Syncing...'}
          </p>
        </div>
        <button onClick={fetchAll} className="btn btn-outline" disabled={refreshing} style={{ fontSize: '0.78rem' }}>
          <RefreshCw size={13} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {/* ── ROW 1: COMPACT KPI STRIP ── */}
      <div className="cc-grid-kpi" style={{ marginBottom: '1rem' }}>
        <KpiCard label="Total Varkaris" value={stats.total} sub="Registered participants" accentColor="#ea580c" />
        <KpiCard label="Verified" value={stats.verified} sub={`${stats.total > 0 ? Math.round((stats.verified/stats.total)*100) : 0}% verified`} accentColor="#16a34a" />
        <KpiCard label="Pending" value={stats.pending} sub="Awaiting verification" accentColor="#eab308" />
        <KpiCard label="Active Incidents" value={stats.activeIncidents} sub="Open / Reported" accentColor="#f97316" />
        <KpiCard label="Critical" value={stats.criticalIncidents} sub="Immediate action" accentColor="#dc2626" pulse={true} />
      </div>

      {/* ── ROW 2: LIVE STATUS + CRITICAL ALERTS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem', marginBottom: '1rem' }}>

        {/* Live Safety Status */}
        <div className={`card ${pulseClass}`} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: `1px solid` }}>
          <SectionHeader icon={Activity} title="Live Safety Status" color={pulseColor} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: pulseColor, flexShrink: 0, animation: isCritical || isElevated ? 'pulse 2s infinite' : 'none' }} />
              <span style={{ fontSize: '1rem', fontWeight: 900, color: pulseColor, fontFamily: 'Outfit, sans-serif' }}>{pulseStatus}</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
              {stats.activeIncidents} active · {stats.criticalIncidents} critical · today: {stats.todayIncidents}
            </div>
            {lastUpdated && <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4 }}>Updated {lastUpdated}</div>}
          </div>
          {stats.activeIncidents > 0 && (
            <button onClick={() => navigate('/incidents')} className="btn btn-primary" style={{ marginTop: '0.75rem', fontSize: '0.75rem', padding: '0.35rem 0.75rem', background: pulseColor, borderColor: pulseColor }}>
              Manage Incidents
            </button>
          )}
        </div>

        {/* Critical Alerts */}
        <div className="card" style={{ padding: '0.85rem 1rem' }}>
          <SectionHeader icon={ShieldAlert} title="Critical Alerts" color="#dc2626" action="View All" onAction={() => navigate('/incidents')} />
          {criticalAlerts.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.5rem 0', color: '#16a34a', fontSize: '0.82rem', fontWeight: 600 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
              No critical incidents — all clear
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {criticalAlerts.map(inc => (
                <div key={inc.id} style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 4, padding: '0.5rem 0.65rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#dc2626', animation: 'pulse 2s infinite', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#991b1b' }}>{inc.type}</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#78716c' }}>{inc.location}</div>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: 2 }}>
                    {new Date(inc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── ROW 3: INCIDENT TREND + INCIDENT MIX ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '0.75rem', marginBottom: '1rem' }}>

        {/* Incident Trend */}
        <div className="card" style={{ padding: '0.85rem 1rem' }}>
          <SectionHeader icon={TrendingUp} title="Incident Trend — Last 7 Days" color="#f97316" />
          <div style={{ height: 160 }}>
            <ResponsiveContainer>
              <LineChart data={trendData} margin={{ top: 5, right: 10, bottom: 0, left: -25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#78716c' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#78716c' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 4, border: '1px solid #e7e5e4', fontSize: '0.78rem' }} />
                <Line type="monotone" dataKey="incidents" stroke="#ea580c" strokeWidth={2.5} dot={{ r: 3, fill: '#ea580c', stroke: '#fff', strokeWidth: 1.5 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Incident Mix */}
        <div className="card" style={{ padding: '0.85rem 1rem' }}>
          <SectionHeader icon={ShieldAlert} title="Incident Mix" color="#8b5cf6" />
          {incidentMix.length === 0 ? (
            <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>No incident data</div>
          ) : (
            <div style={{ height: 160 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={incidentMix} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" paddingAngle={3}>
                    {incidentMix.map((_, i) => <Cell key={i} fill={MIX_COLORS[i % MIX_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 4, border: '1px solid #e7e5e4', fontSize: '0.75rem' }} />
                  <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '0.7rem', paddingTop: 4 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* ── ROW 4: REGISTRATION TREND + RESPONSE PERFORMANCE + MEDICAL RISK ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>

        {/* Registration Trend */}
        <div className="card" style={{ padding: '0.85rem 1rem' }}>
          <SectionHeader icon={Users} title="Registration Growth — Last 7 Days" color="#16a34a" />
          <div style={{ height: 140 }}>
            <ResponsiveContainer>
              <LineChart data={regTrend} margin={{ top: 5, right: 10, bottom: 0, left: -25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#78716c' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#78716c' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 4, border: '1px solid #e7e5e4', fontSize: '0.78rem' }} />
                <Line type="monotone" dataKey="count" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 3, fill: '#16a34a', stroke: '#fff', strokeWidth: 1.5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Response Performance */}
        <div className="card" style={{ padding: '0.85rem 1rem' }}>
          <SectionHeader icon={Clock} title="Response Performance" color="#3b82f6" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: 4 }}>
            {[
              { label: 'AVG RESOLUTION', value: resolutionStats.avgTime, color: '#1c1917' },
              { label: 'OPEN CASES', value: resolutionStats.open, color: '#f97316' },
              { label: 'RESOLVED', value: resolutionStats.resolved, color: '#16a34a' },
              { label: 'RESOLUTION RATE', value: resolutionStats.rate, color: '#3b82f6' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.3rem 0.5rem', background: '#fafaf9', borderRadius: 3 }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>{label}</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color, fontFamily: 'Outfit,sans-serif' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Medical Risk */}
        <div className="card" style={{ padding: '0.85rem 1rem' }}>
          <SectionHeader icon={Activity} title="Medical Risk" color="#dc2626" />
          {medicalData.length === 0 ? (
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 8 }}>Insufficient data</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: 4 }}>
              {medicalData.map(d => {
                const pct = stats.total > 0 ? Math.round((d.value / stats.total) * 100) : 0;
                return (
                  <div key={d.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)' }}>{d.name}</span>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: d.color }}>{d.value} <span style={{ color: '#94a3b8' }}>({pct}%)</span></span>
                    </div>
                    <div style={{ height: 4, background: '#e7e5e4', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: d.color, borderRadius: 2 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── ROW 5: LIVE SAFETY MAP + INCIDENT LIST ── */}
      <div className="card" style={{ padding: '0.85rem 1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
          <div className="card-header" style={{ marginBottom: 0 }}>
            <MapPin size={13} style={{ color: '#ea580c' }} />
            LIVE SAFETY MAP
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 500, marginLeft: 6 }}>
              Active: {stats.activeIncidents} · Critical: {stats.criticalIncidents} · Mapped: {mappedIncidents.length}
            </span>
          </div>
          <button onClick={() => navigate('/map')} style={{ fontSize: '0.72rem', fontWeight: 700, color: '#ea580c', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
            Full Map <ArrowRight size={11} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem', height: 300 }}>
          {/* Map */}
          <div style={{ height: '100%', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}>
            {mappedIncidents.length === 0 ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafaf9', color: 'var(--text-muted)', fontSize: '0.8rem', flexDirection: 'column', gap: 6 }}>
                <MapPin size={24} style={{ opacity: 0.3 }} />
                No mapped incidents available
              </div>
            ) : (
              <MiniMap incidents={mappedIncidents} selected={selectedMapInc} onSelect={setSelectedMapInc} />
            )}
          </div>
          {/* Incident list */}
          <div style={{ height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {incidentFeed.slice(0, 8).map(inc => (
              <div
                key={inc.id}
                onClick={() => { if (!isNaN(inc.lat) && !isNaN(inc.lng)) setSelectedMapInc(inc); }}
                style={{
                  padding: '0.45rem 0.6rem',
                  borderRadius: 4,
                  border: `1px solid ${selectedMapInc?.id === inc.id ? '#ea580c' : '#e7e5e4'}`,
                  background: selectedMapInc?.id === inc.id ? '#fff7ed' : '#fff',
                  cursor: 'pointer',
                  transition: 'all 0.1s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                  <PriorityDot priority={inc.priority} />
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)' }}>{inc.type}</span>
                  <span style={{ fontSize: '0.65rem', color: '#94a3b8', marginLeft: 'auto', fontFamily: 'monospace' }}>
                    {new Date(inc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <MapPin size={10} />{inc.location}
                </div>
              </div>
            ))}
            {incidentFeed.length === 0 && (
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', padding: '1rem', textAlign: 'center' }}>No recent incidents</div>
            )}
          </div>
        </div>
      </div>

      {/* ── ROW 6: PANCHAYAT + DINDI RANKINGS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>

        {/* Top Districts (Panchayats proxy) */}
        <div className="card" style={{ padding: '0.85rem 1rem' }}>
          <SectionHeader icon={MapPin} title="Top Districts / Gram Panchayats" color="#8b5cf6" />
          {districtTop.length === 0 ? (
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', padding: '0.5rem 0' }}>Insufficient data</div>
          ) : (
            <div>
              {districtTop.map((d, i) => (
                <div key={d.name} className="rank-item">
                  <span className="rank-num">{i + 1}.</span>
                  <span className="rank-name">{d.name}</span>
                  <span className="rank-count">{d.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Dindis */}
        <div className="card" style={{ padding: '0.85rem 1rem' }}>
          <SectionHeader icon={Users} title="Top Team Leaders / Dindis" color="#10b981" />
          {dindisTop.length === 0 ? (
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', padding: '0.5rem 0' }}>
              No Dindi data available. Dindi groupings will appear once field is populated.
            </div>
          ) : (
            <div>
              {dindisTop.map((d, i) => (
                <div key={d.name} className="rank-item">
                  <span className="rank-num">{i + 1}.</span>
                  <span className="rank-name">{d.name}</span>
                  <span className="rank-count">{d.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── ROW 7: LIVE ACTIVITY + RECENT INCIDENTS TABLE ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '0.75rem' }}>

        {/* Live Activity */}
        <div className="card" style={{ padding: '0.85rem 1rem' }}>
          <SectionHeader icon={Zap} title="Live Activity" color="#f59e0b" />
          {activity.length === 0 ? (
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', padding: '0.5rem 0' }}>No recent activity</div>
          ) : (
            <div>
              {activity.map((a, i) => (
                <div key={i} className="activity-item">
                  <span className="activity-time">{a.time}</span>
                  <span className="activity-dot" style={{ background: a.color }} />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-main)', fontWeight: 500 }}>{a.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Incidents Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '0.85rem 1rem', borderBottom: '1px solid var(--border)' }}>
            <SectionHeader icon={AlertTriangle} title="Recent Incidents" color="#f97316" action="Manage All" onAction={() => navigate('/incidents')} />
          </div>
          <div className="table-container" style={{ border: 'none' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Type</th>
                  <th>Priority</th>
                  <th>Varkari</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Time</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {incidentFeed.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>No incidents found</td></tr>
                ) : incidentFeed.slice(0, 6).map(inc => (
                  <tr key={inc.id}>
                    <td><code style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{inc.id.split('-')[0].toUpperCase()}</code></td>
                    <td style={{ fontWeight: 600, fontSize: '0.8rem' }}>{inc.type}</td>
                    <td>
                      <span className={`badge badge-${inc.priority?.toLowerCase() || 'standard'}`}>{inc.priority || 'STANDARD'}</span>
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>{inc.varkari?.name || '—'}</td>
                    <td>
                      <span className={`badge ${inc.source === 'IVR' ? 'badge-ivr' : 'badge-web'}`}>{inc.source}</span>
                    </td>
                    <td>
                      <span className={`status-badge ${inc.status === 'RESOLVED' ? 'status-verified' : 'status-rejected'}`} style={{ fontSize: '0.68rem' }}>
                        {inc.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      {new Date(inc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td>
                      <button onClick={() => navigate('/incidents')} className="btn btn-ghost" style={{ padding: '0.2rem 0.4rem', fontSize: '0.72rem' }}>
                        <Eye size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </AdminLayout>
  );
};

export default AdminOverview;
