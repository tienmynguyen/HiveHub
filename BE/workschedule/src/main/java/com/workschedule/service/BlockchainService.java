package com.workschedule.service;

import org.springframework.stereotype.Service;
import org.web3j.abi.FunctionEncoder;
import org.web3j.abi.FunctionReturnDecoder;
import org.web3j.abi.TypeReference;
import org.web3j.abi.datatypes.Address; // <--- QUAN TRỌNG
import org.web3j.abi.datatypes.Function;
import org.web3j.abi.datatypes.Uint;
import org.web3j.abi.datatypes.Utf8String;
import org.web3j.abi.datatypes.generated.Uint256;
import org.web3j.crypto.Credentials;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.DefaultBlockParameterName;
import org.web3j.protocol.core.methods.request.Transaction;
import org.web3j.protocol.core.methods.response.EthCall;
import org.web3j.protocol.core.methods.response.EthSendTransaction;
import org.web3j.protocol.http.HttpService;
import org.web3j.tx.RawTransactionManager;
import org.web3j.tx.TransactionManager;
import org.web3j.tx.gas.DefaultGasProvider;

import java.math.BigInteger;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

@Service
public class BlockchainService {

    private final String GANACHE_URL = "http://127.0.0.1:7545";
    private final long CHAIN_ID = 1337;

    // 1. PRIVATE KEY ADMIN (Ví số 1 trong Ganache - Người trả tiền)
    private final String PRIVATE_KEY = "your_admin_private_key_here";

    // 2. ĐỊA CHỈ CONTRACT QUẢN LÝ TASK (Contract cũ chứa hàm approveTask)
    private final String TASK_CONTRACT_ADDRESS = "your_task_contract_address_here";

    // 3. ĐỊA CHỈ CONTRACT TOKEN (Contract HiveToken - Mới deploy trên Remix)
    // ??? BẠN CẦN ĐIỀN ĐỊA CHỈ TOKEN VÀO ĐÂY ???
    private final String TOKEN_CONTRACT_ADDRESS = "your_token_contract_address_here";


    // --- HÀM 1: GHI BLOCKCHAIN (Proof of Work) ---
    public String approveTaskOnChain(Long taskId, String projectId) {
        try {
            System.out.println("--- [1/2] Ghi Proof lên Blockchain ---");
            Web3j web3j = Web3j.build(new HttpService(GANACHE_URL));
            Credentials credentials = Credentials.create(PRIVATE_KEY);

            Function function = new Function(
                    "approveTask",
                    Arrays.asList(new Uint256(BigInteger.valueOf(taskId)), new Utf8String(projectId)),
                    Collections.emptyList()
            );

            String encodedFunction = FunctionEncoder.encode(function);
            TransactionManager txManager = new RawTransactionManager(web3j, credentials, CHAIN_ID);

            EthSendTransaction response = txManager.sendTransaction(
                    DefaultGasProvider.GAS_PRICE,
                    new BigInteger("300000"),
                    TASK_CONTRACT_ADDRESS, // <--- Gửi tới Task Contract
                    encodedFunction,
                    BigInteger.ZERO
            );

            if (response.getError() != null) {
                System.err.println("Task Error: " + response.getError().getMessage());
                return null;
            }
            return response.getTransactionHash();

        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }

    // --- HÀM 2: GỬI TOKEN THƯỞNG (Hàm bạn đang thiếu) ---
   public String sendTokenReward(String employeeWallet, int amount) {
        try {
            System.out.println("--- [2/2] Gửi " + amount + " Token tới: " + employeeWallet + " ---");

            Web3j web3j = Web3j.build(new HttpService(GANACHE_URL));
            Credentials credentials = Credentials.create(PRIVATE_KEY);

            Function function = new Function(
                    "transfer",
                    Arrays.asList(
                            new Address(employeeWallet),
                            // SỬA DÒNG NÀY: Dùng Uint256 thay vì Uint
                            new Uint256(BigInteger.valueOf(amount)) 
                    ),
                    Collections.emptyList()
            );

            String encodedFunction = FunctionEncoder.encode(function);
            TransactionManager txManager = new RawTransactionManager(web3j, credentials, CHAIN_ID);

            EthSendTransaction response = txManager.sendTransaction(
                    DefaultGasProvider.GAS_PRICE,
                    new BigInteger("300000"),
                    TOKEN_CONTRACT_ADDRESS,
                    encodedFunction,
                    BigInteger.ZERO
            );

            if (response.getError() != null) {
                System.err.println("Token Error: " + response.getError().getMessage());
                return null;
            }
            
            String txHash = response.getTransactionHash();
            System.out.println("--- GỬI TOKEN THÀNH CÔNG! Hash: " + txHash + " ---");
            return txHash;

        } catch (Exception e) {
            System.err.println("Lỗi gửi tiền: " + e.getMessage());
            e.printStackTrace();
            return null;
        }
    }

    // --- HÀM 3: XEM SỐ DƯ ---
    public String getTokenBalance(String walletAddress) {
        try {
            Web3j web3j = Web3j.build(new HttpService(GANACHE_URL));

            Function function = new Function(
                    "balanceOf",
                    Arrays.asList(new Address(walletAddress)),
                    Arrays.asList(new TypeReference<Uint256>() {})
            );

            String encodedFunction = FunctionEncoder.encode(function);

            EthCall response = web3j.ethCall(
                    Transaction.createEthCallTransaction(null, TOKEN_CONTRACT_ADDRESS, encodedFunction),
                    DefaultBlockParameterName.LATEST
            ).send();

            if (response.getError() != null) return "0";

            List<org.web3j.abi.datatypes.Type> result = FunctionReturnDecoder.decode(
                    response.getValue(), function.getOutputParameters());

            if (result.isEmpty()) return "0";
            return result.get(0).getValue().toString();

        } catch (Exception e) {
            return "0";
        }
    }

    // --- HÀM 4: CHUYỂN TIỀN TỪ NGƯỜI DÙNG A SANG B ---
    public String transferTokenByUser(String senderPrivateKey, String receiverAddress, int amount) {
        try {
            System.out.println("--- Bắt đầu chuyển tiền User ---");
            
            Web3j web3j = Web3j.build(new HttpService(GANACHE_URL));
            // Tạo Credentials từ Private Key người gửi nhập vào
            Credentials credentials = Credentials.create(senderPrivateKey);

            Function function = new Function(
                    "transfer",
                    Arrays.asList(
                            new Address(receiverAddress),
                            new Uint256(BigInteger.valueOf(amount))
                    ),
                    Collections.emptyList()
            );

            String encodedFunction = FunctionEncoder.encode(function);
            TransactionManager txManager = new RawTransactionManager(web3j, credentials, CHAIN_ID);

            EthSendTransaction response = txManager.sendTransaction(
                    DefaultGasProvider.GAS_PRICE,
                    new BigInteger("300000"),
                    TOKEN_CONTRACT_ADDRESS,
                    encodedFunction,
                    BigInteger.ZERO
            );

            if (response.getError() != null) {
                System.err.println("User Transfer Error: " + response.getError().getMessage());
                return null;
            }

            return response.getTransactionHash();

        } catch (Exception e) {
            System.err.println("Lỗi chuyển tiền User: " + e.getMessage());
            return null;
        }
    }
}