package com.workschedule.service;

import com.workschedule.model.Task;
import com.workschedule.model.User_Project;

import java.util.List;

public interface UserProjectService {

    List<User_Project> findAll();

    User_Project findById(Long id);


    void kickuser(String projectId,Long userId);

    void deteleById(Long id);

    User_Project save(String projectId,Long userId);

    User_Project saveowner(User_Project userProject);

    User_Project update(String projectId,Long userId,Long roleId);

}
