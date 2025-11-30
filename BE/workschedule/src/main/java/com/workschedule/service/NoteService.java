package com.workschedule.service;

import com.workschedule.model.Note;

import java.util.List;

public interface NoteService {

    List<Note> findAll();

    Note findById(Long id);

    void deteleById(Long id);

    Note save(Note role);

    Note update(Note role,Long id);
}
