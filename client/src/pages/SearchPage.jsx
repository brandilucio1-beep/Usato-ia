import { useState, useEffect, useCallback } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { api } from '../utils/api';
import { useDebounce } from '../hooks/useAsync';
import PhoneCard from '../components/PhoneCard';
import { Button, Skeleton, EmptyState } from '../components/UI';

const BRANDS = ['Tutti', 'Apple', 'Samsung', 'Xiaomi', 'Google', 'OnePlus', 'Huawei', 'OPPO', 'Honor', 'Nothing', 'Motorola', 'Sony'];

export default function SearchPage() {
  const [phones, setPhones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [brand, setBrand] = useState('Tutti');
  const [sort, setSort] = useState('popularity');
  const [maxPrice, setMaxPrice] = useState(2000);
  const [showFilters, setShowFilters] = useState(false);
  const [favorites, setFavorites] = useState(new Set());
  const [total, setTotal] = useState(0);

  const debouncedSearch = useDebounce(search, 400);

  // Load favorites
  useEffect(() => {
    api.getFavorites().then(res => {
      setFavorites(new Set(res.favorites.map(f => f.id)));
    }).catch(() => {});
  }, []);

  // Load phones
  useEffect(() => {
    setLoading(true);
    const params = {};
    if (debouncedSearch) params.search = debouncedSearch;
    if (brand !== 'Tutti') params.brand = brand;
    if (sort !== 'popularity') params.sort = sort === 'price-asc' ? 'price_asc' : sort === 'price-desc' ? 'price_desc' : sort;
    if (maxPrice < 2000) params.maxPrice = maxPrice;
    params.limit = 100;

    api.getPhones(params)
      .then(res => {
        setPhones(res.phones);
        setTotal(res.total);
        setError(null);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [debouncedSearch, brand, sort, maxPrice]);

  const toggleFavorite = useCallback(async (phoneId) => {
    const isFav = favorites.has(phoneId);
    try {
      if (isFav) {
        await api.removeFavorite(phoneId);
        setFavorites(prev => { const s = new Set(prev); s.delete(phoneId); return s; });
      } else {
        await api.addFavorite(phoneId);
        setFavorites(prev => new Set(prev).add(phoneId));
      }
    } catch {}
  }, [favorites]);

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 20px' }}>
      {/* Hero */}
      <div className="fade-in" style={{ textAlign: 'center', marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
          Analisi Prezzi Smartphone Usati
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>
          Dati reali da Subito.it, Facebook Marketplace, Kijiji e Wallapop
        </p>

        {/* Search bar */}
        <div style={{ display: 'flex', gap: 8, maxWidth: 620, margin: '0 auto' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={18} color="var(--text-dim)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cerca smartphone... (es. iPhone 14, Galaxy S23)"
              style={{
                width: '100%', padding: '12px 14px 12px 42px',
                borderRadius: 10, border: '1px solid var(--border)',
                background: 'var(--surface)', color: 'var(--text)',
                fontSize: 14, outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer',
              }}>
                <X size={16} />
              </button>
            )}
          </div>
          <Button variant="ghost" onClick={() => setShowFilters(!showFilters)}>
            <SlidersHorizontal size={16} /> Filtri
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="fade-in" style={{
          maxWidth: 620, margin: '0 auto 24px',
          display: 'flex', flexWrap: 'wrap', gap: 12, padding: 16,
          background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
        }}>
          <div style={{ flex: 1, minWidth: 150 }}>
            <label style={{ fontSize: 11, color: 'var(--text-dim)', display: 'block', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>ORDINA PER</label>
            <select value={sort} onChange={e => setSort(e.target.value)} style={{
              width: '100%', padding: '8px 10px', borderRadius: 6,
              border: '1px solid var(--border)', background: 'var(--card)',
              color: 'var(--text)', fontSize: 13,
            }}>
              <option value="popularity">Popolarità</option>
              <option value="price-asc">Prezzo ↑</option>
              <option value="price-desc">Prezzo ↓</option>
              <option value="name">Nome</option>
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 150 }}>
            <label style={{ fontSize: 11, color: 'var(--text-dim)', display: 'block', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>
              PREZZO MAX: €{maxPrice}
            </label>
            <input type="range" min={50} max={2000} step={50} value={maxPrice}
              onChange={e => setMaxPrice(+e.target.value)}
              style={{ width: '100%', accentColor: 'var(--accent)' }}
            />
          </div>
        </div>
      )}

      {/* Brand pills */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20, justifyContent: 'center' }}>
        {BRANDS.map(b => (
          <button key={b} onClick={() => setBrand(b)} style={{
            padding: '5px 14px', borderRadius: 20,
            border: `1px solid ${brand === b ? 'var(--accent)' : 'var(--border)'}`,
            background: brand === b ? 'var(--accent-glow)' : 'transparent',
            color: brand === b ? 'var(--accent-bright)' : 'var(--text-dim)',
            cursor: 'pointer', fontSize: 12, fontWeight: 500,
            transition: 'all 0.2s',
          }}>
            {b}
          </button>
        ))}
      </div>

      {/* Results count */}
      <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--text-dim)' }}>
        {loading ? 'Caricamento...' : `${total} smartphone trovati`}
      </div>

      {/* Error */}
      {error && (
        <div className="fade-in" style={{
          padding: 16, borderRadius: 'var(--radius)', marginBottom: 16,
          background: 'var(--red-dim)', color: 'var(--red)', fontSize: 13,
        }}>
          Errore: {error}. Verifica che il server sia in esecuzione.
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} height={140} style={{ borderRadius: 'var(--radius-lg)' }} />
          ))}
        </div>
      )}

      {/* Phone grid */}
      {!loading && phones.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {phones.map((phone, i) => (
            <PhoneCard
              key={phone.id}
              phone={phone}
              index={i}
              isFavorite={favorites.has(phone.id)}
              onToggleFavorite={toggleFavorite}
            />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && phones.length === 0 && !error && (
        <EmptyState
          icon={Search}
          title="Nessun risultato trovato"
          description="Prova a modificare la ricerca o i filtri"
        />
      )}
    </div>
  );
}
