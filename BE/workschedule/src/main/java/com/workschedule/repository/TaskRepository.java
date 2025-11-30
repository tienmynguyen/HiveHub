package com.workschedule.repository;
import com.workschedule.model.Note;
import com.workschedule.model.Project;
import com.workschedule.model.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;


@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {

    @Query(value="select a.*\r\n"
            + "			from task a \r\n"

            + "         where a.project_id like ?1 ",nativeQuery = true)
    List<Task> findTaskByProject(String project_id);

//    @Query(value="select p.*,u.user_task_id,u.user_id from task p\n" +
//            "    join user_task u\n" +
//            "    on u.task_id=p.task_id\n" +
//            "    where u.user_id=?1\n" ,nativeQuery = true)
//    List<Task> findTaskbyUser(Long user_id);

    @Query(value="select p.*,u.user_task_id,u.user_id from task p\n" +
            "    join user_task u\n" +
            "    on u.task_id=p.task_id\n" +
            "    where u.user_id=?1\n" ,nativeQuery = true)
    List<Task> findTaskbyUser(Long user_id);

    @Query(value="select p.*,u.user_task_id,u.user_id from task p\n" +
            "    join user_task u\n" +
            "    on u.task_id=p.task_id\n" +
            "    where u.user_id=?1\n" +
            "    and ?2 BETWEEN p.timeStart AND p.timeEnd",nativeQuery = true)
    List<Task> findTaskbydate(Long user_id, LocalDate date);




}
