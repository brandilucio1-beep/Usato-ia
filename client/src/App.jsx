import { useState, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Search, Heart, TrendingUp, MapPin, Home, Smartphone, Zap, Settings } from 'lucide-react';
import SearchPage from './pages/SearchPage';
import PhoneDetail from './pages/PhoneDetail';
import FavoritesPage from './pages/FavoritesPage';
import TrendsPage from './pages/TrendsPage';
import RegionsPage from './pages/RegionsPage';
import StatusBanner from './components/StatusBanner';

const NAV_ITEMS = [
  { path: '/', icon: Search, label: 'Cerca' },
  { path: '/favorites', icon: Heart, label: 'Preferiti' },
  { path: '/trends', icon: TrendingUp, label: 'Trend' },
  { path: '/regions', icon: MapPin, label: 'Regioni' },
];

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navbar */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'var(--bg-elevated)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
        padding: '0 20px',
      }}>
        <div style={{
          maxWidth: 1280, margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 56,
        }}>
          {/* Logo */}
          <div
            onClick={() => navigate('/')}
            style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
          >
            <div style={{
              width: 34, height: 34, borderRadius: 9,
              background: 'linear-gradient(135deg, var(--accent), var(--pink))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 12px var(--accent-glow)',
            }}>
              <Smartphone size={17} color="#fff" />
            </div>
            <span style={{
              fontSize: 17, fontWeight: 700, color: 'var(--text)',
              fontFamily: 'var(--font-mono)', letterSpacing: -0.5,
            }}>
              UsatoIA
            </span>
            <span style={{
              fontSize: 10, padding: '2px 6px', borderRadius: 4,
              background: 'var(--green-dim)', color: 'var(--green)',
              fontWeight: 600, fontFamily: 'var(--font-mono)',
            }}>LIVE</span>
          </div>

          {/* Nav links */}
          <div style={{ display: 'flex', gap: 2 }}>
            {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
              const isActive = path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(path);
              return (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '7px 14px', borderRadius: 8, border: 'none',
                    background: isActive ? 'var(--accent-glow)' : 'transparent',
                    color: isActive ? 'var(--accent-bright)' : 'var(--text-dim)',
                    fontSize: 13, fontWeight: 500,
                    transition: 'all 0.2s',
                  }}
                >
                  <Icon size={16} />
                  <span className="nav-label">{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Status banner */}
      <StatusBanner />

      {/* Content */}
      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<SearchPage />} />
          <Route path="/phone/:id" element={<PhoneDetail />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/trends" element={<TrendsPage />} />
          <Route path="/regions" element={<RegionsPage />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer style={{
        textAlign: 'center', padding: '28px 16px',
        borderTop: '1px solid var(--border)', marginTop: 40,
      }}>
        <p style={{ fontSize: 11, color: 'var(--text-dim)' }}>
          UsatoIA — Dati reali da Subito.it, Facebook Marketplace, Kijiji e Wallapop
        </p>
        <p style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>
          Aggiornamento automatico ogni 6 ore · Solo annunci privati, no ricondizionati
        </p>
      </footer>

      <style>{`
        .nav-label { display: none; }
        @media (min-width: 640px) { .nav-label { display: inline; } }
      `}</style>
    </div>
  );
}
