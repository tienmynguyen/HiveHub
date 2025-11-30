package com.workschedule.service;

import com.workschedule.model.Task;
import com.workschedule.model.UserNote;

import java.util.List;

public interface UserNoteService {

    List<UserNote> findAll();

    UserNote findById(Long id);


    void deteleById(Long id);

    UserNote save(UserNote task);

    UserNote update(UserNote task);

}
