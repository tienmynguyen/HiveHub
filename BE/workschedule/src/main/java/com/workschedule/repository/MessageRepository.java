package com.workschedule.repository;
import com.workschedule.model.Message;
import com.workschedule.model.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;


@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {

    @Query(value="select *" +
            " from message m\n" +
            "where m.project_id=?1\n"
            ,nativeQuery = true)
    List<Message> getallmessage(String projectId);
}
