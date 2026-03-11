import { useState, useEffect } from 'react';
import { MapPin } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../utils/api';
import { Card, Badge, PageHeader, Skeleton, EmptyState } from '../components/UI';

export default function RegionsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getRegions()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 20px' }}>
      <Skeleton height={30} width={250} style={{ marginBottom: 24 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
        {[1, 2, 3].map(i => <Skeleton key={i} height={100} />)}
      </div>
      <Skeleton height={400} />
    </div>
  );

  const regions = data?.regions || [];

  if (regions.length === 0) {
    return (
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 20px' }}>
        <PageHeader title="Mappa regionale" subtitle="Distribuzione annunci e prezzi per regione" />
        <EmptyState icon={MapPin} title="Dati regionali in fase di raccolta" description="I dati per regione appariranno dopo il primo ciclo di scraping" />
      </div>
    );
  }

  const chartData = regions.slice(0, 15).map(r => ({
    name: r.region, annunci: r.total_listings, prezzo: r.avg_price,
  }));

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 20px' }}>
      <PageHeader title="Mappa regionale" subtitle="Distribuzione annunci e prezzi per regione italiana" />

      {/* Top 3 */}
      <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        {regions.slice(0, 3).map((r, i) => (
          <Card key={i} style={{ textAlign: 'center', borderColor: i === 0 ? 'var(--border-accent)' : 'var(--border)' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: ['var(--accent)', 'var(--blue)', 'var(--green)'][i], fontFamily: 'var(--font-mono)' }}>
              #{i + 1}
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, marginTop: 4 }}>{r.region}</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>
              {r.total_listings} annunci · €{r.avg_price} media
            </div>
          </Card>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Bar chart */}
        <Card className="fade-in" style={{ gridColumn: '1 / -1' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Volume annunci per regione</h3>
          <ResponsiveContainer width="100%" height={Math.max(350, chartData.length * 28)}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 120 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" stroke="var(--text-dim)" fontSize={11} />
              <YAxis type="category" dataKey="name" stroke="var(--text-dim)" fontSize={11} width={115} />
              <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="annunci" fill="var(--accent)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Price ranking */}
        <Card className="fade-in">
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Classifica prezzi medi</h3>
          {[...regions].sort((a, b) => b.avg_price - a.avg_price).map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 12 }}>{r.region}</span>
              <span style={{ fontSize: 12, color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>€{r.avg_price}</span>
            </div>
          ))}
        </Card>

        {/* Insights */}
        <Card className="fade-in" style={{ animationDelay: '0.1s' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Insight regionali</h3>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
            {regions[0] && (
              <p><strong style={{ color: 'var(--accent)' }}>{regions[0].region}</strong> domina il mercato con {regions[0].total_listings} annunci attivi.</p>
            )}
            {regions.length > 2 && (
              <p style={{ marginTop: 8 }}>
                <strong style={{ color: 'var(--text)' }}>{regions[1].region}</strong> e <strong style={{ color: 'var(--text)' }}>{regions[2].region}</strong> completano il podio per volume di scambi.
              </p>
            )}
            <p style={{ marginTop: 8 }}>
              I dati si aggiornano automaticamente ogni 6 ore con nuovi annunci da tutte le piattaforme monitorate.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
