package com.workschedule.service.serviceImpl;

import com.workschedule.Exception.ResourceNotFoundException;
import com.workschedule.model.Comment;
import com.workschedule.repository.CommentRepository;
import com.workschedule.service.CommentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
@Service
public class CommentServiceImpl implements CommentService {

    @Autowired
    private CommentRepository commentRepository;
    List<Comment> commentList;
    @Override
    public List<Comment> findAll() {
        return commentList=commentRepository.findAll();
    }

    @Override
    public Comment findById(Long id) {
        if (commentRepository.findById(id) != null) {
            Comment comment = commentRepository.findById(id).get();
            return comment;
        } else {
            throw new ResourceNotFoundException("Cannot find comment with id:"+id);
        }
    }

    @Override
    public void deteleById(Long id) {

    }

    @Override
    public Comment save(Comment comment) {
        return commentRepository.save(comment);
    }

    @Override
    public Comment update(Comment role) {
        return null;
    }
}
