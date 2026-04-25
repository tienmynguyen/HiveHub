const { ethers } = require("ethers");
const env = require("../config/env");

let cachedClient = null;

function isEnabled() {
  return Boolean(env.BLOCKCHAIN_ENABLED);
}

function buildClient() {
  if (!isEnabled()) return null;
  if (cachedClient) return cachedClient;
  if (!env.BLOCKCHAIN_RPC_URL || !env.BLOCKCHAIN_PRIVATE_KEY || !env.BLOCKCHAIN_CONTRACT_ADDRESS) {
    throw new Error("Missing blockchain env: RPC_URL, PRIVATE_KEY, or CONTRACT_ADDRESS");
  }

  const provider = new ethers.JsonRpcProvider(env.BLOCKCHAIN_RPC_URL, env.BLOCKCHAIN_CHAIN_ID || undefined);
  const wallet = new ethers.Wallet(env.BLOCKCHAIN_PRIVATE_KEY, provider);
  const abi = [
    `function ${env.BLOCKCHAIN_APPROVE_METHOD}(bytes32 taskKey,uint256 taskId,address approver,uint256 approvedAt,bytes32 noteHash) external returns (bytes32)`,
  ];
  const contract = new ethers.Contract(env.BLOCKCHAIN_CONTRACT_ADDRESS, abi, wallet);
  cachedClient = { provider, wallet, contract };
  return cachedClient;
}

function buildApprovalCall(payload) {
  const taskKey = ethers.keccak256(
    ethers.toUtf8Bytes(`${payload.projectId}:${payload.taskId}`)
  );
  const noteHash = ethers.keccak256(ethers.toUtf8Bytes(String(payload.note || "")));
  const approvedAt = BigInt(Math.floor(Date.now() / 1000));
  return {
    taskKey,
    noteHash,
    approvedAt,
  };
}

async function submitTaskApprovalOnChain(payload) {
  const client = buildClient();
  if (!client) {
    return { enabled: false };
  }
  const { contract, wallet, provider } = client;
  const { taskKey, noteHash, approvedAt } = buildApprovalCall(payload);
  const tx = await contract[env.BLOCKCHAIN_APPROVE_METHOD](
    taskKey,
    BigInt(payload.taskId),
    wallet.address,
    approvedAt,
    noteHash
  );
  const receipt = await tx.wait(env.BLOCKCHAIN_CONFIRMATIONS);
  const block = await provider.getBlock(receipt.blockNumber);
  return {
    enabled: true,
    mode: "onchain",
    txHash: receipt.hash,
    blockHash: receipt.blockHash,
    blockNumber: receipt.blockNumber,
    network: await provider.getNetwork().then((x) => Number(x.chainId)),
    taskKey,
    noteHash,
    txTimestamp: block?.timestamp || null,
  };
}

module.exports = {
  isEnabled,
  submitTaskApprovalOnChain,
};

