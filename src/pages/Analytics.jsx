import React, { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { supabase } from '../services/supabase';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { PieChart as PieChartIcon, Activity, Map, Users, HeartPulse, ShieldAlert, Timer } from 'lucide-react';

const COLORS = ['#ea580c', '#c2410c', '#f97316', '#fdba74', '#fed7aa', '#ffedd5'];
const STATUS_COLORS = { 'VERIFIED': '#16a34a', 'PENDING_VERIFICATION': '#d97706', 'REJECTED': '#dc2626' };
const MIX_COLORS = ['#dc2626', '#ea580c', '#f59e0b', '#3b82f6', '#8b5cf6'];

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  
  // Registration State
  const [regTrend, setRegTrend] = useState([]);
  const [districtData, setDistrictData] = useState([]);
  const [ageData, setAgeData] = useState([]);
  const [statusData, setStatusData] = useState([]);
  const [medicalData, setMedicalData] = useState([]);
  
  // Incident State
  const [incidentMix, setIncidentMix] = useState([]);
  const [resolutionStats, setResolutionStats] = useState({});
  const [incidentTrend, setIncidentTrend] = useState([]);

  const [insights, setInsights] = useState({});

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const { data: varkaris, error: vErr } = await supabase.from('varkaris').select('*');
        const { data: qrAlerts } = await supabase.from('qr_alerts').select('*');
        const { data: incidents } = await supabase.from('incidents').select('*');

        const allIncidents = [
          ...(qrAlerts || []).map(a => ({ ...a, source: 'QR', priority: 'STANDARD' })),
          ...(incidents || []).map(i => ({ ...i, source: 'WEB/IVR' }))
        ];

        if (!varkaris) return;

        // --- REGISTRATION ANALYTICS ---
        const dateMap = {};
        varkaris.forEach(v => {
          const date = new Date(v.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
          dateMap[date] = (dateMap[date] || 0) + 1;
        });
        const trend = Object.keys(dateMap).map(k => ({ date: k, count: dateMap[k] })).slice(-14);
        setRegTrend(trend);

        const distMap = {};
        varkaris.forEach(v => {
          const d = v.district || 'Unknown';
          distMap[d] = (distMap[d] || 0) + 1;
        });
        const distArr = Object.keys(distMap).map(k => ({ name: k, value: distMap[k] })).sort((a,b) => b.value - a.value).slice(0, 10);
        setDistrictData(distArr);

        const ageBuckets = { '< 20': 0, '21 - 40': 0, '41 - 60': 0, '60+': 0 };
        varkaris.forEach(v => {
          const age = parseInt(v.age, 10);
          if (isNaN(age)) return;
          if (age <= 20) ageBuckets['< 20']++;
          else if (age <= 40) ageBuckets['21 - 40']++;
          else if (age <= 60) ageBuckets['41 - 60']++;
          else ageBuckets['60+']++;
        });
        setAgeData(Object.keys(ageBuckets).map(k => ({ name: k, value: ageBuckets[k] })));

        const statMap = {};
        varkaris.forEach(v => {
          statMap[v.status] = (statMap[v.status] || 0) + 1;
        });
        setStatusData(Object.keys(statMap).map(k => ({ name: k.replace('_', ' '), value: statMap[k], original: k })));

        let diabetesCount = 0; let bloodPressureCount = 0; let noneCount = 0; let otherCount = 0;
        varkaris.forEach(v => {
          const med = (v.medical_conditions || '').toLowerCase();
          if (!med || med === 'none' || med === 'na' || med === 'no') noneCount++;
          else if (med.includes('diabet') || med.includes('sugar')) diabetesCount++;
          else if (med.includes('bp') || med.includes('blood pressure')) bloodPressureCount++;
          else otherCount++;
        });
        setMedicalData([
          { name: 'None', value: noneCount },
          { name: 'Diabetes', value: diabetesCount },
          { name: 'Blood Pressure', value: bloodPressureCount },
          { name: 'Other', value: otherCount }
        ].filter(d => d.value > 0));

        // --- INCIDENT ANALYTICS ---
        const typeMap = {};
        allIncidents.forEach(i => {
          const t = i.type || i.alert_type || 'Unknown';
          typeMap[t] = (typeMap[t] || 0) + 1;
        });
        setIncidentMix(Object.keys(typeMap).map(k => ({ name: k, value: typeMap[k] })));

        // Resolution Performance
        let resolvedCount = 0;
        let openCount = 0;
        let resolutionTimes = [];
        allIncidents.forEach(i => {
          if (i.status === 'RESOLVED') {
            resolvedCount++;
            if (i.resolved_at) {
              const diff = new Date(i.resolved_at) - new Date(i.created_at);
              if (diff > 0) resolutionTimes.push(diff);
            }
          } else {
            openCount++;
          }
        });
        const avgResTimeMs = resolutionTimes.length > 0 ? resolutionTimes.reduce((a,b)=>a+b,0) / resolutionTimes.length : 0;
        const avgResMinutes = Math.round(avgResTimeMs / 60000);
        
        setResolutionStats({
          resolved: resolvedCount,
          open: openCount,
          avgTime: avgResMinutes > 0 ? `${avgResMinutes} mins` : 'N/A'
        });

        // Generate Textual Insights
        const topDistrict = distArr.length > 0 ? distArr[0].name : 'N/A';
        const topDistrictVal = distArr.length > 0 ? distArr[0].value : 0;
        
        setInsights({
          total: varkaris.length,
          topDistrict: `${topDistrict} has the highest registrations with ${topDistrictVal} participants.`,
          diabetesInsight: diabetesCount > 0 ? `${diabetesCount} registered participants have Diabetes.` : `Overall medical risk profile is currently low.`,
          statusInsight: statMap['VERIFIED'] ? `${Math.round((statMap['VERIFIED'] / varkaris.length) * 100)}% of registrations have been successfully verified.` : `Verification processing is pending for most users.`,
          incidentInsight: openCount > 0 ? `There are ${openCount} open incidents requiring immediate attention.` : `All reported incidents have been resolved.`
        });

      } catch (err) {
        console.error('Error loading analytics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  return (
    <AdminLayout title="Operational Analytics">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Analytics Command Center</h2>
          <p className="text-slate-500 text-sm">Deep insights into Safety, Incidents, and Registration Data</p>
        </div>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-slate-500">Processing real-time data cube...</div>
      ) : (
        <div className="grid gap-6">
          
          {/* Section: Safety & Incident Analytics */}
          <div className="mb-2">
            <h3 className="text-lg font-bold text-slate-800 border-b pb-2 mb-4">Safety & Incident Analytics</h3>
            <div className="grid gap-6 lg:grid-cols-3">
              
              <div className="card lg:col-span-1">
                <h3 className="mb-4 text-sm font-bold flex items-center gap-2 text-slate-800 uppercase tracking-wide">
                  <ShieldAlert size={16} className="text-red-600" /> Incident Mix
                </h3>
                <div style={{ width: '100%', height: 200 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={incidentMix} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                        {incidentMix.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={MIX_COLORS[index % MIX_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '4px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                      <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card lg:col-span-1 flex flex-col justify-center">
                <h3 className="mb-6 text-sm font-bold flex items-center gap-2 text-slate-800 uppercase tracking-wide">
                  <Timer size={16} className="text-blue-600" /> Resolution Performance
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-slate-50 rounded">
                    <div className="text-xs text-slate-500 font-bold mb-1">AVG RESOLUTION</div>
                    <div className="text-xl font-black text-slate-800">{resolutionStats.avgTime}</div>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded">
                    <div className="text-xs text-slate-500 font-bold mb-1">RESOLVED</div>
                    <div className="text-xl font-black text-green-700">{resolutionStats.resolved}</div>
                  </div>
                  <div className="col-span-2 text-center p-3 bg-slate-50 rounded border border-slate-200">
                    <div className="text-xs text-slate-500 font-bold mb-1">OPEN CASES</div>
                    <div className="text-2xl font-black text-red-600">{resolutionStats.open}</div>
                  </div>
                </div>
              </div>
              
              <div className="card lg:col-span-1">
                <h3 className="mb-4 text-sm font-bold flex items-center gap-2 text-slate-800 uppercase tracking-wide">
                  <HeartPulse size={16} className="text-red-600" /> Medical Risk Distribution
                </h3>
                <div style={{ width: '100%', height: 200 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={medicalData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} style={{fontSize: '10px', fontWeight: 'bold'}}>
                        {medicalData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.name === 'None' ? '#cbd5e1' : entry.name === 'Diabetes' ? '#ef4444' : entry.name === 'Blood Pressure' ? '#f59e0b' : '#3b82f6'} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '4px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          </div>

          {/* Section: Registration Analytics */}
          <div className="mb-2">
            <h3 className="text-lg font-bold text-slate-800 border-b pb-2 mb-4 mt-4">Registration Analytics</h3>
            <div className="grid gap-6 lg:grid-cols-2">
              
              <div className="card">
                <h3 className="mb-4 text-sm font-bold flex items-center gap-2 text-slate-800 uppercase tracking-wide">
                  <Activity size={16} className="text-orange-600" /> Registration Growth Volume
                </h3>
                <div style={{ width: '100%', height: 250 }}>
                  <ResponsiveContainer>
                    <AreaChart data={regTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ea580c" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#ea580c" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="date" tick={{fontSize: 11, fill: '#64748b'}} tickLine={false} axisLine={false} />
                      <YAxis tick={{fontSize: 11, fill: '#64748b'}} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '4px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                      <Area type="monotone" dataKey="count" stroke="#ea580c" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card">
                <h3 className="mb-4 text-sm font-bold flex items-center gap-2 text-slate-800 uppercase tracking-wide">
                  <Map size={16} className="text-purple-600" /> Top Districts
                </h3>
                <div style={{ width: '100%', height: 250 }}>
                  <ResponsiveContainer>
                    <BarChart data={districtData} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                      <XAxis type="number" tick={{fontSize: 11, fill: '#64748b'}} tickLine={false} axisLine={false} />
                      <YAxis dataKey="name" type="category" tick={{fontSize: 11, fill: '#334155', fontWeight: 600}} tickLine={false} axisLine={false} width={90} />
                      <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '4px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                      <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={16} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          </div>
          
        </div>
      )}
    </AdminLayout>
  );
};

export default Analytics;
