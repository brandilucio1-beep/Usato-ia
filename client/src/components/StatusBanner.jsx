import { useState, useEffect } from 'react';
import { Zap, RefreshCw } from 'lucide-react';
import { api } from '../utils/api';

export default function StatusBanner() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    api.getStatus().then(setStatus).catch(() => {});
    const timer = setInterval(() => {
      api.getStatus().then(setStatus).catch(() => {});
    }, 60000); // refresh every minute
    return () => clearInterval(timer);
  }, []);

  if (!status) return null;

  const lastScrape = status.last_scrape ? new Date(status.last_scrape) : null;
  const minutesAgo = lastScrape ? Math.round((Date.now() - lastScrape.getTime()) / 60000) : null;
  const isRecent = minutesAgo !== null && minutesAgo < status.scrape_interval_hours * 60;

  return (
    <div style={{
      background: isRecent ? 'var(--green-dim)' : 'var(--amber-dim)',
      padding: '6px 20px',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      fontSize: 12, color: isRecent ? 'var(--green)' : 'var(--amber)',
      fontFamily: 'var(--font-mono)',
    }}>
      <Zap size={12} />
      {lastScrape ? (
        <span>
          Ultimo aggiornamento: {minutesAgo < 60 ? `${minutesAgo} min fa` : `${Math.round(minutesAgo / 60)}h fa`}
          {' · '}{status.phones_tracked} modelli monitorati
          {' · '}Prossimo aggiornamento tra {Math.max(0, status.scrape_interval_hours * 60 - minutesAgo)} min
        </span>
      ) : (
        <span>
          <RefreshCw size={11} style={{ animation: 'pulse 1s infinite' }} /> 
          {' '}Prima raccolta dati in corso... I dati appariranno a breve.
        </span>
      )}
    </div>
  );
}
