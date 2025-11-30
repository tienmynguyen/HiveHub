package com.workschedule.controller;

import com.workschedule.model.Message;
import com.workschedule.service.serviceImpl.MessageServiceImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
public class MessageController {
@Autowired
    private MessageServiceImpl messageServiceImpl;


    @PostMapping("/addmessage")
    public ResponseEntity<Message> addconversation(@RequestBody Message message) {
        return ResponseEntity.ok(messageServiceImpl.save(message));
    }



    @GetMapping("/deletemessage")
    public ResponseEntity<Void> deleteconversation(@RequestParam("messageid") Long messageid) {
        messageServiceImpl.deteleById(messageid);
        return ResponseEntity.ok().build();
    }

}
