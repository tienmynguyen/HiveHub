package com.workschedule.repository;
import com.workschedule.model.Project;
import com.workschedule.model.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Date;
import java.util.List;


@Repository
public interface ProjectRepository extends JpaRepository<Project, Long> {
    @Query(value="select a.*,c.taskName\r\n"
            + "			from project a \r\n"
            + "			join task c \r\n"
            + "			on a.project_id=c.project_id\r\n"

            + "         where lower(a.project_name) like lower(concat('%',:keyword,'%'))\r\n"
            + "         and lower(a.projectDescription) like lower(concat('%',:keyword,'%'))\r\n"
            + "         or lower(c.taskName) like lower(concat('%',:keyword,'%'))\r\n"
            + "         or lower(c.taskStatus) like lower(concat('%',:keyword,'%'))\r\n"
            + "           \r\n"
            + "         group by a.project_id ",nativeQuery = true)
    List<Project> searchproject(String keyword);


    @Query(value="select p.*,u.user_id,u.user_project_id from project p\n" +
            "    join user_project u\n" +
            "    on u.project_id=p.project_id\n" +
            "    where u.user_id=?1\n",nativeQuery = true)
    List<Project> findProjectByUser(Long userId);


    @Query(value="select p.*,u.user_id,u.user_project_id from project p\n" +
            "    join user_project u\n" +
            "    on u.project_id=p.project_id\n" +
            "    where u.user_id=?1\n" +
            "    and p.timeStart=?2",nativeQuery = true)
    List<Project> findProjectdate(Long user_id, LocalDate date);

    @Query(value="select p.* from project p\n" +
            "    where p.project_id like ?1\n" ,nativeQuery = true)
    Project findByIdConfig(String project_id);




}
