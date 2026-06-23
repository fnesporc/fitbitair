# Fitbit Air

App personale per visualizzare i dati del mio Fitbit Air, ospitata su Vercel.

I dati arrivano dalla **Google Health API** (la nuova API di Google che ha
sostituito la Fitbit Web API; quest'ultima viene spenta a settembre 2026).

## Come funziona

- **Next.js** (App Router) con funzioni serverless in `app/api/`.
- **Google OAuth 2.0** verso la Google Health API. Il `CLIENT_SECRET` resta solo lato server.
- I token vengono salvati in **cookie httpOnly**; l'access token scaduto si
  rinnova da solo grazie al refresh token.

> ⚠️ Gli scope della Health API sono "Restricted". Per uso personale si tiene
> l'app in **modalità test** aggiungendo se stessi come *test user*: funziona
> senza revisione Google, ma il refresh token scade ogni ~7 giorni (serve
> rifare il login circa una volta a settimana).

## Setup passo-passo

### 1. Crea il progetto su Google Cloud Console
1. Vai su https://console.cloud.google.com → crea un progetto.
2. **APIs & Services → Library** → cerca **Google Health API** → **Enable**.
3. **APIs & Services → OAuth consent screen**: tipo **External**, compila i
   campi base, e in **Test users** aggiungi il tuo indirizzo Google.
4. **Data Access / Scopes**: aggiungi gli scope della Google Health API che ti
   servono (activity, heart_rate, sleep, …). Copia le stringhe esatte in
   `SCOPES` dentro `lib/google-health.js`.
5. **Credentials → Create Credentials → OAuth client ID** → tipo **Web application**:
   - **Authorized redirect URIs:** `https://TUA-APP.vercel.app/api/auth/callback`
     (provvisoriamente puoi usare `http://localhost:3000/api/auth/callback`)
6. Copia **Client ID** e **Client Secret**.

### 2. Metti il codice su GitHub
Il repo è già `fnesporc/fitbitair`. Fai commit e push.

### 3. Deploy su Vercel
1. https://vercel.com → **Add New → Project** → importa `fitbitair`.
2. In **Environment Variables** aggiungi:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `APP_URL` = l'URL Vercel (es. `https://fitbitair.vercel.app`)
3. **Deploy**.

### 4. Aggiorna il redirect URI
Torna su Google Cloud Console e metti il redirect URI definitivo con il dominio Vercel.

### 5. Usa l'app
Apri l'URL → **Collega** → login Google → autorizza → vedi i dati.

## Sviluppo locale (opzionale)
Serve Node.js. Poi:
```
cp .env.example .env.local   # compila i valori
npm install
npm run dev                  # http://localhost:3000
```

## Dove modificare i dati mostrati
- Quali dati leggere: `app/api/data/route.js`
- Come mostrarli: `app/dashboard.js`
- Permessi richiesti (scope): `SCOPES` in `lib/google-health.js`
