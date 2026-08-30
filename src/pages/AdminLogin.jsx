import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';
import { Shield, Lock, Mail, Sparkles } from 'lucide-react';

const AdminLogin = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@maulinode.com');
  const [password, setPassword] = useState('••••••••');
  const [rememberMe, setRememberMe] = useState(true);

  // 100% Direct Fail-Proof Admin Sign In
  const handleLogin = (e) => {
    e?.preventDefault();
    localStorage.setItem('maulinondh_admin_demo', 'true');
    navigate('/overview');
  };

  return (
    <div className="min-h-screen bg-color flex flex-col justify-between" style={{ background: 'var(--bg-color)' }}>
      <header className="p-4 flex justify-between items-center container">
        <div className="brand flex items-center gap-2 font-bold text-xl" style={{ color: 'var(--primary)' }}>
          <Shield size={28} />
          <span>{t('app.name')}</span>
          <span style={{ fontSize: '0.75rem', background: 'var(--primary)', color: 'white', padding: '0.1rem 0.5rem', borderRadius: '4px' }}>ADMIN</span>
        </div>
        <LanguageSelector />
      </header>

      <main className="container flex justify-center items-center py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div 
              style={{ 
                width: '72px', 
                height: '72px', 
                background: 'var(--surface)', 
                borderRadius: '50%', 
                margin: '0 auto 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-md)',
                border: '2px solid var(--primary)'
              }}
            >
              <Lock size={34} color="var(--primary)" />
            </div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>{t('admin.loginTitle')}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              {t('admin.loginSub')}
            </p>
          </div>

          <div className="card" style={{ boxShadow: 'var(--shadow-lg)' }}>
            <form onSubmit={handleLogin}>
              <div className="input-group">
                <label className="flex items-center gap-1" style={{ color: 'var(--text-main)', fontWeight: 600 }}>
                  <Mail size={14} color="var(--primary)" /> {t('admin.emailLabel')}
                </label>
                <input
                  type="email"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@maulinode.com"
                  required
                />
              </div>

              <div className="input-group">
                <label className="flex items-center gap-1" style={{ color: 'var(--text-main)', fontWeight: 600 }}>
                  <Lock size={14} color="var(--primary)" /> {t('admin.passwordLabel')}
                </label>
                <input
                  type="password"
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="flex items-center justify-between mb-6" style={{ fontSize: '0.875rem' }}>
                <label className="flex items-center gap-2 cursor-pointer" style={{ color: 'var(--text-main)' }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  {t('admin.rememberMe')}
                </label>
                <a href="#" onClick={(e) => { e.preventDefault(); handleLogin(); }} className="text-primary font-semibold">
                  {t('admin.forgotPassword')}
                </a>
              </div>

              <button
                type="submit"
                className="btn btn-primary w-full py-3 mb-3"
                style={{ fontSize: '1rem' }}
              >
                {t('admin.loginBtn')}
              </button>

              <button
                type="button"
                onClick={handleLogin}
                className="btn btn-outline w-full flex items-center justify-center gap-2"
                style={{ fontSize: '0.9rem', borderColor: 'var(--primary)', color: 'var(--primary-dark)', fontWeight: 700 }}
              >
                <Sparkles size={16} color="var(--primary)" />
                <span>⚡ Instant Quick Demo Admin Sign In</span>
              </button>
            </form>
          </div>
        </div>
      </main>

      <footer className="text-center p-4 text-xs" style={{ color: 'var(--text-muted)' }}>
        © 2026 MAULINONDH Safety Operations Console — All Rights Reserved.
      </footer>
    </div>
  );
};

export default AdminLogin;
