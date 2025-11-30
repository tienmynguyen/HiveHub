package com.workschedule.service.serviceImpl;

import com.workschedule.Exception.ResourceNotFoundException;
import com.workschedule.model.Project;
import com.workschedule.model.UserNote;
import com.workschedule.repository.UserNoteRepository;
import com.workschedule.service.UserNoteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UserNoteServiceImpl implements UserNoteService {
    @Autowired
    private UserNoteRepository userNoteRepository;
    @Override
    public List<UserNote> findAll() {
        return userNoteRepository.findAll();
    }

    @Override
    public UserNote findById(Long id) {
        if (userNoteRepository.existsById(id)) {
            UserNote project = userNoteRepository.findById(id).get();
            return project;
        } else {
            throw new ResourceNotFoundException("Cannot find usernote with id:"+id);
        }
    }

    @Override
    public void deteleById(Long id) {
userNoteRepository.deleteById(id);
    }

    @Override
    public UserNote save(UserNote task) {
        return userNoteRepository.save(task);
    }

    @Override
    public UserNote update(UserNote task) {
        return null;
    }
}
