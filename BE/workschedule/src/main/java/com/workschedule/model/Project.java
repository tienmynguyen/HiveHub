package com.workschedule.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.Date;
import java.util.List;

@Entity
@Setter
@Getter
@AllArgsConstructor
@NoArgsConstructor
@Table(
        name = "project"
)
public class Project {
    @Id
    @Column(
            name = "project_id"
    )
    private String project_id;
    private String projectName;
    private String projectStatus;
    private Long projectowner;
    private LocalDate timeStart;
    private LocalDate timeEnd;
    private String projectDescription;


    @OneToMany(
            mappedBy = "project"
    )
    private List<User_Project> userProjectList;

    @OneToMany(
            mappedBy = "project"
    )
    private List<Message> messageList;
}
