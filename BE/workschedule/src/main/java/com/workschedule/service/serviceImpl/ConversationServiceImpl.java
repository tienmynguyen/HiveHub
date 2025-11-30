//package com.workschedule.service.serviceImpl;
//
//import com.workschedule.model.Conversation;
//import com.workschedule.repository.ConversationRepository;
//import com.workschedule.service.ConversationService;
//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.stereotype.Service;
//
//import java.util.List;
//
//@Service
//public class ConversationServiceImpl implements ConversationService {
//    @Autowired
//    private ConversationRepository conversationRepository;
//    List<Conversation> conversationList;
//
//
//
//    @Override
//    public List<Conversation> findAll() {
//        this.conversationList = this.conversationRepository.findAll();
//        return this.conversationList;
//    }
//
//    @Override
//    public Conversation findById(Long id) {
//        if (this.conversationRepository.findById(id) != null) {
//            Conversation conversation = (Conversation)this.conversationRepository.findById(id).get();
//            return conversation;
//        } else {
//            return null;
//        }
//    }
//
//    @Override
//    public void deteleById(Long id) {
//    }
//
//    @Override
//    public Conversation save(Conversation conversation) {
//        return null;
//    }
//
//    @Override
//    public Conversation update(Conversation conversation) {
//        return null;
//    }
//}
