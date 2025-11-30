package com.workschedule.controller;

import com.workschedule.service.serviceImpl.UserRoleServiceImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class UserRoleController {
    @Autowired
    private UserRoleServiceImpl userRoleServiceImpl;
}
