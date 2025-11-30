package com.workschedule.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.Date;
import java.util.List;
@Entity
@Setter
@Getter
@AllArgsConstructor
@NoArgsConstructor
@Table(
        name = "task"
)
public class Task {
    @Id
    @GeneratedValue(
            strategy = GenerationType.IDENTITY
    )
    @Column(
            name = "task_id"
    )
    private long task_id;
    private String taskName;
    private String description;
    private Date timeStart;
    private Date timeEnd;
    private Date deadline;
    private String taskStatus;
    @OneToMany(
            mappedBy = "task"
    )
    private List<User_Task> userTaskList;
    @ManyToOne(
            fetch = FetchType.EAGER
    )
    @JoinColumn(
            name = "project_id",
            referencedColumnName = "project_id"
    )
    private Project project;

    @OneToMany(
            mappedBy = "task"
    )
    private List<Comment> commentList;

}
