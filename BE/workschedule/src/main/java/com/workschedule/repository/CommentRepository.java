package com.workschedule.repository;

import com.workschedule.model.Comment;
import com.workschedule.model.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface  CommentRepository extends JpaRepository<Comment, Long> {
    @Query(value="select * from comment c" +
            " where c.task_id=?1",nativeQuery = true)
    List<Comment> getallcommentbytaskidoject(Long taskId);
}
