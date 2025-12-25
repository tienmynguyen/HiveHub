package com.workschedule.controller;

import com.workschedule.Exception.ResourceNotFoundException;
import com.workschedule.model.*;
import com.workschedule.repository.CommentRepository;
import com.workschedule.repository.TaskRepository;
import com.workschedule.repository.UsersRepository;
import com.workschedule.service.serviceImpl.ProjectServiceImpl;
import com.workschedule.service.serviceImpl.TaskServiceImpl;
import com.workschedule.service.BlockchainService; 
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Date;

@RestController
public class TaskController {

    @Autowired
    private TaskServiceImpl taskServiceImpl;
    @Autowired
    private TaskRepository taskRepository;
    @Autowired
    private ProjectServiceImpl projectServiceImpl;
    @Autowired
    private CommentRepository commentRepository;
    @Autowired
    private UsersRepository usersRepository;

    @Autowired
    private BlockchainService blockchainService;

    // --- 1. THÊM TASK ---
    @PostMapping("/addtask")
    public ResponseEntity<Task> addtask(@RequestBody Task task, @RequestParam("projectId") String projectId) {
        Project pro = projectServiceImpl.findById(projectId);
        task.setProject(pro);
        task.setTaskStatus(TaskStatus.IN_PROGRESS.toString());
        return ResponseEntity.ok(taskServiceImpl.save(task));
    }

    // --- 2. LẤY TẤT CẢ TASK ---
    @GetMapping("/getalltask")
    public ResponseEntity<List<Task>> getalltask() {
        return ResponseEntity.ok(taskServiceImpl.findAll());
    }

    // --- 3. XÓA TASK ---
    @GetMapping("/deletetask")
    public ResponseEntity<Void> deletetask(@RequestParam("taskid") Long taskid) {
        taskServiceImpl.deteleById(taskid);
        return ResponseEntity.ok().build();
    }

    // --- 4. LẤY TASK THEO PROJECT (QUAN TRỌNG: ĐÃ SỬA ĐỂ HIỂN THỊ ĐÚNG) ---
    @GetMapping("/gettaskbyprojectid")
    public ResponseEntity<List<Task>> gettaskbyprojectid(@RequestParam("projectid") String projectid) {
        List<Task> taskList = taskRepository.findTaskByProject(projectid);
        
        for (Task task : taskList) {
            // [QUAN TRỌNG] KHÔNG set null userTaskList nữa.
            // Vì bạn đã thêm @JsonIgnore bên Entity, nên JSON sẽ tự động ngắt vòng lặp.
            
            // Chỉ cần che mật khẩu User để bảo mật (Optional)
            if (task.getUserTaskList() != null) {
                // Lưu ý: Ở đây tôi giả định tên class là User_Task hoặc UserTaskList tùy vào code model của bạn
                // Java sẽ tự hiểu nhờ import model.*
                for (var ut : task.getUserTaskList()) {
                    if (ut.getUsers() != null) {
                        ut.getUsers().setPassword(null); 
                    }
                }
            }

            // Dọn dẹp các field không cần thiết khác để API nhẹ hơn
            task.setCommentList(null);
            if (task.getProject() != null) {
                task.getProject().setUserProjectList(null);
                task.getProject().setMessageList(null);
            }
        }
        return ResponseEntity.ok(taskList);
    }

    // --- 5. LẤY TASK THEO USER ---
    @GetMapping("/getalltaskbyuser")
    public ResponseEntity<List<Task>> getalltaskbyuser(@RequestParam("userId") Long userId) {
        List<Task> taskList = taskRepository.findTaskbyUser(userId);
        
        for (Task task : taskList) {
            // Giữ nguyên logic xử lý như trên
            if (task.getUserTaskList() != null) {
                for (var ut : task.getUserTaskList()) {
                    if (ut.getUsers() != null) {
                        ut.getUsers().setPassword(null);
                    }
                }
            }
            
            task.setCommentList(null);
            if (task.getProject() != null) {
                task.getProject().setUserProjectList(null);
                task.getProject().setMessageList(null);
            }
        }
        return ResponseEntity.ok(taskList);
    }

    // --- 6. TÌM TASK THEO NGÀY ---
    @GetMapping("/findtaskbydate")
    public ResponseEntity<List<Task>> findprojectbydate(@RequestParam("user_id") Long user_id,
                                                        @RequestParam("date") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        List<Task> taskList = taskRepository.findTaskbydate(user_id, date);
        if (taskList != null && !taskList.isEmpty()) {
            for (Task task : taskList) {
                if (task.getUserTaskList() != null) {
                    for (var ut : task.getUserTaskList()) {
                        if (ut.getUsers() != null) ut.getUsers().setPassword(null);
                    }
                }
                
                task.setCommentList(null);
                if (task.getProject() != null) {
                    task.getProject().setUserProjectList(null);
                    task.getProject().setMessageList(null);
                }
            }
            return ResponseEntity.ok(taskList);
        } else {
            // Trả về null hoặc empty list, Frontend sẽ tự xử lý hiển thị "Rảnh rỗi"
            return ResponseEntity.ok(List.of());
        }
    }

