import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, BarChart3, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { Card, Badge, PageHeader, Skeleton } from '../components/UI';

export default function TrendsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.getTrends()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 20px' }}>
      <Skeleton height={30} width={200} style={{ marginBottom: 24 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {[1, 2, 3, 4].map(i => <Skeleton key={i} height={300} />)}
      </div>
    </div>
  );

  const TrendList = ({ items, type }) => (
    items.map((p, i) => (
      <div key={i} style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '8px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer',
      }}
        onClick={() => navigate(`/phone/${p.id}`)}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-hover)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <div>
          <span style={{ fontSize: 13, fontWeight: 500 }}>{p.full_name}</span>
          <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 8 }}>
            €{Math.round(p.current_price || p.avg_price || 0)}
          </span>
        </div>
        {type === 'trend' && (
          <Badge color={p.price_change_pct > 0 ? 'var(--green)' : 'var(--red)'}>
            {p.price_change_pct > 0 ? '+' : ''}{p.price_change_pct}%
          </Badge>
        )}
        {type === 'popular' && (
          <span style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
            {p.active_listings} annunci
          </span>
        )}
        {type === 'value' && (
          <Badge color="var(--accent)">{p.value_retention}%</Badge>
        )}
      </div>
    ))
  );

  const noData = !data || (
    (!data.gainers || data.gainers.length === 0) &&
    (!data.most_popular || data.most_popular.length === 0)
  );

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 20px' }}>
      <PageHeader title="Trend di mercato" subtitle="Analisi trend sul mercato italiano dell'usato" />

      {noData ? (
        <Card style={{ textAlign: 'center', padding: 60 }}>
          <BarChart3 size={44} color="var(--text-dim)" strokeWidth={1.5} />
          <p style={{ marginTop: 14, fontSize: 15, color: 'var(--text-secondary)' }}>Dati in fase di raccolta</p>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 6 }}>I trend appariranno dopo almeno due cicli di scraping (12 ore)</p>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {data.gainers?.length > 0 && (
            <Card className="fade-in">
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--green)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <TrendingUp size={16} /> Prezzi in salita
              </h3>
              <TrendList items={data.gainers} type="trend" />
            </Card>
          )}

          {data.losers?.length > 0 && (
            <Card className="fade-in" style={{ animationDelay: '0.1s' }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--red)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <TrendingDown size={16} /> Prezzi in discesa
              </h3>
              <TrendList items={data.losers} type="trend" />
            </Card>
          )}

          {data.most_popular?.length > 0 && (
            <Card className="fade-in" style={{ animationDelay: '0.15s' }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--blue)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <BarChart3 size={16} /> Più ricercati
              </h3>
              <TrendList items={data.most_popular} type="popular" />
            </Card>
          )}

          {data.best_value?.length > 0 && (
            <Card className="fade-in" style={{ animationDelay: '0.2s' }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Award size={16} /> Miglior mantenimento valore
              </h3>
              <TrendList items={data.best_value} type="value" />
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
