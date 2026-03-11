import { Heart, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from './UI';

export default function PhoneCard({ phone, isFavorite, onToggleFavorite, index = 0 }) {
  const navigate = useNavigate();
  const avgPrice = Math.round(phone.avg_price || phone.current_avg_price || 0);
  const listings = phone.total_listings || phone.active_listings || 0;
  const retention = phone.msrp_eur && avgPrice
    ? Math.round((avgPrice / phone.msrp_eur) * 100)
    : null;

  const demandLevel = listings > 80 ? 'Alto' : listings > 25 ? 'Medio' : 'Basso';
  const demandColor = demandLevel === 'Alto' ? 'var(--green)' : demandLevel === 'Medio' ? 'var(--amber)' : 'var(--red)';

  return (
    <div
      className="fade-in"
      style={{ animationDelay: `${index * 0.04}s`, opacity: 0 }}
    >
      <div
        onClick={() => navigate(`/phone/${phone.id}`)}
        style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: 16,
          cursor: 'pointer', transition: 'all 0.2s ease',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--card-hover)'; e.currentTarget.style.borderColor = 'var(--border-accent)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'var(--card)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
              {phone.full_name || `${phone.brand} ${phone.model}`}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <Badge color="var(--blue)">{phone.brand}</Badge>
              <Badge color="var(--text-dim)">{phone.year_released}</Badge>
              {listings > 0 && (
                <Badge color={demandColor}>
                  {demandLevel === 'Alto' ? '▲' : demandLevel === 'Medio' ? '●' : '▼'} {demandLevel}
                </Badge>
              )}
            </div>
          </div>
          <button
            onClick={e => { e.stopPropagation(); onToggleFavorite?.(phone.id); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
          >
            <Heart
              size={18}
              fill={isFavorite ? 'var(--pink)' : 'none'}
              color={isFavorite ? 'var(--pink)' : 'var(--text-dim)'}
            />
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            {avgPrice > 0 ? (
              <>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                  €{avgPrice}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                  <span style={{ textDecoration: 'line-through' }}>€{phone.msrp_eur}</span>
                  {retention && (
                    <span style={{ marginLeft: 6, color: 'var(--green)' }}>
                      -{100 - retention}%
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 14, color: 'var(--text-dim)', fontStyle: 'italic' }}>
                In attesa dati...
              </div>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
              {listings > 0 ? `${listings} annunci` : 'Nessun annuncio'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
