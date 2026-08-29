import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { LanguageProvider } from './context/LanguageContext'
import './styles/index.css'
import App from './App.jsx'

const getBasename = () => {
  const base = import.meta.env.BASE_URL || '/';
  return base.endsWith('/') && base.length > 1 ? base.slice(0, -1) : base;
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename={getBasename()}>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </BrowserRouter>
  </StrictMode>,
)
