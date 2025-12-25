package com.workschedule.model;

import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Setter
@Getter
@AllArgsConstructor
@NoArgsConstructor
@Table(
        name = "message"
)
@ToString
@Builder
public class Message {
    @Id
    @GeneratedValue(
            strategy = GenerationType.IDENTITY
    )
    @Column(
            name = "message_id"
    )
    private long message_id;
    private String message;
    private String date;
    private MessageType type;
    public enum MessageType {
        CHAT, LEAVE, JOIN
    }
    @ManyToOne(
            fetch = FetchType.EAGER
    )
    @JoinColumn(
            name = "project_id",
            referencedColumnName = "project_id"
    )
    private Project project;
    @Transient
    @JsonProperty("project_id")
    private String project_id;

    @ManyToOne(
            fetch = FetchType.EAGER
    )
    @JoinColumn(
            name = "user_id",
            referencedColumnName = "user_id"
    )
    private Users users;
    @Transient
    private Long user_id;




}
