package com.workschedule.controller;

import com.workschedule.model.Comment;
import com.workschedule.model.Project;
import com.workschedule.model.Task;
import com.workschedule.model.Users;
import com.workschedule.repository.CommentRepository;
import com.workschedule.service.serviceImpl.CommentServiceImpl;
import com.workschedule.service.serviceImpl.TaskServiceImpl;
import com.workschedule.service.serviceImpl.UserServiceImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
        Task task=taskServiceImpl.findById(taskId);
        comment.setTask(task);
        Users user=userServiceImpl.findById(userId);
        comment.setUsers(user);
        return ResponseEntity.ok(commentServiceImpl.save(comment));
    }


    @GetMapping("/getallcomment")
    public ResponseEntity<List<Comment>> getallcomment() {
        return ResponseEntity.ok(commentServiceImpl.findAll());
    }

    @GetMapping("/deletecomment")
    public ResponseEntity<Void> deletecomment(@RequestParam("commentId") Long commentId) {
        commentServiceImpl.deteleById(commentId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/getcommentbyid")
    public ResponseEntity<Comment> findbyid(@RequestParam("commentId") Long commentId) {

        return ResponseEntity.ok(commentServiceImpl.findById(commentId));
    }

    @GetMapping("/getallcommentbyTask")
    public ResponseEntity<List<Comment>> getallcommentbyTask(@RequestParam("taskId") Long taskId) {
        return ResponseEntity.ok(commentRepository.getallcommentbytaskidoject(taskId));
    }


}
