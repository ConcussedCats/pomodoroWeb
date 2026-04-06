package com.example.telos.controller.api.session;

import com.example.telos.dto.NoteDto;
import com.example.telos.dto.NoteResponseDto;
import com.example.telos.service.NoteService;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@AllArgsConstructor
@RestController
@RequestMapping("/api/productivity/notes")
public class NoteRestController {
    private final NoteService noteService;

    @GetMapping
    public List<NoteResponseDto> getNotes(Principal principal) {
        return noteService.getUserNotes(principal.getName());
    }

    @PatchMapping("/{id}")
    public NoteResponseDto updateNote(Principal principal, @PathVariable long id, @Valid @RequestBody NoteDto noteDto) {
        return noteService.updateNote(principal.getName(), id, noteDto);
    }

    @PostMapping
    public NoteResponseDto createNote(Principal principal, @Valid @RequestBody NoteDto noteDto) {
        return noteService.createNewNote(principal.getName(), noteDto);
    }

    @DeleteMapping("/{id}")
    public void deleteNote(Principal principal, @PathVariable long id) {
        noteService.deleteNote(principal.getName(), id);
    }
}
