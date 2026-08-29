import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../services/supabase';
import {
  LayoutDashboard,
  Users,
  QrCode,
  CheckCheck,
  AlertTriangle,
  FileBarChart,
  Settings,
  LogOut,
  Shield,
  X
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const navItems = [
    { path: '/overview', label: '1. Overview', icon: LayoutDashboard },
    { path: '/registrations', label: '2. Registrations', icon: Users },
    { path: '/qr-tracking', label: '3. QR & Tracking', icon: QrCode },
    { path: '/verification', label: '4. Verification', icon: CheckCheck },
    { path: '/alerts', label: '5. Alerts', icon: AlertTriangle },
    { path: '/reports', label: '6. Reports', icon: FileBarChart },
    { path: '/settings', label: '7. Settings', icon: Settings },
  ];

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <Shield size={22} color="var(--primary)" />
          <span>MAULINONDH</span>
          <span style={{ fontSize: '0.65rem', background: 'var(--primary-light)', color: 'var(--primary-dark)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>ADMIN</span>
        </div>
        {onClose && (
          <button className="btn btn-outline" style={{ padding: '0.2rem', display: 'md:none' }} onClick={onClose}>
            <X size={18} />
          </button>
        )}
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div style={{ padding: '1rem', borderTop: '1px solid var(--border)' }}>
        <button
          onClick={handleLogout}
          className="btn btn-outline w-full flex items-center justify-center gap-2"
          style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', color: '#dc2626', borderColor: '#fecaca' }}
        >
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
