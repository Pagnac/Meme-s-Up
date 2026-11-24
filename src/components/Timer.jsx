import { useEffect, useState } from 'react';

export default function Timer({ endsAt, duration = 40 }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);
  const total = duration * 1000;
  const remaining = Math.max(0, endsAt - now);
  const seconds = Math.ceil(remaining / 1000);
  const pct = total > 0 ? remaining / total : 0;
  const urgent = seconds <= 10 && remaining > 0;
  const color = urgent ? '#f43f5e' : '#22d3ee';
  return (
    <div
      className={`timer${urgent ? ' urgent' : ''}`}
      style={{ background: `conic-gradient(${color} ${pct * 360}deg, rgba(255,255,255,.12) 0deg)` }}
      role="timer"
      aria-label={`${seconds} secondes restantes`}
    >
      <div className="timer-inner">
        <span className="timer-num">{seconds}</span>
        <span className="timer-label">sec</span>
      </div>
    </div>
  );
}
