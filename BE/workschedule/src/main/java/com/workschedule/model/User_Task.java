package com.workschedule.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Setter
@Getter
@AllArgsConstructor
@NoArgsConstructor
@Table(
        name = "user_task"
)
@Builder
public class User_Task {
    @Id
    @GeneratedValue(
            strategy = GenerationType.IDENTITY
    )
    private long user_task_id;
    @ManyToOne(
            fetch = FetchType.EAGER
    )
    @JoinColumn(
            name = "user_id",
            referencedColumnName = "user_id"
    )
    private Users users;
    @ManyToOne(
            fetch = FetchType.EAGER
    )
    @JoinColumn(
            name = "task_id",
            referencedColumnName = "task_id"
    )
    private Task task;
}
