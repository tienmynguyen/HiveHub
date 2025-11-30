package com.workschedule.repository;
import com.workschedule.model.User_Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;


@Repository
public interface UserTaskRepository extends JpaRepository<User_Task, Long> {
}
