"use client";

import { useEffect, useState, useCallback } from "react";

function fmtDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("it-IT", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Delta({ value }) {
  if (value == null) return <div className="delta flat">—</div>;
  const cls = value === 0 ? "flat" : value > 0 ? "up" : "down";
  const arrow = value === 0 ? "→" : value > 0 ? "↑" : "↓";
  return <div className={`delta ${cls}`}>{arrow} {Math.abs(value)}%</div>;
}

function Kpi({ val, unit, label, delta }) {
  return (
    <div className="kpi">
      <div>
        <span className="kpi-val">{val}</span>{" "}
        {unit ? <span className="kpi-unit">{unit}</span> : null}
      </div>
      <div className="kpi-label">{label}</div>
      {delta !== undefined ? <Delta value={delta} /> : null}
    </div>
  );
}

function Ring({ pct }) {
  const r = 24;
  const c = 2 * Math.PI * r;
  const off = c - (pct / 100) * c;
  return (
    <div className="ring">
      <svg width="56" height="56">
        <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
        <circle cx="28" cy="28" r={r} fill="none" stroke="var(--accent)" strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} />
      </svg>
      <div className="ring-txt">{pct}%</div>
    </div>
  );
}

function WeekBars({ days }) {
  const max = Math.max(1, ...days.map((d) => d.minutes));
  return (
    <div className="week">
      {days.map((d, i) => {
        const h = d.minutes ? Math.max(8, (d.minutes / max) * 100) : 6;
        return (
          <div className="day" key={i}>
            <div className={`bar ${d.minutes ? "" : "empty"}`} style={{ height: `${h}%` }} title={`${d.minutes} min`} />
            <div className="day-label">{d.label}</div>
          </div>
        );
      })}
    </div>
  );
}

const ZONE_COLORS = { light: "#6ea8fe", moderate: "#38e0d0", vigorous: "#fbbf24", peak: "#fb7185" };

function Activity({ a }) {
  const [open, setOpen] = useState(false);
  const totalZone = a.zones ? a.zones.light + a.zones.moderate + a.zones.vigorous + a.zones.peak : 0;
  return (
    <div className="act" onClick={() => setOpen((o) => !o)}>
      <div className="act-icon">{a.icon}</div>
      <div className="act-body">
        <div className="act-top">
          <span className="act-name">{a.type} {a.hasGps ? "📍" : ""}</span>
          <span className="act-date">{fmtDate(a.start)}</span>
        </div>
        <div className="act-stats">
          {a.durationMin ? <span className="act-stat"><b>{a.durationMin}</b> min</span> : null}
          {a.calories ? <span className="act-stat"><b>{a.calories}</b> kcal</span> : null}
          {a.steps ? <span className="act-stat"><b>{a.steps.toLocaleString("it-IT")}</b> passi</span> : null}
          {a.distanceKm ? <span className="act-stat"><b>{a.distanceKm}</b> km</span> : null}
          {a.avgHr ? <span className="act-stat"><b>{a.avgHr}</b> bpm</span> : null}
        </div>

        {open && a.zones && totalZone > 0 ? (
          <div className="act-detail">
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 2 }}>Zone cardiache</div>
            <div className="zones">
              {Object.entries(a.zones).map(([k, v]) =>
                v > 0 ? <div key={k} style={{ flex: v, background: ZONE_COLORS[k] }} /> : null
              )}
            </div>
            <div className="zone-legend">
              {Object.entries(a.zones).map(([k, v]) =>
                v > 0 ? (
                  <span key={k}>
                    <span className="zone-dot" style={{ background: ZONE_COLORS[k] }} />
                    {k} {v}m
                  </span>
                ) : null
              )}
            </div>
            {a.azm ? <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>Active Zone Minutes: <b style={{ color: "var(--text)" }}>{a.azm}</b></div> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ThemeToggle() {
  const [light, setLight] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
    const isLight = saved ? saved === "light" : prefersLight;
    setLight(isLight);
    document.body.classList.toggle("light", isLight);
  }, []);
  const toggle = () => {
    const next = !light;
    setLight(next);
    document.body.classList.toggle("light", next);
    localStorage.setItem("theme", next ? "light" : "dark");
  };
  return <button className="theme-btn" onClick={toggle} aria-label="Cambia tema">{light ? "🌙" : "☀️"}</button>;
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/data")
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : (setData(d), setError(null))))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  if (error)
    return (
      <div className="card" style={{ color: "var(--down)" }}>
        Errore: {error}
        <div style={{ marginTop: 12 }}>
          <button className="btn btn-ghost" onClick={load}>Riprova</button>
        </div>
      </div>
    );
  if (!data) return <p style={{ color: "var(--muted)" }}>Carico i dati…</p>;

  const { week, deltas, days, balance, streak, goal, insights } = data;
  const cardioPct = week.minutes > 0 ? Math.round((balance.cardioMin / week.minutes) * 100) : 0;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
        <ThemeToggle />
      </div>

      {/* Hero */}
      <div className="hero">
        <div className="hero-eyebrow">Insight della settimana</div>
        <p className="hero-headline">{data.headline}</p>
      </div>

      {/* Serie + Obiettivo */}
      <div className="toprow">
        <div className="card streak-card">
          <span className="streak-flame">{streak >= 2 ? "🔥" : "✨"}</span>
          <div>
            <div className="streak-num">{streak}</div>
            <div className="streak-lbl">giorni di fila</div>
          </div>
        </div>
        <div className="card ring-wrap">
          <Ring pct={goal.pct} />
          <div>
            <div className="goal-lbl">Obiettivo 7gg</div>
            <div className="goal-val">{goal.value}/{goal.target} min</div>
          </div>
        </div>
      </div>

      {/* KPI */}
      <div className="kpis">
        <Kpi val={week.minutes} unit="min" label="Attivi (7gg)" delta={deltas.minutes} />
        <Kpi val={week.calories} unit="kcal" label="Bruciate" delta={deltas.calories} />
        <Kpi val={week.distanceKm} unit="km" label="Percorsi" delta={deltas.distanceKm} />
      </div>

      {/* Bilancio */}
      {week.minutes > 0 ? (
        <div className="card" style={{ marginBottom: 4 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>
            <span>Cardio {cardioPct}%</span>
            <span>Forza {100 - cardioPct}%</span>
          </div>
          <div style={{ height: 8, borderRadius: 6, overflow: "hidden", display: "flex", background: "rgba(255,255,255,0.08)" }}>
            <div style={{ width: `${cardioPct}%`, background: "var(--accent)" }} />
            <div style={{ width: `${100 - cardioPct}%`, background: "var(--accent-2)" }} />
          </div>
        </div>
      ) : null}

      {/* Insight list */}
      {insights && insights.length > 0 ? (
        <>
          <div className="section-label">Cosa ti dicono i dati</div>
          {insights.map((ins, i) => (
            <div className="insight" key={i}>
              <span className="insight-icon">{ins.icon}</span>
              <span className="insight-text">{ins.text}</span>
            </div>
          ))}
        </>
      ) : null}

      {/* Settimana */}
      <div className="section-label">Ultimi 7 giorni</div>
      <div className="card"><WeekBars days={days} /></div>

      {/* Feed */}
      <div className="section-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Attività · tocca per dettagli</span>
        <button className="btn" onClick={load} disabled={loading}>{loading ? "…" : "↻"}</button>
      </div>
      {data.activities.map((a, i) => <Activity key={i} a={a} />)}

      <a href="/api/auth/logout" className="link-muted">Scollega</a>
    </div>
  );
}
