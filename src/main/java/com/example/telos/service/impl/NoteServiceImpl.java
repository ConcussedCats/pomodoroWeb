package com.example.telos.service.impl;

import com.example.telos.dto.NoteDto;
import com.example.telos.dto.NoteResponseDto;
import com.example.telos.model.Note;
import com.example.telos.model.User;
import com.example.telos.repository.NoteRepository;
import com.example.telos.service.NoteService;
import com.example.telos.service.UserService;
import jakarta.persistence.EntityNotFoundException;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@AllArgsConstructor
public class NoteServiceImpl implements NoteService {
    private final UserService userService;
    private final NoteRepository noteRepository;

    @Override
    public Note findById(long id) {
        return noteRepository.findById(id).orElseThrow(() -> new EntityNotFoundException("Note not found with id: " + id));
    }

    @Override
    public Note create(Note note) {
        return noteRepository.save(note);
    }

    @Override
    public Note update(Note note) {
        return noteRepository.save(note);
    }

    @Override
    public List<NoteResponseDto> getUserNotes(String login) {
        User user = userService.findByEmailOrUsername(login);

        return findAllByUser(user).stream()
                .map(note -> new NoteResponseDto(
                        note.getNoteId(),
                        note.getNoteText(),
                        null // no message
                ))
                .toList();
    }

    @Override
    public NoteResponseDto updateNote(String login, long noteId, NoteDto noteDto) {
        User user = userService.findByEmailOrUsername(login);
        Note note = findById(noteId);

        if (!note.getUser().getUserId().equals(user.getUserId())) throw new EntityNotFoundException("Note not found with id: " + noteId);

        note.setNoteText(noteDto.getNoteText());
        Note updatedNote = update(note);

        return new NoteResponseDto(updatedNote.getNoteId(), updatedNote.getNoteText(), "Note was updated successfully");
    }

    @Override
    public NoteResponseDto createNewNote(String login, NoteDto noteDto) {
        User user = userService.findByEmailOrUsername(login);
        Note note = new Note();
        note.setUser(user);
        note.setNoteText(noteDto.getNoteText());
        Note noteCreated = create(note);
        return new NoteResponseDto(noteCreated.getNoteId(), noteCreated.getNoteText(), "Note was created successfully");
    }

    @Override
    public List<Note> findAllByUser(User user) {
        return noteRepository.findByUser(user);
    }

    @Override
    public void delete(Note note) {
        noteRepository.delete(note);
    }
}
