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

function Delta({ value, invert }) {
  if (value == null) return <div className="delta flat">—</div>;
  const positive = invert ? value < 0 : value > 0;
  const cls = value === 0 ? "flat" : positive ? "up" : "down";
  const arrow = value === 0 ? "→" : value > 0 ? "↑" : "↓";
  return (
    <div className={`delta ${cls}`}>
      {arrow} {Math.abs(value)}%
    </div>
  );
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

function WeekBars({ days }) {
  const max = Math.max(1, ...days.map((d) => d.minutes));
  return (
    <div className="week">
      {days.map((d, i) => {
        const h = d.minutes ? Math.max(8, (d.minutes / max) * 100) : 0;
        return (
          <div className="day" key={i}>
            <div
              className={`bar ${d.minutes ? "" : "empty"}`}
              style={{ height: `${d.minutes ? h : 6}%` }}
              title={`${d.minutes} min`}
            />
            <div className="day-label">{d.label}</div>
          </div>
        );
      })}
    </div>
  );
}

function Activity({ a }) {
  return (
    <div className="act">
      <div className="act-icon">{a.icon}</div>
      <div className="act-body">
        <div className="act-top">
          <span className="act-name">{a.type}</span>
          <span className="act-date">{fmtDate(a.start)}</span>
        </div>
        <div className="act-stats">
          {a.durationMin ? (
            <span className="act-stat">
              <b>{a.durationMin}</b> min
            </span>
          ) : null}
          {a.calories ? (
            <span className="act-stat">
              <b>{a.calories}</b> kcal
            </span>
          ) : null}
          {a.steps ? (
            <span className="act-stat">
              <b>{a.steps.toLocaleString("it-IT")}</b> passi
            </span>
          ) : null}
          {a.distanceKm ? (
            <span className="act-stat">
              <b>{a.distanceKm}</b> km
            </span>
          ) : null}
          {a.avgHr ? (
            <span className="act-stat">
              <b>{a.avgHr}</b> bpm
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
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

  useEffect(() => {
    load();
  }, [load]);

  if (error)
    return (
      <div className="card" style={{ color: "var(--down)" }}>
        Errore: {error}
        <div style={{ marginTop: 12 }}>
          <button className="btn btn-ghost" onClick={load}>
            Riprova
          </button>
        </div>
      </div>
    );
  if (!data) return <p style={{ color: "var(--muted)" }}>Carico i dati…</p>;

  const { week, deltas, days, balance } = data;
  const cardioPct =
    week.minutes > 0 ? Math.round((balance.cardioMin / week.minutes) * 100) : 0;

  return (
    <div>
      {/* Hero insight */}
      <div className="hero">
        <div className="hero-eyebrow">Insight della settimana</div>
        <p
          className="hero-headline"
          dangerouslySetInnerHTML={{ __html: data.headline }}
        />
      </div>

      {/* KPI */}
      <div className="kpis">
        <Kpi val={week.minutes} unit="min" label="Attivi (7gg)" delta={deltas.minutes} />
        <Kpi val={week.calories} unit="kcal" label="Bruciate" delta={deltas.calories} />
        <Kpi val={week.distanceKm} unit="km" label="Percorsi" delta={deltas.distanceKm} />
      </div>

      {/* Bilancio cardio/forza */}
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

      {/* Settimana */}
      <div className="section-label">Ultimi 7 giorni</div>
      <div className="card">
        <WeekBars days={days} />
      </div>

      {/* Feed */}
      <div className="section-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Attività</span>
        <button className="btn" onClick={load} disabled={loading}>
          {loading ? "…" : "↻ Aggiorna"}
        </button>
      </div>
      {data.activities.map((a, i) => (
        <Activity key={i} a={a} />
      ))}

      <a href="/api/auth/logout" className="link-muted">
        Scollega
      </a>
    </div>
  );
}
