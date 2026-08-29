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
              className="btn btn-outline p-2"
              style={{ padding: '0.4rem', display: 'flex' }}
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              <Menu size={20} />
            </button>
            <h1 style={{ fontSize: '1.25rem' }}>{title || 'Dashboard'}</h1>
          </div>

          <div className="flex items-center gap-4">
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
