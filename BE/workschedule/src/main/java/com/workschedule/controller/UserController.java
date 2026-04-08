package com.workschedule.controller;

import com.workschedule.Exception.NotFoundException;
import com.workschedule.dto.UserDto;
import com.workschedule.model.Users;
import com.workschedule.repository.UsersRepository;
import com.workschedule.Exception.ResourceNotFoundException;
import com.workschedule.service.BlockchainService;
import com.workschedule.service.serviceImpl.UserServiceImpl;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
public class UserController {
@Autowired
    private UserServiceImpl userServiceImpl;
@Autowired
private UsersRepository usersRepository;
@Autowired
private BlockchainService blockchainService;

@PostMapping("/register")
    public ResponseEntity<Users> register(@RequestBody @Valid UserDto userDto
        ,BindingResult bindingResult ) throws Exception {
    if (userDto.getEmaildto() == null || userDto.getEmaildto().isBlank()) {
        throw new ResourceNotFoundException("Thiếu email");
    }
    if (userDto.getPassworddto() == null || userDto.getPassworddto().isBlank()) {
        throw new ResourceNotFoundException("Thiếu password");
    }
    if (userDto.getUserName() == null || userDto.getUserName().isBlank()) {
        throw new ResourceNotFoundException("userName không được để trống");
    }
    if (bindingResult.hasErrors()){
        throw new ResourceNotFoundException(bindingResult.getAllErrors().get(0).getDefaultMessage());
    }
    return ResponseEntity.ok(userServiceImpl.save(userDto));
}

    @PostMapping("/login")
    public Users login(@RequestBody UserDto userDto) throws NotFoundException {
        return userServiceImpl.logintest(userDto);
    }

    @PostMapping("/updateuser")
    public ResponseEntity<Users> updateuser(@RequestBody @Valid UserDto userDto
            ,BindingResult bindingResult,
              @RequestParam("userId") Long userId) throws Exception {
        if (bindingResult.hasErrors()){
            throw new ResourceNotFoundException(bindingResult.getAllErrors().get(0).getDefaultMessage());
        }
        return ResponseEntity.ok(userServiceImpl.update(userDto,userId));
    }

   @GetMapping("/getalluserbyprojectId")
    public ResponseEntity<List<Users>> getalluserbyprojectId(@RequestParam("projectId") String projectId) {
        List<Users> projectList = usersRepository.findUsersByProjectId(projectId);
        
        // Kiểm tra null trước khi trả về
        if (projectList == null) {
            return ResponseEntity.ok(new ArrayList<>());
        }

        // Vệ sinh dữ liệu (Data Cleaning) an toàn
        for (Users user : projectList) {
            user.setUserProjectList(null);
            user.setUserTaskList(null);
            user.setUserNotes(null);
            user.setCommentList(null);
            user.setPassword("********"); // Bảo mật: Không trả về pass thật
        }
        return ResponseEntity.ok(projectList);
    }

   @GetMapping("/getalluserbytaskId")
    public ResponseEntity<List<Users>> getalluserbytask(@RequestParam("taskId") Long taskId) {
        try {
            List<Users> userList = usersRepository.getalluserbytask(taskId);

            // 1. Nếu không tìm thấy ai, trả về danh sách rỗng [] ngay lập tức
            if (userList == null || userList.isEmpty()) {
                return ResponseEntity.ok(new ArrayList<>());
            }

            // 2. Vệ sinh dữ liệu để tránh lỗi vòng lặp (Circular Reference)
            for (Users user : userList) {
                user.setPassword("********"); // Che mật khẩu
                
                // Ngắt các quan hệ để JSON không bị lỗi đệ quy vô tận
                user.setUserProjectList(null);
                user.setCommentList(null);
                user.setUserNotes(null);
                
                // QUAN TRỌNG: Ngắt quan hệ task list để tránh load nặng và lỗi
                user.setUserTaskList(null); 
            }

            return ResponseEntity.ok(userList);

        } catch (Exception e) {
            // In lỗi ra màn hình Console của IntelliJ để bạn biết tại sao
            e.printStackTrace();
            // Trả về danh sách rỗng để App không bị crash, dù server có lỗi
            return ResponseEntity.ok(new ArrayList<>());
        }
    }
    @GetMapping("/getbalance")
    public ResponseEntity<?> getBalance(@RequestParam("walletAddress") String walletAddress) {
        if (walletAddress == null || walletAddress.length() < 10) {
            return ResponseEntity.ok(Map.of("balance", "0", "symbol", "HIVE"));
        }
        
        String balance = blockchainService.getTokenBalance(walletAddress);
        
        return ResponseEntity.ok(Map.of(
            "balance", balance,
            "symbol", "HIVE"
        ));
    }
    @PostMapping("/transfertoken")
    public ResponseEntity<?> transferToken(@RequestBody Map<String, String> payload) {
        String privateKey = payload.get("privateKey");
        String receiverAddress = payload.get("receiverAddress");
        String amountStr = payload.get("amount");

        if (privateKey == null || receiverAddress == null || amountStr == null) {
            return ResponseEntity.badRequest().body("Thiếu thông tin chuyển tiền");
        }

        try {
            int amount = Integer.parseInt(amountStr);
            String txHash = blockchainService.transferTokenByUser(privateKey, receiverAddress, amount);

            if (txHash != null) {
                return ResponseEntity.ok(Map.of(
                    "message", "Chuyển tiền thành công!",
                    "txHash", txHash
                ));
            } else {
                return ResponseEntity.status(400).body("Giao dịch thất bại. Kiểm tra lại số dư ETH (làm phí Gas) hoặc Private Key.");
            }
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Lỗi: " + e.getMessage());
        }
    }

}
