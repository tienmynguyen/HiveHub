package com.workschedule.service;

import com.workschedule.model.User_Task;

import java.util.List;

public interface UserTaskService {
    List<User_Task> findAll();

    User_Task findById(Long id);

    void deteleById(Long id);

    User_Task save(Long userId ,Long taskId);

    User_Task update(User_Task userTask);
}
