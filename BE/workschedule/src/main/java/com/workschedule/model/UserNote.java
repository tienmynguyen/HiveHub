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
@Table(name = "usernote")
public class UserNote {
    @Id
    @GeneratedValue(
            strategy = GenerationType.IDENTITY
    )
    @Column(
            name = "usernote_id"
    )
    private long usernote_id;

    @ManyToOne( fetch = FetchType.EAGER  )
    @JoinColumn( name = "note_id",
            referencedColumnName = "note_id" )
    private Note note;

    @ManyToOne(   fetch = FetchType.EAGER  )
    @JoinColumn(  name = "user_id",
            referencedColumnName = "user_id"  )
    private Users users;
}
