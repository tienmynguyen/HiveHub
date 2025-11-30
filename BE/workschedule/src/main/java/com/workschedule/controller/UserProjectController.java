package com.workschedule.controller;

import com.workschedule.model.Project;
import com.workschedule.model.ProjectStatus;
import com.workschedule.model.User_Project;
import com.workschedule.repository.UserProjectRepository;
import com.workschedule.service.serviceImpl.UserProjectServiceimpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
public class UserProjectController {
@Autowired
    private UserProjectServiceimpl userProjectServiceimpl;
@Autowired
private UserProjectRepository userProjectRepository;

    @PostMapping("/joinproject")
    public ResponseEntity<User_Project> addproject(@RequestParam("projectId") String projectId
            , @RequestParam("userId") Long userId) {

        User_Project user_project=  userProjectServiceimpl.save(projectId,userId);
        user_project.getProject().setUserProjectList(null);
        user_project.getUsers().setUserTaskList(null);
        user_project.getUsers().setUserNotes(null);
        user_project.getUsers().setCommentList(null);
        user_project.getUsers().setUserProjectList(null);
        return ResponseEntity.ok(user_project);
    }

    @PostMapping("/updateuserproject")
    public ResponseEntity<User_Project> updateuserproject(@RequestParam("projectId") String projectId
            , @RequestParam("userId") Long userId
            // , @RequestParam("userProjectId") Long userProjectId     khi nào cần dùng dùng lại đỡ quên và khả năng là ko bao giờ
            , @RequestParam("roleId") Long roleId ) {

        User_Project user_project=  userProjectServiceimpl.update(projectId,userId,roleId);
        user_project.getProject().setUserProjectList(null);
        user_project.getUsers().setUserTaskList(null);
        user_project.getUsers().setUserNotes(null);
        user_project.getUsers().setCommentList(null);
        user_project.getUsers().setUserProjectList(null);
        user_project.getRole().setUserProjectList(null);
        return ResponseEntity.ok(user_project);
    }

    @GetMapping("/findAlluspr")
    public ResponseEntity<List<User_Project>> findAlluspr( ) {
        List<User_Project> userProjectList=userProjectServiceimpl.findAll();
        for(User_Project userProject:userProjectList){
            userProject.getProject().setUserProjectList(null);
            userProject.getUsers().setUserProjectList(null);
            userProject.getUsers().setUserTaskList(null);
            userProject.getUsers().setUserNotes(null);
            userProject.getUsers().setCommentList(null);
        }
        return ResponseEntity.ok(userProjectList);
    }

    @GetMapping("/findroleinuspr")
    public ResponseEntity<User_Project> findroleinuspr(@RequestParam("projectId") String projectId
                                                        , @RequestParam("userId") Long userId) {
        User_Project uspr=userProjectRepository.findUserProjectByUserAndProject(userId,projectId).get();
        uspr.getProject().setUserProjectList(null);
        uspr.getUsers().setUserProjectList(null);
        uspr.getUsers().setUserTaskList(null);
        uspr.getUsers().setUserNotes(null);
        uspr.getUsers().setCommentList(null);
        uspr.getRole().setUserProjectList(null);
        uspr.getProject().setMessageList(null);

        return ResponseEntity.ok(uspr);
    }


    @GetMapping("/kickuser")
    public ResponseEntity<String> kickuser(@RequestParam("projectId") String projectId
            , @RequestParam("userId") Long userId) {
       userProjectServiceimpl.kickuser(projectId,userId);

        return ResponseEntity.ok("Delete successfull");
    }




}
