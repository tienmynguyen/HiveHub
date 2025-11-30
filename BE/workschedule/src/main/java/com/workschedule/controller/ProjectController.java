package com.workschedule.controller;

import com.workschedule.Exception.ResourceNotFoundException;
import com.workschedule.model.*;
import com.workschedule.repository.ProjectRepository;
import com.workschedule.service.serviceImpl.ProjectServiceImpl;
import com.workschedule.service.serviceImpl.UserProjectServiceimpl;
import com.workschedule.service.serviceImpl.UserServiceImpl;
import org.apache.poi.ss.formula.functions.T;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Date;
import java.util.List;

@RestController
public class ProjectController {

    @Autowired
    private ProjectServiceImpl projectServiceImpl;

    @Autowired
    private ProjectRepository projectRepository;
    @Autowired
    private UserProjectServiceimpl userProjectServiceimpl;
    @Autowired
    private UserServiceImpl userService;

    @PostMapping("/createdproject")
    public ResponseEntity<Project> addproject(@RequestBody Project project
            , @RequestParam("userId") Long userId) {
        project.setProjectStatus(ProjectStatus.TODO.toString());
        Project projectsaved = projectServiceImpl.save(project);
 //dcm
        User_Project userProject = new User_Project();
        userProject.setProject(projectsaved);
        userProject.setUsers(userService.findById(userId));
        userProjectServiceimpl.saveowner(userProject);



        return ResponseEntity.ok(projectsaved);
    }

    @GetMapping("/searchproject")
    public ResponseEntity<List<Project>> searchproject(@RequestParam("data") String data) {
        return ResponseEntity.ok(projectRepository.searchproject(data));
    }

    @GetMapping("/getallproject")
    public ResponseEntity<List<Project>> getallproject() {
        return ResponseEntity.ok(projectServiceImpl.findAll());
    }

    @GetMapping("/deleteproject")
    public ResponseEntity<Void> deleteproject(@RequestParam("projectid") Long projectid) {
        projectServiceImpl.deteleById(projectid);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/getprjectbyuserId")
    public ResponseEntity<List<Project>> getprjectbyuserId(@RequestParam("userId") Long userId) {
        List<Project> projectList= projectRepository.findProjectByUser(userId);
        for(Project pro:projectList){
            pro.setUserProjectList(null);
            pro.setMessageList(null);
        }
        return ResponseEntity.ok(projectList);
    }

    @GetMapping("/findprojectbydate")
    public ResponseEntity<List<Project>> findprojectbydate(@RequestParam("user_id") Long user_id
            , @RequestParam("date") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        List<Project> project = projectRepository.findProjectdate(user_id, date);
        if (project != null) {
            List<Project> taskList=  projectRepository.findProjectdate(user_id, date);

            for (Project note:taskList){
                note.setUserProjectList(null);
                note.setMessageList(null);
            }

            return ResponseEntity.ok(taskList);
        } else {
            throw new ResourceNotFoundException("Hôm nay rảnh.Không có việc");
        }

    }

    @PostMapping("/updateproject")
    public ResponseEntity<Project> updateproject(@RequestBody Project project
            , @RequestParam("projectId") String projectId) {

        project.setProjectStatus(ProjectStatus.TODO.toString());

        Project projectsaved = projectServiceImpl.update(project,projectId);

        return ResponseEntity.ok(projectsaved);
    }



}
