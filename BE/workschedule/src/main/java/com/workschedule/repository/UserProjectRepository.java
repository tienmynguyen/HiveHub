package com.workschedule.repository;

import com.workschedule.model.Project;
import com.workschedule.model.UserNote;
import com.workschedule.model.User_Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserProjectRepository  extends JpaRepository<User_Project, Long> {

    @Query(value="select *\r\n"
            + "		from	 user_project a \r\n"
            + "         where a.user_id=?1 " +
            "and a.project_id=?2 ",nativeQuery = true)
    Optional<User_Project> findUserProjectByUserAndProject(Long userId,String projectId);

}
