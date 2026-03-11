export function Card({ children, style, onClick, className = '' }) {
  return (
    <div
      className={className}
      onClick={onClick}
      style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: 18,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        ...style,
      }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.background = 'var(--card-hover)'; e.currentTarget.style.borderColor = 'var(--border-accent)'; } }}
      onMouseLeave={e => { if (onClick) { e.currentTarget.style.background = 'var(--card)'; e.currentTarget.style.borderColor = 'var(--border)'; } }}
    >{children}</div>
  );
}

export function Badge({ children, color = 'var(--accent)', style }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '2px 8px',
      borderRadius: 6, fontSize: 11, fontWeight: 600,
      background: `color-mix(in srgb, ${color} 15%, transparent)`, color,
      fontFamily: 'var(--font-mono)', ...style,
    }}>{children}</span>
  );
}

export function Button({ children, onClick, variant = 'primary', style, disabled }) {
  const variants = {
    primary: { background: 'var(--accent)', color: '#fff' },
    ghost: { background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)' },
    secondary: { background: 'var(--surface-hover)', color: 'var(--text)' },
  };
  return (
    <button disabled={disabled} onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '8px 16px', borderRadius: 8, border: 'none',
      fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
      opacity: disabled ? 0.5 : 1,
      cursor: disabled ? 'not-allowed' : 'pointer',
      ...variants[variant], ...style,
    }}>{children}</button>
  );
}

export function Skeleton({ width = '100%', height = 20, style }) {
  return <div className="skeleton" style={{ width, height, ...style }} />;
}

export function EmptyState({ icon: Icon, title, description }) {
  return (
    <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-dim)' }}>
      {Icon && <Icon size={44} strokeWidth={1.5} />}
      <p style={{ marginTop: 14, fontSize: 16, fontWeight: 500, color: 'var(--text-secondary)' }}>{title}</p>
      {description && <p style={{ fontSize: 13, marginTop: 6 }}>{description}</p>}
    </div>
  );
}

export function PageHeader({ title, subtitle }) {
  return (
    <div className="fade-in" style={{ marginBottom: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-sans)' }}>{title}</h1>
      {subtitle && <p style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 4 }}>{subtitle}</p>}
    </div>
  );
}
