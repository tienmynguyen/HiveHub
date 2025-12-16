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

import java.util.ArrayList;
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
    public ResponseEntity<List<Users>> getalluserbyprojectId(@RequestParam("projectId") String projectId) {
        List<Users> projectList = usersRepository.findUsersByProjectId(projectId);
        
        // Kiểm tra null trước khi trả về
        if (projectList == null) {
            return ResponseEntity.ok(new ArrayList<>());
        }

        // Vệ sinh dữ liệu (Data Cleaning) an toàn
        for (Users user : projectList) {
            user.setUserProjectList(null);
            user.setUserTaskList(null);
            user.setUserNotes(null);
            user.setCommentList(null);
            user.setPassword("********"); // Bảo mật: Không trả về pass thật
        }
        return ResponseEntity.ok(projectList);
    }

   @GetMapping("/getalluserbytaskId")
    public ResponseEntity<List<Users>> getalluserbytask(@RequestParam("taskId") Long taskId) {
        try {
            List<Users> userList = usersRepository.getalluserbytask(taskId);

            // 1. Nếu không tìm thấy ai, trả về danh sách rỗng [] ngay lập tức
            if (userList == null || userList.isEmpty()) {
                return ResponseEntity.ok(new ArrayList<>());
            }

            // 2. Vệ sinh dữ liệu để tránh lỗi vòng lặp (Circular Reference)
            for (Users user : userList) {
                user.setPassword("********"); // Che mật khẩu
                
                // Ngắt các quan hệ để JSON không bị lỗi đệ quy vô tận
                user.setUserProjectList(null);
                user.setCommentList(null);
                user.setUserNotes(null);
                
                // QUAN TRỌNG: Ngắt quan hệ task list để tránh load nặng và lỗi
                user.setUserTaskList(null); 
            }

            return ResponseEntity.ok(userList);

        } catch (Exception e) {
            // In lỗi ra màn hình Console của IntelliJ để bạn biết tại sao
            e.printStackTrace();
            // Trả về danh sách rỗng để App không bị crash, dù server có lỗi
            return ResponseEntity.ok(new ArrayList<>());
        }
    }


}
