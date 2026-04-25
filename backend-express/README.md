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

## Blockchain Task Approval (Deploy on Render)

When Owner/Management approves a task (`/approvetask`), backend can write approval proof on-chain and save `txHash`.

### 1) Required smart-contract function

Contract must expose this function (name configurable by env):

```solidity
function approveTask(
  bytes32 taskKey,
  uint256 taskId,
  address approver,
  uint256 approvedAt,
  bytes32 noteHash
) external returns (bytes32);
```

### 2) Render environment variables

Set in Render service -> Environment:

- `BLOCKCHAIN_ENABLED=true`
- `BLOCKCHAIN_REQUIRED=true` (optional, but recommended in production)
- `BLOCKCHAIN_RPC_URL=<your RPC endpoint>`
- `BLOCKCHAIN_CHAIN_ID=<e.g. 84532>`
- `BLOCKCHAIN_PRIVATE_KEY=<server signer wallet private key>`
- `BLOCKCHAIN_CONTRACT_ADDRESS=<deployed contract address>`
- `BLOCKCHAIN_APPROVE_METHOD=approveTask`
- `BLOCKCHAIN_CONFIRMATIONS=1`
- `BLOCKCHAIN_EXPLORER_TX_URL=<e.g. https://sepolia.basescan.org/tx>`

### 3) Deploy steps on Render

1. Push latest backend code.
2. Open Render service for `backend-express`.
3. Add environment variables above.
4. Click **Manual Deploy** -> **Deploy latest commit**.
5. Check logs for startup success.
6. Test API:
   - `POST /approvetask` with `{ taskId, adminId, note }`.
   - response should include `txHash`, `blockHash`, `onChainSynced: true`.
   - `GET /task-approval/:taskId` should return `explorerTxUrl` for FE.

### 4) Fallback behavior

- If `BLOCKCHAIN_ENABLED=false`: server still approves task and stores local audit hash-chain.
- If `BLOCKCHAIN_ENABLED=true` and on-chain call fails:
  - `BLOCKCHAIN_REQUIRED=true` -> return `503 BLOCKCHAIN_UNAVAILABLE`, no approval state update.
  - `BLOCKCHAIN_REQUIRED=false` -> fallback local audit and mark `onChainSynced: false`.

