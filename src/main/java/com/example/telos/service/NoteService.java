package com.example.telos.service;

import com.example.telos.dto.NoteDto;
import com.example.telos.dto.NoteResponseDto;
import com.example.telos.model.Note;
import com.example.telos.model.User;

import java.util.List;

public interface NoteService {
    Note findById(long id);
    Note create(Note note);
    Note update(Note note);
    List<Note> findAllByUser(User user);
    List<NoteResponseDto> getUserNotes(String login);
    NoteResponseDto updateNote(String login, long noteId, NoteDto noteDto);
    NoteResponseDto createNewNote(String login, NoteDto noteDto);
    void delete(Note note);
}
