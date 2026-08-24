import { useEffect, useState } from 'react';

export function NowLine() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <div
      className="chronicle-now-line"
      aria-label={`Current time ${now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`}
    >
      <span className="chronicle-now-rule" />
      <strong>
        <span className="chronicle-now-dot" aria-hidden="true" />
        Now · {now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
      </strong>
      <span className="chronicle-now-rule" />
    </div>
  );
}
