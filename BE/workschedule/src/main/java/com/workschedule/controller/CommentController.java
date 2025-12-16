package com.workschedule.controller;

import com.workschedule.model.Comment;
import com.workschedule.model.Task;
import com.workschedule.model.Users;
import com.workschedule.repository.CommentRepository;
import com.workschedule.service.serviceImpl.CommentServiceImpl;
import com.workschedule.service.serviceImpl.TaskServiceImpl;
import com.workschedule.service.serviceImpl.UserServiceImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;

@RestController
public class CommentController {
    @Autowired
    private CommentServiceImpl commentServiceImpl;
    @Autowired
    private CommentRepository commentRepository;
    @Autowired
    private TaskServiceImpl taskServiceImpl;
    @Autowired
    private UserServiceImpl userServiceImpl;

    @PostMapping("/postcomment")
    public ResponseEntity<Comment> postcomment(@RequestBody Comment comment,
                                               @RequestParam("taskId") Long taskId,
                                               @RequestParam("userId") Long userId) {
        try {
            Task task = taskServiceImpl.findById(taskId);
            Users user = userServiceImpl.findById(userId);
            
            comment.setTask(task);
            comment.setUsers(user);
            
            // Lưu vào DB
            Comment savedComment = commentServiceImpl.save(comment);

            // --- VỆ SINH DỮ LIỆU TRƯỚC KHI TRẢ VỀ (Tránh lỗi Maximum nesting) ---
            if (savedComment.getUsers() != null) {
                // Chỉ giữ lại thông tin cơ bản của User, cắt hết các list quan hệ
                savedComment.getUsers().setCommentList(null);
                savedComment.getUsers().setUserTaskList(null);
                savedComment.getUsers().setUserProjectList(null);
                savedComment.getUsers().setPassword("********");
            }
            if (savedComment.getTask() != null) {
                // Cắt quan hệ ngược về Task
                savedComment.getTask().setCommentList(null);
                savedComment.getTask().setUserTaskList(null);
                savedComment.getTask().setProject(null); // Nếu không cần project info
            }

            return ResponseEntity.ok(savedComment);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/getallcommentbyTask")
    public ResponseEntity<List<Comment>> getallcommentbyTask(@RequestParam("taskId") Long taskId) {
        List<Comment> list = commentRepository.getallcommentbytaskidoject(taskId);
        
        if (list == null) {
            return ResponseEntity.ok(new ArrayList<>());
        }

        // Vệ sinh dữ liệu cho từng comment trong list
        for (Comment c : list) {
            if (c.getUsers() != null) {
                c.getUsers().setCommentList(null);
                c.getUsers().setUserTaskList(null);
                c.getUsers().setUserProjectList(null);
                c.getUsers().setPassword("********");
            }
            // Set Task thành null luôn để giảm dung lượng JSON (vì ở Frontend ta đã biết Task nào rồi)
            c.setTask(null); 
        }

        return ResponseEntity.ok(list);
    }

    // ... Các hàm delete, getall khác giữ nguyên hoặc xóa nếu không dùng
}