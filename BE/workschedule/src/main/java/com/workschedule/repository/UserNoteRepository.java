package com.workschedule.repository;

import com.workschedule.model.Attachment;
import com.workschedule.model.Task;
import com.workschedule.model.UserNote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserNoteRepository extends JpaRepository<UserNote, Long> {

    @Query(value="select *\r\n"
            + "		from	 usernote a \r\n"
            + "         where a.note_id=?1 ",nativeQuery = true)
    List<UserNote> findUserNoteByNote(Long note_id);

}
