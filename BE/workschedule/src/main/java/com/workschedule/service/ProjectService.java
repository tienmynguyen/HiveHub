package com.workschedule.service;

import com.workschedule.model.Project;

import java.util.List;

public interface ProjectService {
    List<Project> findAll();

    Project findById(String id);

    void deteleById(Long id);

    Project save(Project project);

    Project update(Project project,String id);
}
