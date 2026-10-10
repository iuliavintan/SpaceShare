# SpaceShare

Aplicație universitară pentru gestionarea resurselor comune. Etapa 1 oferă fundația: server Express + TypeScript, frontend React + Vite + Tailwind CSS și verificarea conexiunii frontend–backend.

Autentificarea, modelele bazei de date, rezervările și dashboardurile vor fi implementate în etapele următoare. Prisma și SQLite sunt păstrate, dar serverul nu deschide încă baza de date. `/api/health` verifică doar funcționarea API-ului.

## Cerințe

- Windows, PowerShell și Node.js 24 LTS (proiect verificat cu Node 24.20.0 și npm 11.19.0).
- Două terminale PowerShell pentru rularea simultană a frontendului și backendului.
- La prima instalare este necesar acces la registry-ul npm.

Folosim `npm.cmd` și `npx.cmd` pentru a evita blocarea scripturilor `.ps1`. Nu este necesară modificarea politicii de execuție Windows.

## Instalare

Din PowerShell:

```powershell
Set-Location D:\an4\PW\SpaceShare\backend
npm.cmd ci
if (-not (Test-Path -LiteralPath .env)) {
    Copy-Item -LiteralPath .env.example -Destination .env
}

Set-Location D:\an4\PW\SpaceShare\frontend
npm.cmd ci
```

Comanda condiționată de mai sus păstrează fișierul `.env` dacă există deja. Backendul folosește implicit portul `3000`. `.env.example` oferă `PORT=3000` și o adresă SQLite demonstrativă. Nu publica fișierul `.env`.

Frontendul funcționează fără `.env`. Pentru un port backend diferit, copiază `frontend/.env.example` în `frontend/.env` și schimbă `API_PROXY_TARGET` astfel încât să corespundă portului backend. Repornește serverele după schimbări de configurație.

## Pornire în development

Terminalul 1 — backend:

```powershell
Set-Location D:\an4\PW\SpaceShare\backend
npm.cmd run dev
```

Terminalul 2 — frontend:

```powershell
Set-Location D:\an4\PW\SpaceShare\frontend
npm.cmd run dev
```

Deschide **http://127.0.0.1:5173**. Pagina verifică automat API-ul și oferă butonul „Verifică din nou”. `Ctrl+C` oprește fiecare server. Porturile frontend sunt fixe: dacă sunt ocupate, Vite raportează eroarea în loc să schimbe automat adresa.

Backend: **http://127.0.0.1:3000/api/health**. Vite trimite cererile `/api` către backend prin proxy. Browserul folosește aceeași origine cu frontendul, deci nu introducem o bibliotecă CORS în această etapă.

## Verificări

```powershell
Set-Location D:\an4\PW\SpaceShare\backend
npm.cmd run typecheck
npm.cmd run build
npm.cmd run prisma:validate

Set-Location D:\an4\PW\SpaceShare\frontend
npm.cmd run typecheck
npm.cmd run build
```

Cu serverele pornite, verifică API-ul direct și prin proxy:

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:3000/api/health
Invoke-RestMethod -Uri http://127.0.0.1:5173/api/health
```

Ambele trebuie să returneze `status: ok`, `service: spaceshare-api` și `timestamp` în format ISO UTC. Ora ultimei verificări din interfață este afișată pentru Europe/Bucharest. Dacă backendul este oprit, pagina afișează eroarea și permite repetarea verificării; cererea are timeout de 5 secunde.

## Rulare după build, tot local

După comenzile de build, în două terminale:

```powershell
# Terminalul 1
Set-Location D:\an4\PW\SpaceShare\backend
npm.cmd start
```

```powershell
# Terminalul 2
Set-Location D:\an4\PW\SpaceShare\frontend
npm.cmd run preview
```

Deschide **http://127.0.0.1:4173**. Proxy-ul este configurat și pentru preview. `vite preview` servește buildul pentru verificare locală; nu este o configurație de deployment. Deschiderea directă a `dist/index.html` nu înlocuiește serverul local.

## Structură

```text
backend/
  src/
    app.ts                    # middleware și rute Express
    server.ts                 # pornirea/oprirea serverului
    config/env.ts             # încărcarea mediului și validarea portului
    middleware/error-handler.ts
    modules/health/health.routes.ts
  prisma/schema.prisma        # schema existentă, încă fără modele
  prisma7.config.ts           # configurația Prisma existentă
  tsconfig.json
frontend/
  src/
    app/App.tsx
    pages/HomePage.tsx
    components/Icon.tsx
    features/health/HealthPanel.tsx
    lib/api.ts                # fetch și verificarea răspunsului API
    types/health.ts
    styles/index.css
  public/favicon.svg
  vite.config.ts              # React, Tailwind și proxy /api
docs/                         # documentație locală
```

Backendul este ESM (`type: module`); TypeScript folosește `NodeNext` și importuri `.js` compatibile cu rezultatul compilat. `tsx watch` rulează TypeScript în development, iar `tsc` generează `backend/dist` pentru `npm.cmd start`. Vite gestionează frontendul; Tailwind este integrat prin pluginul oficial Vite: https://tailwindcss.com/docs/installation/using-vite. Configurația proxy urmează https://vite.dev/config/server-options#server-proxy.

Directoarele viitoare sunt introduse când conțin cod real, nu ca module goale. Markdown este ignorat prin `.gitignore`, cu excepția `README.md`, conform cerinței proiectului. Fișierele deja urmărite de Git rămân urmărite chiar dacă se potrivesc ulterior unei reguli de ignorare; operațiile Git sunt efectuate exclusiv de utilizator.
