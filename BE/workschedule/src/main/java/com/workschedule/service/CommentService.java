package com.workschedule.service;

import com.workschedule.model.Comment;

import java.util.List;

public interface CommentService {
    List<Comment> findAll();

    Comment findById(Long id);

    void deteleById(Long id);

    Comment save(Comment role);

    Comment update(Comment role);
}
