"use client";

import { useEffect, useState } from "react";

function Card({ label, value, unit }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.06)",
        borderRadius: 16,
        padding: 18,
      }}
    >
      <div style={{ fontSize: 13, opacity: 0.6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4 }}>
        {value}
        {unit ? <span style={{ fontSize: 14, opacity: 0.6 }}> {unit}</span> : null}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/api/data")
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setData(d)))
      .catch((e) => setError(String(e)));
  }, []);

  if (error) return <p style={{ color: "#f87171" }}>Errore: {error}</p>;
  if (!data) return <p style={{ opacity: 0.6 }}>Carico i dati…</p>;

  return (
    <div style={{ marginTop: 20 }}>
      {data.name ? (
        <p style={{ opacity: 0.7 }}>Ciao {data.name} 👋</p>
      ) : null}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginTop: 8,
        }}
      >
        <Card label="Passi" value={data.steps.toLocaleString("it-IT")} />
        <Card label="Calorie" value={data.caloriesOut.toLocaleString("it-IT")} unit="kcal" />
        <Card label="Distanza" value={data.distanceKm} unit="km" />
        <Card label="Minuti attivi" value={data.activeMinutes} unit="min" />
      </div>

      <a
        href="/api/auth/logout"
        style={{
          display: "inline-block",
          marginTop: 24,
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
