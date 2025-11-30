package com.workschedule.model;

import jakarta.persistence.*;
import lombok.*;

import java.util.List;

@Entity
@Setter
@Getter
@AllArgsConstructor
@NoArgsConstructor
@Table(
        name = "user_project"
        , uniqueConstraints = @UniqueConstraint(columnNames = {"project_id", "user_id"})
)
@Builder
public class User_Project {
    @Id
    @GeneratedValue(
            strategy = GenerationType.IDENTITY
    )
    private long user_project_id;
    @ManyToOne(
            fetch = FetchType.EAGER
    )
    @JoinColumn(
            name = "project_id",
            referencedColumnName = "project_id"
    )
    private Project project;
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
            name = "role_id",
            referencedColumnName = "role_id"
    )
    private Role role;
}
