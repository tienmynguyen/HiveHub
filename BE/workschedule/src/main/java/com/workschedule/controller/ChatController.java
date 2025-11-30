package com.workschedule.controller;

import com.workschedule.model.Message;
import com.workschedule.model.Project;
import com.workschedule.model.Users;
import com.workschedule.service.serviceImpl.MessageServiceImpl;
import com.workschedule.service.serviceImpl.ProjectServiceImpl;
import com.workschedule.service.serviceImpl.UserServiceImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Controller
@CrossOrigin(origins = "*")
public class ChatController {

    @Autowired
    private MessageServiceImpl messageServiceImpl;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;
    @Autowired
    private ProjectServiceImpl projectServiceImpl;
    @Autowired
    private UserServiceImpl userServiceIml;

    // WebSocket endpoint for user registration
    @MessageMapping("/chat.register")
    @SendTo("/topic/public")
    public Message register(@Payload Message chatMessage) {
        // Save the message to the database if needed
        return chatMessage;
    }

    // WebSocket endpoint for sending messages
    @MessageMapping("/chat.send")
    @SendTo("/topic/public")
    public Message sendMessage(@Payload Message chatMessage) {
        Message savedMessage = messageServiceImpl.save(chatMessage);
        return savedMessage;
    }

    // REST endpoint to add a message
    @PostMapping("/chat/addmessage")
    public ResponseEntity<Message> addMessage(@RequestBody Message message) {

        Project pro=projectServiceImpl.findById(message.getProject_id());
        message.setProject(pro);
        Users user = userServiceIml.findById(message.getUser_id());
        message.setUsers(user);
        Message savedMessage = messageServiceImpl.save(message);
        Message message1 =savedMessage;
        // Send the saved message to WebSocket subscribers
      //  messagingTemplate.convertAndSend("/topic/public", savedMessage);

        message1.getProject().setUserProjectList(null);
        message1.getProject().setMessageList(null);
        message1.getUsers().setUserTaskList(null);
        message1.getUsers().setUserNotes(null);
        message1.getUsers().setUserProjectList(null);
        return ResponseEntity.ok(message1);
    }

    // REST endpoint to delete a message
    @DeleteMapping("/chat/deletemessage")
    public ResponseEntity<Void> deleteMessage(@RequestParam("messageid") Long messageid) {
        messageServiceImpl.deteleById(messageid);
        return ResponseEntity.ok().build();
    }

    // REST endpoint to get all messages for a specific project
    @GetMapping("/chat/getallmessage")
    public ResponseEntity<List<Message>> getAllMessages(@RequestParam("projectId") String projectId) {
        List<Message> messageList = messageServiceImpl.getallmessage(projectId);

        for(Message message1:messageList){
            message1.getProject().setUserProjectList(null);
            message1.getProject().setMessageList(null);
            message1.getUsers().setUserTaskList(null);
            message1.getUsers().setUserNotes(null);
            message1.getUsers().setUserProjectList(null);
        }
        return ResponseEntity.ok(messageList);
    }
}
