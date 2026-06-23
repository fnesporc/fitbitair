import { cookies } from "next/headers";

// SCOPE = quali dati chiediamo. ⚠️ Gli scope esatti della Google Health API
// si trovano nella Google Cloud Console → "Data Access" (cerca "Google Health API").
// Incolla qui le stringhe esatte che vedi lì. Questi sono indicativi:
export const SCOPES = [
  "https://www.googleapis.com/auth/health.activity.read",
  "https://www.googleapis.com/auth/health.heart_rate.read",
  "https://www.googleapis.com/auth/health.sleep.read",
];

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API_BASE = "https://health.googleapis.com/v4";

function redirectUri() {
  return `${process.env.APP_URL}/api/auth/callback`;
}

// URL a cui mandare l'utente per autorizzare l'app.
// access_type=offline + prompt=consent servono per ricevere un refresh_token.
export function buildAuthorizeUrl() {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri(),
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
  });
  return `${AUTH_URL}?${params.toString()}`;
}

// Scambia il "code" ricevuto dal callback con i token (Google usa i parametri
// nel body, non l'header Basic).
export async function exchangeCodeForTokens(code) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri(),
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${await res.text()}`);
  return res.json();
}

// Usa il refresh_token per ottenere un nuovo access_token quando scade.
async function refreshTokens(refreshToken) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`);
  return res.json();
}

// Salva i token nei cookie (httpOnly = non leggibili da JS, più sicuri).
// Nota: Google a volte NON rimanda il refresh_token al refresh, quindi
// lo riscriviamo solo se presente.
export function saveTokens(tokens) {
  const store = cookies();
  const opts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  };
  if (tokens.access_token) store.set("gh_access", tokens.access_token, opts);
  if (tokens.refresh_token) store.set("gh_refresh", tokens.refresh_token, opts);
}

export function clearTokens() {
  const store = cookies();
  store.delete("gh_access");
  store.delete("gh_refresh");
}

export function isLoggedIn() {
  return Boolean(cookies().get("gh_refresh"));
}

// Chiamata autenticata all'API. Se l'access token è scaduto (401),
// fa il refresh automatico e riprova una volta sola.
export async function healthFetch(path) {
  const store = cookies();
  let access = store.get("gh_access")?.value;
  const refresh = store.get("gh_refresh")?.value;
  if (!refresh) throw new Error("Not logged in");

  async function call(token) {
    return fetch(`${API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
    });
  }

  let res = await call(access);
  if (res.status === 401) {
    const fresh = await refreshTokens(refresh);
    saveTokens(fresh);
    access = fresh.access_token;
    res = await call(access);
  }
  if (!res.ok) throw new Error(`Health API ${path} -> ${res.status}`);
  return res.json();
}
