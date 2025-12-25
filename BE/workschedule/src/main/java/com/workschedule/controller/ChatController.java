package com.workschedule.controller;

import com.workschedule.model.Message;
import com.workschedule.service.serviceImpl.MessageServiceImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import java.util.List;

@Controller
public class ChatController {

    @Autowired
    private MessageServiceImpl messageService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    // --- 1. WEBSOCKET: Gửi & Nhận tin nhắn Realtime ---
    @MessageMapping("/chat.sendMessage")
    public Message sendMessage(@Payload Message message) {
        System.out.println("DEBUG - Message Content: " + message.getMessage());
    System.out.println("DEBUG - Project ID received: " + message.getProject_id()); 
   
        // A. Lưu vào Database
        Message savedMsg = messageService.save(message);
        
        // B. Gửi tới Room (Topic) của Project đó
        String destination = "/topic/project/" + message.getProject_id();
        messagingTemplate.convertAndSend(destination, savedMsg);

        return savedMsg;
    }

    // --- 2. REST API: Lấy lịch sử chat (PHẦN BỊ THIẾU) ---
    // Frontend gọi cái này khi vừa mở màn hình Chat
    @GetMapping("/chat/getallmessage")
    @ResponseBody // <--- BẮT BUỘC: Để trả về JSON thay vì file HTML
    public ResponseEntity<List<Message>> getAllMessages(@RequestParam("projectId") String projectId) {
        // Lưu ý: Kiểm tra lại tên hàm trong MessageServiceImpl của bạn 
        // (ví dụ: findByProjectId, getAllMessageByProject, v.v...)
        List<Message> list = messageService.getallmessage(projectId); 
        return ResponseEntity.ok(list);
    }
}