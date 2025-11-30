//package com.workschedule.service.serviceImpl;
//
//import com.workschedule.model.Participant;
//import com.workschedule.repository.ParticipantRepository;
//import com.workschedule.service.ParticipantService;
//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.stereotype.Service;
//
//import java.util.List;
//
//@Service
//public class ParticipantServiceImpl implements ParticipantService {
//    @Autowired
//    private ParticipantRepository participantRepository;
//    List<Participant> participantList;
//
//
//
//    @Override
//    public List<Participant> findAll() {
//        this.participantList = this.participantRepository.findAll();
//        return this.participantList;
//    }
//
//    @Override
//    public Participant findById(Long id) {
//        if (this.participantRepository.existsById(id)) {
//            Participant participant = (Participant)this.participantRepository.findById(id).get();
//            return participant;
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
//    public Participant save(Participant participant) {
//        return null;
//    }
//
//    @Override
//    public Participant update(Participant participant) {
//        return null;
//    }
//}
