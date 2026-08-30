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
              className="btn btn-outline p-2 md:hidden"
              style={{ padding: '0.4rem', display: 'flex' }}
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              <Menu size={20} />
            </button>
            <div className="flex flex-col">
              <h1 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-main)', textTransform: 'uppercase' }}>
                {title || 'Command Center'}
              </h1>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'none', '@media(min-width: 768px)': { display: 'block' } }}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-2.5 py-1" style={{ background: '#fefce8', border: '1px solid #fef08a', borderRadius: '4px', color: '#854d0e', fontSize: '0.75rem', fontWeight: 700 }}>
               <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#eab308' }} className="animate-pulse"></span>
               NETWORK ACTIVE
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
