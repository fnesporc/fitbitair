import { isLoggedIn } from "../lib/google-health";
import Dashboard from "./dashboard";

export const dynamic = "force-dynamic";

export default function Home() {
  const logged = isLoggedIn();

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "32px 20px" }}>
      <h1 style={{ fontSize: 28, marginBottom: 4 }}>Fitbit Air</h1>
      <p style={{ opacity: 0.6, marginTop: 0 }}>I miei dati di oggi</p>

      {logged ? (
        <Dashboard />
      ) : (
        <a
          href="/api/auth/login"
          style={{
            display: "inline-block",
            marginTop: 24,
            padding: "12px 20px",
            borderRadius: 12,
            background: "#22d3ee",
            color: "#0f172a",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Collega il mio Fitbit
        </a>
      )}
    </main>
  );
}
