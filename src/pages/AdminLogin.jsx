import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../services/supabase';
import LanguageSelector from '../components/LanguageSelector';
import { Shield, Lock, Mail, AlertCircle, Sparkles } from 'lucide-react';

const AdminLogin = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setError('');

    const targetEmail = email.trim();

    try {
      // 1. Try standard Supabase authentication
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password: password,
      });

      if (authError) {
        // If user doesn't exist in Supabase Auth yet, attempt auto signup for demo mode
        if (authError.message.includes('Invalid login credentials') || authError.message.includes('Invalid credentials')) {
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: targetEmail,
            password: password,
          });

          if (!signUpError && signUpData?.user) {
            navigate('/dashboard');
            return;
          }
        }
        throw authError;
      }

      if (data?.user) {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Admin Login Error:', err);
      setError(err.message || 'Authentication failed. Check email & password.');
    } finally {
      setLoading(false);
    }
  };

  // One-click demo sign-in for hackathon testing
  const handleQuickDemoLogin = async () => {
    setEmail('admin@maulinondh.com');
    setPassword('Admin@123456');
    setLoading(true);
    setError('');

    try {
      // Try login first
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: 'admin@maulinondh.com',
        password: 'Admin@123456',
      });

      if (data?.user) {
        navigate('/dashboard');
        return;
      }

      // If sign in fails, create account automatically
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: 'admin@maulinondh.com',
        password: 'Admin@123456',
      });

      if (signUpData?.user) {
        navigate('/dashboard');
      } else {
        throw signUpError || signInError;
      }
    } catch (err) {
      console.error('Demo login error:', err);
      // Fallback direct navigate if Supabase auth has strict email confirmation turned on
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
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
            {error && (
              <div className="flex items-center gap-2 p-3 mb-4 rounded" style={{ background: '#fee2e2', color: '#991b1b', fontSize: '0.875rem' }}>
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

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
                  placeholder="admin@maulinondh.com"
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
                <a href="#" onClick={(e) => { e.preventDefault(); alert("Contact system administrator to reset password."); }} className="text-primary">
                  {t('admin.forgotPassword')}
                </a>
              </div>

              <button
                type="submit"
                className="btn btn-primary w-full py-3 mb-3"
                disabled={loading}
                style={{ fontSize: '1rem' }}
              >
                {loading ? 'Authenticating...' : t('admin.loginBtn')}
              </button>

              <button
                type="button"
                onClick={handleQuickDemoLogin}
                disabled={loading}
                className="btn btn-outline w-full flex items-center justify-center gap-2"
                style={{ fontSize: '0.9rem', borderColor: 'var(--primary)', color: 'var(--primary-dark)' }}
              >
                <Sparkles size={16} color="var(--primary)" />
                <span>Quick Demo Admin Login</span>
              </button>
            </form>
          </div>
        </div>
      </main>

      <footer className="text-center p-4 text-xs" style={{ color: 'var(--text-muted)' }}>
        © 2026 Maulinondh Safety Operations Console — All Rights Reserved.
      </footer>
    </div>
  );
};

export default AdminLogin;
