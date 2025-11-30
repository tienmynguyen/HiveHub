package com.workschedule.repository;

import com.workschedule.model.Note;
import com.workschedule.model.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface NoteRepository extends JpaRepository<Note, Long> {

    @Query(value="select p.*,u.usernote_id,u.user_id from note p\n" +
            "    join usernote u\n" +
            "    on u.note_id=p.note_id\n" +
            "    where u.user_id=?1\n" ,nativeQuery = true)
    List<Note> findNotebyUser(Long user_id);


}
