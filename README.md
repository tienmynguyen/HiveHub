# HiveHub Mobile

HiveHub is a Scrum-oriented mobile task management app built with Expo (React Native) and an Express.js backend.

## Current Architecture

- `FE/`: mobile client (Expo + React Native)
- `backend-express/`: API server (Express + Socket.IO + JWT + JSON file DB)
- `BE/`: removed (legacy Spring backend no longer used)

## Main Features

- Project -> Sprint -> Story -> Subtask structure
- Role-based permissions (Owner/Member)
- Story and subtask status workflow
- Owner notifications for member status changes
- Project member management by email
- In-project chat with Socket.IO

## Tech Stack

- Frontend: React Native (Expo)
- Backend: Node.js, Express, Socket.IO
- Auth: JWT access token + refresh token
- Storage (dev): `backend-express/src/db.json`

## Quick Start

### 1) Backend (Express)

```bash
cd backend-express
npm install
npm run dev
```

Default server: `http://localhost:8889`

### 2) Frontend (Expo)

```bash
cd FE
npm install --legacy-peer-deps
npm start
```

If needed, set API URL in `FE/src/config/config.json` to your backend IP/port.

## Backend Structure

`backend-express/src` is organized by responsibility:

- `config/`: environment configuration
- `data/`: db read/write utilities
- `middlewares/`: request context, auth parsing, error handling, not found
- `routes/`: feature-based route modules
- `services/`: shared business logic helpers
- `app.js`: app composition
- `server.js`: HTTP + Socket.IO bootstrap

## Notes

- This repo currently targets local/dev workflow.
- `db.json` is for development data only.

