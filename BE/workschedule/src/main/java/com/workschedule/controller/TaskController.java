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

    @Autowired private TaskServiceImpl taskServiceImpl;
    @Autowired private TaskRepository taskRepository;
    @Autowired private ProjectServiceImpl projectServiceImpl;
    @Autowired private CommentRepository commentRepository;
    @Autowired private UsersRepository usersRepository;
    @Autowired private BlockchainService blockchainService;

    // ... (Giữ nguyên các API add, get, delete cũ) ...
    @PostMapping("/addtask")
    public ResponseEntity<Task> addtask(@RequestBody Task task, @RequestParam("projectId") String projectId) {
        Project pro = projectServiceImpl.findById(projectId);
        task.setProject(pro);
        task.setTaskStatus(TaskStatus.IN_PROGRESS.toString());
        return ResponseEntity.ok(taskServiceImpl.save(task));
    }
    
    @GetMapping("/getalltask")
    public ResponseEntity<List<Task>> getalltask() { return ResponseEntity.ok(taskServiceImpl.findAll()); }

    @GetMapping("/deletetask")
    public ResponseEntity<Void> deletetask(@RequestParam("taskid") Long taskid) {
        taskServiceImpl.deteleById(taskid);
        return ResponseEntity.ok().build();
    }
    
    // ... (Các hàm gettaskbyprojectid, getalltaskbyuser, findtaskbydate giữ nguyên) ...
     @GetMapping("/gettaskbyprojectid")
    public ResponseEntity<List<Task>> gettaskbyprojectid(@RequestParam("projectid") String projectid) {
        List<Task> taskList = taskRepository.findTaskByProject(projectid);
        for (Task note : taskList) {
            note.setUserTaskList(null);
            note.setCommentList(null);
            if (note.getProject() != null) {
                note.getProject().setUserProjectList(null);
                note.getProject().setMessageList(null);
            }
        }
        return ResponseEntity.ok(taskList);
    }

    @GetMapping("/getalltaskbyuser")
    public ResponseEntity<List<Task>> getalltaskbyuser(@RequestParam("userId") Long userId) {
        List<Task> taskList = taskRepository.findTaskbyUser(userId);
        for (Task task : taskList) {
            task.setUserTaskList(null);
            task.setCommentList(null);
            if (task.getProject() != null) {
                task.getProject().setUserProjectList(null);
                task.getProject().setMessageList(null);
            }
        }
        return ResponseEntity.ok(taskList);
    }

    @GetMapping("/findtaskbydate")
    public ResponseEntity<List<Task>> findprojectbydate(@RequestParam("user_id") Long user_id,
                                                        @RequestParam("date") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        List<Task> taskList = taskRepository.findTaskbydate(user_id, date);
        if (taskList != null && !taskList.isEmpty()) {
            for (Task note : taskList) {
                note.setUserTaskList(null);
                note.setCommentList(null);
                if (note.getProject() != null) {
                    note.getProject().setUserProjectList(null);
                    note.getProject().setMessageList(null);
                }
            }
            return ResponseEntity.ok(taskList);
        } else {
            throw new ResourceNotFoundException("Hôm nay rảnh. Không có việc");
        }
    }
    
    @PostMapping("/updatetask")
    public ResponseEntity<Task> updateproject(@RequestBody Task task, @RequestParam("taskId") Long taskId) {
        Task tasksaved = taskServiceImpl.update(task, taskId);
        return ResponseEntity.ok(tasksaved);
    }

    // --- PHẦN QUAN TRỌNG NHẤT: API DUYỆT BÀI ---
    @PostMapping("/approvetask")
    public ResponseEntity<?> approveTask(@RequestBody Map<String, Object> payload) {
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

            // 1. Ghi Proof lên Blockchain
            String txHash = blockchainService.approveTaskOnChain(taskId, projectId);

            // 2. Gửi Token thưởng (Nếu có nhân viên làm task)
            String rewardHash = null;
            if (task.getUserTaskList() != null && !task.getUserTaskList().isEmpty()) {
                Users employee = task.getUserTaskList().get(0).getUsers(); 
                String wallet = employee.getWalletAddress(); // Lấy ví từ DB
                
                if (wallet != null && wallet.length() > 10) {
                    // Thưởng 10 Token
                    rewardHash = blockchainService.sendTokenReward(wallet, 10);
                } else {
                    System.out.println("Cảnh báo: Nhân viên chưa cập nhật ví.");
                }
            }

            // 3. Nếu ghi Blockchain thành công -> Cập nhật DB
            if (txHash != null) {
                task.setTaskStatus("COMPLETED");
                task.setIsApproved(true);
                task.setTxHash(txHash);
                taskRepository.save(task);

                // Lưu lịch sử
                if (adminId != null) {
                    String msg = "APPROVED. Tx: " + txHash;
                    if(rewardHash != null) msg += " | +10 Token (" + rewardHash + ")";
                    saveHistoryComment(task, adminId, "COMPLETED", msg);
                }

                return ResponseEntity.ok(Map.of(
                        "message", "Duyệt thành công!",
                        "txHash", txHash,
                        "rewardHash", (rewardHash != null ? rewardHash : "null"),
                        "taskStatus", "COMPLETED"
                ));
            } else {
                return ResponseEntity.status(500).body("Lỗi Blockchain.");
            }

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Lỗi: " + e.getMessage());
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
    
    // ... (Giữ nguyên rejectTask và submitTask) ...
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

        task.setTaskStatus("IN_PROGRESS"); // Trả về cho làm lại
        task.setIsApproved(false);        // Bỏ duyệt nếu có

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

        task.setTaskStatus("PENDING_APPROVAL"); // Chờ duyệt

        saveHistoryComment(task, userId, "SUBMITTED (Nộp bài)", message);

        return ResponseEntity.ok(taskServiceImpl.save(task));
    }
}