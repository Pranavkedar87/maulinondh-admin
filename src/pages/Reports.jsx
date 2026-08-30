import React, { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { supabase } from '../services/supabase';
import { FileBarChart, Download, Calendar, Filter } from 'lucide-react';

const Reports = () => {
  const [exporting, setExporting] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportType, setReportType] = useState('REGISTRATION');

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      let dataToExport = [];
      let filename = `MAULI NODE_${reportType}_Report.csv`;

      if (reportType === 'REGISTRATION' || reportType === 'VERIFICATION') {
        const { data } = await supabase.from('varkaris').select('registration_id, name, age, gender, phone, district, blood_group, status, created_at');
        dataToExport = data || [];
      } else if (reportType === 'QR_SCAN') {
        const { data } = await supabase.from('qr_scans').select('registration_id, scanned_at, latitude, longitude, location_name, permission_granted');
        dataToExport = data || [];
      } else if (reportType === 'ALERTS') {
        const { data } = await supabase.from('qr_alerts').select('registration_id, alert_type, message, location_name, status, created_at');
        dataToExport = data || [];
      }

      if (dataToExport.length === 0) {
        alert('No data available to export.');
        return;
      }

      // Convert JSON array to CSV format
      const headers = Object.keys(dataToExport[0]).join(',');
      const rows = dataToExport.map(row => Object.values(row).map(v => `"${v || ''}"`).join(','));
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('Export error:', e);
      alert('Failed to generate export file');
    } finally {
      setExporting(false);
    }
  };

  return (
    <AdminLayout title="Reports">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 style={{ fontSize: '1.3rem' }}>Operational Reports & Exports</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Generate and export structured CSV/Excel reports for event auditing
          </p>
        </div>
      </div>

      <div className="card max-w-2xl mb-6">
        <h3 className="text-base font-bold mb-4 flex items-center gap-2">
          <FileBarChart size={18} className="text-orange-600" /> Export Data Configuration
        </h3>

        <div className="space-y-4">
          <div className="input-group">
            <label>Report Type</label>
            <select className="select" value={reportType} onChange={(e) => setReportType(e.target.value)}>
              <option value="REGISTRATION">Registration Master Report</option>
              <option value="VERIFICATION">Verification Audit Report</option>
              <option value="QR_SCAN">QR Scan & Geolocation Activity Log</option>
              <option value="ALERTS">Emergency & Actionable Alerts Log</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="input-group">
              <label>Start Date</label>
              <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="input-group">
              <label>End Date</label>
              <input type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="pt-2 flex gap-3">
            <button onClick={handleExportCSV} disabled={exporting} className="btn btn-primary flex items-center gap-2">
              <Download size={16} />
              <span>{exporting ? 'Generating CSV...' : 'Export Report (CSV / Excel)'}</span>
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Reports;
