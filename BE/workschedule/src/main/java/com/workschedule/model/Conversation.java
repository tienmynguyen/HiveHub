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
//        name = "conversation"
//)
//public class Conversation {
//
//    @Id
//    @GeneratedValue(
//            strategy = GenerationType.IDENTITY
//    )
//    @Column(
//            name = "conversation_id"
//    )
//    private long conversation_id;
//    private String title;
//    private String description;
//    private Date created_At;
//    private Date updated_At;
//    @OneToMany(
//            mappedBy = "conversation"
//    )
//    private List<Participant> participantList;
//    @OneToMany(
//            mappedBy = "conversation"
//    )
//    private List<Message> messageList;
//}
