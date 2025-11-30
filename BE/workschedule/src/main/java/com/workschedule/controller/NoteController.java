package com.workschedule.controller;

import com.workschedule.model.Comment;
import com.workschedule.model.Note;
import com.workschedule.model.UserNote;
import com.workschedule.repository.NoteRepository;
import com.workschedule.repository.UserNoteRepository;
import com.workschedule.service.serviceImpl.NoteServiceImpl;
import com.workschedule.service.serviceImpl.UserNoteServiceImpl;
import com.workschedule.service.serviceImpl.UserServiceImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
public class NoteController {
    @Autowired
    private NoteServiceImpl noteServiceImpl;
@Autowired
private UserNoteServiceImpl userNoteServiceImopl;
@Autowired
private UserServiceImpl userService;
@Autowired
private UserNoteRepository userNoteRepository;
@Autowired
private NoteRepository noteRepository;

    @PostMapping("/addnote")
    public ResponseEntity<Note> addnote(@RequestBody Note note
            , @RequestParam("userId") Long userId) {
        Note note1 =noteServiceImpl.save(note);

        UserNote userNote=new UserNote();
        userNote.setNote(note);
        userNote.setUsers(userService.findById(userId));
        userNoteServiceImopl.save(userNote);

        return ResponseEntity.ok(note1);
    }


    @GetMapping("/getallnote")
    public ResponseEntity<List<Note>> getallnote() {
        return ResponseEntity.ok(noteServiceImpl.findAll());
    }

    @GetMapping("/deletenote")
    public ResponseEntity<Void> deletenote(@RequestParam("noteId") Long noteId) {
        List<UserNote> noteList=userNoteRepository.findUserNoteByNote(noteId);

        for(UserNote userNote:noteList ){

            userNoteServiceImopl.deteleById(userNote.getUsernote_id());
        }

        noteServiceImpl.deteleById(noteId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/getnotebyid")
    public ResponseEntity<Note> findbyid(@RequestParam("noteId") Long noteId) {

        return ResponseEntity.ok(noteServiceImpl.findById(noteId));
    }

    @GetMapping("/getallnotebyuser")
    public ResponseEntity<List<Note>> getallnotebyuser(@RequestParam("userId") Long userId) {
        List<Note> noteList= noteRepository.findNotebyUser(userId);

        for (Note note:noteList){
            note.setUserNotes(null);
        }

        return ResponseEntity.ok(noteList);
    }


    @PostMapping("/updatenote")
    public ResponseEntity<Note> updatenote(@RequestBody Note note
            , @RequestParam("noteId") Long noteId) {
        Note note1 =noteServiceImpl.update(note,noteId);


        return ResponseEntity.ok(note1);
    }


}
