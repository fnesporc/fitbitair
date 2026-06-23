import { cookies } from "next/headers";

// Scope = quali dati chiediamo. Aggiungine/togline a piacere.
export const SCOPES = ["activity", "heartrate", "sleep", "profile", "weight"];

const AUTH_URL = "https://www.fitbit.com/oauth2/authorize";
const TOKEN_URL = "https://api.fitbit.com/oauth2/token";
const API_BASE = "https://api.fitbit.com";

function redirectUri() {
  return `${process.env.APP_URL}/api/auth/callback`;
}

// URL a cui mandare l'utente per autorizzare l'app.
export function buildAuthorizeUrl() {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.FITBIT_CLIENT_ID,
    redirect_uri: redirectUri(),
    scope: SCOPES.join(" "),
  });
  return `${AUTH_URL}?${params.toString()}`;
}

// Header Basic con client_id:client_secret in base64 (client "confidenziale").
function basicAuthHeader() {
  const creds = `${process.env.FITBIT_CLIENT_ID}:${process.env.FITBIT_CLIENT_SECRET}`;
  return `Basic ${Buffer.from(creds).toString("base64")}`;
}

// Scambia il "code" ricevuto dal callback con i token.
export async function exchangeCodeForTokens(code) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
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
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`);
  return res.json();
}

// Salva i token nei cookie (httpOnly = non leggibili da JS, più sicuri).
export function saveTokens(tokens) {
  const store = cookies();
  const opts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 anno
  };
  store.set("fb_access", tokens.access_token, opts);
  store.set("fb_refresh", tokens.refresh_token, opts);
}

export function clearTokens() {
  const store = cookies();
  store.delete("fb_access");
  store.delete("fb_refresh");
}

export function isLoggedIn() {
  return Boolean(cookies().get("fb_refresh"));
}

// Chiamata autenticata all'API. Se l'access token è scaduto (401),
// fa il refresh automatico e riprova una volta sola.
export async function fitbitFetch(path) {
  const store = cookies();
  let access = store.get("fb_access")?.value;
  const refresh = store.get("fb_refresh")?.value;
  if (!refresh) throw new Error("Not logged in");

  async function call(token) {
    return fetch(`${API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
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
  if (!res.ok) throw new Error(`Fitbit API ${path} -> ${res.status}`);
  return res.json();
}
