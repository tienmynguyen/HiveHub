package com.workschedule.service.serviceImpl;


import com.workschedule.model.Attachment;
import com.workschedule.repository.AttachmentRepository;
import com.workschedule.service.AttachmentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AttachmentServiceImpl implements AttachmentService {
    @Autowired
    private AttachmentRepository attachmentRepository;
    private List<Attachment> attachmentList;


    @Override
    public List<Attachment> findAll() {
        this.attachmentList = this.attachmentRepository.findAll();
        return this.attachmentList;
    }

    @Override
    public Attachment findById(Long id) {
        if (this.attachmentRepository.findById(id) != null) {
            Attachment attachment = (Attachment)this.attachmentRepository.findById(id).get();
            return attachment;
        } else {
            return null;
        }
    }

    @Override
    public void deteleById(Long id) {
    }

    @Override
    public Attachment save(Attachment attachment) {
        return null;
    }

    @Override
    public Attachment update(Attachment attachment) {
        return null;
    }
}
