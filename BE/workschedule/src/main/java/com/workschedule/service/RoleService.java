package com.workschedule.service;

import com.workschedule.model.Role;

import java.util.List;

public interface RoleService {
    List<Role> findAll();

    Role findById(Long id);

    void deteleById(Long id);

    Role save(Role role);

    Role update(Role role);
}
