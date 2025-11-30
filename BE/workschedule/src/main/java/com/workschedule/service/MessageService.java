package com.workschedule.service;

import com.workschedule.model.Message;

import java.util.List;

public interface MessageService {
    List<Message> findAll();

    Message findById(Long id);

    void deteleById(Long id);

    Message save(Message message);

    Message update(Message message);

    List<Message> getallmessage(String projectId);
}
