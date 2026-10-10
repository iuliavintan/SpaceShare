# SpaceShare

SpaceShare is a university project for managing shared spaces and equipment. It is being built to let users find resources, check availability and make bookings, while administrators manage resources and approval requests.

## Stack

- Frontend: React, TypeScript, Vite and Tailwind CSS
- Backend: Node.js, Express and TypeScript
- Database: SQLite with Prisma ORM
- Authentication: JWT and bcrypt
- Planned: FullCalendar for the calendar

## Structure

```text
SpaceShare/
  frontend/   # Web interface
  backend/    # API, database schema, migrations and seed data
  docs/       # Project notes
```

## Running locally

Use Node.js 24 LTS. Install dependencies in `backend` and `frontend` with `npm install`, then run each in a separate terminal:

```powershell
cd backend
npm run dev
```

```powershell
cd frontend
npm run dev
```

Open **http://127.0.0.1:5173**. The backend runs on port **3000** and prepares the local database and demo resources before starting. On Windows, use `npm.cmd` if PowerShell blocks `npm`.

You can create an account, sign in and edit your profile. For a demo administrator, set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in `backend/.env` before starting. The JWT secret is generated locally on first startup.
