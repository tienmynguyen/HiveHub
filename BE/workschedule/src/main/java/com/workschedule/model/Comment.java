package com.workschedule.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.Date;

@Entity
@Setter
@Getter
@AllArgsConstructor
@NoArgsConstructor
@Table(name = "comment")
public class Comment {
    @Id
    @GeneratedValue(
            strategy = GenerationType.IDENTITY
    )
    @Column(
            name = "comment_id"
    )
    private long comment_id;
    private String commmentContent;
    private Date date;

    @ManyToOne( fetch = FetchType.EAGER  )
    @JoinColumn(name = "user_id",
            referencedColumnName = "user_id" )
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
