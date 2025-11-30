//package com.workschedule.controller;
//
//import com.workschedule.model.Conversation;
//import com.workschedule.model.Project;
//import com.workschedule.service.serviceImpl.ConversationServiceImpl;
//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.http.ResponseEntity;
//import org.springframework.web.bind.annotation.*;
//
//import java.util.List;
//
//@RestController
//public class ConversationController {
//@Autowired
//    private ConversationServiceImpl conversationServiceImpl;
//
//
//    @PostMapping("/addconversation")
//    public ResponseEntity<Conversation> addconversation(@RequestBody Conversation conversation) {
//        return ResponseEntity.ok(conversationServiceImpl.save(conversation));
//    }
//
//
//    @GetMapping("/getallconversation")
//    public ResponseEntity<List<Conversation>> getallconversation() {
//        return ResponseEntity.ok(conversationServiceImpl.findAll());
//    }
//
//    @GetMapping("/deleteconversation")
//    public ResponseEntity<Void> deleteconversation(@RequestParam("conversationid") Long conversationid) {
//        conversationServiceImpl.deteleById(conversationid);
//        return ResponseEntity.ok().build();
//    }
//}
