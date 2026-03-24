package com.example.telos.service.impl;

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
    NoteRepository noteRepository;

    @Override
    public Note findById(long id) {
        return noteRepository.findById(id).orElseThrow(() -> new EntityNotFoundException("Note not found with id: " + id));
    }

    @Override
    public List<Note> findAll() {
        return noteRepository.findAll();
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
                        note.getId(),
                        note.getNoteText(),
                        null // no message
                ))
                .toList();
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
