package com.workschedule.service.serviceImpl;

import com.workschedule.Exception.ResourceNotFoundException;
import com.workschedule.model.Role;
import com.workschedule.repository.RoleRepository;
import com.workschedule.service.RoleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class RoleServiceImpl implements RoleService {
    @Autowired
    private RoleRepository roleRepository;
    List<Role> roleList;



    @Override
    public List<Role> findAll() {
        this.roleList = this.roleRepository.findAll();
        return this.roleList;
    }

    @Override
    public Role findById(Long id) {
        if (this.roleRepository.existsById(id)) {
            Role role = (Role)this.roleRepository.findById(id).get();
            return role;
        } else {
            throw new ResourceNotFoundException("Cannot find role with id:"+id);
        }
    }

    @Override
    public void deteleById(Long id) {
    }

    @Override
    public Role save(Role role) {
        return roleRepository.save(role);
    }

    @Override
    public Role update(Role role) {
        return null;
    }
}
