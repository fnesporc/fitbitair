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

function Stat({ value, label }) {
  if (value == null) return null;
  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 11, opacity: 0.55 }}>{label}</div>
    </div>
  );
}

function Activity({ a }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.06)",
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 24 }}>{a.icon}</span>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{a.type}</div>
          <div style={{ fontSize: 12, opacity: 0.55 }}>{fmtDate(a.start)}</div>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          gap: 18,
          marginTop: 12,
          flexWrap: "wrap",
        }}
      >
        <Stat value={a.durationMin ? `${a.durationMin} min` : null} label="Durata" />
        <Stat value={a.calories ? `${a.calories}` : null} label="kcal" />
        <Stat value={a.steps ? a.steps.toLocaleString("it-IT") : null} label="Passi" />
        <Stat value={a.distanceKm ? `${a.distanceKm} km` : null} label="Distanza" />
        <Stat value={a.avgHr ? `${a.avgHr}` : null} label="bpm medi" />
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
      .then((d) => (d.error ? setError(d.error) : setData(d)))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <p style={{ color: "#f87171" }}>Errore: {error}</p>;
  if (!data) return <p style={{ opacity: 0.6 }}>Carico i dati…</p>;

  return (
    <div style={{ marginTop: 20 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <span style={{ fontSize: 13, opacity: 0.6 }}>
          {data.activities.length} attività
        </span>
        <button
          onClick={load}
          disabled={loading}
          style={{
            background: "#22d3ee",
            color: "#0f172a",
            border: "none",
            borderRadius: 10,
            padding: "8px 14px",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          {loading ? "…" : "↻ Aggiorna"}
        </button>
      </div>

      {data.activities.map((a, i) => (
        <Activity key={i} a={a} />
      ))}

      <a
        href="/api/auth/logout"
        style={{
          display: "inline-block",
          marginTop: 12,
          fontSize: 13,
          opacity: 0.5,
          color: "#e2e8f0",
        }}
      >
        Scollega
      </a>
    </div>
  );
}
