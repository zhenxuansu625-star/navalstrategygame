import type { ReactNode } from 'react';

/** Bevelled metal panel with an optional brass title strip. */
export function Frame({
  title,
  actions,
  className = '',
  children,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`frame ${className}`}>
      {(title || actions) && (
        <header className="frame-title">
          <span>{title}</span>
          {actions && <span className="frame-actions">{actions}</span>}
        </header>
      )}
      <div className="frame-body">{children}</div>
    </section>
  );
}

export function Bar({ value, kind, title }: { value: number; kind: 'hp' | 'org'; title?: string }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className={`bar ${kind}`} title={title}>
      <div className="bar-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}
