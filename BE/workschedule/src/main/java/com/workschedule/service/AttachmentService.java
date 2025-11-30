package com.workschedule.service;

import com.workschedule.model.Attachment;

import java.util.List;

public interface AttachmentService {
    List<Attachment> findAll();

    Attachment findById(Long id);

    void deteleById(Long id);

    Attachment save(Attachment attachment);

    Attachment update(Attachment attachment);
}
