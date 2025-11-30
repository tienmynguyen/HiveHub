package com.workschedule.service.serviceImpl;

import com.workschedule.Exception.ResourceNotFoundException;
import com.workschedule.model.Note;
import com.workschedule.model.User_Project;
import com.workschedule.model.User_Task;
import com.workschedule.model.Users;
import com.workschedule.repository.TaskRepository;
import com.workschedule.repository.UserTaskRepository;
import com.workschedule.repository.UsersRepository;
import com.workschedule.service.UserTaskService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UserTaskServiceImpl implements UserTaskService {
@Autowired
private UserTaskRepository userTaskRepository;
@Autowired
private UsersRepository usersRepository;
@Autowired
private TaskRepository taskRepository;
@Autowired
private UserServiceImpl userServiceImpl;
@Autowired
private TaskServiceImpl taskServiceImpl;

    @Override
    public List<User_Task> findAll() {
        return userTaskRepository.findAll();
    }

    @Override
    public User_Task findById(Long id) {
        if (userTaskRepository.existsById(id)) {
            User_Task userTask = userTaskRepository.findById(id).get();
            return userTask;
        } else {
            throw new ResourceNotFoundException("Cannot find userTask with id:"+id);
        }
    }

    @Override
    public void deteleById(Long id) {
        userTaskRepository.deleteById(id);
    }

    @Override
    public User_Task save(Long userId ,Long taskId) {

        if (!taskRepository.existsById(taskId)) {
            throw new ResourceNotFoundException("Cannot find task with id:"+taskId);
        } else if(!usersRepository.existsById(userId)) {
            throw new ResourceNotFoundException("Cannot find user with id:"+userId);
        }else{
            User_Task userTask=User_Task.builder()
                    .users(userServiceImpl.findById(userId))
                    .task(taskServiceImpl.findById(taskId))
                    .build();

            userTask.getTask().setUserTaskList(null);
            userTask.getTask().setCommentList(null);
            userTask.getUsers().setUserTaskList(null);
            userTask.getUsers().setUserNotes(null);
            userTask.getUsers().setCommentList(null);
            userTask.getUsers().setUserProjectList(null);
            userTask.getTask().getProject().setUserProjectList(null);

            return userTaskRepository.save(userTask);
        }
    }

    @Override
    public User_Task update(User_Task userTask) {
        return null;
    }
}
