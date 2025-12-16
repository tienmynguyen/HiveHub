package com.workschedule.service;

import org.springframework.stereotype.Service;
import org.web3j.abi.FunctionEncoder;
import org.web3j.abi.datatypes.Function;
import org.web3j.abi.datatypes.Uint;
import org.web3j.abi.datatypes.Utf8String;
import org.web3j.crypto.Credentials;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.methods.response.EthSendTransaction;
import org.web3j.protocol.http.HttpService;
import org.web3j.tx.RawTransactionManager;
import org.web3j.tx.TransactionManager;
import org.web3j.tx.gas.DefaultGasProvider;

import java.math.BigInteger;
import java.util.Arrays;
import java.util.Collections;

@Service
public class BlockchainService {

    // 1. Kết nối Ganache (Port 7545)
    private final String GANACHE_URL = "http://127.0.0.1:7545";

    // 2. Chain ID (Thường là 1337 hoặc 5777 trên Ganache)
    private final long CHAIN_ID = 1337; 

    // 3. PRIVATE KEY (QUAN TRỌNG) - HÃY DÁN PRIVATE KEY CỦA BẠN VÀO ĐÂY
    private final String PRIVATE_KEY = "0xdf21c080182e378c7f6bdb7a6aaec281edca4b9cee0eabd12837085c3ecf989a"; 

    // 4. CONTRACT ADDRESS (QUAN TRỌNG) - HÃY DÁN ĐỊA CHỈ HỢP ĐỒNG CỦA BẠN VÀO ĐÂY
    private final String CONTRACT_ADDRESS = "0x4b512eB43b1c28955f52eEeB84F549A054b6A602";

    public String approveTaskOnChain(Long taskId, String projectId) {
        try {
            System.out.println("--- Bắt đầu ghi Blockchain ---");
            
            // Kết nối
            Web3j web3j = Web3j.build(new HttpService(GANACHE_URL));

            // Load ví
            Credentials credentials = Credentials.create(PRIVATE_KEY);

            // Chuẩn bị hàm 'approveTask' (Phải đúng tên hàm trong file Solidity)
            Function function = new Function(
                    "approveTask",
                    Arrays.asList(new Uint(BigInteger.valueOf(taskId)), new Utf8String(projectId)),
                    Collections.emptyList()
            );

            // Mã hóa dữ liệu
            String encodedFunction = FunctionEncoder.encode(function);

            // Tạo Transaction Manager
            TransactionManager txManager = new RawTransactionManager(web3j, credentials, CHAIN_ID);

            // --- ĐOẠN ĐÃ SỬA LỖI ---
            // Dùng sendTransaction (public) thay vì executeTransaction (protected)
            EthSendTransaction response = txManager.sendTransaction(
                    DefaultGasProvider.GAS_PRICE,
                   new BigInteger("300000"),
                    CONTRACT_ADDRESS,
                    encodedFunction,
                    BigInteger.ZERO
            );

            // Kiểm tra lỗi từ Node trả về
            if (response.getError() != null) {
                System.err.println("Blockchain Error Details: " + response.getError().getMessage());
                return null;
            }

            String txHash = response.getTransactionHash();
            System.out.println("--- GHI THÀNH CÔNG! TxHash: " + txHash + " ---");
            
            return txHash;

        } catch (Exception e) {
            System.err.println("--- LỖI GHI BLOCKCHAIN (Exception) ---");
            e.printStackTrace();
            return null;
        }
    }
}