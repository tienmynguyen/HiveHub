package com.workschedule.controller;

import com.workschedule.model.Role;
import com.workschedule.service.serviceImpl.RoleServiceImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class RoleController {
    @Autowired
    private RoleServiceImpl roleServiceImpl;

    public RoleController() {
    }

    @PostMapping({"/addrole"})
    public ResponseEntity<Role> adduser(@RequestBody Role role) {
        return ResponseEntity.ok(this.roleServiceImpl.save(role));
    }

    @GetMapping({"/getallrole"})
    public ResponseEntity<List<Role>> getalluser() {
        return ResponseEntity.ok(this.roleServiceImpl.findAll().stream().toList());
    }
}
