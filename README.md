# HiveHub Mobile

HiveHub is a Scrum-oriented mobile app for team collaboration, built with Expo (React Native) and an Express backend.

## Project Layout

- `FE/`: mobile client
- `backend-express/`: API server, chat socket, auth, and data store
- Legacy Spring backend has been removed

## Core Functionality

- Scrum hierarchy: Project -> Sprint -> Story -> Subtask
- Role permissions: Owner and Member
- Story/Subtask status updates with owner notifications
- Project member management by email
- In-project realtime chat

## Technology

- Frontend: React Native + Expo
- Backend: Node.js + Express + Socket.IO
- Authentication: JWT access token + refresh token
- Database: MongoDB Atlas (with local JSON snapshot fallback)

## Setup

### 1) Backend (`backend-express`)

Install dependencies and run:

```bash
cd backend-express
npm install
npm run dev
```

Server default: `http://localhost:8889`

Create `.env` from `.env.example` and configure at least:

```env
PORT=8889
JWT_SECRET=ChangeMeToA32CharSecretKeyForJwt
JWT_ACCESS_EXP_MS=900000
JWT_REFRESH_EXP_MS=604800000

MONGODB_URI=
MONGODB_DB_NAME=hivehub
MONGODB_COLLECTION=app_state
MONGODB_DOCUMENT_ID=hivehub_main
```

Behavior:
- If `MONGODB_URI` is set: backend syncs app data snapshot to MongoDB Atlas
- If `MONGODB_URI` is empty: backend uses local `src/db.json`

### 2) Frontend (`FE`)

```bash
cd FE
npm install --legacy-peer-deps
npm start
```

Update backend API URL in `FE/src/config/config.json` if needed.

## Backend Module Structure

`backend-express/src`:

- `config/`: env and Mongo bootstrap
- `data/`: read/write abstraction and persistence sync
- `middlewares/`: request context, optional auth, not found, error handler
- `routes/`: grouped API endpoints by domain
- `services/`: shared business logic helpers
- `app.js`: express app composition
- `server.js`: HTTP + Socket.IO bootstrap

## Development Notes

- Main runtime data source is `backend-express/src/db.json`
- When MongoDB is configured, data is mirrored to Atlas for persistence

