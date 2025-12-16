package com.workschedule.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.web3j.abi.FunctionEncoder;
import org.web3j.abi.TypeReference;
import org.web3j.abi.datatypes.Address;
import org.web3j.abi.datatypes.Function;
import org.web3j.abi.datatypes.generated.Uint256;
import org.web3j.crypto.Credentials;
import org.web3j.crypto.RawTransaction;
import org.web3j.crypto.TransactionEncoder;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.DefaultBlockParameterName;
import org.web3j.protocol.core.methods.response.EthGetTransactionCount;
import org.web3j.protocol.core.methods.response.EthSendTransaction;
import org.web3j.protocol.http.HttpService;
import org.web3j.utils.Numeric;

import java.math.BigInteger;
import java.util.Arrays;
import java.util.Collections;

@Service
public class Web3jService {

    // Cấu hình trong application.properties
    @Value("${blockchain.rpc-url}")
    private String rpcUrl; // Ví dụ: https://rpc-amoy.polygon.technology/

    @Value("${blockchain.private-key}")
    private String privateKey; // Private key ví Admin

    @Value("${blockchain.contract-address}")
    private String contractAddress; // Địa chỉ Smart Contract Token

    // Hàm gửi Token thưởng
    public String sendTokenReward(String userWalletAddress, long amountToSend) throws Exception {
        // 1. Kết nối Blockchain
        Web3j web3j = Web3j.build(new HttpService(rpcUrl));

        // 2. Tải ví Admin
        Credentials credentials = Credentials.create(privateKey);

        // 3. Chuẩn bị thông số giao dịch
        // Lấy số nonce (số thứ tự giao dịch) để tránh trùng lặp
        EthGetTransactionCount ethGetTransactionCount = web3j.ethGetTransactionCount(
                credentials.getAddress(), DefaultBlockParameterName.LATEST).send();
        BigInteger nonce = ethGetTransactionCount.getTransactionCount();

        // 4. Tạo data gọi hàm transfer(address, uint256) của ERC-20
        // Quy đổi số lượng token (giả sử token có 18 số thập phân -> nhân 10^18)
        BigInteger value = BigInteger.valueOf(amountToSend).multiply(BigInteger.TEN.pow(18));
        
        Function function = new Function(
                "transfer",  // Tên hàm trong Smart Contract
                Arrays.asList(new Address(userWalletAddress), new Uint256(value)), // Tham số đầu vào
                Collections.singletonList(new TypeReference<>() {}) // Đầu ra (bool)
        );
        String encodedFunction = FunctionEncoder.encode(function);

        // 5. Cấu hình Gas (Phí giao dịch) - Có thể để hardcode cho testnet
        BigInteger gasLimit = BigInteger.valueOf(200000);
        BigInteger gasPrice = web3j.ethGasPrice().send().getGasPrice();

        // 6. Tạo giao dịch Raw
        RawTransaction rawTransaction = RawTransaction.createTransaction(
                nonce, gasPrice, gasLimit, contractAddress, encodedFunction);

        // 7. Ký giao dịch bằng Private Key
        byte[] signedMessage = TransactionEncoder.signMessage(rawTransaction, credentials);
        String hexValue = Numeric.toHexString(signedMessage);

        // 8. Gửi lên Blockchain
        EthSendTransaction ethSendTransaction = web3j.ethSendRawTransaction(hexValue).send();

        if (ethSendTransaction.hasError()) {
            throw new RuntimeException("Lỗi Blockchain: " + ethSendTransaction.getError().getMessage());
        }

        // Trả về Transaction Hash (Mã giao dịch)
        return ethSendTransaction.getTransactionHash();
    }
}