package com.workschedule.controller;

import com.workschedule.Exception.ResourceNotFoundException;
import com.workschedule.model.*;
import com.workschedule.repository.CommentRepository;
import com.workschedule.repository.TaskRepository;
import com.workschedule.repository.UsersRepository;
import com.workschedule.service.serviceImpl.ProjectServiceImpl;
import com.workschedule.service.serviceImpl.TaskServiceImpl;
import com.workschedule.service.BlockchainService; // SỬ DỤNG SERVICE VỪA TẠO
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

    // Inject Service Blockchain chúng ta vừa viết
    @Autowired
    private BlockchainService blockchainService;

    @PostMapping("/addtask")
    public ResponseEntity<Task> addtask(@RequestBody Task task, @RequestParam("projectId") String projectId) {
        Project pro = projectServiceImpl.findById(projectId);
        task.setProject(pro);
        task.setTaskStatus(TaskStatus.IN_PROGRESS.toString());
        return ResponseEntity.ok(taskServiceImpl.save(task));
    }

    @GetMapping("/getalltask")
    public ResponseEntity<List<Task>> getalltask() {
        return ResponseEntity.ok(taskServiceImpl.findAll());
    }

    @GetMapping("/deletetask")
    public ResponseEntity<Void> deletetask(@RequestParam("taskid") Long taskid) {
        taskServiceImpl.deteleById(taskid);
        return ResponseEntity.ok().build();
    }

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
        System.out.println(">>> ĐANG CHẠY VÀO: /updatetask (Không có Blockchain)");
        return ResponseEntity.ok(tasksaved);
    }

    // --- LOGIC DUYỆT BÀI VÀ GHI BLOCKCHAIN (QUAN TRỌNG) ---
    @PostMapping("/approvetask")
    public ResponseEntity<?> approveTask(@RequestBody Map<String, Object> payload) {
        System.out.println(">>> ĐANG CHẠY VÀO: /approvetask (CÓ Blockchain)"); // <--- Log 2
        // Lấy dữ liệu từ JSON Body (để khớp với React Native gửi lên)
       // Cách lấy dữ liệu AN TOÀN, không sợ null
    Object taskIdObj = payload.get("taskId");
    Object projectIdObj = payload.get("projectId");
    Object adminIdObj = payload.get("adminId");

    if (taskIdObj == null || projectIdObj == null) {
        return ResponseEntity.badRequest().body("Thiếu taskId hoặc projectId!");
    }

    Long taskId = Long.valueOf(taskIdObj.toString());
    String projectId = projectIdObj.toString();
    Long adminId = adminIdObj != null ? Long.valueOf(adminIdObj.toString()) : null;
        // Hoặc nếu bạn muốn dùng @RequestParam như cũ thì giữ nguyên tham số hàm,
        // nhưng nên dùng @RequestBody Map cho các API POST phức tạp.
        // Ở đây mình viết theo kiểu nhận @RequestBody để linh hoạt.

        try {
            // 1. Tìm Task
            Task task = taskRepository.findById(taskId)
                    .orElseThrow(() -> new ResourceNotFoundException("Task not found with id: " + taskId));

            // 2. Gọi Blockchain Service
            System.out.println("Đang ghi Task " + taskId + " lên Blockchain...");
            String txHash = blockchainService.approveTaskOnChain(taskId, projectId);

            if (txHash != null) {
                // 3. Cập nhật Database sau khi Blockchain xác nhận
                task.setTaskStatus("COMPLETED");     // Trạng thái hoàn thành
                task.setIsApproved(true);         // Đã duyệt (Cần thêm field này vào Entity Task nếu chưa có)
                task.setTxHash(txHash);           // Lưu mã giao dịch (Cần thêm field này vào Entity Task)
                
                taskRepository.save(task);

                // 4. Lưu lịch sử (Comment)
                if (adminId != null) {
                    saveHistoryComment(task, adminId, "APPROVED (Đã duyệt)", "Xác thực Blockchain thành công. Tx: " + txHash);
                }

                // 5. Trả về kết quả cho React Native
                return ResponseEntity.ok(Map.of(
                        "message", "Duyệt thành công!",
                        "txHash", txHash,
                        "taskStatus", "DONE"
                ));
            } else {
                return ResponseEntity.status(500).body("Lỗi: Không thể ghi dữ liệu lên Blockchain Ganache.");
            }

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Lỗi Server: " + e.getMessage());
        }
    }

    // Hàm hỗ trợ lưu lịch sử
    private void saveHistoryComment(Task task, Long userId, String action, String content) {
        Users user = usersRepository.findById(userId).orElse(null);
        if (user == null) return;

        Comment comment = new Comment();
        comment.setCommmentContent(action + ": " + content);
        comment.setDate(new Date());
        comment.setTask(task);
        comment.setUsers(user);

        commentRepository.save(comment);
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

        task.setTaskStatus("IN_PROGRESS"); // Trả về cho làm lại
        task.setIsApproved(false);         // Bỏ duyệt nếu có

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