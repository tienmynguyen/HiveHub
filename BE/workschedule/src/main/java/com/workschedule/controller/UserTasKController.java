package com.workschedule.controller;

import com.workschedule.model.User_Project;
import com.workschedule.model.User_Task;
import com.workschedule.service.serviceImpl.UserTaskServiceImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class UserTasKController {
@Autowired
    private UserTaskServiceImpl userTaskServiceImpl;


    @PostMapping("/addusertask")
    public ResponseEntity<User_Task> addusertask(@RequestParam("taskId") Long taskId
            , @RequestParam("userId") Long userId) {

        User_Task userTask=  userTaskServiceImpl.save(userId,taskId);
        return ResponseEntity.ok(userTask);
    }

}
