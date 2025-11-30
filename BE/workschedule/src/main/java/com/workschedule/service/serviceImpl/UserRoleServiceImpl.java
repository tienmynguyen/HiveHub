package com.workschedule.service.serviceImpl;

import com.workschedule.Exception.ResourceNotFoundException;
import com.workschedule.model.User_Project;
import com.workschedule.repository.UserRoleRepository;
import com.workschedule.service.UserRoleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UserRoleServiceImpl implements UserRoleService {
    @Autowired
    private UserRoleRepository userRoleRepository;
    List<User_Project> userRoleList;



    @Override
    public List<User_Project> findAll() {
        this.userRoleList = this.userRoleRepository.findAll();
        return this.userRoleList;
    }

    @Override
    public User_Project findById(Long id) {
        if (this.userRoleRepository.existsById(id)) {
            User_Project userRole = (User_Project)this.userRoleRepository.findById(id).get();
            return userRole;
        } else {
            throw new ResourceNotFoundException("Cannot find user_role with id:"+id);
        }
    }

    @Override
    public void deteleById(Long id) {
    }

    @Override
    public User_Project save(Long taskId,Long userId) {
        return null;
    }

    @Override
    public User_Project update(User_Project userTask,Long userprojectId) {
        return null;
    }
}