    // --- 7. CẬP NHẬT TASK ---
    @PostMapping("/updatetask")
    public ResponseEntity<Task> updateproject(@RequestBody Task task, @RequestParam("taskId") Long taskId) {
        Task tasksaved = taskServiceImpl.update(task, taskId);
        return ResponseEntity.ok(tasksaved);
    }

    // --- 8. DUYỆT BÀI & TRẢ THƯỞNG (BLOCKCHAIN) ---
    @PostMapping("/approvetask")
    public ResponseEntity<?> approveTask(@RequestBody Map<String, Object> payload) {
        System.out.println(">>> ĐANG CHẠY VÀO: /approvetask (CÓ Blockchain)");

        Object taskIdObj = payload.get("taskId");
        Object projectIdObj = payload.get("projectId");
        Object adminIdObj = payload.get("adminId");

        if (taskIdObj == null || projectIdObj == null) {
            return ResponseEntity.badRequest().body("Thiếu taskId hoặc projectId!");
        }

        Long taskId = Long.valueOf(taskIdObj.toString());
        String projectId = projectIdObj.toString();
        Long adminId = adminIdObj != null ? Long.valueOf(adminIdObj.toString()) : null;

        try {
            Task task = taskRepository.findById(taskId)
                    .orElseThrow(() -> new ResourceNotFoundException("Task not found"));

            // a. Ghi Proof (Xác nhận công việc)
            System.out.println(">>> [1/2] Ghi Proof lên Blockchain...");
            String txHash = blockchainService.approveTaskOnChain(taskId, projectId);

            // b. Gửi Token Thưởng (Từ Admin -> Nhân viên)
            String rewardHash = null;
            
            // Kiểm tra userTaskList có dữ liệu không
            if (task.getUserTaskList() != null && !task.getUserTaskList().isEmpty()) {
                // Lấy người đầu tiên làm task (Nhân viên)
                Users employee = task.getUserTaskList().get(0).getUsers(); 
                String wallet = employee.getWalletAddress();
                
                if (wallet != null && wallet.length() > 10) {
                    System.out.println(">>> [2/2] Gửi 10 Token tới: " + wallet);
                    rewardHash = blockchainService.sendTokenReward(wallet, 10);
                } else {
                    System.out.println("!!! Cảnh báo: Nhân viên chưa cập nhật ví.");
                }
            }

            if (txHash != null) {
                // c. Cập nhật Database
                task.setTaskStatus("COMPLETED");    
                task.setIsApproved(true);         
                task.setTxHash(txHash);           
                
                taskRepository.save(task);

                // d. Lưu lịch sử
                if (adminId != null) {
                    String msg = "APPROVED (Đã duyệt). Proof: " + txHash;
                    if(rewardHash != null) {
                        msg += " | +10 Token (Tx: " + rewardHash + ")";
                    }
                    saveHistoryComment(task, adminId, "COMPLETED", msg);
                }

                return ResponseEntity.ok(Map.of(
                        "message", "Duyệt thành công!",
                        "txHash", txHash,
                        "rewardHash", (rewardHash != null ? rewardHash : "null"),
                        "taskStatus", "COMPLETED"
                ));
            } else {
                return ResponseEntity.status(500).body("Lỗi: Không thể ghi dữ liệu lên Blockchain.");
            }

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Lỗi Server: " + e.getMessage());
        }
    }

    private void saveHistoryComment(Task task, Long userId, String action, String content) {
        Users user = usersRepository.findById(userId).orElse(null);
        if (user != null) {
            Comment comment = new Comment();
            comment.setCommmentContent(action + ": " + content);
            comment.setDate(new Date());
            comment.setTask(task);
            comment.setUsers(user);
            commentRepository.save(comment);
        }
    }

    @PostMapping("/rejecttask")
    public ResponseEntity<?> rejectTask(
            @RequestParam("taskId") Long taskId,
            @RequestParam("adminId") Long adminId,
            @RequestParam("reason") String reason) {

        if (reason == null || reason.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Vui lòng nhập lý do từ chối.");
        }

        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));

        task.setTaskStatus("IN_PROGRESS"); 
        task.setIsApproved(false);        

        saveHistoryComment(task, adminId, "REJECTED (Yêu cầu làm lại)", reason);

        return ResponseEntity.ok(taskServiceImpl.save(task));
    }

    @PostMapping("/submittask")
    public ResponseEntity<?> submitTask(
            @RequestParam("taskId") Long taskId,
            @RequestParam("userId") Long userId,
            @RequestParam("message") String message) {

        if (message == null || message.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Vui lòng nhập nội dung báo cáo.");
        }

        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));

        task.setTaskStatus("PENDING_APPROVAL"); 

        saveHistoryComment(task, userId, "SUBMITTED (Nộp bài)", message);

        return ResponseEntity.ok(taskServiceImpl.save(task));
    }
}