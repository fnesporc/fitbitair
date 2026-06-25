import { isLoggedIn } from "../lib/google-health";
import Dashboard from "./dashboard";

export const dynamic = "force-dynamic";

export default function Home() {
  const logged = isLoggedIn();

  return (
    <main className="wrap">
      <div className="app-head">
        <div>
          <h1 className="app-title">Pulse</h1>
          <div className="app-sub">i tuoi dati, resi utili</div>
        </div>
      </div>

      {logged ? (
        <Dashboard />
      ) : (
        <div>
          <div className="hero">
            <div className="hero-eyebrow">Benvenuto</div>
            <p className="hero-headline">
              Trasforma i dati del tuo <b>Fitbit Air</b> in insight chiari per
              ogni giorno.
            </p>
          </div>
          <a href="/api/auth/login" className="cta">
            Collega il mio Fitbit →
          </a>
        </div>
      )}
    </main>
  );
}
