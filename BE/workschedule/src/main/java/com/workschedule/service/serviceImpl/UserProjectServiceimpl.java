package com.workschedule.service.serviceImpl;

import com.workschedule.Exception.ResourceNotFoundException;
import com.workschedule.model.Project;
import com.workschedule.model.Task;
import com.workschedule.model.User_Project;
import com.workschedule.repository.ProjectRepository;
import com.workschedule.repository.UserProjectRepository;
import com.workschedule.repository.UsersRepository;
import com.workschedule.service.UserProjectService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class UserProjectServiceimpl implements UserProjectService {
    @Autowired
    private UserProjectRepository userProjectRepository;
    @Autowired
    private ProjectRepository  projectRepository;
    @Autowired
    private UsersRepository usersRepository;
    @Autowired
    private UserServiceImpl userServiceImpl;
    @Autowired
    private ProjectServiceImpl projectServiceImpl;
    @Autowired
    private RoleServiceImpl roleServiceImpl;
    @Override
    public List<User_Project> findAll() {
        return userProjectRepository.findAll();
    }

    @Override
    public User_Project findById(Long id) {
        if (userProjectRepository.existsById(id)) {
            User_Project project = userProjectRepository.findById(id).get();
            return project;
        } else {
            throw new ResourceNotFoundException("Cannot find userProject with id:"+id);
        }
    }

    @Override
    public void kickuser(String projectId, Long userId) {
        Optional<User_Project> us=userProjectRepository.findUserProjectByUserAndProject(userId,projectId);
              if(us.isPresent()){
                  deteleById(us.get().getUser_project_id());
              }else{
                  throw new ResourceNotFoundException("Cannot find userProject with this information.Pls check again");
              }

    }

    @Override
    public void deteleById(Long id) {
        if (userProjectRepository.existsById(id)) {
           userProjectRepository.deleteById(id);
        } else {
            throw new ResourceNotFoundException("Cannot find userProject with id:"+id);
        }
    }

    @Override
    public User_Project save(String projectId,Long userId) {
        if (projectRepository.findByIdConfig(projectId)==null) {
            throw new ResourceNotFoundException("Cannot find Project with id:"+projectId);
        } else if(!usersRepository.existsById(userId)) {
            throw new ResourceNotFoundException("Cannot find user with id:"+userId);
        }else{
            User_Project userProject=User_Project.builder()
                    .users(userServiceImpl.findById(userId))
                    .project(projectServiceImpl.findById(projectId))
                    .build();
            if (userProjectRepository.save(userProject)==null){
                throw new ResourceNotFoundException("Trung");

            }else{

                return userProjectRepository.save(userProject);
            }
        }
    }

    @Override
    public User_Project saveowner(User_Project userProject) {
    return   userProjectRepository.save(userProject);
    }


    @Override
    public User_Project update(String projectId,Long userId,Long roleId) {
        User_Project user_project=userProjectRepository.findUserProjectByUserAndProject(userId ,projectId).get();

        if (projectRepository.findByIdConfig(projectId)==null) {
            throw new ResourceNotFoundException("Cannot find Project with id:"+projectId);
        } else if(!usersRepository.existsById(userId)) {
            throw new ResourceNotFoundException("Cannot find user with id:"+userId);
        }else{
          user_project=User_Project.builder()
                  .user_project_id(user_project.getUser_project_id())
                    .users(userServiceImpl.findById(userId))
                    .project(projectServiceImpl.findById(projectId))
                  .role(roleServiceImpl.findById(roleId))
                    .build();
            return userProjectRepository.save(user_project);
        }

    }

}
