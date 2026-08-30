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

const NavGroup = ({ label }) => (
  <div style={{
    fontSize: '0.65rem',
    fontWeight: 800,
    letterSpacing: '0.08em',
    color: '#94a3b8',
    textTransform: 'uppercase',
    padding: '0.9rem 0.85rem 0.35rem',
    userSelect: 'none'
  }}>
    {label}
  </div>
);

const Sidebar = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <Shield size={20} color="var(--primary)" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
            <span style={{ fontSize: '1rem', lineHeight: 1.1 }}>MAULINONDH</span>
            <span style={{ fontSize: '0.6rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>ADMIN COMMAND CENTER</span>
          </div>
        </div>
        {onClose && (
          <button className="btn btn-outline" style={{ padding: '0.2rem' }} onClick={onClose}>
            <X size={16} />
          </button>
        )}
      </div>

      <nav className="sidebar-nav" style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0.75rem' }}>

        <NavGroup label="Overview" />
        <NavLink to="/overview" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
          <LayoutDashboard size={16} /><span>Command Center</span>
        </NavLink>
        <NavLink to="/analytics" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
          <PieChart size={16} /><span>Analytics</span>
        </NavLink>

        <NavGroup label="Registration" />
        <NavLink to="/varkaris" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
          <Users size={16} /><span>Varkaris</span>
        </NavLink>
        <NavLink to="/panchayats" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
          <Home size={16} /><span>Gram Panchayats</span>
        </NavLink>
        <NavLink to="/dindis" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
          <Flag size={16} /><span>Team Leaders / Dindis</span>
        </NavLink>
        <NavLink to="/verification" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
          <CheckCheck size={16} /><span>Verification</span>
        </NavLink>

        <NavGroup label="Safety" />
        <NavLink to="/incidents" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
          <AlertTriangle size={16} /><span>Incidents</span>
        </NavLink>
        <NavLink to="/map" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
          <Map size={16} /><span>Live Map</span>
        </NavLink>
        <NavLink to="/qr-tracking" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
          <QrCode size={16} /><span>QR / Safety Band</span>
        </NavLink>
        <NavLink to="/ivr" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
          <Phone size={16} /><span>IVR</span>
        </NavLink>

        <NavGroup label="System" />
        <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
          <Settings size={16} /><span>Settings</span>
        </NavLink>

      </nav>

      <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border)' }}>
        <button
          onClick={handleLogout}
          className="btn btn-outline w-full flex items-center justify-center gap-2"
          style={{ padding: '0.45rem 1rem', fontSize: '0.82rem', color: '#dc2626', borderColor: '#fecaca' }}
        >
          <LogOut size={14} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
