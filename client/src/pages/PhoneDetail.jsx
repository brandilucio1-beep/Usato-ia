import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Heart, ArrowLeft, TrendingUp, TrendingDown, Sparkles, RefreshCw, ExternalLink } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../utils/api';
import { Card, Badge, Button, Skeleton } from '../components/UI';

export default function PhoneDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [phone, setPhone] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.getPhone(id)
      .then(data => { setPhone(data); setLoading(false); })
      .catch(() => setLoading(false));
    
    api.getFavorites().then(res => {
      setIsFavorite(res.favorites.some(f => f.id === parseInt(id)));
    }).catch(() => {});
  }, [id]);

  const toggleFavorite = async () => {
    try {
      if (isFavorite) { await api.removeFavorite(id); setIsFavorite(false); }
      else { await api.addFavorite(id); setIsFavorite(true); }
    } catch {}
  };

  const runAI = async () => {
    setAiLoading(true);
    try {
      const result = await api.analyzePhone(id);
      setAiAnalysis(result);
    } catch (err) {
      setAiAnalysis({ verdict: 'Analisi non disponibile.', tips: [] });
    }
    setAiLoading(false);
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 20px' }}>
        <Skeleton height={40} width={200} style={{ marginBottom: 16 }} />
        <Skeleton height={200} style={{ marginBottom: 16 }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} height={80} />)}
        </div>
      </div>
    );
  }

  if (!phone) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>Telefono non trovato</div>;

  const p = phone;
  const avgPrice = Math.round(p.avg_price || p.current_avg_price || 0);
  const trendData = (p.trend_data || []).map(t => ({
    ...t,
    date: new Date(t.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }),
  }));

  const regionalData = (p.regional_stats || []).map(r => ({
    name: r.region, listings: r.total_listings, avgPrice: Math.round(r.avg_price),
  }));

  const conditionData = Object.entries(p.prices_by_condition || {}).map(([k, v]) => ({
    name: k.replace('_', ' ').replace(/^\w/, c => c.toUpperCase()), price: v,
  }));

  const sourceData = Object.entries(p.listings_by_source || {}).map(([k, v]) => ({
    name: k.charAt(0).toUpperCase() + k.slice(1), count: v,
  }));

  const TABS = [
    { id: 'overview', label: 'Panoramica' },
    { id: 'regions', label: 'Regioni' },
    { id: 'listings', label: 'Annunci' },
    { id: 'ai', label: '✨ Analisi IA' },
  ];

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 20px' }}>
      <button onClick={() => navigate(-1)} className="fade-in" style={{
        background: 'none', border: 'none', color: 'var(--text-secondary)',
        cursor: 'pointer', fontSize: 13, marginBottom: 16,
        display: 'flex', alignItems: 'center', gap: 4,
      }}>
        <ArrowLeft size={16} /> Indietro
      </button>

      {/* Header */}
      <div className="fade-in" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <h1 style={{ fontSize: 26, fontWeight: 700 }}>{p.full_name}</h1>
            <button onClick={toggleFavorite} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <Heart size={22} fill={isFavorite ? 'var(--pink)' : 'none'} color={isFavorite ? 'var(--pink)' : 'var(--text-dim)'} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Badge color="var(--blue)">{p.brand}</Badge>
            <Badge>{p.year_released}</Badge>
            {p.demand_level && <Badge color={p.demand_level === 'Alto' ? 'var(--green)' : 'var(--amber)'}>Domanda {p.demand_level}</Badge>}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 34, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
            {avgPrice > 0 ? `€${avgPrice}` : '—'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            MSRP €{p.msrp_eur} {p.value_retention && `· Valore: ${p.value_retention}%`}
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 24 }}>
        {[
          { label: 'Prezzo min', value: p.min_price ? `€${Math.round(p.min_price)}` : '—', color: 'var(--green)' },
          { label: 'Prezzo max', value: p.max_price ? `€${Math.round(p.max_price)}` : '—', color: 'var(--red)' },
          { label: 'Annunci attivi', value: p.total_listings || 0, color: 'var(--blue)' },
          { label: 'Acquisto consigliato', value: p.suggested_buy ? `€${p.suggested_buy}` : '—', color: 'var(--green)' },
          { label: 'Vendita consigliata', value: p.suggested_sell ? `€${p.suggested_sell}` : '—', color: 'var(--amber)' },
          { label: 'Deprezzamento/anno', value: p.depreciation_yearly ? `${p.depreciation_yearly}%` : '—', color: 'var(--red)' },
        ].map((s, i) => (
          <Card key={i} style={{ padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4, fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>{s.label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: s.color, fontFamily: 'var(--font-mono)' }}>{s.value}</div>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 2 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); if (t.id === 'ai' && !aiAnalysis && !aiLoading) runAI(); }} style={{
            padding: '8px 16px', border: 'none',
            borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
            background: 'transparent', color: tab === t.id ? 'var(--accent-bright)' : 'var(--text-dim)',
            cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Tab content */}
      <div className="fade-in" key={tab}>
        {tab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Price trend chart */}
            {trendData.length > 0 && (
              <Card style={{ gridColumn: '1 / -1' }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Andamento prezzo</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" stroke="var(--text-dim)" fontSize={11} />
                    <YAxis stroke="var(--text-dim)" fontSize={11} tickFormatter={v => `€${v}`} />
                    <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                      formatter={(v) => [`€${Math.round(v)}`, 'Prezzo medio']} />
                    <Line type="monotone" dataKey="avg_price" stroke="var(--accent)" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            )}

            {/* Sources */}
            {sourceData.length > 0 && (
              <Card>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Fonti annunci</h3>
                {sourceData.map((s, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid var(--border)` }}>
                    <span style={{ fontSize: 13 }}>{s.name}</span>
                    <Badge>{s.count} annunci</Badge>
                  </div>
                ))}
              </Card>
            )}

            {/* Conditions */}
            {conditionData.length > 0 && (
              <Card>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Prezzo per condizione</h3>
                {conditionData.map((c, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid var(--border)` }}>
                    <span style={{ fontSize: 13 }}>{c.name}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>€{c.price}</span>
                  </div>
                ))}
              </Card>
            )}

            {trendData.length === 0 && sourceData.length === 0 && (
              <Card style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40 }}>
                <p style={{ color: 'var(--text-dim)' }}>Dati in fase di raccolta. I grafici appariranno dopo il primo ciclo di scraping.</p>
              </Card>
            )}
          </div>
        )}

        {tab === 'regions' && (
          <div>
            {regionalData.length > 0 ? (
              <>
                <Card style={{ marginBottom: 16 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Annunci per regione</h3>
                  <ResponsiveContainer width="100%" height={Math.max(300, regionalData.length * 30)}>
                    <BarChart data={regionalData.slice(0, 15)} layout="vertical" margin={{ left: 100 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" stroke="var(--text-dim)" fontSize={11} />
                      <YAxis type="category" dataKey="name" stroke="var(--text-dim)" fontSize={11} width={95} />
                      <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="listings" fill="var(--accent)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>

                <Card>
                  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Prezzo medio per regione</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
                    {regionalData.map((r, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: 13 }}>{r.name}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>€{r.avgPrice}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </>
            ) : (
              <Card style={{ textAlign: 'center', padding: 40 }}>
                <p style={{ color: 'var(--text-dim)' }}>Dati regionali in fase di raccolta.</p>
              </Card>
            )}
          </div>
        )}

        {tab === 'listings' && (
          <div>
            {(p.recent_listings || []).length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {p.recent_listings.map((l, i) => (
                  <Card key={i} style={{ padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{l.title}</div>
                        <div style={{ display: 'flex', gap: 6, fontSize: 12, color: 'var(--text-dim)' }}>
                          <Badge color="var(--blue)">{l.source}</Badge>
                          {l.location_region && <span>{l.location_region}</span>}
                          {l.condition && <Badge>{l.condition.replace('_', ' ')}</Badge>}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>€{l.price}</div>
                        {l.url && (
                          <a href={l.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'flex-end' }}>
                            Vedi annuncio <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card style={{ textAlign: 'center', padding: 40 }}>
                <p style={{ color: 'var(--text-dim)' }}>Nessun annuncio ancora raccolto per questo modello.</p>
              </Card>
            )}
          </div>
        )}

        {tab === 'ai' && (
          <div>
            {aiLoading && (
              <Card className="glow" style={{ textAlign: 'center', padding: 40 }}>
                <Sparkles size={32} color="var(--accent)" style={{ animation: 'pulse 1.5s infinite' }} />
                <p style={{ color: 'var(--text-secondary)', marginTop: 12 }}>Analisi IA in corso...</p>
              </Card>
            )}
            {aiAnalysis && !aiLoading && (
              <div style={{ display: 'grid', gap: 16 }}>
                <Card className="glow">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <Sparkles size={18} color="var(--accent)" />
                    <h3 style={{ fontSize: 15, fontWeight: 700 }}>Verdetto IA</h3>
                    {aiAnalysis.priceOutlook && (
                      <Badge color={aiAnalysis.priceOutlook === 'up' ? 'var(--green)' : aiAnalysis.priceOutlook === 'stable' ? 'var(--amber)' : 'var(--red)'}>
                        {aiAnalysis.priceOutlook === 'up' ? '↑ In salita' : aiAnalysis.priceOutlook === 'stable' ? '→ Stabile' : '↓ In calo'}
                      </Badge>
                    )}
                    {aiAnalysis.riskLevel && (
                      <Badge color={aiAnalysis.riskLevel === 'basso' ? 'var(--green)' : aiAnalysis.riskLevel === 'medio' ? 'var(--amber)' : 'var(--red)'}>
                        Rischio {aiAnalysis.riskLevel}
                      </Badge>
                    )}
                  </div>
                  <p style={{ fontSize: 14, lineHeight: 1.6 }}>{aiAnalysis.verdict}</p>
                </Card>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {aiAnalysis.buyAdvice && (
                    <Card>
                      <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)', marginBottom: 8 }}>Consiglio Acquisto</h4>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{aiAnalysis.buyAdvice}</p>
                    </Card>
                  )}
                  {aiAnalysis.sellAdvice && (
                    <Card>
                      <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--amber)', marginBottom: 8 }}>Consiglio Vendita</h4>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{aiAnalysis.sellAdvice}</p>
                    </Card>
                  )}
                </div>

                {aiAnalysis.bestTime && (
                  <Card>
                    <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', marginBottom: 8 }}>Periodo migliore</h4>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{aiAnalysis.bestTime}</p>
                  </Card>
                )}

                {aiAnalysis.tips?.length > 0 && (
                  <Card>
                    <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Suggerimenti</h4>
                    {aiAnalysis.tips.map((tip, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 12, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>0{i + 1}</span>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{tip}</p>
                      </div>
                    ))}
                  </Card>
                )}

                <Button variant="ghost" onClick={runAI} style={{ justifyContent: 'center' }}>
                  <RefreshCw size={14} /> Rigenera analisi
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
