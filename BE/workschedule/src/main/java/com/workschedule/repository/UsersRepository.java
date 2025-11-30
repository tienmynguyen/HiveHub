package com.workschedule.repository;

import java.util.List;
import java.util.Optional;

import com.workschedule.model.Project;
import com.workschedule.model.Users;
import org.apache.catalina.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;


@Repository
public interface UsersRepository extends JpaRepository<Users, Long> {
    Optional<Users> findByemail(String email);

    @Query(value="select p.*,u.project_id,u.user_project_id " +
            "   from users p\n" +
            "    join user_project u\n" +
            "    on u.user_id=p.user_id\n" +
            "    where u.project_id like lower(concat('%',:projectId,'%'))\n",nativeQuery = true)
    List<Users> findUsersByProjectId(String projectId);

    @Query(value="select u.user_id,u.description,\n" +
            "u.email,u.imagePath,u.userName,\n" +
            "us.task_id,u.password from users u\n" +
            "join user_task us\n" +
            "on u.user_id=us.user_id\n" +
            "where task_id=?1\n" +
            "group by u.user_id;",nativeQuery = true)
    List<Users> getalluserbytask (Long taskId);




}
