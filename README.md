# Fitbit Air

App personale per visualizzare i dati del mio Fitbit, ospitata su Vercel.

## Come funziona

- **Next.js** (App Router) con funzioni serverless in `app/api/`.
- **OAuth 2.0** verso l'API di Fitbit. Il `CLIENT_SECRET` resta solo lato server.
- I token vengono salvati in **cookie httpOnly**; l'access token scaduto si
  rinnova da solo grazie al refresh token.

## Setup passo-passo

### 1. Registra l'app su Fitbit
1. Vai su https://dev.fitbit.com → **Register an App**.
2. Compila i campi (URL a piacere). Importante:
   - **OAuth 2.0 Application Type:** `Server`
   - **Callback URL:** `https://TUA-APP.vercel.app/api/auth/callback`
     (per ora puoi mettere `http://localhost:3000/api/auth/callback`; lo
     aggiorni dopo il deploy)
3. Salva e copia **Client ID** e **Client Secret**.

### 2. Metti il codice su GitHub
Il repo è già `fnesporc/fitbitair`. Fai commit e push.

### 3. Deploy su Vercel
1. https://vercel.com → **Add New → Project** → importa `fitbitair`.
2. In **Environment Variables** aggiungi:
   - `FITBIT_CLIENT_ID`
   - `FITBIT_CLIENT_SECRET`
   - `APP_URL` = l'URL Vercel (es. `https://fitbitair.vercel.app`)
3. **Deploy**.

### 4. Aggiorna il Callback URL
Torna su dev.fitbit.com e metti il Callback URL definitivo con il dominio Vercel.

### 5. Usa l'app
Apri l'URL → **Collega il mio Fitbit** → autorizza → vedi i dati.

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
- Permessi richiesti (scope): `SCOPES` in `lib/fitbit.js`
