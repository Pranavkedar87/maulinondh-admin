import React, { useState } from 'react';
import Sidebar from './Sidebar';
import LanguageSelector from './LanguageSelector';
import { useAdminAuth } from '../hooks/useAdminAuth';
import { Menu, Bell, Shield } from 'lucide-react';

const AdminLayout = ({ children, title }) => {
  const { adminUser } = useAdminAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="admin-container">
      <Sidebar isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="main-content">
        <header className="top-header">
          <div className="flex items-center gap-3">
            <button
              className="btn btn-ghost"
              style={{ padding: '0.3rem', display: 'flex' }}
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              <Menu size={18} />
            </button>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <h1 style={{ fontSize: '0.9rem', fontWeight: 800, margin: 0, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                {title || 'Command Center'}
              </h1>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                {new Date().toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0.25rem 0.6rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 4, color: '#15803d', fontSize: '0.68rem', fontWeight: 700 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#16a34a', animation: 'pulse 2s infinite' }} />
              LIVE
            </div>
            
            <LanguageSelector />
            
            <div className="flex items-center gap-2" style={{ fontSize: '0.9rem' }}>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: 'var(--primary-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Shield size={18} color="var(--primary)" />
              </div>
              <span className="font-medium" style={{ display: 'none', '@media(min-width: 640px)': { display: 'inline' } }}>
                {adminUser?.name || 'Admin'}
              </span>
            </div>
          </div>
        </header>

        <main className="content-body">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
