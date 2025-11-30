package com.workschedule.service;

import com.workschedule.Exception.NotFoundException;
import com.workschedule.dto.UserDto;
import com.workschedule.model.Users;

import java.util.List;

public interface UsersService {
    List<Users> findAll();

    Users findById(Long id);

    void deteleById(Long id);


    Users save(UserDto userDto);

    Users update(UserDto users,Long id);

    UserDto login(UserDto userDto) throws NotFoundException;

    Users logintest(UserDto userDto) throws NotFoundException;

}
