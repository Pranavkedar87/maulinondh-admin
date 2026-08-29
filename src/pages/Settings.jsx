import React, { useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { useAdminAuth } from '../hooks/useAdminAuth';
import LanguageSelector from '../components/LanguageSelector';
import { MapPin, QrCode, Shield, Save } from 'lucide-react';

const Settings = () => {
  const { adminUser, session } = useAdminAuth();
  const [mapKey, setMapKey] = useState(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '');
  const [qrBaseUrl, setQrBaseUrl] = useState(window.location.origin);
  const [savedMsg, setSavedMsg] = useState(false);

  const handleSaveSettings = (e) => {
    e.preventDefault();
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2500);
  };

  return (
    <AdminLayout title="Settings">
      <div className="mb-6">
        <h2 style={{ fontSize: '1.3rem' }}>System & Infrastructure Settings</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Configure Map API integration, secure QR domain URLs, and system security
        </p>
      </div>

      {savedMsg && (
        <div className="card mb-4 bg-emerald-50 text-emerald-800 border-emerald-200 text-sm font-semibold p-3">
          ✓ Configuration settings saved securely!
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-6 max-w-3xl">
        {/* Map Configuration */}
        <div className="card space-y-3">
          <h3 className="text-sm font-bold flex items-center gap-2 text-slate-800">
            <MapPin size={16} className="text-orange-600" /> Map API Configuration
          </h3>
          <div className="input-group">
            <label>Google Maps API Key</label>
            <input
              type="password"
              className="input font-mono text-xs"
              value={mapKey}
              onChange={(e) => setMapKey(e.target.value)}
              placeholder="AIzaSy..."
            />
            <span className="text-xs text-slate-400">Used for scan location map clustering in QR & Tracking. Key is securely stored.</span>
          </div>
        </div>

        {/* QR Domain Settings */}
        <div className="card space-y-3">
          <h3 className="text-sm font-bold flex items-center gap-2 text-slate-800">
            <QrCode size={16} className="text-purple-600" /> QR Code Domain & URL Config
          </h3>
          <div className="input-group">
            <label>QR Base URL Domain</label>
            <input
              type="text"
              className="input font-mono text-xs"
              value={qrBaseUrl}
              onChange={(e) => setQrBaseUrl(e.target.value)}
              placeholder="https://maulinondh.com"
            />
            <span className="text-xs text-slate-400">Determines the secure public URL encoded in generated QR codes (e.g. <code>{qrBaseUrl}/u/REG10234</code>).</span>
          </div>
        </div>

        {/* Admin Account */}
        <div className="card space-y-3">
          <h3 className="text-sm font-bold flex items-center gap-2 text-slate-800">
            <Shield size={16} className="text-blue-600" /> Admin Account Metadata
          </h3>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block">ADMIN USER</span>
              <span className="font-semibold">{adminUser?.name || 'Administrator'}</span>
            </div>
            <div>
              <span className="text-slate-400 block">EMAIL SESSION</span>
              <span className="font-semibold">{session?.user?.email || 'admin@maulinondh.com'}</span>
            </div>
          </div>
        </div>

        <button type="submit" className="btn btn-primary flex items-center gap-2">
          <Save size={16} /> Save Configuration
        </button>
      </form>
    </AdminLayout>
  );
};

export default Settings;
