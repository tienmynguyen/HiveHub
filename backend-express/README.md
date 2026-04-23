# backend-express

Express.js backend scaffold compatible with current `FE` endpoints.

## Run

1. Copy env file:

```bash
cp .env.example .env
```

2. Install dependencies:

```bash
npm install
```

3. Start server:

```bash
npm run dev
```

Default URL: `http://localhost:8889`

## Notes

- Data is stored in `src/db.json` for quick development.
- Supports both legacy auth routes (`/login`, `/register`) and new routes (`/auth/*`).
- Socket namespace is `/ws` to match FE usage (`io(URL + '/ws')`).

