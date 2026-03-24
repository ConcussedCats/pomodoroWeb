package com.example.telos.service;

import com.example.telos.dto.NoteResponseDto;
import com.example.telos.model.Note;
import com.example.telos.model.User;

import java.util.List;

public interface NoteService {
    Note findById(long id);
    List<Note> findAll();
    Note create(Note note);
    Note update(Note note);
    List<Note> findAllByUser(User user);
    List<NoteResponseDto> getUserNotes(String login);

    void delete(Note note);
}
