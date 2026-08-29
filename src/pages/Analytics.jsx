import React, { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { supabase } from '../services/supabase';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { Activity, MapPin, Users, ActivitySquare, CheckCircle } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
const STATUS_COLORS = {
  VERIFIED: '#16a34a',
  PENDING_VERIFICATION: '#d97706',
  REJECTED: '#dc2626'
};

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [registrationTrend, setRegistrationTrend] = useState([]);
  const [villageStats, setVillageStats] = useState([]);
  const [medicalStats, setMedicalStats] = useState([]);
  const [statusStats, setStatusStats] = useState([]);
  const [ageStats, setAgeStats] = useState([]);

  // Insights
  const [insights, setInsights] = useState({
    topVillage: '',
    topMedical: '',
    verificationRate: 0,
    totalCount: 0
  });

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const { data: varkaris, error } = await supabase.from('varkaris').select('id, created_at, status, address, medical_conditions, age');
      
      if (error || !varkaris) {
        console.error("Error fetching data:", error);
        return;
      }

      // 1. Process Status
      const statusCounts = { VERIFIED: 0, PENDING_VERIFICATION: 0, REJECTED: 0 };
      varkaris.forEach(v => {
        if (statusCounts[v.status] !== undefined) statusCounts[v.status]++;
      });
      const statusData = Object.keys(statusCounts).map(k => ({ name: k, value: statusCounts[k] }));

      // 2. Process Age Groups
      const ageGroups = { 'Under 18': 0, '18-30': 0, '31-50': 0, '51-70': 0, '70+': 0 };
      varkaris.forEach(v => {
        const age = parseInt(v.age);
        if (!isNaN(age)) {
          if (age < 18) ageGroups['Under 18']++;
          else if (age <= 30) ageGroups['18-30']++;
          else if (age <= 50) ageGroups['31-50']++;
          else if (age <= 70) ageGroups['51-70']++;
          else ageGroups['70+']++;
        }
      });
      const ageData = Object.keys(ageGroups).map(k => ({ name: k, count: ageGroups[k] }));

      // 3. Process Medical Conditions
      const medCounts = {};
      varkaris.forEach(v => {
        if (v.medical_conditions) {
          const conditions = v.medical_conditions.split(',').map(s => s.trim()).filter(Boolean);
          conditions.forEach(c => {
            medCounts[c] = (medCounts[c] || 0) + 1;
          });
        }
      });
      const medData = Object.keys(medCounts).map(k => ({ name: k, count: medCounts[k] })).sort((a,b) => b.count - a.count).slice(0, 5);

      // 4. Process Villages
      const vilCounts = {};
      varkaris.forEach(v => {
        if (v.address) {
          vilCounts[v.address] = (vilCounts[v.address] || 0) + 1;
        }
      });
      const vilData = Object.keys(vilCounts).map(k => ({ name: k, count: vilCounts[k] })).sort((a,b) => b.count - a.count).slice(0, 5);

      // 5. Registration Trends (by date)
      const dateCounts = {};
      varkaris.forEach(v => {
        const d = new Date(v.created_at).toLocaleDateString();
        dateCounts[d] = (dateCounts[d] || 0) + 1;
      });
      const trendData = Object.keys(dateCounts).map(k => ({ date: k, registrations: dateCounts[k] })).sort((a,b) => new Date(a.date) - new Date(b.date));

      setStatusStats(statusData);
      setAgeStats(ageData);
      setMedicalStats(medData);
      setVillageStats(vilData);
      setRegistrationTrend(trendData);

      // Calc insights
      setInsights({
        totalCount: varkaris.length,
        verificationRate: varkaris.length > 0 ? Math.round((statusCounts.VERIFIED / varkaris.length) * 100) : 0,
        topVillage: vilData.length > 0 ? vilData[0].name : 'N/A',
        topMedical: medData.length > 0 ? medData[0].name : 'N/A'
      });

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout title="Analytics">
      <div className="mb-6">
        <h2 style={{ fontSize: '1.4rem' }}>Data & Analytics</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Graphical insights derived from real database records.</p>
      </div>

      {loading ? (
        <div className="text-center p-8">Loading analytical models...</div>
      ) : (
        <div className="grid gap-6">
          {/* Insights Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
             <div className="card border-l-4 border-blue-500 p-4">
                <div className="text-sm font-semibold text-gray-500 mb-1 flex items-center gap-2"><Activity size={16}/> Total Registrations</div>
                <div className="text-2xl font-bold">{insights.totalCount}</div>
             </div>
             <div className="card border-l-4 border-green-500 p-4">
                <div className="text-sm font-semibold text-gray-500 mb-1 flex items-center gap-2"><CheckCircle size={16}/> Verification Rate</div>
                <div className="text-2xl font-bold">{insights.verificationRate}%</div>
             </div>
             <div className="card border-l-4 border-orange-500 p-4">
                <div className="text-sm font-semibold text-gray-500 mb-1 flex items-center gap-2"><MapPin size={16}/> Top Location</div>
                <div className="text-xl font-bold truncate" title={insights.topVillage}>{insights.topVillage}</div>
             </div>
             <div className="card border-l-4 border-red-500 p-4">
                <div className="text-sm font-semibold text-gray-500 mb-1 flex items-center gap-2"><ActivitySquare size={16}/> Top Medical Condition</div>
                <div className="text-xl font-bold truncate" title={insights.topMedical}>{insights.topMedical}</div>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Chart 1 */}
            <div className="card p-4">
              <h3 className="font-bold mb-4 text-gray-700">Registration Trend</h3>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <LineChart data={registrationTrend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{fontSize: 12}} />
                    <YAxis tick={{fontSize: 12}} />
                    <RechartsTooltip />
                    <Line type="monotone" dataKey="registrations" stroke="#2563eb" strokeWidth={3} dot={{r: 4}} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2 */}
            <div className="card p-4">
              <h3 className="font-bold mb-4 text-gray-700">Age Distribution</h3>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <BarChart data={ageStats}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{fontSize: 12}} />
                    <YAxis tick={{fontSize: 12}} />
                    <RechartsTooltip cursor={{fill: 'var(--bg-color)'}} />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 3 */}
            <div className="card p-4">
              <h3 className="font-bold mb-4 text-gray-700">Top Locations (Villages/Areas)</h3>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <BarChart data={villageStats} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{fontSize: 12}} />
                    <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 11}} />
                    <RechartsTooltip cursor={{fill: 'var(--bg-color)'}} />
                    <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 4 */}
            <div className="card p-4 flex flex-col">
              <h3 className="font-bold mb-4 text-gray-700">Verification Status Pipeline</h3>
              <div style={{ width: '100%', height: 300, flex: 1 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={statusStats}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({name, percent}) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={false}
                    >
                      {statusStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default Analytics;
