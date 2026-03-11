import { useState, useEffect, useCallback } from 'react';
import { Heart } from 'lucide-react';
import { api } from '../utils/api';
import PhoneCard from '../components/PhoneCard';
import { Card, Badge, PageHeader, EmptyState } from '../components/UI';
import { useNavigate } from 'react-router-dom';

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = useCallback(() => {
    setLoading(true);
    api.getFavorites()
      .then(res => setFavorites(res.favorites))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleFavorite = async (phoneId) => {
    await api.removeFavorite(phoneId);
    setFavorites(prev => prev.filter(f => f.id !== phoneId));
  };

  const favIds = new Set(favorites.map(f => f.id));

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 20px' }}>
      <PageHeader title="I tuoi preferiti" subtitle={`${favorites.length} smartphone salvati`} />

      {loading && <p style={{ color: 'var(--text-dim)' }}>Caricamento...</p>}

      {!loading && favorites.length === 0 && (
        <EmptyState icon={Heart} title="Nessun preferito salvato" description="Tocca il cuore su uno smartphone per aggiungerlo qui" />
      )}

      {/* Comparison table */}
      {favorites.length > 1 && (
        <Card className="fade-in" style={{ marginBottom: 24, overflowX: 'auto' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Confronto rapido</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Modello', 'Prezzo medio', 'MSRP', 'Annunci', 'Anno'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-dim)', fontWeight: 500, fontSize: 11, textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {favorites.map(f => {
                const avg = Math.round(f.avg_price || f.current_avg_price || 0);
                return (
                  <tr key={f.id} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                    onClick={() => navigate(`/phone/${f.id}`)}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{f.full_name}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{avg > 0 ? `€${avg}` : '—'}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-dim)' }}>€{f.msrp_eur}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{f.total_listings || f.active_listings || 0}</td>
                    <td style={{ padding: '10px 12px' }}><Badge>{f.year_released}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {/* Cards */}
      {favorites.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {favorites.map((phone, i) => (
            <PhoneCard key={phone.id} phone={phone} index={i} isFavorite={favIds.has(phone.id)} onToggleFavorite={toggleFavorite} />
          ))}
        </div>
      )}
    </div>
  );
}
