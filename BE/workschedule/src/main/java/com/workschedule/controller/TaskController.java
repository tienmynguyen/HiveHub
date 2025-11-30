package com.workschedule.controller;

import com.workschedule.Exception.ResourceNotFoundException;
import com.workschedule.model.*;
import com.workschedule.repository.TaskRepository;
import com.workschedule.service.serviceImpl.ProjectServiceImpl;
import com.workschedule.service.serviceImpl.TaskServiceImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
public class TaskController {
@Autowired
    private TaskServiceImpl taskServiceImpl;
@Autowired
private TaskRepository taskRepository;
@Autowired
private ProjectServiceImpl projectServiceImpl;


    @PostMapping("/addtask")
    public ResponseEntity<Task> addtask(@RequestBody Task task ,
                                        @RequestParam("projectId") String projectId) {
        Project pro=projectServiceImpl.findById(projectId);

        task.setProject(pro);
       task.setTaskStatus(TaskStatus.TODO.toString());
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
     //   taskServiceImpl.deteleById(projectid);

        List<Task> taskList= taskRepository.findTaskByProject(projectid);


        for (Task note:taskList){
            note.setUserTaskList(null);
            note.setCommentList(null);
            note.getProject().setUserProjectList(null);
            note.getProject().setMessageList(null);
        }
        return ResponseEntity.ok(taskList);
    }

    @GetMapping("/getalltaskbyuser")
    public ResponseEntity<List<Task>> getalltaskbyuser(@RequestParam("userId") Long userId) {

        List<Task> taskList= taskRepository.findTaskbyUser(userId);

        for (Task task:taskList){
            task.setUserTaskList(null);
            task.setCommentList(null);
            task.getProject().setUserProjectList(null);
            task.getProject().setMessageList(null);
        }

        return ResponseEntity.ok(taskList);
        }

    @GetMapping("/findtaskbydate")
    public ResponseEntity<List<Task>> findprojectbydate(@RequestParam("user_id") Long user_id
            , @RequestParam("date") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        List<Task> project = taskRepository.findTaskbydate(user_id, date);
        if (project != null) {
            List<Task> taskList=  taskRepository.findTaskbydate(user_id, date);

            for (Task note:taskList){
                note.setUserTaskList(null);
                note.setCommentList(null);
                note.getProject().setUserProjectList(null);
                note.getProject().setMessageList(null);
            }

            return ResponseEntity.ok(taskList);

        } else {
            throw new ResourceNotFoundException("Hôm nay rảnh.Không có việc");
        }

    }

    @PostMapping("/updatetask")
    public ResponseEntity<Task> updateproject(@RequestBody Task task
            , @RequestParam("taskId") Long taskId) {


        Task tasksaved = taskServiceImpl.update(task,taskId);

        return ResponseEntity.ok(tasksaved);
    }



}
