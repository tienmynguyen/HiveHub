package com.workschedule.service.serviceImpl;

import com.workschedule.Exception.NotFoundException;
import com.workschedule.Exception.ResourceNotFoundException;
import com.workschedule.dto.UserDto;
import com.workschedule.model.Users;
import com.workschedule.repository.UsersRepository;
import com.workschedule.service.UsersService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UserServiceImpl implements UsersService {
@Autowired
private UsersRepository usersRepository;

    @Override
    public List<Users> findAll() {
        List<Users> usersList=usersRepository.findAll();
        return usersList;
    }

    @Override
    public Users findById(Long id) {
        if (usersRepository.findById(id) != null) {
            Users users = usersRepository.findById(id).get();
            return users;
        } else {
            throw new ResourceNotFoundException("Cannot find user with id:"+id);
        }
    }

    @Override
    public void deteleById(Long id) {
    }

    @Override
    public Users save(UserDto userDto) {
        Users users=new Users();

        List<Users> usersList=usersRepository.findAll();

        for (Users user : usersList) {
            if(user.getEmail().equals(userDto.getEmaildto())){
                throw new ResourceNotFoundException("Email already exists.");
            }
        }

         if(userDto.getUserName().equals(userDto.getEmaildto())){
    throw new ResourceNotFoundException("Username and email must not be the same.");
        }

        users.setEmail(userDto.getEmaildto());
        users.setPassword(userDto.getPassworddto());
        users.setUserName(userDto.getUserName());
        return usersRepository.save(users);
    }

    @Override
    public Users update(UserDto userDto,Long userId) {
        Users users=findById(userId);


        List<Users> usersList=usersRepository.findAll();

        if(!userDto.getEmaildto().equals(users.getEmail())){
            for (Users user : usersList) {
                if(user.getEmail().equals(userDto.getEmaildto())){
                    throw new ResourceNotFoundException("Email already exists.");
                }
            }
        }
        if(userDto.getUserName().equals(userDto.getEmaildto())){
            throw new ResourceNotFoundException("Username and email must not be the same.");
        }

        if(userDto.getUserName()!=null){
            users.setUserName(userDto.getUserName());
        }
        if(userDto.getImagePath()!=null){
            users.setImagePath(userDto.getImagePath());
        }
        if(userDto.getEmaildto()!=null){
            users.setEmail(userDto.getEmaildto());
        }
        if(userDto.getPassworddto()!=null){
            users.setPassword(userDto.getPassworddto());
        }
        if(userDto.getDescription()!=null){
            users.setDescription(userDto.getDescription());
        }

        Users usersave=usersRepository.save(users);
        usersave.setUserProjectList(null);
        usersave.setUserNotes(null);
        usersave.setCommentList(null);
        usersave.setUserTaskList(null);

        if (userDto.getWalletAddress() != null && !userDto.getWalletAddress().isEmpty()) {
        usersave.setWalletAddress(userDto.getWalletAddress());
}
        return usersave;
    }

    @Override
    public Users logintest(UserDto userDto) throws NotFoundException {
        List<Users> usersList=findAll();



        for (Users user : usersList) {
            if(user.getEmail().equals(userDto.getEmaildto())
            &&user.getPassword().equals(userDto.getPassworddto())){
                user.setUserProjectList(null);
                user.setUserNotes(null);
                user.setCommentList(null);
                user.setUserTaskList(null);
                return user;
            }
        }

        throw new ResourceNotFoundException("User with emai "+userDto.getEmaildto()+"not found!!!");
    }

    @Override
    public UserDto login(UserDto userDto) throws NotFoundException {
        List<Users> usersList=findAll();

        for (Users user : usersList) {
            if(user.getEmail().equals(userDto.getEmaildto())
                    &&user.getPassword().equals(userDto.getPassworddto())){

                UserDto userDto1=UserDto.builder()
                        .emaildto(user.getEmail())
                        .userName(user.getUsername())
                        .passworddto("************")
                        .imagePath(user.getImagePath()).build();

                return userDto1;

            }
        }

        throw new ResourceNotFoundException("User with emai "+userDto.getEmaildto()+"not found!!!");
    }


}



