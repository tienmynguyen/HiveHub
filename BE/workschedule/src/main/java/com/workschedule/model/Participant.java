//package com.workschedule.model;
//
//import jakarta.persistence.*;
//import lombok.AllArgsConstructor;
//import lombok.Getter;
//import lombok.NoArgsConstructor;
//import lombok.Setter;
//
//import java.util.Date;
//import java.util.List;
//@Entity
//@Setter
//@Getter
//@AllArgsConstructor
//@NoArgsConstructor
//@Table(
//        name = "participant"
//)
//public class Participant {
//    @Id
//    @GeneratedValue(
//            strategy = GenerationType.IDENTITY
//    )
//    @Column(
//            name = "participant_id"
//    )
//    private long participant_id;
//    private Date created_At;
//    private Date updated_At;
//    @OneToMany(
//            mappedBy = "participant"
//    )
//    private List<Message> messageList;
//    @OneToOne
//    @JoinColumn(name = "user_id", unique = true)
//    private Users user;
//    @ManyToOne(
//            fetch = FetchType.EAGER
//    )
//    @JoinColumn(
//            name = "conversation_id",
//            referencedColumnName = "conversation_id"
//    )
//    private Conversation conversation;
//}
