package com.workschedule.service.serviceImpl;

import com.workschedule.Exception.ResourceNotFoundException;
import com.workschedule.model.Message;
import com.workschedule.repository.MessageRepository;
import com.workschedule.service.MessageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class MessageServiceImpl implements MessageService {
    @Autowired
    private MessageRepository messageRepository;

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

    @Override
    public Message save(Message message) {
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
