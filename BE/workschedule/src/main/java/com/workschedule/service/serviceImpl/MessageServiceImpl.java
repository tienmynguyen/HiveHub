package com.workschedule.service.serviceImpl;

import com.workschedule.Exception.ResourceNotFoundException;
import com.workschedule.model.Message;
import com.workschedule.model.Project;
import com.workschedule.model.Users;
import com.workschedule.repository.MessageRepository;
import com.workschedule.repository.ProjectRepository; // <--- Cần import
import com.workschedule.repository.UsersRepository;   // <--- Cần import (Check tên Repo của bạn)
import com.workschedule.service.MessageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class MessageServiceImpl implements MessageService {
    @Autowired
    private MessageRepository messageRepository;

    // --- THÊM 2 REPOSITORY NÀY ---
    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private UsersRepository usersRepository; // Đảm bảo bạn có UsersRepository

    private List<Message> messageList;

    @Override
    public List<Message> findAll() {
        this.messageList = this.messageRepository.findAll();
        return this.messageList;
    }

    @Override
    public Message findById(Long id) {
        return messageRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cannot find message with id: " + id));
    }

    @Override
    public void deteleById(Long id) {
        messageRepository.deleteById(id);
    }

    // --- SỬA LẠI HÀM SAVE Ở ĐÂY ---
    @Override
    public Message save(Message message) {
        // 1. Map Project từ project_id (Transient) sang Object Project
        if (message.getProject_id() != null) {
            try {
                
                String projectId = message.getProject_id();
                
               Project project = projectRepository.findByIdConfig(projectId);
                if (project == null) {
                    throw new RuntimeException("Project not found with id: " + projectId);
                }
                
                message.setProject(project); // <--- QUAN TRỌNG: Gán Object để Hibernate lưu ID
            } catch (NumberFormatException e) {
                System.err.println("Project ID không phải là số hợp lệ: " + message.getProject_id());
            }
        }

        // 2. Map Users từ user_id (Transient) sang Object Users
        if (message.getUser_id() != null) {
            Users user = usersRepository.findById(message.getUser_id())
                    .orElseThrow(() -> new RuntimeException("User not found"));
            
            message.setUsers(user); // <--- QUAN TRỌNG: Gán Object để Hibernate lưu ID
        }

        // 3. Set thời gian nếu client chưa gửi
        if (message.getDate() == null) {
            message.setDate(new java.util.Date().toString());
        }

        return messageRepository.save(message);
    }

    @Override
    public Message update(Message message) {
        return messageRepository.save(message);
    }

    @Override
    public List<Message> getallmessage(String projectId) {
        return messageRepository.getallmessage(projectId);
    }
}