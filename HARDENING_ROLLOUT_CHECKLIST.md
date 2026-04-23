# Hardening Rollout Checklist

## 1) Environment setup
- Set JWT env vars:
  - `JWT_SECRET`
  - `JWT_ACCESS_EXP_MS`
  - `JWT_REFRESH_EXP_MS`
- Set blockchain env vars:
  - `BLOCKCHAIN_GANACHE_URL`
  - `BLOCKCHAIN_CHAIN_ID`
  - `BLOCKCHAIN_ADMIN_PRIVATE_KEY`
  - `BLOCKCHAIN_TASK_CONTRACT_ADDRESS`
  - `BLOCKCHAIN_TOKEN_CONTRACT_ADDRESS`
- Reference: `BE/workschedule/.env.example`

## 2) Backend verification
- `POST /auth/register` returns `accessToken` + `refreshToken`.
- `POST /auth/login` returns `accessToken` + `refreshToken`.
- `POST /auth/refresh` rotates refresh token and returns new token pair.
- `POST /auth/logout` revokes refresh token.
- Protected endpoints reject missing/invalid bearer token.
- Legacy endpoints `/register` and `/login` remain available for migration compatibility.

## 3) Frontend verification
- Login stores tokens in Expo SecureStore.
- App cold start restores session automatically.
- API requests include `Authorization: Bearer <token>`.
- On access token expiry, interceptor refreshes token and retries once.
- Logout clears tokens from SecureStore and resets auth state.

## 4) Error schema verification
- Validation errors return:
  - `code: VALIDATION_ERROR`
  - `message`
  - `details` field map
- Not found/business errors return:
  - `code: RESOURCE_NOT_FOUND`
  - `message`
- Unhandled errors return:
  - `code: INTERNAL_SERVER_ERROR`
  - `message`

## 5) Tests verification
- Auth integration tests:
  - register
  - login
  - refresh
  - invalid refresh token
  - logout
- Task approval test:
  - `/approvetask` happy path returns `txHash` and `taskStatus=COMPLETED`
- Chat tests:
  - get message history
  - add message and websocket broadcast trigger

## 6) Migration notes
- FE now sends auth payload as `email` and `password`.
- BE currently supports both:
  - new `/auth/*` endpoints
  - legacy `/register` and `/login` endpoints
- Password flow:
  - FE sends SHA-256(password)
  - BE stores BCrypt(SHA-256(password))
  - legacy password records are migrated on successful login.

