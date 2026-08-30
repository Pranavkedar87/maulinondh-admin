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
  PieChart,
  Settings,
  LogOut,
  Shield,
  X,
  Home,
  Flag,
  Map,
  Phone
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const navItems = [
    { path: '/overview', label: 'Overview', icon: LayoutDashboard },
    { path: '/varkaris', label: 'Varkaris', icon: Users },
    { path: '/panchayats', label: 'Gram Panchayats', icon: Home },
    { path: '/dindis', label: 'Team Leaders / Dindis', icon: Flag },
    { path: '/incidents', label: 'Incidents', icon: AlertTriangle },
    { path: '/map', label: 'Live Map', icon: Map },
    { path: '/analytics', label: 'Analytics', icon: PieChart },
    { path: '/ivr', label: 'IVR', icon: Phone },
    { path: '/verification', label: 'Verification', icon: CheckCheck },
    { path: '/qr-tracking', label: 'QR / Safety Band', icon: QrCode },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <Shield size={22} color="var(--primary)" />
          <span>MAULI NODE</span>
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
