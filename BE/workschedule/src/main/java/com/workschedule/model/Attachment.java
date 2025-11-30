package com.workschedule.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Setter
@Getter
@AllArgsConstructor
@NoArgsConstructor
@Table(name = "attachment")
public class Attachment {
    @Id
    @GeneratedValue(
            strategy = GenerationType.IDENTITY
    )
    @Column(
            name = "attachment_id"
    )
    private long attachment_id;
    private String thumb_url;
    private String file_url;
    @ManyToOne(
            fetch = FetchType.EAGER
    )
    @JoinColumn(
            name = "message_id",
            referencedColumnName = "message_id"
    )
    private Message message;
}
