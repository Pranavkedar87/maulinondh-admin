import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Globe } from 'lucide-react';

const LanguageSelector = () => {
  const { language, changeLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-1 bg-surface border rounded-full px-2 py-1" style={{ borderColor: 'var(--border)' }}>
      <Globe size={16} color="var(--primary)" />
      <select
        value={language}
        onChange={(e) => changeLanguage(e.target.value)}
        style={{
          border: 'none',
          background: 'transparent',
          fontSize: '0.85rem',
          fontWeight: 600,
          color: 'var(--text-main)',
          cursor: 'pointer',
          outline: 'none'
        }}
      >
        <option value="mr">🇮🇳 मराठी</option>
        <option value="hi">हिंदी</option>
        <option value="en">English</option>
      </select>
    </div>
  );
};

export default LanguageSelector;
