package com.workschedule.controller;

import com.workschedule.Exception.NotFoundException;
import com.workschedule.dto.UserDto;
import com.workschedule.model.Project;
import com.workschedule.model.Task;
import com.workschedule.model.User_Task;
import com.workschedule.model.Users;
import com.workschedule.repository.UsersRepository;
import com.workschedule.service.serviceImpl.UserServiceImpl;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
public class UserController {
@Autowired
    private UserServiceImpl userServiceImpl;
@Autowired
private UsersRepository usersRepository;

@PostMapping("/register")
    public ResponseEntity<Users> register(@RequestBody @Valid UserDto userDto
        ,BindingResult bindingResult ) throws Exception {
//if (bindingResult.hasErrors()){
//    throw new  Exception("Wrong data");
//}
    return ResponseEntity.ok(userServiceImpl.save(userDto));
}

    @PostMapping("/login")
    public Users login(@RequestBody UserDto userDto) throws NotFoundException {
        return userServiceImpl.logintest(userDto);
    }
    @GetMapping("/login test")
    public String logintest(){
    return "main";
    }

    @GetMapping("/logintest")
    public UserDto logintest(@RequestBody UserDto userDto) throws NotFoundException {
        return userServiceImpl.login(userDto);
    }

    @PostMapping("/updateuser")
    public ResponseEntity<Users> updateuser(@RequestBody @Valid UserDto userDto
            ,BindingResult bindingResult,
              @RequestParam("userId") Long userId) throws Exception {
//if (bindingResult.hasErrors()){
//    throw new  Exception("Wrong data");
//}
        return ResponseEntity.ok(userServiceImpl.update(userDto,userId));
    }

    @GetMapping("/getalluserbyprojectId")
    public ResponseEntity<List<Users>> getalluserbyprojectId(@RequestParam("projectId")String projectId) {
        List<Users> projectList= usersRepository.findUsersByProjectId(projectId);
        for(Users pro:projectList){
            pro.setUserProjectList(null);
            pro.setUserTaskList(null);
            pro.setUserNotes(null);
            pro.setCommentList(null);
        }
        return ResponseEntity.ok(projectList);
    }

    @GetMapping("/getalluserbytaskId")
    public ResponseEntity<List<Users>> getalluserbytask(@RequestParam("taskId")Long taskId) {
        List<Users> projectList= usersRepository.getalluserbytask(taskId);
        for(Users users:projectList){
            users.setUserProjectList(null);
            for(User_Task task:users.getUserTaskList()){
                task.getTask().setUserTaskList(null);
                task.getTask().setCommentList(null);
                task.setUsers(null);
                task.getTask().setProject(null);
            }
            users.setUserNotes(null);
            users.setCommentList(null);
            users.setPassword("********");
        }
        return ResponseEntity.ok(projectList);
    }


}
