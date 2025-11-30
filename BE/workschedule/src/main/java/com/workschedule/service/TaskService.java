package com.workschedule.service;

import com.workschedule.model.Task;

import java.util.List;

public interface TaskService {
    List<Task> findAll();

    Task findById(Long id);


    void deteleById(Long id);

    Task save(Task task);

    Task update(Task task,Long taskId);
}
